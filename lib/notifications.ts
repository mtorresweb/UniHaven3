import "server-only";

import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export type NotificationReference = {
  projectId?: string;
  commentId?: string;
  announcementId?: string;
  title?: string;
  note?: string;
  [key: string]: unknown;
};

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
