import type { Metadata } from "next";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pin } from "lucide-react";
import { getAnnouncements } from "@/app/actions/announcements";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Anuncios — UniHaven",
  description:
    "Consulta anuncios, avisos y novedades importantes de la comunidad académica de UniHaven.",
};

function formatDate(date: Date) {
  return format(date, "d 'de' MMMM yyyy", { locale: es });
}

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Anuncios</h1>
        <p className="text-muted-foreground">
          Mantente al día con novedades, avisos y cambios importantes en UniHaven.
        </p>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay anuncios publicados en este momento.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => (
            <Card key={announcement.id} id={announcement.id} className="overflow-hidden">
              {announcement.coverImage ? (
                <div className="relative h-52 w-full bg-muted">
                  <Image
                    src={announcement.coverImage}
                    alt={announcement.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : null}
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {announcement.pinned ? (
                    <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                      <Pin className="h-3 w-3" />
                      Fijado
                    </Badge>
                  ) : null}
                  <span>{formatDate(announcement.createdAt)}</span>
                </div>
                <CardTitle className="text-xl">{announcement.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground dark:prose-invert">
                  {announcement.body}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
