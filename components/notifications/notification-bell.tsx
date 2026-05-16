"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, MessageSquare, Heart, Megaphone, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { pusherClient } from "@/lib/pusher-client";
import { getNotifications, markAllRead, markRead } from "@/app/actions/notifications";
import type { NotificationListItem } from "@/app/actions/notifications";
import type { NotificationType } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationBellProps {
  userId: string;
  initialCount?: number;
}

function notificationMeta(type: NotificationType, ref: Record<string, unknown> | null) {
  const title = (ref?.title as string) ?? "un proyecto";
  switch (type) {
    case "COMMENT":
      return { icon: <MessageSquare className="h-4 w-4 text-blue-500" />, text: `Nuevo comentario en "${title}"`, href: ref?.projectId ? `/projects/${ref.projectId}` : "/projects" };
    case "REACTION":
      return { icon: <Heart className="h-4 w-4 text-pink-500" />, text: `Nueva reacción en "${title}"`, href: ref?.projectId ? `/projects/${ref.projectId}` : "/projects" };
    case "PROJECT_REJECTED":
      return { icon: <Trash2 className="h-4 w-4 text-red-500" />, text: `Tu proyecto "${title}" fue rechazado`, href: ref?.projectId ? `/projects/${ref.projectId}` : "/projects" };
    case "PROJECT_APPROVED":
      return { icon: <Check className="h-4 w-4 text-emerald-500" />, text: `Tu proyecto "${title}" fue aprobado`, href: ref?.projectId ? `/projects/${ref.projectId}` : "/projects" };
    case "NEW_FOLLOWER":
      return { icon: <Bell className="h-4 w-4 text-primary" />, text: `${title} comenzó a seguirte`, href: ref?.userId ? `/profile/${ref.userId}` : "/" };
    case "MENTION":
      return { icon: <MessageSquare className="h-4 w-4 text-blue-500" />, text: `Nuevo mensaje de ${title}`, href: ref?.chatId ? `/messages?chat=${ref.chatId}` : "/messages" };
    case "ANNOUNCEMENT":
      return { icon: <Megaphone className="h-4 w-4 text-yellow-500" />, text: `Nuevo anuncio: ${title}`, href: "/announcements" };
    default:
      return { icon: <Bell className="h-4 w-4 text-muted-foreground" />, text: "Nueva notificación", href: "/" };
  }
}

export function NotificationBell({ userId, initialCount = 0 }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const channelRef = useRef<ReturnType<typeof pusherClient.subscribe> | null>(null);

  // Subscribe to Pusher for real-time badge updates
  useEffect(() => {
    const channel = pusherClient.subscribe(`user-${userId}`);
    channelRef.current = channel;

    channel.bind("new-notification", (data: { count: number }) => {
      setCount(data.count);
    });

    channel.bind("notifications-cleared", () => {
      setCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });

    // Fetch initial unread count
    getNotifications().then((res) => {
      if (res.unreadCount !== undefined) setCount(res.unreadCount);
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`user-${userId}`);
    };
  }, [userId]);

  // Load notifications when popover opens
  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const res = await getNotifications();
      if (res.notifications) {
        setNotifications(res.notifications);
        setLoaded(true);
      }
    });
  }, [open]);

  function handleMarkAll() {
    startTransition(async () => {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setCount(0);
    });
  }

  async function handleClick(notification: NotificationListItem) {
    const { href } = notificationMeta(notification.type, notification.reference as Record<string, unknown> | null);
    if (!notification.read) {
      await markRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    router.push(href);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-full p-1.5 hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold text-sm">Notificaciones</span>
          {notifications.some((n) => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAll}
              disabled={isPending}
            >
              Marcar todo como leído
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {!loaded && isPending ? (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-sm text-muted-foreground">
              <Bell className="h-8 w-8 opacity-30" />
              No tienes notificaciones
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const { icon, text } = notificationMeta(
                  n.type,
                  n.reference as Record<string, unknown> | null
                );
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent transition-colors ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          !n.read ? "font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
