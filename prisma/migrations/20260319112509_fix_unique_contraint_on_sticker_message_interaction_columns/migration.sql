/*
  Warnings:

  - A unique constraint covering the columns `[interactionId,interactionToken,stickerId]` on the table `StickerMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StickerMessage_interactionId_interactionToken_key";

-- CreateIndex
CREATE UNIQUE INDEX "StickerMessage_interactionId_interactionToken_stickerId_key" ON "StickerMessage"("interactionId", "interactionToken", "stickerId");
