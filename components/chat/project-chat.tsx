"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendMessage } from "@/app/actions/chat";
import { pusherClient } from "@/lib/pusher-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

type CurrentUser = {
  id: string;
  name: string | null;
  image: string | null;
};

type ProjectChatProps = {
  chatId: string;
  initialMessages: ChatMessage[];
  currentUser: CurrentUser;
};

type PusherStateChange = {
  previous: string;
  current: string;
};

type PusherMessage = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
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

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
  );
}

export function ProjectChat({
  chatId,
  initialMessages,
  currentUser,
}: ProjectChatProps) {
  const [messages, setMessages] = useState(() => sortMessages(initialMessages));
  const [draft, setDraft] = useState("");
  const [connectionState, setConnectionState] = useState(
    pusherClient.connection.state
  );
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channelName = `chat-${chatId}`;
    const channel = pusherClient.subscribe(channelName);

    const handleNewMessage = (message: PusherMessage) => {
      const normalizedMessage: ChatMessage = {
        ...message,
        chatId,
        userId: message.user.id,
      };

      setMessages((current) => {
        if (current.some((item) => item.id === normalizedMessage.id)) {
          return current;
        }

        return sortMessages([...current, normalizedMessage]);
      });
    };

    const handleStateChange = (state: PusherStateChange) => {
      setConnectionState(state.current);
    };

    channel.bind("new-message", handleNewMessage);
    pusherClient.connection.bind("state_change", handleStateChange);

    return () => {
      channel.unbind("new-message", handleNewMessage);
      pusherClient.connection.unbind("state_change", handleStateChange);
      pusherClient.unsubscribe(channelName);
    };
  }, [chatId]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content) {
      return;
    }

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      chatId,
      userId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
      user: {
        id: currentUser.id,
        name: currentUser.name,
        image: currentUser.image,
      },
    };

    setMessages((current) => sortMessages([...current, optimisticMessage]));
    setDraft("");

    startTransition(async () => {
      try {
        const savedMessage = await sendMessage(chatId, content);

        setMessages((current) => {
          const withoutOptimistic = current.filter(
            (item) => item.id !== optimisticMessage.id
          );

          if (withoutOptimistic.some((item) => item.id === savedMessage.id)) {
            return sortMessages(withoutOptimistic);
          }

          return sortMessages([...withoutOptimistic, savedMessage]);
        });
      } catch (error) {
        setMessages((current) =>
          current.filter((item) => item.id !== optimisticMessage.id)
        );
        setDraft(content);
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo enviar el mensaje."
        );
      }
    });
  }

  const isConnected = connectionState === "connected";

  return (
    <Card className="border">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Conversación en tiempo real</CardTitle>
            <CardDescription>
              Sigue los mensajes al instante y participa desde aquí.
            </CardDescription>
          </div>
          <div
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
              isConnected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
            {isConnected ? "Conectado" : "Desconectado"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="h-[60vh] overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sé el primero en comentar en este chat
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.userId === currentUser.id;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      isOwnMessage && "flex-row-reverse"
                    )}
                  >
                    <Avatar className="h-10 w-10 border-0">
                      <AvatarImage
                        src={message.user.image ?? undefined}
                        alt={message.user.name ?? "Usuario"}
                      />
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {getInitials(message.user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={cn(
                        "max-w-[80%] space-y-1",
                        isOwnMessage && "text-right"
                      )}
                    >
                      <div
                        className={cn(
                          "flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
                          isOwnMessage && "justify-end"
                        )}
                      >
                        <span className="font-medium text-foreground">
                          {isOwnMessage ? "Tú" : message.user.name ?? "Usuario"}
                        </span>
                        <span>•</span>
                        <span>{formatMessageTime(message.createdAt)}</span>
                      </div>

                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
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
        </div>
      </CardContent>

      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={isPending}
            className="bg-background"
            maxLength={2000}
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
