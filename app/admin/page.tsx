import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BookOpen, Flag, Users } from "lucide-react";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportActions } from "@/components/admin/report-actions";

const CATEGORY_LABELS = {
  INAPPROPRIATE: "Contenido inapropiado",
  PLAGIARISM: "Plagio",
  FALSE_INFO: "Información falsa",
  OTHER: "Otro",
} as const;

function formatDate(date: Date) {
  return format(date, "d 'de' MMM yyyy", { locale: es });
}

export default async function AdminReportsPage() {
  const [pendingReportsCount, totalProjects, totalUsers, pendingReports] =
    await Promise.all([
      prisma.report.count({
        where: { status: "PENDING", projectId: { not: null } },
      }),
      prisma.project.count(),
      prisma.user.count(),
      prisma.report.findMany({
        where: { status: "PENDING", projectId: { not: null } },
        select: {
          id: true,
          category: true,
          description: true,
          createdAt: true,
          projectId: true,
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          reporter: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const reports = pendingReports.filter(
    (report): report is typeof report & { project: { id: string; title: string } } =>
      Boolean(report.project)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes pendientes</h1>
        <p className="text-sm text-muted-foreground">
          Revisa reportes, retira proyectos y mantén el repositorio bajo control.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes pendientes</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{pendingReportsCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de proyectos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalProjects}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalUsers}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reportes abiertos</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay reportes pendientes por revisar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Reportado por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.project.title}</TableCell>
                    <TableCell>{CATEGORY_LABELS[report.category]}</TableCell>
                    <TableCell className="max-w-sm text-muted-foreground">
                      {report.description?.trim() || "Sin descripción"}
                    </TableCell>
                    <TableCell>
                      {report.reporter.name || report.reporter.email || "Usuario sin nombre"}
                    </TableCell>
                    <TableCell>{formatDate(report.createdAt)}</TableCell>
                    <TableCell>
                      <ReportActions
                        reportId={report.id}
                        projectId={report.project.id}
                        removeNote={`Proyecto retirado por administración tras un reporte por ${CATEGORY_LABELS[report.category].toLowerCase()}.`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
