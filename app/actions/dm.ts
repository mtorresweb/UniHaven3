"use server";

import { auth } from "@/lib/auth";
import { triggerUnreadNotificationCount } from "@/lib/notifications";
import { pusherServer } from "@/lib/pusher";
import prisma from "@/lib/prisma";

const messageInclude = {
  user: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
} as const;

type MessageWithUser = {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export type DMMessage = {
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

export type DMConversation = {
  chatId: string;
  createdAt: string;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  lastMessage: DMMessage | null;
};

function serializeMessage(message: MessageWithUser): DMMessage {
  return {
    id: message.id,
    chatId: message.chatId,
    userId: message.userId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    user: message.user,
  };
}

async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Debes iniciar sesión para ver tus mensajes.");
  }

  return session.user;
}

async function getMembership(chatId: string, userId: string) {
  return prisma.chatParticipant.findUnique({
    where: {
      userId_chatId: {
        userId,
        chatId,
      },
    },
    select: {
      userId: true,
      chat: {
        select: {
          id: true,
          type: true,
          participants: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getOrCreateDM(
  otherUserId: string,
): Promise<{ chatId: string }> {
  const user = await requireUser();
  const normalizedOtherUserId = otherUserId.trim();

  if (!normalizedOtherUserId) {
    throw new Error("Usuario inválido.");
  }

  if (normalizedOtherUserId === user.id) {
    throw new Error("No puedes abrir un chat contigo mismo.");
  }

  const otherUser = await prisma.user.findUnique({
    where: { id: normalizedOtherUserId },
    select: { id: true },
  });

  if (!otherUser) {
    throw new Error("Usuario no encontrado.");
  }

  const existingChat = await prisma.chat.findFirst({
    where: {
      type: "DM",
      participants: {
        some: { userId: user.id },
      },
      AND: {
        participants: {
          some: { userId: normalizedOtherUserId },
        },
      },
    },
    select: { id: true },
  });

  if (existingChat) {
    return { chatId: existingChat.id };
  }

  const createdChat = await prisma.chat.create({
    data: {
      type: "DM",
    },
    select: { id: true },
  });

  await prisma.chatParticipant.create({
    data: {
      userId: user.id,
      chatId: createdChat.id,
    },
  });

  await prisma.chatParticipant.create({
    data: {
      userId: normalizedOtherUserId,
      chatId: createdChat.id,
    },
  });

  return { chatId: createdChat.id };
}

export async function getDMConversations(): Promise<DMConversation[]> {
  const user = await requireUser();

  const memberships = await prisma.chatParticipant.findMany({
    where: {
      userId: user.id,
      chat: { type: "DM" },
    },
    select: {
      chat: {
        select: {
          id: true,
          createdAt: true,
          participants: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: [
              { createdAt: "desc" },
              { id: "desc" },
            ],
            include: messageInclude,
          },
        },
      },
    },
  });

  return memberships
    .map(({ chat }) => {
      const otherParticipant = chat.participants.find(
        (participant) => participant.userId !== user.id,
      );

      if (!otherParticipant) {
        return null;
      }

      const lastMessage = chat.messages[0]
        ? serializeMessage(chat.messages[0] as MessageWithUser)
        : null;

      return {
        chatId: chat.id,
        createdAt: chat.createdAt.toISOString(),
        otherUser: {
          id: otherParticipant.user.id,
          name: otherParticipant.user.name,
          email: otherParticipant.user.email,
          image: otherParticipant.user.image,
        },
        lastMessage,
      };
    })
    .filter((conversation): conversation is DMConversation => Boolean(conversation))
    .sort((left, right) => {
      const leftTime = left.lastMessage?.createdAt ?? left.createdAt;
      const rightTime = right.lastMessage?.createdAt ?? right.createdAt;
      return new Date(rightTime).getTime() - new Date(leftTime).getTime();
    });
}

export async function getDMMessages(
  chatId: string,
  take = 50,
): Promise<DMMessage[]> {
  const user = await requireUser();
  const normalizedChatId = chatId.trim();

  if (!normalizedChatId) {
    return [];
  }

  const membership = await getMembership(normalizedChatId, user.id);

  if (!membership || membership.chat.type !== "DM") {
    throw new Error("No autorizado.");
  }

  const messages = await prisma.message.findMany({
    where: { chatId: normalizedChatId },
    take: Math.max(1, Math.min(take, 100)),
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    include: messageInclude,
  });

  return messages
    .reverse()
    .map((message) => serializeMessage(message as MessageWithUser));
}

export async function sendDMMessage(
  chatId: string,
  content: string,
): Promise<void> {
  const user = await requireUser();
  const normalizedChatId = chatId.trim();
  const normalizedContent = content.trim();

  if (!normalizedChatId) {
    throw new Error("Chat inválido.");
  }

  if (!normalizedContent) {
    throw new Error("El mensaje no puede estar vacío.");
  }

  const membership = await getMembership(normalizedChatId, user.id);

  if (!membership || membership.chat.type !== "DM") {
    throw new Error("No autorizado.");
  }

  const createdMessage = await prisma.message.create({
    data: {
      chatId: normalizedChatId,
      userId: user.id,
      content: normalizedContent,
    },
    select: { id: true },
  });

  const fullMessage = await prisma.message.findUnique({
    where: { id: createdMessage.id },
    include: messageInclude,
  });

  if (!fullMessage) {
    throw new Error("No se pudo enviar el mensaje.");
  }

  const serializedMessage = serializeMessage(fullMessage as MessageWithUser);

  await pusherServer.trigger(`dm-${normalizedChatId}`, "new-message", serializedMessage);

  const recipient = membership.chat.participants.find(
    (participant) => participant.userId !== user.id,
  );

  if (recipient) {
    try {
      await prisma.notification.create({
        data: {
          userId: recipient.userId,
          type: "MENTION",
          reference: {
            chatId: normalizedChatId,
            title: user.name ?? fullMessage.user.name ?? "Nuevo mensaje",
          },
        },
      });
      await triggerUnreadNotificationCount(recipient.userId);
    } catch {
      // Non-critical notification failure.
    }
  }
}
