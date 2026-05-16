import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pin } from "lucide-react";
import { getAnnouncements } from "@/app/actions/announcements";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { DeleteAnnouncementButton } from "@/components/admin/delete-announcement-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Anuncios — Admin — UniHaven" };

function formatDate(date: Date) {
  return format(date, "d 'de' MMM yyyy", { locale: es });
}

export default async function AdminAnnouncementsPage() {
  const announcements = await getAnnouncements();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anuncios</h1>
          <p className="text-sm text-muted-foreground">
            Crea, edita y elimina comunicados visibles para toda la comunidad.
          </p>
        </div>
        <AnnouncementForm />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los anuncios</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay anuncios publicados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anuncio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="max-w-xl align-top">
                      <div className="space-y-1">
                        <p className="font-medium">{announcement.title}</p>
                        <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                          {announcement.body}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {announcement.pinned ? (
                        <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                          <Pin className="h-3 w-3" />
                          Fijado
                        </Badge>
                      ) : (
                        <Badge variant="outline">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="align-top">{formatDate(announcement.createdAt)}</TableCell>
                    <TableCell className="align-top">{formatDate(announcement.updatedAt)}</TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-2">
                        <AnnouncementForm announcement={announcement} />
                        <DeleteAnnouncementButton
                          announcementId={announcement.id}
                          announcementTitle={announcement.title}
                        />
                      </div>
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
