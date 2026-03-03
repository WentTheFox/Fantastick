/*
  Warnings:

  - The primary key for the `StickerMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[messageId,serverId]` on the table `StickerMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StickerMessage" DROP CONSTRAINT "StickerMessage_pkey",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "StickerMessage_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "StickerMessage_messageId_stickerId_key" ON "StickerMessage"("messageId", "stickerId");
