"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/constants";
import prisma from "@/lib/prisma";

export async function toggleBookmark(
  projectId: string
): Promise<{ bookmarked: boolean }> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Debes iniciar sesión para guardar marcadores.");
  }

  const existingBookmark = await prisma.bookmark.findUnique({
    where: {
      userId_projectId: {
        userId: session.user.id,
        projectId,
      },
    },
  });

  if (existingBookmark) {
    await prisma.bookmark.delete({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId,
        },
      },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/profile/${session.user.id}`);

    return { bookmarked: false };
  }

  await prisma.bookmark.create({
    data: {
      userId: session.user.id,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/profile/${session.user.id}`);

  return { bookmarked: true };
}

export async function getUserBookmarks(userId: string) {
  const session = await auth();

  if (!session?.user) {
    return [];
  }

  if (session.user.id !== userId && session.user.role !== Role.ADMIN) {
    return [];
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      project: {
        select: {
          id: true,
          title: true,
          type: true,
          year: true,
          coverImage: true,
          authors: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return bookmarks.map(({ project }) => ({
    ...project,
    authors: project.authors.map(({ user }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
  }));
}
