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
import { canUploadProjects, Role, UPLOAD_LIMITS } from "@/lib/constants";
import {
  notifyAdmins,
  triggerUnreadNotificationCount,
} from "@/lib/notifications";

// Topes para instancias con poca RAM. Viven en lib/constants para
// compartirlos con el formulario de subida.
const MAX_FILE_SIZE = UPLOAD_LIMITS.maxFileSize;
const MAX_TOTAL_SIZE = UPLOAD_LIMITS.maxTotalSize;
const MAX_FILE_MB = MAX_FILE_SIZE / 1024 / 1024;
const MAX_TOTAL_MB = MAX_TOTAL_SIZE / 1024 / 1024;

/**
 * Sanitiza una ruta relativa preservando su estructura de carpetas
 * (p. ej. "src/components/Button.js" se mantiene igual).
 */
function sanitizeRelativePath(path: string): string {
  const cleaned = path
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._\-]/g, "_"))
    .filter(Boolean)
    .join("/");
  return cleaned || "archivo";
}

export type CreateProjectState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  projectId?: string;
};

export type CoAuthor = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function createProject(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const session = await auth();
  if (!session?.user || !canUploadProjects(session.user.role)) {
    return {
      error: "No autorizado. Solo estudiantes UPC pueden subir proyectos.",
    };
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
  if (!title || title.length < 5)
    fieldErrors.title = "El título debe tener al menos 5 caracteres.";
  if (!abstract || abstract.length < 50)
    fieldErrors.abstract = "El resumen debe tener al menos 50 caracteres.";
  if (!["THESIS", "RESEARCH", "CLASSROOM"].includes(type))
    fieldErrors.type = "Tipo inválido.";
  if (!areaId) fieldErrors.areaId = "Selecciona un área de conocimiento.";
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
    fieldErrors.year = "Año inválido.";
  }

  // ── Files ─────────────────────────────────────────────────────────────────
  const rawFiles = formData.getAll("files") as File[];
  const rawPaths = formData.getAll("paths") as string[];
  if (!rawFiles.length || (rawFiles.length === 1 && rawFiles[0].size === 0)) {
    fieldErrors.files = "Debes subir al menos un archivo.";
  }

  let totalSize = 0;
  for (const f of rawFiles) {
    if (f.size > MAX_FILE_SIZE) {
      fieldErrors.files = `El archivo "${f.name}" supera el límite de ${MAX_FILE_MB} MB.`;
    }
    totalSize += f.size;
  }
  if (totalSize > MAX_TOTAL_SIZE) {
    fieldErrors.files = `El tamaño total de los archivos supera ${MAX_TOTAL_MB} MB.`;
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };

  // ── Co-autores (opcionales) ──────────────────────────────────────────────
  const coauthorIds = Array.from(
    new Set(
      (formData.getAll("coauthors") as string[])
        .map((id) => id.trim())
        .filter((id) => id && id !== session.user.id),
    ),
  );

  const coauthors: { id: string; name: string }[] = [];
  for (const id of coauthorIds) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.UPC_STUDENT)) {
      return {
        error:
          "Solo puedes añadir como coautores a usuarios registrados con rol de administrador o estudiante UPC.",
      };
    }
    coauthors.push({ id: user.id, name: user.name ?? user.email });
  }

  // ── Cover image → Vercel Blob ─────────────────────────────────────────────
  const coverFile = formData.get("coverImage") as File | null;
  let coverImageUrl: string | undefined;
  if (coverFile && coverFile.size > 0) {
    const ext = coverFile.name.split(".").pop() ?? "jpg";
    const blob = await put(
      `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
      coverFile,
      {
        access: "public",
        contentType: coverFile.type || "image/jpeg",
      },
    );
    coverImageUrl = blob.url;
  }

  // ── Validate area exists ──────────────────────────────────────────────────
  const area = await prisma.knowledgeArea.findUnique({ where: { id: areaId } });
  if (!area) return { error: "Área de conocimiento no encontrada." };

  const keywords = keywordsRaw
    ? keywordsRaw
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  // ── GitHub: create repo ───────────────────────────────────────────────────
  const repoName = buildRepoName(type, title, year);
  let fullRepo: string;
  try {
    fullRepo = await createProjectRepo(
      repoName,
      `${title} — ${area.name} (${year})`,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Handle duplicate repo names gracefully
    if (msg.includes("already exists") || msg.includes("name already exists")) {
      const ts = Date.now().toString(36);
      fullRepo = await createProjectRepo(
        `${repoName}-${ts}`,
        `${title} — ${area.name} (${year})`,
      );
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
    authors: [
      session.user.name ?? session.user.email ?? "Autor desconocido",
      ...coauthors.map((c) => c.name),
    ],
    license,
    keywords,
  });
  gitFiles.push({ path: "README.md", content: readmeBuffer });

  // Actual uploaded files — placed in /files/ subfolder, preserving any
  // directory structure selected via the folder picker.
  const fileRecords: {
    name: string;
    path: string;
    mimeType: string;
    size: number;
  }[] = [];
  for (let i = 0; i < rawFiles.length; i++) {
    const f = rawFiles[i];
    if (f.size === 0) continue;
    const originalName = rawPaths[i] || f.name;
    const relativePath = sanitizeRelativePath(originalName);
    const repoPath = `files/${relativePath}`;
    gitFiles.push({
      path: repoPath,
      // Se lee al subirlo: evita tener todos los archivos en memoria a la vez.
      content: async () => Buffer.from(await f.arrayBuffer()),
    });
    fileRecords.push({
      name: originalName,
      path: repoPath,
      mimeType: f.type || "application/octet-stream",
      size: f.size,
    });
  }

  // ── GitHub: commit files ──────────────────────────────────────────────────
  let commitSha: string;
  try {
    commitSha = await commitFilesToRepo(
      fullRepo,
      gitFiles,
      `feat: subida inicial — ${title} (v1)`,
    );
  } catch (e: unknown) {
    return {
      error: `Error subiendo archivos a GitHub: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // ── Prisma: save project (sequential inserts — HTTP mode has no transactions) ──
  // El proyecto nace en "Requiere revisión" y el repo queda privado hasta que
  // un administrador lo apruebe manualmente.
  const project = await prisma.project.create({
    data: {
      title,
      abstract,
      type: type as "THESIS" | "RESEARCH" | "CLASSROOM",
      status: "NEEDS_REVISION",
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

  for (const coauthor of coauthors) {
    await prisma.projectAuthor.create({
      data: { projectId: project.id, userId: coauthor.id },
    });
  }

  // Notifica a cada coautor que fue añadido al proyecto.
  for (const coauthor of coauthors) {
    await prisma.notification.create({
      data: {
        userId: coauthor.id,
        type: "COAUTHOR_ADDED",
        reference: { projectId: project.id, title },
      },
    });
    await triggerUnreadNotificationCount(coauthor.id);
  }

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

  // Avisa a los administradores para que revisen el nuevo proyecto.
  await notifyAdmins("PROJECT_NEEDS_REVISION", {
    projectId: project.id,
    title,
    note: "Nuevo proyecto pendiente de aprobación.",
  });

  revalidatePath("/projects");
  revalidatePath("/admin/review");
  redirect(`/projects/${project.id}?submitted=1`);
}

// ── Search co-authors (admins or UPC students only) ───────────────────────
export async function searchCoAuthors(query: string): Promise<CoAuthor[]> {
  const session = await auth();
  if (!session?.user || !canUploadProjects(session.user.role)) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      role: { in: [Role.ADMIN, Role.UPC_STUDENT] },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, role: true },
    take: 10,
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
    role: u.role,
  }));
}

// ── Report a project ───────────────────────────────────────────────────────
export async function reportProject(
  projectId: string,
  category: "INAPPROPRIATE" | "PLAGIARISM" | "FALSE_INFO" | "OTHER",
  description: string,
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

  // Avisa a los administradores del nuevo reporte.
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { title: true },
  });
  await notifyAdmins("NEW_REPORT", {
    projectId,
    title: project?.title ?? "un proyecto",
    note: category,
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
  if (project.githubRepo)
    await makeRepoPrivate(project.githubRepo).catch(() => {});

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "REJECTED", rejectionNote: note },
  });

  // Mark related reports as actioned (updateMany also needs raw SQL or loop)
  const pendingReports = await prisma.report.findMany({
    where: { projectId, status: "PENDING" },
    select: { id: true, reporterId: true },
  });
  for (const r of pendingReports) {
    await prisma.report.update({
      where: { id: r.id },
      data: { status: "ACTIONED" },
    });

    // Notifica al reportante que su reporte fue atendido.
    await prisma.notification.create({
      data: {
        userId: r.reporterId,
        type: "REPORT_ACTIONED",
        reference: { projectId, title: project.title, note },
      },
    });
    await triggerUnreadNotificationCount(r.reporterId);
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
  revalidatePath("/admin/review");
  return { ok: true };
}

// ── Reinstate a rejected project ──────────────────────────────────────────
export async function reinstateProject(projectId: string) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) return { error: "No autorizado." };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Proyecto no encontrado." };
  if (project.status !== "REJECTED")
    return { error: "Solo se pueden reintegrar proyectos rechazados." };

  if (project.githubRepo)
    await makeRepoPublic(project.githubRepo).catch(() => {});

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "APPROVED", rejectionNote: null },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/review");
  return { ok: true };
}

// ── Approve a project (admin) ─────────────────────────────────────────────
export async function approveProject(projectId: string) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) return { error: "No autorizado." };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      githubRepo: true,
      _count: { select: { versions: true } },
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        select: { number: true },
      },
    },
  });
  if (!project) return { error: "Proyecto no encontrado." };

  // Publica el repositorio para que el proyecto quede disponible públicamente.
  if (project.githubRepo)
    await makeRepoPublic(project.githubRepo).catch(() => {});

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "APPROVED", rejectionNote: null },
  });

  // Notificar a los autores.
  const authors = await prisma.projectAuthor.findMany({ where: { projectId } });
  for (const a of authors) {
    await prisma.notification.create({
      data: {
        userId: a.userId,
        type: "PROJECT_APPROVED" as const,
        reference: { projectId, title: project.title },
      },
    });
    await triggerUnreadNotificationCount(a.userId);
  }

  // Si es una actualización (más de una versión), avisa a los seguidores recién
  // ahora que el proyecto vuelve a estar público con la nueva versión.
  if (project._count.versions > 1) {
    const latestVersion = project.versions[0]?.number;
    const followers = await prisma.projectFollow.findMany({
      where: { projectId },
      select: { userId: true },
    });
    for (const follower of followers) {
      await prisma.notification.create({
        data: {
          userId: follower.userId,
          type: "PROJECT_UPDATE",
          reference: {
            projectId,
            title: project.title,
            note: latestVersion
              ? `Nueva versión (v${latestVersion}).`
              : "Nueva actualización.",
          },
        },
      });
      await triggerUnreadNotificationCount(follower.userId);
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/review");
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
  revalidatePath("/admin/review");
  return { ok: true };
}

// ── Upload a new version of an existing project ───────────────────────────
export async function uploadProjectVersion(
  projectId: string,
  formData: FormData,
) {
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
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        select: { number: true },
      },
    },
  });

  if (!project) return { error: "Proyecto no encontrado." };

  // Solo el autor puede publicar versiones (no los admins).
  const isAuthor = project.authors.some((a) => a.userId === session.user.id);
  if (!isAuthor) return { error: "Solo los autores pueden subir versiones." };

  const changelog = (formData.get("changelog") as string | null)?.trim() ?? "";
  const rawFiles = formData.getAll("files") as File[];
  const rawPaths = formData.getAll("paths") as string[];
  const validFiles = rawFiles
    .map((file, i) => ({ file, path: rawPaths[i] || file.name }))
    .filter((entry) => entry.file.size > 0);

  if (validFiles.length === 0)
    return { error: "Debes subir al menos un archivo." };

  const oversized = validFiles.find((entry) => entry.file.size > MAX_FILE_SIZE);
  if (oversized) {
    return {
      error: `El archivo "${oversized.path}" supera el límite de ${MAX_FILE_MB} MB.`,
    };
  }

  const totalSize = validFiles.reduce((sum, entry) => sum + entry.file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      error: `El tamaño total de los archivos supera ${MAX_TOTAL_MB} MB.`,
    };
  }

  const nextNumber = (project.versions[0]?.number ?? 0) + 1;

  // Commit to GitHub — preserva la estructura de carpetas si se subió un directorio.
  let commitSha: string | undefined;
  if (project.githubRepo) {
    try {
      const fileBuffers: GitHubFile[] = validFiles.map((entry) => ({
        path: sanitizeRelativePath(entry.path),
        content: async () => Buffer.from(await entry.file.arrayBuffer()),
      }));
      commitSha = await commitFilesToRepo(
        project.githubRepo,
        fileBuffers,
        `v${nextNumber}: ${changelog || "Nueva versión"}`,
      );
    } catch {
      // non-fatal — still record the version
    }
  }

  // Upload files to Vercel Blob
  for (const entry of validFiles) {
    const blobKey = sanitizeRelativePath(entry.path);
    const blob = await put(`projects/${projectId}/${blobKey}`, entry.file, {
      access: "public",
    });
    await prisma.projectFile.create({
      data: {
        projectId,
        name: entry.path,
        blobUrl: blob.url,
        mimeType: entry.file.type || "application/octet-stream",
        size: entry.file.size,
      },
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

  // Las actualizaciones también requieren revisión: el proyecto vuelve a
  // "Requiere revisión" y el repo queda privado hasta la aprobación manual.
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "NEEDS_REVISION" },
  });

  if (project.githubRepo) {
    const { makeRepoPrivate } = await import("@/lib/github");
    await makeRepoPrivate(project.githubRepo).catch(() => {});
  }

  // Avisa a los administradores para que revisen la nueva versión.
  await notifyAdmins("PROJECT_NEEDS_REVISION", {
    projectId,
    title: project.title,
    note: `Nueva versión (v${nextNumber}) pendiente de aprobación.`,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/review");
  return { ok: true, version };
}

// ── Increment view counter ─────────────────────────────────────────────────
export async function incrementProjectView(projectId: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { views: { increment: 1 } },
  });
}
