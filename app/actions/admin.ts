"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { Role, isUpcEmail } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { triggerUnreadNotificationCount } from "@/lib/notifications";

const VALID_ROLES = [Role.GENERAL, Role.UPC_STUDENT, Role.ADMIN] as const;

type AdminRole = (typeof VALID_ROLES)[number];

export async function dismissReport(
  reportId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return { error: "No autorizado." };
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      reporterId: true,
      projectId: true,
      project: { select: { title: true } },
    },
  });

  if (!report) {
    return { error: "Reporte no encontrado." };
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "DISMISSED" },
  });

  // Notifica al reportante que su reporte fue atendido.
  await prisma.notification.create({
    data: {
      userId: report.reporterId,
      type: "REPORT_ACTIONED",
      reference: {
        ...(report.projectId ? { projectId: report.projectId } : {}),
        title: report.project?.title ?? "tu reporte",
      },
    },
  });
  await triggerUnreadNotificationCount(report.reporterId);

  revalidatePath("/admin");
  return { ok: true };
}

export async function setUserRole(
  userId: string,
  role: AdminRole,
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
    select: { id: true, email: true },
  });

  if (!user) {
    return { error: "Usuario no encontrado." };
  }

  // Los correos fuera del dominio institucional deben quedarse en GENERAL.
  if (!isUpcEmail(user.email) && role !== Role.GENERAL) {
    return {
      error:
        "Los usuarios con correo externo a unicesar.edu.co deben permanecer como General.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  // Avisa al cliente para que refresque su sesión al instante.
  await pusherServer.trigger(`user-session-${userId}`, "role-changed", {
    role,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * Elimina una cuenta (solo administradores, y nunca a otro administrador).
 * Los proyectos donde es el único autor también se eliminan (repo incluido);
 * en los compartidos solo se quita su autoría.
 */
export async function deleteUser(
  userId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return { error: "No autorizado." };
  }

  if (session.user.id === userId) {
    return { error: "No puedes eliminar tu propia cuenta." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      projects: {
        select: {
          project: {
            select: {
              id: true,
              githubRepo: true,
              coverImage: true,
              _count: { select: { authors: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return { error: "Usuario no encontrado." };
  }

  if (user.role === Role.ADMIN) {
    return { error: "No se pueden eliminar administradores." };
  }

  const soloProjects = user.projects
    .map((entry) => entry.project)
    .filter((project) => project._count.authors === 1);

  const { Octokit } = await import("octokit");
  const { del } = await import("@vercel/blob");

  for (const project of soloProjects) {
    // Repositorio de GitHub (mejor esfuerzo).
    if (project.githubRepo) {
      try {
        const [owner, repo] = project.githubRepo.split("/");
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        await octokit.rest.repos.delete({ owner, repo });
      } catch {
        // El repo puede no existir o el token no tener permisos de borrado.
      }
    }

    // Portada en Vercel Blob (mejor esfuerzo).
    if (project.coverImage) {
      try {
        await del(project.coverImage);
      } catch {
        // Ignorar
      }
    }

    await prisma.project.delete({ where: { id: project.id } });
  }

  // El borrado de la cuenta limpia en cascada el resto de su actividad.
  await prisma.user.delete({ where: { id: userId } });

  // Si tenía la sesión abierta, que se cierre sola.
  await pusherServer.trigger(`user-session-${userId}`, "account-deleted", {});

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}
