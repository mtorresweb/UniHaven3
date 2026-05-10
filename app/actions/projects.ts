"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildRepoName,
  commitFilesToRepo,
  createProjectRepo,
  generateReadme,
  type GitHubFile,
} from "@/lib/github";
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

  // ── Prisma: save project ──────────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      title,
      abstract,
      type: type as "THESIS" | "RESEARCH" | "CLASSROOM",
      status: "IN_REVIEW",
      year,
      license,
      keywords,
      githubRepo: fullRepo,
      areaId,
      authors: {
        create: { userId: session.user.id },
      },
      files: {
        create: fileRecords.map((fr) => ({
          name: fr.name,
          githubPath: fr.path,
          mimeType: fr.mimeType,
          size: fr.size,
        })),
      },
      versions: {
        create: {
          number: 1,
          commitSHA: commitSha,
          changelog: "Versión inicial.",
        },
      },
    },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}?submitted=1`);
}

// ── Admin: approve project ─────────────────────────────────────────────────
export async function approveProject(projectId: string) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) return { error: "No autorizado." };

  const { makeRepoPublic } = await import("@/lib/github");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Proyecto no encontrado." };

  if (project.githubRepo) await makeRepoPublic(project.githubRepo);

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "APPROVED" },
  });

  // Notify authors
  const authors = await prisma.projectAuthor.findMany({ where: { projectId } });
  await prisma.notification.createMany({
    data: authors.map((a: { userId: string }) => ({
      userId: a.userId,
      type: "PROJECT_APPROVED" as const,
      reference: { projectId, title: project.title },
    })),
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ── Admin: reject project ──────────────────────────────────────────────────
export async function rejectProject(projectId: string, note: string) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) return { error: "No autorizado." };

  const { makeRepoPrivate } = await import("@/lib/github");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Proyecto no encontrado." };

  if (project.githubRepo) await makeRepoPrivate(project.githubRepo);

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "REJECTED", rejectionNote: note },
  });

  const authors = await prisma.projectAuthor.findMany({ where: { projectId } });
  await prisma.notification.createMany({
    data: authors.map((a: { userId: string }) => ({
      userId: a.userId,
      type: "PROJECT_REJECTED" as const,
      reference: { projectId, title: project.title, note },
    })),
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ── Increment view counter ─────────────────────────────────────────────────
export async function incrementProjectView(projectId: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { views: { increment: 1 } },
  });
}
