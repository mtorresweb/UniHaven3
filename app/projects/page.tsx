import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnnouncementBannerClient } from "@/components/announcements/announcement-banner-client";
import { Eye, Download, BookOpen, Search, GitBranch } from "lucide-react";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Proyectos — UniHaven",
  description:
    "Explora proyectos de grado, investigaciones y proyectos de aula de la Universidad Popular del Cesar.",
};

const TYPE_LABELS: Record<string, string> = {
  THESIS: "Tesis de Grado",
  RESEARCH: "Investigación",
  CLASSROOM: "Proyecto de Aula",
};

const TYPE_COLORS: Record<string, string> = {
  THESIS: "bg-primary/10 text-primary border-primary/20",
  RESEARCH: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  CLASSROOM: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
};

const PAGE_SIZE = 12;

interface SearchParams {
  q?: string;
  type?: string;
  area?: string;
  year?: string;
  page?: string;
}

async function ProjectsFeed({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    status: "APPROVED" as const,
    ...(searchParams.type && searchParams.type !== "all"
      ? { type: searchParams.type as "THESIS" | "RESEARCH" | "CLASSROOM" }
      : {}),
    ...(searchParams.area && searchParams.area !== "all"
      ? { areaId: searchParams.area }
      : {}),
    ...(searchParams.year && searchParams.year !== "all"
      ? { year: parseInt(searchParams.year, 10) }
      : {}),
    ...(searchParams.q
      ? {
          OR: [
            { title: { contains: searchParams.q, mode: "insensitive" as const } },
            { abstract: { contains: searchParams.q, mode: "insensitive" as const } },
            { keywords: { has: searchParams.q.toLowerCase() } },
          ],
        }
      : {}),
  };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        title: true,
        abstract: true,
        type: true,
        year: true,
        views: true,
        downloads: true,
        keywords: true,
        githubRepo: true,
        coverImage: true,
        area: { select: { name: true } },
        authors: {
          select: { user: { select: { name: true } } },
        },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.project.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-muted-foreground">
            No se encontraron proyectos
          </p>
          <p className="text-sm text-muted-foreground/70">
            Intenta con otros filtros o términos de búsqueda
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {total} proyecto{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Card
            key={p.id}
            className="group flex flex-col transition-shadow hover:shadow-md"
          >
            {/* Cover or gradient placeholder */}
            <div className="relative h-36 w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-primary/20 to-primary/5">
              {p.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.coverImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute left-3 top-3">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold shadow-sm backdrop-blur-sm ${
                    p.coverImage
                      ? "border-white/30 bg-black/50 text-white"
                      : TYPE_COLORS[p.type] ?? ""
                  }`}
                >
                  {TYPE_LABELS[p.type]}
                </span>
              </div>
            </div>

            <CardHeader className="pb-2 pt-4">
              <CardTitle className="line-clamp-2 text-base leading-snug group-hover:text-primary transition-colors">
                <Link href={`/projects/${p.id}`}>{p.title}</Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {p.authors.map((a) => a.user.name).filter(Boolean).join(", ")} · {p.year}
              </p>
            </CardHeader>

            <CardContent className="flex-1 pb-3">
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {p.abstract}
              </p>
              {p.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.keywords.slice(0, 3).map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {p.views}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" /> {p.downloads}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {p.githubRepo && (
                  <Link
                    href={`https://github.com/${p.githubRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                  </Link>
                )}
                <span className="text-muted-foreground/60">{p.area.name.split(" ").slice(0, 2).join(" ")}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <PaginationLink
              href={buildHref(searchParams, page - 1)}
              label="← Anterior"
            />
          )}
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <PaginationLink
              href={buildHref(searchParams, page + 1)}
              label="Siguiente →"
            />
          )}
        </div>
      )}
    </div>
  );
}

function PaginationLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <Button variant="outline" size="sm">
        {label}
      </Button>
    </Link>
  );
}

function buildHref(sp: SearchParams, page: number) {
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.type) params.set("type", sp.type);
  if (sp.area) params.set("area", sp.area);
  if (sp.year) params.set("year", sp.year);
  params.set("page", String(page));
  return `/projects?${params.toString()}`;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const [areas, latestPinnedAnnouncement] = await Promise.all([
    prisma.knowledgeArea.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.announcement.findFirst({
      where: { pinned: true },
      select: { id: true, title: true, body: true, coverImage: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2009 }, (_, i) => currentYear - i);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Proyectos académicos</h1>
        <p className="mt-1 text-muted-foreground">
          Repositorio de tesis, investigaciones y proyectos de la Universidad Popular del Cesar
        </p>
      </div>

      {latestPinnedAnnouncement ? (
        <AnnouncementBannerClient
          key={latestPinnedAnnouncement.id}
          announcementId={latestPinnedAnnouncement.id}
          title={latestPinnedAnnouncement.title}
          body={latestPinnedAnnouncement.body}
          coverImage={latestPinnedAnnouncement.coverImage}
        />
      ) : null}

      {/* Filters */}
      <form method="GET" className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={sp.q}
            placeholder="Buscar por título, resumen o palabras clave…"
            className="pl-9"
          />
        </div>
        <Select name="type" defaultValue={sp.type ?? "all"}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="THESIS">Tesis de Grado</SelectItem>
            <SelectItem value="RESEARCH">Investigación</SelectItem>
            <SelectItem value="CLASSROOM">Proyecto de Aula</SelectItem>
          </SelectContent>
        </Select>
        <Select name="area" defaultValue={sp.area ?? "all"}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="year" defaultValue={sp.year ?? "all"}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="w-full sm:w-auto">
          Buscar
        </Button>
      </form>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <ProjectsFeed searchParams={sp} />
      </Suspense>
    </main>
  );
}
