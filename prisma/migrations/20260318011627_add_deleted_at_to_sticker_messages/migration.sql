-- AlterTable
ALTER TABLE "StickerMessage" ADD COLUMN     "deletedAt" TIMESTAMPTZ(0);

-- CreateIndex
CREATE INDEX "StickerMessage_deletedAt_idx" ON "StickerMessage"("deletedAt");
