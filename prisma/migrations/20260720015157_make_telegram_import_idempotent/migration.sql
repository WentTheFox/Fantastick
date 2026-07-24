/*
  Warnings:

  - You are about to drop the column `telegramPackName` on the `Pack` table. All the data in the column will be lost.
  - You are about to drop the column `telegramFileUniqueId` on the `Sticker` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Pack_name_key";

-- DropIndex
DROP INDEX "Pack_telegramPackName_idx";

-- DropIndex
DROP INDEX "Sticker_telegramFileUniqueId_idx";

-- AlterTable
ALTER TABLE "Pack" DROP COLUMN "telegramPackName",
ADD COLUMN     "telegramPackId" UUID,
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Sticker" DROP COLUMN "telegramFileUniqueId",
ADD COLUMN     "telegramStickerId" UUID,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "url" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TelegramPack" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "telegramPackName" VARCHAR(255) NOT NULL,
    "title" TEXT NOT NULL,
    "lastImportedAt" TIMESTAMPTZ(0),
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0),

    CONSTRAINT "TelegramPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramSticker" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "telegramPackId" UUID NOT NULL,
    "telegramFileUniqueId" VARCHAR(255) NOT NULL,
    "emoji" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "url" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0),
    "deletedAt" TIMESTAMPTZ(0),

    CONSTRAINT "TelegramSticker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramPack_telegramPackName_key" ON "TelegramPack"("telegramPackName");

-- CreateIndex
CREATE INDEX "TelegramSticker_deletedAt_idx" ON "TelegramSticker"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSticker_telegramPackId_telegramFileUniqueId_key" ON "TelegramSticker"("telegramPackId", "telegramFileUniqueId");

-- CreateIndex
CREATE INDEX "Pack_name_idx" ON "Pack"("name");

-- CreateIndex
CREATE INDEX "Pack_telegramPackId_idx" ON "Pack"("telegramPackId");

-- CreateIndex
CREATE INDEX "Sticker_telegramStickerId_idx" ON "Sticker"("telegramStickerId");

-- AddForeignKey
ALTER TABLE "TelegramSticker" ADD CONSTRAINT "TelegramSticker_telegramPackId_fkey" FOREIGN KEY ("telegramPackId") REFERENCES "TelegramPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_telegramPackId_fkey" FOREIGN KEY ("telegramPackId") REFERENCES "TelegramPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_telegramStickerId_fkey" FOREIGN KEY ("telegramStickerId") REFERENCES "TelegramSticker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
