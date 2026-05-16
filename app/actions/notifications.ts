"use server";

import { auth } from "@/lib/auth";
import type { NotificationType } from "@/lib/generated/prisma/enums";
import { triggerNotificationsCleared, type NotificationReference } from "@/lib/notifications";
import prisma from "@/lib/prisma";

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  reference: NotificationReference | null;
  read: boolean;
  createdAt: string;
};

export type NotificationsResult = {
  error?: string;
  notifications?: NotificationListItem[];
  unreadCount?: number;
};

export type NotificationActionResult = {
  error?: string;
  ok?: boolean;
};

async function requireUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function getNotifications(): Promise<NotificationsResult> {
  const user = await requireUser();
  if (!user) {
    return { error: "No autorizado." };
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        reference: true,
        read: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId: user.id, read: false },
    }),
  ]);

  return {
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      reference: (notification.reference as NotificationReference | null) ?? null,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markAllRead(): Promise<NotificationActionResult> {
  const user = await requireUser();
  if (!user) {
    return { error: "No autorizado." };
  }

  const unreadNotifications = await prisma.notification.findMany({
    where: { userId: user.id, read: false },
    select: { id: true },
  });

  for (const notification of unreadNotifications) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true },
    });
  }

  await triggerNotificationsCleared(user.id);

  return { ok: true };
}

export async function markRead(id: string): Promise<NotificationActionResult> {
  const user = await requireUser();
  if (!user) {
    return { error: "No autorizado." };
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      read: true,
    },
  });

  if (!notification) {
    return { error: "Notificación no encontrada." };
  }

  if (!notification.read) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true },
    });
  }

  return { ok: true };
}
