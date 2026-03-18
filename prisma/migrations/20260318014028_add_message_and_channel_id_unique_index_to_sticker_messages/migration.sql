/*
  Warnings:

  - A unique constraint covering the columns `[messageId,channelId]` on the table `StickerMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StickerMessage_messageId_channelId_key" ON "StickerMessage"("messageId", "channelId");
