/**
 * Standalone constants safe for use in both server and client components.
 * Do NOT import anything from @prisma/client or the generated client here.
 */

export const Role = {
  ADMIN: "ADMIN",
  UPC_STUDENT: "UPC_STUDENT",
  GENERAL: "GENERAL",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** Roles con permiso para subir proyectos. */
export function canUploadProjects(role: Role | null | undefined): boolean {
  return role === Role.UPC_STUDENT || role === Role.ADMIN;
}

export const ProjectType = {
  THESIS: "THESIS",
  RESEARCH: "RESEARCH",
  CLASSROOM: "CLASSROOM",
} as const;

export type ProjectType = (typeof ProjectType)[keyof typeof ProjectType];

export const ProjectStatus = {
  DRAFT: "DRAFT",
  IN_REVIEW: "IN_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NEEDS_REVISION: "NEEDS_REVISION",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ReactionType = {
  LIKE: "LIKE",
  LOVE: "LOVE",
  CELEBRATE: "CELEBRATE",
  THINKING: "THINKING",
} as const;

export type ReactionType = (typeof ReactionType)[keyof typeof ReactionType];

export const ReportCategory = {
  INAPPROPRIATE: "INAPPROPRIATE",
  PLAGIARISM: "PLAGIARISM",
  FALSE_INFO: "FALSE_INFO",
  OTHER: "OTHER",
} as const;

export type ReportCategory =
  (typeof ReportCategory)[keyof typeof ReportCategory];

/**
 * Límites de subida de archivos. Viven aquí para que el formulario (cliente) y
 * las server actions usen exactamente los mismos valores.
 *
 * Ajustados para instancias con poca RAM (Render free: 512 MB): la API de
 * GitHub exige base64, así que subir un archivo usa ~3.6x su tamaño de forma
 * transitoria. Si subes de plan, estos números se pueden aumentar.
 */
export const UPLOAD_LIMITS = {
  /** Tamaño máximo por archivo. */
  maxFileSize: 15 * 1024 * 1024,
  /** Tamaño máximo del conjunto de archivos. */
  maxTotalSize: 30 * 1024 * 1024,
} as const;

/** Dominio institucional de la UPC. */
export const UPC_EMAIL_DOMAIN = "unicesar.edu.co";

/**
 * Los correos fuera del dominio institucional no pueden pasar de GENERAL,
 * ni al registrarse ni desde el panel de administración.
 */
export function isUpcEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${UPC_EMAIL_DOMAIN}`);
}
