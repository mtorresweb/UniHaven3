"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildRepoName,
  commitFilesToRepo,
  createProjectRepo,
  generateReadme,
  makeRepoPublic,
  type GitHubFile,
} from "@/lib/github";
import { put } from "@vercel/blob";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Role } from "@/lib/constants";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200 MB total

export type CreateProjectState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  projectId?: string;
};

export async function createProject(
  _prev: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== Role.UPC_STUDENT &&
      session.user.role !== Role.ADMIN)
  ) {
    return { error: "No autorizado. Solo estudiantes UPC pueden subir proyectos." };
  }

  // ── Metadata ──────────────────────────────────────────────────────────────
  const title = (formData.get("title") as string)?.trim();
  const abstract = (formData.get("abstract") as string)?.trim();
  const type = formData.get("type") as string;
  const areaId = formData.get("areaId") as string;
  const yearStr = formData.get("year") as string;
  const keywordsRaw = (formData.get("keywords") as string)?.trim();
  const license = (formData.get("license") as string) || "CC BY 4.0";

  const fieldErrors: Record<string, string> = {};
  if (!title || title.length < 5) fieldErrors.title = "El título debe tener al menos 5 caracteres.";
  if (!abstract || abstract.length < 50) fieldErrors.abstract = "El resumen debe tener al menos 50 caracteres.";
  if (!["THESIS", "RESEARCH", "CLASSROOM"].includes(type)) fieldErrors.type = "Tipo inválido.";
  if (!areaId) fieldErrors.areaId = "Selecciona un área de conocimiento.";
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
    fieldErrors.year = "Año inválido.";
  }

  // ── Files ─────────────────────────────────────────────────────────────────
  const rawFiles = formData.getAll("files") as File[];
  if (!rawFiles.length || (rawFiles.length === 1 && rawFiles[0].size === 0)) {
    fieldErrors.files = "Debes subir al menos un archivo.";
  }

  let totalSize = 0;
  for (const f of rawFiles) {
    if (f.size > MAX_FILE_SIZE) {
      fieldErrors.files = `El archivo "${f.name}" supera el límite de 50 MB.`;
    }
    totalSize += f.size;
  }
  if (totalSize > MAX_TOTAL_SIZE) {
    fieldErrors.files = "El tamaño total de los archivos supera 200 MB.";
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };

  // ── Cover image → Vercel Blob ─────────────────────────────────────────────
  const coverFile = formData.get("coverImage") as File | null;
  let coverImageUrl: string | undefined;
  if (coverFile && coverFile.size > 0) {
    const ext = coverFile.name.split(".").pop() ?? "jpg";
    const blob = await put(`covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`, coverFile, {
      access: "public",
      contentType: coverFile.type || "image/jpeg",
    });
    coverImageUrl = blob.url;
  }

  // ── Validate area exists ──────────────────────────────────────────────────
  const area = await prisma.knowledgeArea.findUnique({ where: { id: areaId } });
  if (!area) return { error: "Área de conocimiento no encontrada." };

  const keywords = keywordsRaw
    ? keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  // ── GitHub: create repo ───────────────────────────────────────────────────
  const repoName = buildRepoName(type, title, year);
  let fullRepo: string;
  try {
    fullRepo = await createProjectRepo(repoName, `${title} — ${area.name} (${year})`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Handle duplicate repo names gracefully
    if (msg.includes("already exists") || msg.includes("name already exists")) {
      const ts = Date.now().toString(36);
      fullRepo = await createProjectRepo(`${repoName}-${ts}`, `${title} — ${area.name} (${year})`);
    } else {
      return { error: `Error creando repositorio GitHub: ${msg}` };
    }
  }

  // ── GitHub: build file list ───────────────────────────────────────────────
  const gitFiles: GitHubFile[] = [];

  // README
  const readmeBuffer = generateReadme({
    title,
    abstract,
    type,
    area: area.name,
    year,
    authors: [session.user.name ?? session.user.email ?? "Autor desconocido"],
    license,
    keywords,
  });
  gitFiles.push({ path: "README.md", content: readmeBuffer });

  // Actual uploaded files — placed in /files/ subfolder
  const fileRecords: { name: string; path: string; mimeType: string; size: number }[] = [];
  for (const f of rawFiles) {
    if (f.size === 0) continue;
    const buf = Buffer.from(await f.arrayBuffer());
    const safeName = f.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
    const repoPath = `files/${safeName}`;
    gitFiles.push({ path: repoPath, content: buf });
    fileRecords.push({ name: f.name, path: repoPath, mimeType: f.type || "application/octet-stream", size: f.size });
  }

  // ── GitHub: commit files ──────────────────────────────────────────────────
  let commitSha: string;
  try {
    commitSha = await commitFilesToRepo(
      fullRepo,
      gitFiles,
      `feat: subida inicial — ${title} (v1)`
    );
  } catch (e: unknown) {
    return { error: `Error subiendo archivos a GitHub: ${e instanceof Error ? e.message : String(e)}` };
  }

  // ── GitHub: make repo public immediately ──────────────────────────────────
  try {
    const { makeRepoPublic } = await import("@/lib/github");
    await makeRepoPublic(fullRepo);
  } catch {
    // Non-fatal — repo stays private, project still saved
  }

  // ── Prisma: save project (sequential inserts — HTTP mode has no transactions) ──
  const project = await prisma.project.create({
    data: {
      title,
      abstract,
      type: type as "THESIS" | "RESEARCH" | "CLASSROOM",
      status: "APPROVED",
      year,
      license,
      keywords,
      githubRepo: fullRepo,
      areaId,
      ...(coverImageUrl ? { coverImage: coverImageUrl } : {}),
    },
  });

  await prisma.projectAuthor.create({
    data: { projectId: project.id, userId: session.user.id },
  });

  // createMany uses implicit transactions too — use individual creates instead
  for (const fr of fileRecords) {
    await prisma.projectFile.create({
      data: {
        projectId: project.id,
        name: fr.name,
        githubPath: fr.path,
        mimeType: fr.mimeType,
        size: fr.size,
      },
    });
  }

  await prisma.projectVersion.create({
    data: {
      projectId: project.id,
      number: 1,
      commitSHA: commitSha,
      changelog: "Versión inicial.",
    },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}?submitted=1`);
}

// ── Report a project ───────────────────────────────────────────────────────
export async function reportProject(
  projectId: string,
  category: "INAPPROPRIATE" | "PLAGIARISM" | "FALSE_INFO" | "OTHER",
  description: string
) {
  const session = await auth();
  if (!session?.user) return { error: "Debes iniciar sesión para reportar." };

  const existing = await prisma.report.findFirst({
    where: { reporterId: session.user.id, projectId, status: "PENDING" },
  });
  if (existing) return { error: "Ya enviaste un reporte para este proyecto." };

  await prisma.report.create({
    data: {
      reporterId: session.user.id,
      projectId,
      category,
      description,
      status: "PENDING",
    },
  });
  return { ok: true };
}

// ── Admin: remove (reject) reported project ────────────────────────────────
export async function removeProject(projectId: string, note: string) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) return { error: "No autorizado." };

  const { makeRepoPrivate } = await import("@/lib/github");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Proyecto no encontrado." };

  // Make repo private so it's no longer publicly accessible
  if (project.githubRepo) await makeRepoPrivate(project.githubRepo).catch(() => {});

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "REJECTED", rejectionNote: note },
  });

  // Mark related reports as actioned (updateMany also needs raw SQL or loop)
  const pendingReports = await prisma.report.findMany({
    where: { projectId, status: "PENDING" },
    select: { id: true },
  });
  for (const r of pendingReports) {
    await prisma.report.update({ where: { id: r.id }, data: { status: "ACTIONED" } });
  }

  // Notify authors
  const authors = await prisma.projectAuthor.findMany({ where: { projectId } });
  for (const a of authors) {
    await prisma.notification.create({
      data: {
        userId: a.userId,
        type: "PROJECT_REJECTED" as const,
        reference: { projectId, title: project.title, note },
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  return { ok: true };
}

// ── Reinstate a rejected project ──────────────────────────────────────────
export async function reinstateProject(projectId: string) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) return { error: "No autorizado." };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Proyecto no encontrado." };
  if (project.status !== "REJECTED") return { error: "Solo se pueden reintegrar proyectos rechazados." };

  if (project.githubRepo) await makeRepoPublic(project.githubRepo).catch(() => {});

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "APPROVED", rejectionNote: null },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  return { ok: true };
}

// ── Permanently delete a project ──────────────────────────────────────────
export async function deleteProject(projectId: string) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) return { error: "No autorizado." };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Proyecto no encontrado." };

  // Try to delete the GitHub repo (best-effort)
  if (project.githubRepo) {
    try {
      const { Octokit } = await import("octokit");
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      const [owner, repo] = project.githubRepo.split("/");
      await octokit.rest.repos.delete({ owner, repo });
    } catch {
      // Ignore — repo may not exist or token may lack delete scope
    }
  }

  // Delete cover image from Vercel Blob (best-effort)
  if (project.coverImage) {
    try {
      const { del } = await import("@vercel/blob");
      await del(project.coverImage);
    } catch {
      // Ignore
    }
  }

  // Cascading deletes handle all related records
  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/projects");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  return { ok: true };
}

// ── Upload a new version of an existing project ───────────────────────────
export async function uploadProjectVersion(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado." };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      githubRepo: true,
      status: true,
      authors: { select: { userId: true } },
      versions: { orderBy: { number: "desc" }, take: 1, select: { number: true } },
    },
  });

  if (!project) return { error: "Proyecto no encontrado." };

  const isAuthor = project.authors.some((a) => a.userId === session.user.id);
  const isAdmin = session.user.role === Role.ADMIN;
  if (!isAuthor && !isAdmin) return { error: "Solo los autores pueden subir versiones." };

  const changelog = (formData.get("changelog") as string | null)?.trim() ?? "";
  const rawFiles = formData.getAll("files") as File[];
  const validFiles = rawFiles.filter((f) => f.size > 0);

  if (validFiles.length === 0) return { error: "Debes subir al menos un archivo." };

  const nextNumber = (project.versions[0]?.number ?? 0) + 1;

  // Commit to GitHub
  let commitSha: string | undefined;
  if (project.githubRepo) {
    try {
      const fileBuffers: GitHubFile[] = await Promise.all(
        validFiles.map(async (f) => ({
          path: f.name,
          content: Buffer.from(await f.arrayBuffer()),
        }))
      );
      commitSha = await commitFilesToRepo(
        project.githubRepo,
        fileBuffers,
        `v${nextNumber}: ${changelog || "Nueva versión"}`
      );
    } catch {
      // non-fatal — still record the version
    }
  }

  // Upload files to Vercel Blob
  for (const file of validFiles) {
    const blob = await put(`projects/${projectId}/${file.name}`, file, { access: "public" });
    await prisma.projectFile.create({
      data: { projectId, name: file.name, blobUrl: blob.url, mimeType: file.type || "application/octet-stream", size: file.size },
    });
  }

  // Create version record
  const version = await prisma.projectVersion.create({
    data: {
      projectId,
      number: nextNumber,
      changelog: changelog || null,
      commitSHA: commitSha ?? null,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, version };
}

// ── Increment view counter ─────────────────────────────────────────────────
export async function incrementProjectView(projectId: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { views: { increment: 1 } },
  });
}
