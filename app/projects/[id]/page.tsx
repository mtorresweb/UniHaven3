import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  FileText,
  Calendar,
  Tag,
  User,
  BookOpen,
  ExternalLink,
  CheckCircle,
  Flag,
  GitBranch,
} from "lucide-react";
import { incrementProjectView } from "@/app/actions/projects";
import { repoUrl } from "@/lib/github";
import { ReportDialog } from "@/components/projects/report-dialog";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  THESIS: "Tesis de Grado",
  RESEARCH: "Investigación",
  CLASSROOM: "Proyecto de Aula",
};

function FileIcon({ mimeType }: { mimeType: string }) {
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      area: true,
      authors: { include: { user: { select: { id: true, name: true, image: true, email: true } } } },
      files: { orderBy: { createdAt: "asc" } },
      versions: { orderBy: { number: "desc" } },
      _count: { select: { comments: true, reactions: true } },
    },
  });

  if (!project) notFound();

  // Access control: non-approved projects are only visible to authors and admins
  const isAuthor = project.authors.some((a) => a.userId === session?.user?.id);
  const isAdmin = session?.user?.role === "ADMIN";
  if (project.status !== "APPROVED" && !isAuthor && !isAdmin) {
    notFound();
  }

  // Increment view count (fire and forget)
  incrementProjectView(id).catch(() => {});

  const submitted = sp.submitted === "1";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Published banner */}
      {submitted && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-primary">¡Proyecto publicado con éxito!</p>
            <p className="text-sm text-muted-foreground">
              Tu trabajo ya está disponible públicamente en UniHaven y en GitHub.
            </p>
          </div>
        </div>
      )}

      {/* Removed banner */}
      {project.status === "REJECTED" && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Este proyecto fue removido</p>
          {project.rejectionNote && <p className="mt-1">{project.rejectionNote}</p>}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="space-y-6 min-w-0">
          {/* Cover image / gradient hero */}
          <div className="relative h-56 w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            {project.coverImage && (
              <Image
                src={project.coverImage}
                alt={`Portada de ${project.title}`}
                fill
                className="object-cover"
                priority
              />
            )}
          </div>

          {/* Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{TYPE_LABELS[project.type]}</Badge>
              <Badge variant="outline">{project.area.name}</Badge>
            </div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight break-words">
              {project.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {project.authors.map((a) => a.user.name ?? a.user.email).join(", ")}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {project.year}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {project.views} vistas
              </span>
            </div>
          </div>

          <Separator />

          {/* Abstract */}
          <section>
            <h2 className="mb-2 font-semibold">Resumen</h2>
            <p className="leading-relaxed text-muted-foreground whitespace-pre-line break-words">
              {project.abstract}
            </p>
          </section>

          {/* Keywords */}
          {project.keywords.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 font-semibold">
                <Tag className="h-4 w-4" /> Palabras clave
              </h2>
              <div className="flex flex-wrap gap-2">
                {project.keywords.map((kw) => (
                  <Badge key={kw} variant="secondary">
                    {kw}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Files */}
          {project.files.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Archivos</h2>
              <div className="space-y-2">
                {project.files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3"
                  >
                    <FileIcon mimeType={f.mimeType} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(f.size)} · {f.mimeType}
                      </p>
                    </div>
                    {project.githubRepo && f.githubPath && (
                      <Link
                        href={`https://github.com/${project.githubRepo}/blob/main/${f.githubPath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm" className="h-8">
                          <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                          Ver
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Version history */}
          {project.versions.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Historial de versiones</h2>
              <div className="space-y-2">
                {project.versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm"
                  >
                    <Badge variant="outline" className="mt-0.5 shrink-0">
                      v{v.number}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground">{v.changelog ?? "Versión inicial."}</p>
                      {v.commitSHA && (
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground/60">
                          {v.commitSHA.slice(0, 7)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString("es-CO")}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="space-y-4">
          {/* GitHub link */}
          {project.githubRepo && project.status === "APPROVED" && (
            <Link
              href={repoUrl(project.githubRepo)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full gap-2">
                <GitBranch className="h-4 w-4" />
                Ver en GitHub
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </Link>
          )}

          {/* Metadata card */}
          <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
            <h3 className="font-semibold">Detalles</h3>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex justify-between">
                <span>Tipo</span>
                <span className="font-medium text-foreground">{TYPE_LABELS[project.type]}</span>
              </div>
              <div className="flex justify-between">
                <span>Área</span>
                <span className="font-medium text-foreground text-right max-w-[140px] leading-tight">{project.area.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Año</span>
                <span className="font-medium text-foreground">{project.year}</span>
              </div>
              <div className="flex justify-between">
                <span>Licencia</span>
                <span className="font-medium text-foreground">{project.license}</span>
              </div>
              <div className="flex justify-between">
                <span>Archivos</span>
                <span className="font-medium text-foreground">{project.files.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Comentarios</span>
                <span className="font-medium text-foreground">{project._count.comments}</span>
              </div>
            </div>
          </div>

          {/* Authors */}
          <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
            <h3 className="font-semibold">Autores</h3>
            <div className="space-y-2">
              {project.authors.map((a) => (
                <div key={a.userId} className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(a.user.name ?? a.user.email ?? "?")[0].toUpperCase()}
                  </div>
                  <span className="text-muted-foreground">
                    {a.user.name ?? a.user.email}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Back to feed */}
          <Link href="/projects">
            <Button variant="outline" className="w-full">
              <BookOpen className="mr-2 h-4 w-4" />
              Ver todos los proyectos
            </Button>
          </Link>

          {/* Report */}
          {session?.user && !isAuthor && (
            <ReportDialog projectId={project.id} />
          )}
        </aside>
      </div>
    </main>
  );
}
