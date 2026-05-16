import Link from "next/link";
import { Eye } from "lucide-react";
import prisma from "@/lib/prisma";
import { RemoveProjectButton } from "@/components/admin/remove-project-button";
import { DeleteProjectButton } from "@/components/admin/delete-project-button";
import { ReinstateProjectButton } from "@/components/admin/reinstate-project-button";
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
  THESIS: "Tesis",
  RESEARCH: "Investigación",
  CLASSROOM: "Proyecto de aula",
} as const;

const STATUS_META = {
  DRAFT: {
    label: "Borrador",
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  IN_REVIEW: {
    label: "En revisión",
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  NEEDS_REVISION: {
    label: "Requiere revisión",
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  APPROVED: {
    label: "Aprobado",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Rechazado",
    className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  },
} as const;

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Todos los proyectos</h1>
        <p className="text-sm text-muted-foreground">
          Consulta el estado general del repositorio y retira proyectos aprobados cuando sea necesario.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado completo</CardTitle>
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
              {projects.map((project) => {
                const authors = project.authors
                  .map((author) => author.user.name || author.user.email || "Autor sin nombre")
                  .join(", ");

                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.title}</TableCell>
                    <TableCell>{TYPE_LABELS[project.type]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_META[project.status].className}>
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
                        {project.status === "APPROVED" && (
                          <RemoveProjectButton
                            projectId={project.id}
                            note="Proyecto retirado por administración desde el panel de proyectos."
                            label="Retirar"
                          />
                        )}
                        {project.status === "REJECTED" && (
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
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
