"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/constants";
import prisma from "@/lib/prisma";

const VALID_ROLES = [Role.GENERAL, Role.UPC_STUDENT, Role.ADMIN] as const;

type AdminRole = (typeof VALID_ROLES)[number];

export async function dismissReport(
  reportId: string
): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return { error: "No autorizado." };
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true },
  });

  if (!report) {
    return { error: "Reporte no encontrado." };
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "DISMISSED" },
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function setUserRole(
  userId: string,
  role: AdminRole
): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return { error: "No autorizado." };
  }

  if (!VALID_ROLES.includes(role)) {
    return { error: "Rol inválido." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return { error: "Usuario no encontrado." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
