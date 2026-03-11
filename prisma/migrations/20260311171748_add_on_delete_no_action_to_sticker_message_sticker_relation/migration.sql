-- DropForeignKey
ALTER TABLE "StickerMessage" DROP CONSTRAINT "StickerMessage_stickerId_fkey";

-- AddForeignKey
ALTER TABLE "StickerMessage" ADD CONSTRAINT "StickerMessage_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
