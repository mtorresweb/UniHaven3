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
 */
export const UPLOAD_LIMITS = {
  /** Tamaño máximo por archivo. */
  maxFileSize: 25 * 1024 * 1024,
  /** Tamaño máximo del conjunto de archivos. */
  maxTotalSize: 50 * 1024 * 1024,
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
