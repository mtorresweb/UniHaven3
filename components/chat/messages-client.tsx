"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import type { DMConversation, DMMessage } from "@/app/actions/dm";
import { DMChat } from "@/components/chat/dm-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pusherClient } from "@/lib/pusher-client";
import { cn } from "@/lib/utils";

type MessagesClientProps = {
  conversations: DMConversation[];
  currentUserId: string;
};

function getInitials(name?: string | null, email?: string) {
  return (name?.trim() || email || "Usuario")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MessagesClient({
  conversations: initialConversations,
  currentUserId,
}: MessagesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState(initialConversations);
  const requestedChatId = searchParams.get("chat");
  const hasRequestedConversation = requestedChatId
    ? conversations.some((conversation) => conversation.chatId === requestedChatId)
    : false;
  const selectedChatId = hasRequestedConversation
    ? requestedChatId
    : conversations[0]?.chatId ?? null;
  const mobileChatOpen = Boolean(requestedChatId && hasRequestedConversation);

  useEffect(() => {
    const activeChannels = initialConversations.map((conversation) => {
      const channelName = `dm-${conversation.chatId}`;
      const channel = pusherClient.subscribe(channelName);
      const handler = (message: DMMessage) => {
        setConversations((current) => {
          const updated = current.map((item) =>
            item.chatId === conversation.chatId
              ? { ...item, lastMessage: message }
              : item,
          );

          return [...updated].sort((left, right) => {
            const leftTime = left.lastMessage?.createdAt ?? left.createdAt;
            const rightTime = right.lastMessage?.createdAt ?? right.createdAt;
            return new Date(rightTime).getTime() - new Date(leftTime).getTime();
          });
        });
      };

      channel.bind("new-message", handler);

      return { channelName, channel, handler };
    });

    return () => {
      activeChannels.forEach(({ channelName, channel, handler }) => {
        channel.unbind("new-message", handler);
        pusherClient.unsubscribe(channelName);
      });
    };
  }, [initialConversations]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.chatId === selectedChatId) ??
      null,
    [conversations, selectedChatId],
  );

  function updateQuery(chatId?: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (chatId) {
      params.set("chat", chatId);
    } else {
      params.delete("chat");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function handleSelectConversation(chatId: string) {
    updateQuery(chatId);
  }

  function handleBackToList() {
    updateQuery(undefined);
  }

  function handleConversationMessage(chatId: string, message: DMMessage) {
    setConversations((current) => {
      const updated = current.map((conversation) =>
        conversation.chatId === chatId
          ? { ...conversation, lastMessage: message }
          : conversation,
      );

      return [...updated].sort((left, right) => {
        const leftTime = left.lastMessage?.createdAt ?? left.createdAt;
        const rightTime = right.lastMessage?.createdAt ?? right.createdAt;
        return new Date(rightTime).getTime() - new Date(leftTime).getTime();
      });
    });
  }

  if (conversations.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card px-6 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
        <div>
          <p className="font-medium">No tienes mensajes aún</p>
          <p className="text-sm text-muted-foreground">
            Sigue a alguien o abre una conversación desde su perfil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <aside className={cn("rounded-2xl border bg-card", mobileChatOpen && "hidden md:block")}>
        <ScrollArea className="h-[70vh]">
          <div className="divide-y">
            {conversations.map((conversation) => {
              const isActive = conversation.chatId === selectedChatId;
              const displayName = conversation.otherUser.name?.trim() || conversation.otherUser.email;

              return (
                <button
                  key={conversation.chatId}
                  type="button"
                  onClick={() => handleSelectConversation(conversation.chatId)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent",
                    isActive && "bg-primary/5",
                  )}
                >
                  <Avatar className="h-11 w-11 border">
                    <AvatarImage
                      src={conversation.otherUser.image ?? undefined}
                      alt={displayName}
                    />
                    <AvatarFallback>
                      {getInitials(conversation.otherUser.name, conversation.otherUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-medium">{displayName}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTimestamp(
                          conversation.lastMessage?.createdAt ?? conversation.createdAt,
                        )}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {conversation.lastMessage?.content ?? "Aún no hay mensajes en esta conversación."}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      <section className={cn(!mobileChatOpen && "hidden md:block")}>
        {selectedConversation ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={handleBackToList}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <DMChat
              key={selectedConversation.chatId}
              chatId={selectedConversation.chatId}
              currentUserId={currentUserId}
              otherUser={{
                name:
                  selectedConversation.otherUser.name?.trim() ||
                  selectedConversation.otherUser.email,
                image: selectedConversation.otherUser.image,
              }}
              onMessage={(message) =>
                handleConversationMessage(selectedConversation.chatId, message)
              }
            />
          </div>
        ) : (
          <div className="flex h-[70vh] items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground">
            Selecciona una conversación para ver tus mensajes.
          </div>
        )}
      </section>
    </div>
  );
}
