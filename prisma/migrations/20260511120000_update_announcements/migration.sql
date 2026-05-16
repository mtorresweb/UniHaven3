-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "body" TEXT;

-- CopyData
UPDATE "Announcement" SET "body" = "content";

-- AlterTable
ALTER TABLE "Announcement" ALTER COLUMN "body" SET NOT NULL,
DROP COLUMN "content",
DROP COLUMN "priority",
DROP COLUMN "expiresAt",
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "AnnouncementPriority";
