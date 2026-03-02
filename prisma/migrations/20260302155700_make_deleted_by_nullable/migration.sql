-- DropForeignKey
ALTER TABLE "Pack" DROP CONSTRAINT "Pack_deletedBy_fkey";

-- DropForeignKey
ALTER TABLE "Sticker" DROP CONSTRAINT "Sticker_deletedBy_fkey";

-- AlterTable
ALTER TABLE "Pack" ALTER COLUMN "deletedBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Sticker" ALTER COLUMN "deletedBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "DiscordUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "DiscordUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
