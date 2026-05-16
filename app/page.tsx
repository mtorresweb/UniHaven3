import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  GitBranch,
  Globe,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Pin,
  Presentation,
  Search,
  Star,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";

const TYPE_META = {
  THESIS: {
    label: "Tesis",
    icon: GraduationCap,
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  RESEARCH: {
    label: "Investigación",
    icon: FlaskConical,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  CLASSROOM: {
    label: "Proyecto de aula",
    icon: Presentation,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
} as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Regístrate",
    description:
      "Crea tu cuenta con tu correo de la UPC (@unicesar.edu.co) o con Google Institucional.",
    icon: UserPlus,
  },
  {
    step: "02",
    title: "Sube tu proyecto",
    description:
      "Completa el formulario con los datos de tu proyecto, sube los archivos y UniHaven crea el repositorio en GitHub automáticamente.",
    icon: Upload,
  },
  {
    step: "03",
    title: "Comparte y descubre",
    description:
      "Tu proyecto queda disponible para toda la comunidad académica. Explora lo que otros han construido.",
    icon: Globe,
  },
] as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getExcerpt(text: string, maxLength = 150) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}…`;
}

async function getData() {
  const [projectCount, userCount, areaCount, recentProjects, announcements, areas] =
    await Promise.all([
      prisma.project.count({ where: { status: "APPROVED" } }),
      prisma.user.count(),
      prisma.knowledgeArea.count(),
      prisma.project.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          type: true,
          year: true,
          coverImage: true,
          area: { select: { name: true } },
          authors: {
            take: 2,
            select: { user: { select: { name: true } } },
          },
          _count: { select: { comments: true } },
        },
      }),
      prisma.announcement.findMany({
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          id: true,
          title: true,
          body: true,
          pinned: true,
          coverImage: true,
          createdAt: true,
        },
      }),
      prisma.knowledgeArea.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { projects: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

  return {
    projectCount,
    userCount,
    areaCount,
    recentProjects,
    announcements,
    areas,
  };
}

export default async function Home() {
  const { projectCount, userCount, areaCount, recentProjects, announcements, areas } =
    await getData();

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="container mx-auto flex max-w-4xl flex-col items-center justify-center gap-8 px-4 py-24 text-center">
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <BookOpen className="h-3.5 w-3.5" />
            Universidad Popular del Cesar
          </Badge>

          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            El conocimiento de la <span className="text-primary">UPC</span>, siempre disponible
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground">
            UniHaven es el repositorio académico oficial donde estudiantes suben sus proyectos
            de grado, investigaciones y trabajos de aula. Todo respaldado en GitHub, disponible
            para toda la comunidad.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href="/projects">
                <Search className="h-4 w-4" />
                Explorar proyectos
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/register">
                <Upload className="h-4 w-4" />
                Subir mi proyecto
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-4 text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold text-foreground">{projectCount}</span>
              <span>Proyectos publicados</span>
            </div>
            <div className="hidden h-12 w-px self-center bg-border sm:block" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold text-foreground">{userCount}</span>
              <span>Miembros registrados</span>
            </div>
            <div className="hidden h-12 w-px self-center bg-border sm:block" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold text-foreground">{areaCount}</span>
              <span>Áreas de conocimiento</span>
            </div>
          </div>
        </div>
      </section>

      {recentProjects.length > 0 && (
        <section className="container mx-auto max-w-5xl px-4 py-16">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Proyectos recientes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lo último publicado en UniHaven
              </p>
            </div>
            <Button asChild variant="ghost" className="gap-1.5">
              <Link href="/projects">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {recentProjects.map((project) => {
              const meta = TYPE_META[project.type];
              const Icon = meta.icon;
              const authors = project.authors
                .map((author) => author.user.name ?? "Autor")
                .join(", ");

              return (
                <Link key={project.id} href={`/projects/${project.id}`} className="group">
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                    <div className="relative h-36 bg-muted">
                      {project.coverImage ? (
                        <Image
                          src={project.coverImage}
                          alt={project.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <BookOpen className="h-10 w-10 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute left-2 top-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${meta.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <CardContent className="flex h-full flex-col gap-2 p-4">
                      <p className="line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-primary">
                        {project.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{authors}</p>
                      <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {project._count.comments}
                        </span>
                        <span>{project.year}</span>
                        {project.area ? <span className="truncate">{project.area.name}</span> : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {announcements.length > 0 && (
        <section className="border-t py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Megaphone className="h-4 w-4" />
                  <span className="text-sm font-medium">Novedades destacadas</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Anuncios recientes</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Comunicados importantes para la comunidad académica.
                </p>
              </div>
              <Button asChild variant="ghost" className="gap-1.5">
                <Link href="/announcements">
                  Ver todos los anuncios <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {announcements.map((announcement) => (
                <Link
                  key={announcement.id}
                  href={`/announcements#${announcement.id}`}
                  className="group"
                >
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                    <div className="relative h-32 bg-muted">
                      {announcement.coverImage ? (
                        <Image
                          src={announcement.coverImage}
                          alt={announcement.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Megaphone className="h-8 w-8 text-primary/30" />
                        </div>
                      )}
                    </div>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {announcement.pinned ? (
                          <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                            <Pin className="h-3 w-3" />
                            Fijado
                          </Badge>
                        ) : null}
                        <span>{formatDate(announcement.createdAt)}</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="line-clamp-2 font-semibold group-hover:text-primary">
                          {announcement.title}
                        </h3>
                        <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                          {getExcerpt(announcement.body)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t bg-muted/30 px-4 py-20">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Todo en un solo lugar</h2>
            <p className="mt-2 text-muted-foreground">
              Herramientas pensadas para la comunidad académica de la UPC
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: GitBranch,
                title: "Respaldo en GitHub",
                desc: "Cada proyecto genera automáticamente un repositorio en GitHub con control de versiones.",
                color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
              },
              {
                icon: Search,
                title: "Búsqueda avanzada",
                desc: "Filtra por área de conocimiento, tipo de proyecto, año o palabras clave.",
                color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              },
              {
                icon: Upload,
                title: "Sube tu proyecto",
                desc: "Estudiantes de la UPC pueden subir archivos, definir autores y publicar con un formulario guiado.",
                color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              },
              {
                icon: MessageSquare,
                title: "Comentarios y chat",
                desc: "Comenta en proyectos, reacciona con emojis y conversa en el chat de cada proyecto.",
                color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
              },
              {
                icon: Star,
                title: "Guarda favoritos",
                desc: "Marca proyectos para encontrarlos fácilmente desde tu perfil.",
                color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
              },
              {
                icon: Users,
                title: "Comunidad abierta",
                desc: "Cualquier persona puede registrarse y acceder al conocimiento generado en la UPC.",
                color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="flex gap-4 rounded-xl border bg-background p-4">
                <div className={`h-fit shrink-0 rounded-lg p-2.5 ${color} bg-opacity-10`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-20">
        <div className="container mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight">Cómo usar UniHaven</h2>
            <p className="mt-2 text-muted-foreground">
              Publica y descubre proyectos académicos en tres pasos sencillos.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, description, icon: Icon }) => (
              <div
                key={step}
                className="flex h-full flex-col gap-5 rounded-2xl border bg-background p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                    {step}
                  </span>
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {areas.length > 0 && (
        <section className="border-t bg-muted/30 px-4 py-16">
          <div className="container mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight">
                Explora por área de conocimiento
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Encuentra proyectos agrupados por las líneas académicas de la UPC.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {areas.map((area) => (
                <Link
                  key={area.id}
                  href={`/projects?area=${area.id}`}
                  className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <span>{area.name}</span>
                  <Badge variant="secondary" className="px-2 py-0 text-xs">
                    {area._count.projects}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t px-4 py-20">
        <div className="container mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">¿Eres estudiante de la UPC?</h2>
          <p className="text-muted-foreground">
            Comparte tu proyecto con la comunidad académica. Regístrate con tu correo institucional
            y empieza a subir tu trabajo hoy.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href="/register">
                Crear cuenta gratuita <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/announcements">Ver anuncios</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
