import { fetchRepoFile } from "@/lib/github";
import { canViewProject } from "@/lib/project-access";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Tipos que el navegador puede mostrar por sí mismo (PDF e imágenes).
// Todo lo demás se sirve como descarga.
const INLINE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

function contentDisposition(filename: string, inline: boolean): string {
  const asciiName = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params;

  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    include: {
      project: {
        select: {
          id: true,
          status: true,
          githubRepo: true,
          authors: { select: { userId: true } },
        },
      },
    },
  });

  if (!file || file.project.id !== id) {
    return new Response("Archivo no encontrado", { status: 404 });
  }

  // Los proyectos no aprobados solo los ven sus autores y los admins.
  if (!(await canViewProject(file.project))) {
    return new Response("Archivo no encontrado", { status: 404 });
  }

  const forceDownload =
    new URL(request.url).searchParams.get("download") === "1";

  // Incrementa el contador de descargas solo cuando es una descarga explícita.
  if (forceDownload) {
    await prisma.project
      .update({
        where: { id },
        data: { downloads: { increment: 1 } },
      })
      .catch(() => {});
  }

  // Archivos alojados en Vercel Blob: Vercel ya los sirve directamente.
  if (file.blobUrl) {
    return Response.redirect(file.blobUrl, 302);
  }

  if (!file.project.githubRepo || !file.githubPath) {
    return new Response("Archivo no disponible", { status: 404 });
  }

  const mimeType = file.mimeType || "application/octet-stream";
  const inline = !forceDownload && INLINE_TYPES.has(mimeType);

  const upstream = await fetchRepoFile(
    file.project.githubRepo,
    file.githubPath,
  );

  if (!upstream.ok || !upstream.body) {
    return new Response("No se pudo obtener el archivo desde GitHub", {
      status: 502,
    });
  }

  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Disposition": contentDisposition(file.name, inline),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new Response(upstream.body, { status: 200, headers });
}
