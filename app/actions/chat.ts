"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
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

function serializeMessage(message: MessageWithUser) {
  return {
    id: message.id,
    chatId: message.chatId,
    userId: message.userId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    user: message.user,
  };
}

export async function getOrCreateProjectChat(projectId: string) {
  const normalizedProjectId = projectId.trim();

  if (!normalizedProjectId) {
    throw new Error("Proyecto inválido.");
  }

  const existingChat = await prisma.chat.findUnique({
    where: { projectId: normalizedProjectId },
    select: { id: true },
  });

  if (existingChat) {
    return existingChat.id;
  }

  const project = await prisma.project.findUnique({
    where: { id: normalizedProjectId },
    select: { id: true },
  });

  if (!project) {
    throw new Error("Proyecto no encontrado.");
  }

  try {
    const createdChat = await prisma.chat.create({
      data: {
        type: "PROJECT",
        projectId: normalizedProjectId,
      },
      select: { id: true },
    });

    return createdChat.id;
  } catch {
    const concurrentChat = await prisma.chat.findUnique({
      where: { projectId: normalizedProjectId },
      select: { id: true },
    });

    if (concurrentChat) {
      return concurrentChat.id;
    }

    throw new Error("No se pudo crear el chat del proyecto.");
  }
}

export async function sendMessage(chatId: string, content: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Debes iniciar sesión para enviar mensajes.");
  }

  const normalizedChatId = chatId.trim();
  const normalizedContent = content.trim();

  if (!normalizedChatId) {
    throw new Error("Chat inválido.");
  }

  if (!normalizedContent) {
    throw new Error("El mensaje no puede estar vacío.");
  }

  const chat = await prisma.chat.findUnique({
    where: { id: normalizedChatId },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!chat) {
    throw new Error("Chat no encontrado.");
  }

  const createdMessage = await prisma.message.create({
    data: {
      chatId: normalizedChatId,
      userId: session.user.id,
      content: normalizedContent,
    },
  });

  const fullMessage = await prisma.message.findUnique({
    where: { id: createdMessage.id },
    include: messageInclude,
  });

  if (!fullMessage) {
    throw new Error("No se pudo cargar el mensaje enviado.");
  }

  const serializedMessage = serializeMessage(fullMessage as MessageWithUser);

  await pusherServer.trigger(`chat-${normalizedChatId}`, "new-message", {
    id: serializedMessage.id,
    content: serializedMessage.content,
    createdAt: serializedMessage.createdAt,
    user: serializedMessage.user,
  });

  if (chat.projectId) {
    revalidatePath(`/projects/${chat.projectId}/chat`);
  }

  return serializedMessage;
}

export async function getChatMessages(chatId: string, cursor?: string) {
  const normalizedChatId = chatId.trim();

  if (!normalizedChatId) {
    return [];
  }

  const messages = await prisma.message.findMany({
    where: { chatId: normalizedChatId },
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    take: 50,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    include: messageInclude,
  });

  return messages.reverse().map((message) => serializeMessage(message as MessageWithUser));
}
