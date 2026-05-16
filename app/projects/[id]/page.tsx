import { Fragment } from "react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/constants";
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
  GitBranch,
} from "lucide-react";
import { incrementProjectView } from "@/app/actions/projects";
import { repoUrl } from "@/lib/github";
import { CommentsSection, type CommentWithReplies } from "@/components/projects/comments-section";
import { ProjectReactions } from "@/components/projects/project-reactions";
import { FollowButton } from "@/components/follows/follow-button";
import { BookmarkButton } from "@/components/projects/bookmark-button";
import { UploadVersionButton } from "@/components/projects/upload-version-button";
import { ReportDialog } from "@/components/projects/report-dialog";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      title: true,
      abstract: true,
      coverImage: true,
      year: true,
      type: true,
      authors: { take: 3, select: { user: { select: { name: true } } } },
    },
  });

  if (!project) return { title: "Proyecto no encontrado — UniHaven" };

  const typeLabel = { THESIS: "Tesis", RESEARCH: "Investigación", CLASSROOM: "Proyecto de aula" }[project.type] ?? project.type;
  const authorsStr = project.authors.map((a) => a.user.name).filter(Boolean).join(", ");
  const description = project.abstract
    ? project.abstract.slice(0, 160)
    : `${typeLabel} · ${project.year}${authorsStr ? ` · ${authorsStr}` : ""}`;

  return {
    title: `${project.title} — UniHaven`,
    description,
    openGraph: {
      title: project.title,
      description,
      type: "article",
      ...(project.coverImage ? { images: [{ url: project.coverImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: project.coverImage ? "summary_large_image" : "summary",
      title: project.title,
      description,
      ...(project.coverImage ? { images: [project.coverImage] } : {}),
    },
  };
}

const TYPE_LABELS: Record<string, string> = {
  THESIS: "Tesis de Grado",
  RESEARCH: "Investigación",
  CLASSROOM: "Proyecto de Aula",
};

const REACTION_TYPES = ["LIKE", "LOVE", "CELEBRATE", "THINKING"] as const;
const COMMENTS_PAGE_SIZE = 10;

const commentSelect = {
  id: true,
  content: true,
  hidden: true,
  createdAt: true,
  userId: true,
  parentId: true,
  user: {
    select: {
      name: true,
      image: true,
      email: true,
    },
  },
  replies: {
    where: { hidden: false },
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      content: true,
      hidden: true,
      createdAt: true,
      userId: true,
      parentId: true,
      user: {
        select: {
          name: true,
          image: true,
          email: true,
        },
      },
    },
  },
};

function FileIcon() {
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
      authors: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
      files: { orderBy: { createdAt: "asc" } },
      versions: { orderBy: { number: "desc" } },
      _count: { select: { comments: true, reactions: true } },
    },
  });

  if (!project) notFound();

  // Access control: non-approved projects are only visible to authors and admins
  const isAuthor = project.authors.some((a) => a.userId === session?.user?.id);
  const isAdmin = session?.user?.role === Role.ADMIN;
  if (project.status !== "APPROVED" && !isAuthor && !isAdmin) {
    notFound();
  }

  // Increment view count (fire and forget)
  incrementProjectView(id).catch(() => {});

  const [
    reactionGroups,
    userReactions,
    initialComments,
    totalComments,
    bookmark,
    projectFollowerCount,
    projectFollow,
  ] = await Promise.all([
    prisma.reaction.groupBy({
      by: ["type"],
      where: { projectId: id },
      _count: { _all: true },
    }),
    session?.user?.id
      ? prisma.reaction.findMany({
          where: { projectId: id, userId: session.user.id },
          select: { type: true },
        })
      : Promise.resolve([]),
    prisma.comment.findMany({
      where: {
        projectId: id,
        parentId: null,
        hidden: false,
      },
      orderBy: { createdAt: "desc" },
      take: COMMENTS_PAGE_SIZE,
      select: commentSelect,
    }),
    prisma.comment.count({
      where: {
        projectId: id,
        parentId: null,
        hidden: false,
      },
    }),
    session?.user?.id
      ? prisma.bookmark.findUnique({
          where: {
            userId_projectId: {
              userId: session.user.id,
              projectId: id,
            },
          },
        })
      : Promise.resolve(null),
    prisma.projectFollow.count({
      where: { projectId: id },
    }),
    session?.user?.id
      ? prisma.projectFollow.findUnique({
          where: {
            userId_projectId: {
              userId: session.user.id,
              projectId: id,
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const userReactionSet = new Set(userReactions.map((reaction) => reaction.type));
  const reactionCountByType = Object.fromEntries(
    reactionGroups.map((reaction) => [reaction.type, reaction._count._all])
  ) as Partial<Record<(typeof REACTION_TYPES)[number], number>>;

  const projectReactions = REACTION_TYPES.map((type) => ({
    type,
    count: reactionCountByType[type] ?? 0,
    active: userReactionSet.has(type),
  }));
  const isBookmarked = Boolean(bookmark);
  const isFollowingProject = Boolean(projectFollow);

  const submitted = sp.submitted === "1";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Published banner */}
      {submitted && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-primary">
              ¡Proyecto publicado con éxito!
            </p>
            <p className="text-sm text-muted-foreground">
              Tu trabajo ya está disponible públicamente en UniHaven y en
              GitHub.
            </p>
          </div>
        </div>
      )}

      {/* Removed banner */}
      {project.status === "REJECTED" && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Este proyecto fue removido</p>
          {project.rejectionNote && (
            <p className="mt-1">{project.rejectionNote}</p>
          )}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
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
                <span>
                  {project.authors.map((author, index) => (
                    <Fragment key={author.userId}>
                      {index > 0 ? ", " : null}
                      <Link
                        href={`/profile/${author.user.id}`}
                        className="transition-colors hover:text-foreground"
                      >
                        {author.user.name ?? author.user.email}
                      </Link>
                    </Fragment>
                  ))}
                </span>
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

          <ProjectReactions
            projectId={project.id}
            reactions={projectReactions}
            isLoggedIn={Boolean(session?.user)}
          />

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
                    <FileIcon />
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Historial de versiones</h2>
                {(isAuthor || isAdmin) && project.status === "APPROVED" && (
                  <UploadVersionButton
                    projectId={project.id}
                    currentVersion={project.versions[0]?.number ?? 0}
                  />
                )}
              </div>
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
                      <p className="text-muted-foreground">
                        {v.changelog ?? "Versión inicial."}
                      </p>
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

          <Separator />

          <CommentsSection
            projectId={project.id}
            initialComments={initialComments as CommentWithReplies[]}
            currentUserId={session?.user?.id}
            isAdmin={isAdmin}
            totalComments={totalComments}
          />
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="space-y-6 pt-2">
          <div className="space-y-3">
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

            {session?.user && (
              <BookmarkButton
                projectId={project.id}
                initialBookmarked={isBookmarked}
              />
            )}

            {session?.user && !isAuthor && (
              <FollowButton
                type="project"
                targetId={project.id}
                initialFollowing={isFollowingProject}
                followerCount={projectFollowerCount}
              />
            )}

            {session?.user && !isAuthor && (
              <ReportDialog projectId={project.id} />
            )}
          </div>

          {/* Metadata card */}
          <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
            <h3 className="font-semibold">Detalles</h3>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex justify-between">
                <span>Tipo</span>
                <span className="font-medium text-foreground">
                  {TYPE_LABELS[project.type]}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Área</span>
                <span className="font-medium text-foreground text-right max-w-[140px] leading-tight">
                  {project.area.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Año</span>
                <span className="font-medium text-foreground">
                  {project.year}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Licencia</span>
                <span className="font-medium text-foreground">
                  {project.license}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Archivos</span>
                <span className="font-medium text-foreground">
                  {project.files.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Comentarios</span>
                <span className="font-medium text-foreground">
                  {totalComments}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Seguidores</span>
                <span className="font-medium text-foreground">
                  {projectFollowerCount}
                </span>
              </div>
            </div>
          </div>

          {/* Authors */}
          <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
            <h3 className="font-semibold">Autores</h3>
            <div className="space-y-2">
              {project.authors.map((a) => (
                <Link
                  key={a.userId}
                  href={`/profile/${a.user.id}`}
                  className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-accent"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(a.user.name ?? a.user.email ?? "?")[0].toUpperCase()}
                  </div>
                  <span className="text-muted-foreground transition-colors hover:text-foreground">
                    {a.user.name ?? a.user.email}
                  </span>
                </Link>
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

        </aside>
      </div>
    </main>
  );
}
