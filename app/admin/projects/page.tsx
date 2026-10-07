import Link from "next/link";
import { Eye, Search, X } from "lucide-react";
import prisma from "@/lib/prisma";
import { ProjectStatus, ProjectType } from "@/lib/constants";
import { RemoveProjectButton } from "@/components/admin/remove-project-button";
import { DeleteProjectButton } from "@/components/admin/delete-project-button";
import { ReinstateProjectButton } from "@/components/admin/reinstate-project-button";
import { ApproveProjectButton } from "@/components/admin/approve-project-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_LABELS = {
  [ProjectType.THESIS]: "Tesis",
  [ProjectType.RESEARCH]: "Investigación",
  [ProjectType.CLASSROOM]: "Proyecto de aula",
} as const;

const STATUS_META = {
  [ProjectStatus.DRAFT]: {
    label: "Borrador",
    className:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  [ProjectStatus.IN_REVIEW]: {
    label: "En revisión",
    className:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  [ProjectStatus.NEEDS_REVISION]: {
    label: "Requiere revisión",
    className:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  [ProjectStatus.APPROVED]: {
    label: "Aprobado",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  [ProjectStatus.REJECTED]: {
    label: "Rechazado",
    className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  },
} as const;

const STATUS_VALUES = [
  ProjectStatus.DRAFT,
  ProjectStatus.IN_REVIEW,
  ProjectStatus.NEEDS_REVISION,
  ProjectStatus.APPROVED,
  ProjectStatus.REJECTED,
] as string[];

const TYPE_VALUES = [
  ProjectType.THESIS,
  ProjectType.RESEARCH,
  ProjectType.CLASSROOM,
] as string[];

type SearchParams = {
  q?: string;
  status?: string;
  type?: string;
};

function isStatus(value: string | undefined): value is ProjectStatus {
  return Boolean(value) && STATUS_VALUES.includes(value as string);
}

function isType(value: string | undefined): value is ProjectType {
  return Boolean(value) && TYPE_VALUES.includes(value as string);
}

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = isStatus(sp.status) ? sp.status : "";
  const type = isType(sp.type) ? sp.type : "";

  const projects = await prisma.project.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              {
                authors: {
                  some: {
                    user: {
                      name: { contains: q, mode: "insensitive" as const },
                    },
                  },
                },
              },
              {
                authors: {
                  some: {
                    user: {
                      email: { contains: q, mode: "insensitive" as const },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      year: true,
      authors: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const hasFilters = Boolean(q || status || type);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Todos los proyectos
        </h1>
        <p className="text-sm text-muted-foreground">
          Revisa, aprueba o retira proyectos del repositorio. Los proyectos
          nuevos y sus actualizaciones requieren aprobación manual.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>
            Listado completo{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({projects.length}
              {hasFilters ? " encontrados" : ""})
            </span>
          </CardTitle>

          {/* Filtros — se envían por la URL, sin JS de cliente */}
          <form
            method="GET"
            className="flex flex-col gap-3 lg:flex-row lg:items-center"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Buscar por título o autor…"
                className="pl-9"
              />
            </div>
            <Select name="status" defaultValue={status || "all"}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_META[value as ProjectStatus].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="type" defaultValue={type || "all"}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {TYPE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TYPE_LABELS[value as ProjectType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full lg:w-auto">
              Buscar
            </Button>
            {hasFilters && (
              <Button asChild variant="ghost" className="w-full lg:w-auto">
                <Link href="/admin/projects">
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Limpiar
                </Link>
              </Button>
            )}
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Autor(es)</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No se encontraron proyectos con esos criterios.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => {
                  const authors = project.authors
                    .map(
                      (author) =>
                        author.user.name ||
                        author.user.email ||
                        "Autor sin nombre",
                    )
                    .join(", ");

                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.title}
                      </TableCell>
                      <TableCell>{TYPE_LABELS[project.type]}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_META[project.status].className}
                        >
                          {STATUS_META[project.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{project.year}</TableCell>
                      <TableCell>{authors || "Sin autores"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/projects/${project.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              Ver
                            </Link>
                          </Button>
                          {(project.status === ProjectStatus.DRAFT ||
                            project.status === ProjectStatus.IN_REVIEW ||
                            project.status ===
                              ProjectStatus.NEEDS_REVISION) && (
                            <ApproveProjectButton projectId={project.id} />
                          )}
                          {project.status === ProjectStatus.APPROVED && (
                            <RemoveProjectButton
                              projectId={project.id}
                              note="Proyecto retirado por administración desde el panel de proyectos."
                              label="Retirar"
                            />
                          )}
                          {project.status === ProjectStatus.REJECTED && (
                            <ReinstateProjectButton projectId={project.id} />
                          )}
                          <DeleteProjectButton
                            projectId={project.id}
                            projectTitle={project.title}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
