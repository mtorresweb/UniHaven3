"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function updateProfile(name: string, bio: string) {
  const session = await auth();

  if (!session?.user) {
    return { error: "No autorizado." };
  }

  const nextName = name.trim();
  const nextBio = bio.trim();

  if (nextName.length < 2) {
    return { error: "El nombre debe tener al menos 2 caracteres." };
  }

  if (nextName.length > 80) {
    return { error: "El nombre no puede superar los 80 caracteres." };
  }

  if (nextBio.length > 500) {
    return { error: "La biografía no puede superar los 500 caracteres." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: nextName,
      bio: nextBio || null,
    },
  });

  revalidatePath(`/profile/${session.user.id}`);
  revalidatePath("/projects");

  return { success: true };
}
