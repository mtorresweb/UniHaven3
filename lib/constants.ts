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

export const AnnouncementPriority = {
  INFO: "INFO",
  IMPORTANT: "IMPORTANT",
  URGENT: "URGENT",
} as const;

export type AnnouncementPriority =
  (typeof AnnouncementPriority)[keyof typeof AnnouncementPriority];
