/*
  Warnings:

  - A unique constraint covering the columns `[interactionId,interactionToken]` on the table `StickerMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StickerMessage_messageId_channelId_key";

-- AlterTable
ALTER TABLE "StickerMessage" ADD COLUMN     "interactionId" BIGINT,
ADD COLUMN     "interactionToken" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "StickerMessage_interactionId_interactionToken_key" ON "StickerMessage"("interactionId", "interactionToken");
