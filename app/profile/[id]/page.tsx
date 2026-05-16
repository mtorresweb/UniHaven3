import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@/lib/constants";
import { getUserBookmarks } from "@/app/actions/bookmarks";
import { StartDMButton } from "@/components/follows/start-dm-button";
import { FollowButton } from "@/components/follows/follow-button";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  BookMarked,
  FolderOpen,
  Mail,
  UserCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      name: true,
      email: true,
      bio: true,
    },
  });

  if (!user) {
    return { title: "Perfil no encontrado — UniHaven" };
  }

  const displayName = user.name?.trim() || user.email;
  const description = user.bio?.trim() || `Perfil académico de ${displayName} en UniHaven.`;

  return {
    title: `${displayName} — UniHaven`,
    description,
  };
}

const ROLE_META = {
  [Role.ADMIN]: {
    label: "Administrador",
    className:
      "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  },
  [Role.UPC_STUDENT]: {
    label: "Estudiante UPC",
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  [Role.GENERAL]: {
    label: "Usuario general",
    className:
      "border-muted bg-muted/60 text-muted-foreground",
  },
} as const;

const TYPE_LABELS = {
  THESIS: "Tesis",
  RESEARCH: "Investigación",
  CLASSROOM: "Proyecto de aula",
} as const;

const STATUS_META = {
  DRAFT: {
    label: "Borrador",
    className:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  IN_REVIEW: {
    label: "En revisión",
    className:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  NEEDS_REVISION: {
    label: "Requiere revisión",
    className:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  APPROVED: {
    label: "Aprobado",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Rechazado",
    className:
      "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  },
} as const;

function getInitials(name?: string | null, email?: string) {
  const source = name?.trim() || email || "Usuario";

  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

function formatJoinDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [session, user] = await Promise.all([
    auth(),
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        role: true,
        createdAt: true,
        projects: {
          select: {
            project: {
              select: {
                id: true,
                title: true,
                type: true,
                year: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        bookmarks: {
          select: {
            projectId: true,
          },
        },
      },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const isOwnProfile = session?.user?.id === user.id;
  const isAdmin = session?.user?.role === Role.ADMIN;
  const [bookmarkedProjects, followCounts, initialUserFollow] = await Promise.all([
    isOwnProfile ? getUserBookmarks(user.id) : Promise.resolve([]),
    Promise.all([
      prisma.userFollow.count({ where: { userId: user.id } }),
      prisma.userFollow.count({ where: { followerId: user.id } }),
    ]).then(([followers, following]) => ({ followers, following })),
    session?.user?.id && !isOwnProfile
      ? prisma.userFollow.findUnique({
          where: {
            followerId_userId: {
              followerId: session.user.id,
              userId: user.id,
            },
          },
        })
      : Promise.resolve(null),
  ]);
  const uploadedProjects = user.projects
    .map(({ project }) => project)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.email} />
                  <AvatarFallback className="text-lg font-semibold">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div>
                    <CardTitle className="text-2xl">
                      {user.name?.trim() || user.email}
                    </CardTitle>
                    {(isOwnProfile || isAdmin) && (
                      <CardDescription className="mt-1 flex items-start gap-2 text-sm min-w-0">
                        <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="break-all">{user.email}</span>
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="outline" className={ROLE_META[user.role].className}>
                    {ROLE_META[user.role].label}
                  </Badge>
                </div>
              </div>
              {isOwnProfile && (
                <EditProfileDialog
                  initialName={user.name ?? ""}
                  initialBio={user.bio ?? ""}
                />
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {session?.user && !isOwnProfile ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <FollowButton
                    type="user"
                    targetId={user.id}
                    initialFollowing={Boolean(initialUserFollow)}
                    followerCount={followCounts.followers}
                  />
                  <StartDMButton targetUserId={user.id} />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Seguidores</p>
                  <p className="text-lg font-semibold text-foreground">
                    {followCounts.followers}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Siguiendo</p>
                  <p className="text-lg font-semibold text-foreground">
                    {followCounts.following}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Se unió el {formatJoinDate(user.createdAt)}
              </div>
              <Separator />
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Biografía</h2>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {user.bio?.trim() ||
                    (isOwnProfile
                      ? "Aún no has agregado una biografía."
                      : "Este usuario aún no ha agregado una biografía.")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Perfil de usuario</h1>
            <p className="text-sm text-muted-foreground">
              Explora los proyectos publicados y los marcadores personales disponibles.
            </p>
          </div>

          <Tabs defaultValue="projects" className="gap-4">
            <TabsList>
              <TabsTrigger value="projects" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Proyectos ({uploadedProjects.length})
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger value="bookmarks" className="gap-2">
                  <BookMarked className="h-4 w-4" />
                  Marcadores ({user.bookmarks.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="projects">
              {uploadedProjects.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <UserCircle2 className="h-10 w-10 text-muted-foreground/50" />
                    <div>
                      <p className="font-medium">Sin proyectos publicados</p>
                      <p className="text-sm text-muted-foreground">
                        Este usuario todavía no ha subido proyectos a UniHaven.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {uploadedProjects.map((project) => (
                    <Card key={project.id} className="flex h-full flex-col">
                      <CardHeader className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{TYPE_LABELS[project.type]}</Badge>
                          <Badge
                            variant="outline"
                            className={STATUS_META[project.status].className}
                          >
                            {STATUS_META[project.status].label}
                          </Badge>
                        </div>
                        <div>
                          <CardTitle className="line-clamp-2 text-base">
                            {project.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Año {project.year}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/projects/${project.id}`}>Ver proyecto</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {isOwnProfile && (
              <TabsContent value="bookmarks">
                {bookmarkedProjects.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                      <BookMarked className="h-10 w-10 text-muted-foreground/50" />
                      <div>
                        <p className="font-medium">Aún no tienes marcadores</p>
                        <p className="text-sm text-muted-foreground">
                          Guarda proyectos para volver a ellos más tarde.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {bookmarkedProjects.map((project) => (
                      <Card key={project.id} className="flex h-full flex-col">
                        <CardHeader className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{TYPE_LABELS[project.type]}</Badge>
                            <Badge variant="secondary">{project.year}</Badge>
                          </div>
                          <div>
                            <CardTitle className="line-clamp-2 text-base">
                              {project.title}
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">
                              {project.authors
                                .map((author) => author.name ?? author.email)
                                .join(", ")}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="mt-auto">
                          <Button asChild variant="outline" className="w-full">
                            <Link href={`/projects/${project.id}`}>Abrir proyecto</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </main>
  );
}
