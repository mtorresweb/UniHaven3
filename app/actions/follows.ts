"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { triggerUnreadNotificationCount } from "@/lib/notifications";
import prisma from "@/lib/prisma";

async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Debes iniciar sesión para seguir.");
  }

  return session.user;
}

export async function toggleUserFollow(
  targetUserId: string,
): Promise<{ following: boolean }> {
  const user = await requireUser();
  const normalizedTargetUserId = targetUserId.trim();

  if (!normalizedTargetUserId) {
    throw new Error("Usuario inválido.");
  }

  if (normalizedTargetUserId === user.id) {
    throw new Error("No puedes seguir tu propio perfil.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: normalizedTargetUserId },
    select: { id: true },
  });

  if (!targetUser) {
    throw new Error("Usuario no encontrado.");
  }

  const existingFollow = await prisma.userFollow.findUnique({
    where: {
      followerId_userId: {
        followerId: user.id,
        userId: normalizedTargetUserId,
      },
    },
  });

  if (existingFollow) {
    await prisma.userFollow.delete({
      where: {
        followerId_userId: {
          followerId: user.id,
          userId: normalizedTargetUserId,
        },
      },
    });

    revalidatePath(`/profile/${normalizedTargetUserId}`);
    revalidatePath(`/profile/${user.id}`);

    return { following: false };
  }

  await prisma.userFollow.create({
    data: {
      followerId: user.id,
      userId: normalizedTargetUserId,
    },
  });

  try {
    await prisma.notification.create({
      data: {
        userId: normalizedTargetUserId,
        type: "NEW_FOLLOWER",
        reference: {
          userId: user.id,
          title: user.name ?? "Un usuario",
        },
      },
    });
    await triggerUnreadNotificationCount(normalizedTargetUserId);
  } catch {
    // Non-critical notification failure.
  }

  revalidatePath(`/profile/${normalizedTargetUserId}`);
  revalidatePath(`/profile/${user.id}`);

  return { following: true };
}

export async function toggleProjectFollow(
  projectId: string,
): Promise<{ following: boolean }> {
  const user = await requireUser();
  const normalizedProjectId = projectId.trim();

  if (!normalizedProjectId) {
    throw new Error("Proyecto inválido.");
  }

  const project = await prisma.project.findUnique({
    where: { id: normalizedProjectId },
    select: { id: true },
  });

  if (!project) {
    throw new Error("Proyecto no encontrado.");
  }

  const existingFollow = await prisma.projectFollow.findUnique({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId: normalizedProjectId,
      },
    },
  });

  if (existingFollow) {
    await prisma.projectFollow.delete({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: normalizedProjectId,
        },
      },
    });

    revalidatePath(`/projects/${normalizedProjectId}`);

    return { following: false };
  }

  await prisma.projectFollow.create({
    data: {
      userId: user.id,
      projectId: normalizedProjectId,
    },
  });

  revalidatePath(`/projects/${normalizedProjectId}`);

  return { following: true };
}

export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return { followers: 0, following: 0 };
  }

  const [followers, following] = await Promise.all([
    prisma.userFollow.count({
      where: { userId: normalizedUserId },
    }),
    prisma.userFollow.count({
      where: { followerId: normalizedUserId },
    }),
  ]);

  return { followers, following };
}
