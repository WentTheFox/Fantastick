-- DropIndex
DROP INDEX "Pack_name_key";

-- AlterTable
ALTER TABLE "Pack" ALTER COLUMN "name" SET DATA TYPE TEXT;
ALTER TABLE "Pack" ADD COLUMN     "lastImportedAt" TIMESTAMPTZ(0);

-- AlterTable
ALTER TABLE "Sticker" ALTER COLUMN "name" SET DATA TYPE TEXT;
ALTER TABLE "Sticker" ADD COLUMN     "emoji" TEXT;

-- CreateIndex
CREATE INDEX "Pack_name_idx" ON "Pack"("name");

-- Imported packs are always public
UPDATE "Pack" SET "public" = true WHERE "telegramPackName" IS NOT NULL;

-- Split legacy imported sticker names ("😀#3") into the emoji column and a blank user label
UPDATE "Sticker"
SET "emoji" = split_part("name", '#', 1), "name" = ''
WHERE "telegramFileUniqueId" IS NOT NULL AND "name" ~ '^[^#]*#[0-9]+$';
