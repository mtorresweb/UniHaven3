"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/constants";
import prisma from "@/lib/prisma";

const VALID_REACTION_TYPES = ["LIKE", "LOVE", "CELEBRATE", "THINKING"] as const;
const COMMENTS_PAGE_SIZE = 10;

const commentSelect = {
  id: true,
  content: true,
  hidden: true,
  createdAt: true,
  userId: true,
  parentId: true,
  user: {
    select: {
      name: true,
      image: true,
      email: true,
    },
  },
  replies: {
    where: { hidden: false },
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      content: true,
      hidden: true,
      createdAt: true,
      userId: true,
      parentId: true,
      user: {
        select: {
          name: true,
          image: true,
          email: true,
        },
      },
    },
  },
};

export async function addComment(
  projectId: string,
  content: string,
  parentId?: string
): Promise<{
  error?: string;
  comment?: {
    id: string;
    content: string;
    hidden: boolean;
    createdAt: Date;
    userId: string;
    parentId: string | null;
    user: { name: string | null; image: string | null; email: string | null };
    replies: {
      id: string;
      content: string;
      hidden: boolean;
      createdAt: Date;
      userId: string;
      parentId: string | null;
      user: { name: string | null; image: string | null; email: string | null };
    }[];
  };
}> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Debes iniciar sesión para comentar." };
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length < 1 || trimmedContent.length > 2000) {
    return { error: "El comentario debe tener entre 1 y 2000 caracteres." };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return { error: "Proyecto no encontrado." };
  }

  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: {
        id: parentId,
        projectId,
        hidden: false,
      },
      select: { id: true, parentId: true },
    });

    if (!parent) {
      return { error: "Comentario padre no encontrado." };
    }

    if (parent.parentId) {
      return { error: "Solo se permite un nivel de respuestas." };
    }
  }

  const created = await prisma.comment.create({
    data: {
      projectId,
      userId: session.user.id,
      content: trimmedContent,
      ...(parentId ? { parentId } : {}),
    },
  });

  // Fetch with relations separately (HTTP mode can't do create + nested select)
  const createdComment = await prisma.comment.findUnique({
    where: { id: created.id },
    select: commentSelect,
  });

  revalidatePath(`/projects/${projectId}`);

  // Notify project authors (skip the commenter)
  try {
    const { triggerUnreadNotificationCount } = await import("@/lib/notifications");
    const authors = await prisma.projectAuthor.findMany({
      where: { projectId },
      select: { userId: true },
    });
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true },
    });
    for (const author of authors) {
      if (author.userId === session.user.id) continue;
      await prisma.notification.create({
        data: {
          userId: author.userId,
          type: "COMMENT",
          reference: {
            projectId,
            commentId: created.id,
            title: project?.title ?? "un proyecto",
          },
        },
      });
      await triggerUnreadNotificationCount(author.userId);
    }
  } catch {
    // non-critical
  }

  return {
    comment: createdComment ?? undefined,
  };
}

export async function deleteComment(commentId: string): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Debes iniciar sesión para eliminar comentarios." };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      userId: true,
      projectId: true,
      hidden: true,
    },
  });

  if (!comment) {
    return { error: "Comentario no encontrado." };
  }

  const isOwner = comment.userId === session.user.id;
  const isAdmin = session.user.role === Role.ADMIN;
  if (!isOwner && !isAdmin) {
    return { error: "No autorizado." };
  }

  if (!comment.hidden) {
    await prisma.comment.update({
      where: { id: commentId },
      data: { hidden: true },
    });
  }

  revalidatePath(`/projects/${comment.projectId}`);
  return { ok: true };
}

export async function toggleReaction(opts: {
  projectId?: string;
  commentId?: string;
  type: (typeof VALID_REACTION_TYPES)[number];
}): Promise<{ error?: string; active?: boolean }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Debes iniciar sesión para reaccionar." };
  }

  const { projectId, commentId, type } = opts;

  if (!VALID_REACTION_TYPES.includes(type)) {
    return { error: "Tipo de reacción inválido." };
  }

  if ((!projectId && !commentId) || (projectId && commentId)) {
    return { error: "Debes reaccionar a un proyecto o a un comentario." };
  }

  let targetProjectId: string | undefined = projectId;

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return { error: "Proyecto no encontrado." };
    }
  }

  if (commentId) {
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, hidden: false },
      select: { id: true, projectId: true },
    });

    if (!comment) {
      return { error: "Comentario no encontrado." };
    }

    targetProjectId = comment.projectId;
  }

  const existingReaction = await prisma.reaction.findFirst({
    where: {
      userId: session.user.id,
      type,
      ...(projectId ? { projectId } : { commentId }),
    },
    select: { id: true },
  });

  if (existingReaction) {
    await prisma.reaction.delete({ where: { id: existingReaction.id } });
    if (targetProjectId) {
      revalidatePath(`/projects/${targetProjectId}`);
    }
    return { active: false };
  }

  await prisma.reaction.create({
    data: {
      userId: session.user.id,
      type,
      ...(projectId ? { projectId } : { commentId }),
    },
  });

  if (targetProjectId) {
    revalidatePath(`/projects/${targetProjectId}`);
  }

  return { active: true };
}

export async function loadMoreComments(
  projectId: string,
  offset: number
): Promise<{
  error?: string;
  comments?: {
    id: string;
    content: string;
    hidden: boolean;
    createdAt: Date;
    userId: string;
    parentId: string | null;
    user: { name: string | null; image: string | null; email: string | null };
    replies: {
      id: string;
      content: string;
      hidden: boolean;
      createdAt: Date;
      userId: string;
      parentId: string | null;
      user: { name: string | null; image: string | null; email: string | null };
    }[];
  }[];
}> {
  if (offset < 0) {
    return { error: "Offset inválido." };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return { error: "Proyecto no encontrado." };
  }

  const comments = await prisma.comment.findMany({
    where: {
      projectId,
      parentId: null,
      hidden: false,
    },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: COMMENTS_PAGE_SIZE,
    select: commentSelect,
  });

  return { comments };
}
