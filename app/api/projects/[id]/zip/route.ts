import { fetchRepoFile, listRepoPaths } from "@/lib/github";
import { canViewProject } from "@/lib/project-access";
import prisma from "@/lib/prisma";
import { createZipStream, type ZipEntry } from "@/lib/zip";

export const dynamic = "force-dynamic";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "proyecto"
  );
}

function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }

  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";

  let counter = 2;
  let candidate = `${base} (${counter})${ext}`;
  while (used.has(candidate)) {
    counter++;
    candidate = `${base} (${counter})${ext}`;
  }

  used.add(candidate);
  return candidate;
}

type FileSource = {
  name: string;
  githubPath: string | null;
  blobUrl: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      authors: { select: { userId: true } },
      files: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project || !(await canViewProject(project))) {
    return new Response("Proyecto no encontrado", { status: 404 });
  }

  const used = new Set<string>();
  const sources: FileSource[] = [];

  for (const file of project.files) {
    const githubPath = project.githubRepo ? file.githubPath : null;
    const blobUrl = file.blobUrl;

    if (!githubPath && !blobUrl) continue;

    sources.push({
      name: uniqueName(file.name, used),
      githubPath,
      blobUrl,
    });
  }

  if (sources.length === 0) {
    return new Response("El proyecto no tiene archivos disponibles", {
      status: 404,
    });
  }

  // Verificar de antemano que los archivos existen en el repo (una sola llamada).
  // Así, si falta alguno, se responde un error claro en vez de empezar a enviar
  // un zip que quedaría incompleto.
  const githubPaths = sources
    .map((source) => source.githubPath)
    .filter((path): path is string => Boolean(path));

  if (githubPaths.length > 0 && project.githubRepo) {
    let available: Set<string> | null;

    try {
      available = await listRepoPaths(project.githubRepo);
    } catch {
      return new Response(
        "No se pudo acceder al repositorio del proyecto en GitHub",
        { status: 502 },
      );
    }

    if (available) {
      const missing = githubPaths.filter((path) => !available.has(path));
      if (missing.length > 0) {
        return new Response(
          `No se pudieron obtener estos archivos desde GitHub: ${missing.join(", ")}`,
          { status: 502 },
        );
      }
    }
  }

  const entries: ZipEntry[] = sources.map((source) => ({
    name: source.name,
    load: async () => {
      const response = source.blobUrl
        ? await fetch(source.blobUrl, { cache: "no-store" })
        : await fetchRepoFile(project.githubRepo!, source.githubPath!);

      if (!response.ok) {
        throw new Error(`No se pudo obtener el archivo "${source.name}"`);
      }

      return new Uint8Array(await response.arrayBuffer());
    },
  }));

  const filename = `${slugify(project.title)}-archivos.zip`;

  // Incrementa el contador de descargas.
  await prisma.project
    .update({
      where: { id },
      data: { downloads: { increment: 1 } },
    })
    .catch(() => {});

  return new Response(createZipStream(entries), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
