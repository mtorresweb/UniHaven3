import "server-only";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/constants";

/**
 * Los proyectos aprobados son públicos.
 * Los que no lo están sólo los pueden ver sus autores y los admins.
 */
export async function canViewProject(project: {
  status: string;
  authors: { userId: string }[];
}): Promise<boolean> {
  if (project.status === "APPROVED") {
    return true;
  }

  const session = await auth();
  if (!session?.user) {
    return false;
  }

  if (session.user.role === Role.ADMIN) {
    return true;
  }

  return project.authors.some((author) => author.userId === session.user.id);
}
