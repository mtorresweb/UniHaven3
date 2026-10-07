import Link from "next/link";
import { Eye, Inbox } from "lucide-react";
import prisma from "@/lib/prisma";
import { ProjectStatus, ProjectType } from "@/lib/constants";
import { ApproveProjectButton } from "@/components/admin/approve-project-button";
import { RejectProjectButton } from "@/components/admin/reject-project-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const PENDING_STATUSES = [
  ProjectStatus.DRAFT,
  ProjectStatus.IN_REVIEW,
  ProjectStatus.NEEDS_REVISION,
] as const;

export default async function AdminReviewPage() {
  const projects = await prisma.project.findMany({
    where: { status: { in: [...PENDING_STATUSES] } },
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
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Pendientes de aprobación
        </h1>
        <p className="text-sm text-muted-foreground">
          Proyectos nuevos y actualizaciones que esperan la aprobación manual de
          un administrador antes de publicarse.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>
            Cola de revisión{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({projects.length})
            </span>
          </CardTitle>
          <Inbox className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay proyectos pendientes de revisión.
              </p>
            </div>
          ) : (
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
                {projects.map((project) => {
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
                          <ApproveProjectButton projectId={project.id} />
                          <RejectProjectButton
                            projectId={project.id}
                            note="Proyecto rechazado durante la revisión."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
