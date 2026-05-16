"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getDMMessages,
  sendDMMessage,
  type DMMessage,
} from "@/app/actions/dm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pusherClient } from "@/lib/pusher-client";
import { cn } from "@/lib/utils";

type DMChatProps = {
  chatId: string;
  currentUserId: string;
  otherUser: {
    name: string;
    image: string | null;
  };
  onMessage?: (message: DMMessage) => void;
};

function getInitials(name?: string | null) {
  return (name?.trim() || "Usuario")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortMessages(messages: DMMessage[]) {
  return [...messages].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );
}

export function DMChat({
  chatId,
  currentUserId,
  otherUser,
  onMessage,
}: DMChatProps) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    getDMMessages(chatId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setMessages(sortMessages(result));
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los mensajes.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    const channelName = `dm-${chatId}`;
    const channel = pusherClient.subscribe(channelName);

    const handleNewMessage = (message: DMMessage) => {
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }

        return sortMessages([...current, message]);
      });
      onMessage?.(message);
    };

    channel.bind("new-message", handleNewMessage);

    return () => {
      channel.unbind("new-message", handleNewMessage);
      pusherClient.unsubscribe(channelName);
    };
  }, [chatId, onMessage]);

  const title = useMemo(
    () => otherUser.name.trim() || "Conversación privada",
    [otherUser.name],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content) {
      return;
    }

    const optimisticMessage: DMMessage = {
      id: `temp-${Date.now()}`,
      chatId,
      userId: currentUserId,
      content,
      createdAt: new Date().toISOString(),
      user: {
        id: currentUserId,
        name: "Tú",
        image: null,
      },
    };

    setMessages((current) => sortMessages([...current, optimisticMessage]));
    onMessage?.(optimisticMessage);
    setDraft("");

    startTransition(async () => {
      try {
        await sendDMMessage(chatId, content);
        setMessages((current) =>
          current.filter((item) => item.id !== optimisticMessage.id),
        );
      } catch (error) {
        setMessages((current) =>
          current.filter((item) => item.id !== optimisticMessage.id),
        );
        setDraft(content);
        toast.error(
          error instanceof Error ? error.message : "No se pudo enviar el mensaje.",
        );
      }
    });
  }

  return (
    <Card className="flex h-[70vh] flex-col border">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-3 text-base">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={otherUser.image ?? undefined} alt={title} />
            <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
          </Avatar>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full px-4 py-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Cargando conversación...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No hay mensajes todavía. Inicia la conversación.
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {messages.map((message) => {
                const isOwnMessage = message.userId === currentUserId;
                const senderName = isOwnMessage
                  ? "Tú"
                  : message.user.name ?? otherUser.name ?? "Usuario";

                return (
                  <div
                    key={message.id}
                    className={cn("flex gap-3", isOwnMessage && "flex-row-reverse")}
                  >
                    <Avatar className="h-9 w-9 border">
                      <AvatarImage
                        src={message.user.image ?? undefined}
                        alt={senderName}
                      />
                      <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[80%] space-y-1",
                        isOwnMessage && "text-right",
                      )}
                    >
                      <div
                        className={cn(
                          "flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
                          isOwnMessage && "justify-end",
                        )}
                      >
                        <span className="font-medium text-foreground">{senderName}</span>
                        <span>•</span>
                        <span>{formatMessageTime(message.createdAt)}</span>
                      </div>
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe tu mensaje..."
            maxLength={2000}
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending || !draft.trim()}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
