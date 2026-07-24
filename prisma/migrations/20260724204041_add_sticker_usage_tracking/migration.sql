-- AlterTable
ALTER TABLE "StickerMessage" ADD COLUMN     "userId" BIGINT;

-- CreateTable
CREATE TABLE "StickerUsage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" BIGINT NOT NULL,
    "stickerId" UUID NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "StickerUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StickerUsage_userId_count_idx" ON "StickerUsage"("userId", "count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "StickerUsage_userId_stickerId_key" ON "StickerUsage"("userId", "stickerId");

-- CreateIndex
CREATE INDEX "StickerMessage_isFeed_deletedAt_userId_stickerId_idx" ON "StickerMessage"("isFeed", "deletedAt", "userId", "stickerId");

-- AddForeignKey
ALTER TABLE "StickerMessage" ADD CONSTRAINT "StickerMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DiscordUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerUsage" ADD CONSTRAINT "StickerUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DiscordUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerUsage" ADD CONSTRAINT "StickerUsage_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
