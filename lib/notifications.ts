import "server-only";

import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import type { NotificationType } from "@/lib/generated/prisma/enums";
import type { InputJsonValue } from "@/lib/generated/prisma/internal/prismaNamespace";

export type NotificationReference = {
  projectId?: string;
  commentId?: string;
  announcementId?: string;
  title?: string;
  note?: string;
  [key: string]: unknown;
};

/**
 * Crea una notificación para todos los administradores. Útil para avisar
 * cuando llega contenido que requiere revisión manual.
 */
export async function notifyAdmins(
  type: NotificationType,
  reference: NotificationReference,
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type,
        reference: reference as InputJsonValue,
      },
    });
    await triggerUnreadNotificationCount(admin.id);
  }
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function triggerUnreadNotificationCount(userId: string) {
  const count = await getUnreadNotificationCount(userId);

  await pusherServer.trigger(`user-${userId}`, "new-notification", { count });

  return count;
}

export async function triggerNotificationsCleared(userId: string) {
  await pusherServer.trigger(`user-${userId}`, "notifications-cleared", {});
}
