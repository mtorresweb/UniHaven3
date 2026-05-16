"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/constants";
import prisma from "@/lib/prisma";

const MAX_COVER_IMAGE_SIZE = 5 * 1024 * 1024;

export type AnnouncementListItem = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  coverImage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AnnouncementActionResult = {
  error?: string;
  ok?: boolean;
};

function parseAnnouncementFormData(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = formData.get("pinned") === "on";
  const removeCoverImage = formData.get("removeCoverImage") === "on";
  const imageField = formData.get("coverImage");
  const coverImage = imageField instanceof File && imageField.size > 0 ? imageField : null;

  if (!title) {
    return { error: "El título es obligatorio." };
  }

  if (!body) {
    return { error: "El contenido es obligatorio." };
  }

  if (coverImage) {
    if (!coverImage.type.startsWith("image/")) {
      return { error: "La portada debe ser una imagen válida." };
    }

    if (coverImage.size > MAX_COVER_IMAGE_SIZE) {
      return { error: "La portada no puede superar los 5 MB." };
    }
  }

  return { title, body, pinned, removeCoverImage, coverImage };
}

async function ensureAdmin() {
  const session = await auth();

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return null;
  }

  return session;
}

async function uploadAnnouncementCover(file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const blob = await put(
    `announcements/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
    file,
    {
      access: "public",
      contentType: file.type || "image/jpeg",
    }
  );

  return blob.url;
}

function revalidateAnnouncementPaths() {
  revalidatePath("/");
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  revalidatePath("/projects");
}

export async function createAnnouncement(
  formData: FormData
): Promise<AnnouncementActionResult> {
  const session = await ensureAdmin();

  if (!session) {
    return { error: "No autorizado." };
  }

  const parsed = parseAnnouncementFormData(formData);
  if ("error" in parsed) {
    return parsed;
  }

  const coverImage = parsed.coverImage
    ? await uploadAnnouncementCover(parsed.coverImage)
    : undefined;

  await prisma.announcement.create({
    data: {
      title: parsed.title,
      body: parsed.body,
      pinned: parsed.pinned,
      coverImage,
    },
  });

  revalidateAnnouncementPaths();
  return { ok: true };
}

export async function updateAnnouncement(
  id: string,
  formData: FormData
): Promise<AnnouncementActionResult> {
  const session = await ensureAdmin();

  if (!session) {
    return { error: "No autorizado." };
  }

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: { id: true, coverImage: true },
  });

  if (!announcement) {
    return { error: "Anuncio no encontrado." };
  }

  const parsed = parseAnnouncementFormData(formData);
  if ("error" in parsed) {
    return parsed;
  }

  const coverImage = parsed.coverImage
    ? await uploadAnnouncementCover(parsed.coverImage)
    : parsed.removeCoverImage
      ? null
      : announcement.coverImage;

  await prisma.announcement.update({
    where: { id },
    data: {
      title: parsed.title,
      body: parsed.body,
      pinned: parsed.pinned,
      coverImage,
    },
  });

  revalidateAnnouncementPaths();
  return { ok: true };
}

export async function deleteAnnouncement(
  id: string
): Promise<AnnouncementActionResult> {
  const session = await ensureAdmin();

  if (!session) {
    return { error: "No autorizado." };
  }

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!announcement) {
    return { error: "Anuncio no encontrado." };
  }

  await prisma.announcement.delete({ where: { id } });

  revalidateAnnouncementPaths();
  return { ok: true };
}

export async function getAnnouncements(): Promise<AnnouncementListItem[]> {
  return prisma.announcement.findMany({
    select: {
      id: true,
      title: true,
      body: true,
      pinned: true,
      coverImage: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
}
