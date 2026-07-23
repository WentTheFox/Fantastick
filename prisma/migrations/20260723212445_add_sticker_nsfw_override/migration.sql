-- AlterTable
ALTER TABLE "Sticker" ADD COLUMN     "nsfwOverride" BOOLEAN;

-- Enforce at most one published (public) copy per Telegram pack
CREATE UNIQUE INDEX "Pack_telegramPackId_public_unique"
  ON "Pack" ("telegramPackId")
  WHERE "public" = true AND "deletedAt" IS NULL AND "telegramPackId" IS NOT NULL;
