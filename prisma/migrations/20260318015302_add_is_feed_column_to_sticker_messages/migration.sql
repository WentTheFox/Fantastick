-- AlterTable
ALTER TABLE "StickerMessage" ADD COLUMN     "isFeed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "StickerMessage_isFeed_idx" ON "StickerMessage"("isFeed");
