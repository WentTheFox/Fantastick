-- CreateTable
CREATE TABLE "StickerMessage" (
    "messageId" BIGINT NOT NULL,
    "serverId" BIGINT,
    "channelId" BIGINT,
    "stickerId" UUID NOT NULL,

    CONSTRAINT "StickerMessage_pkey" PRIMARY KEY ("messageId")
);

-- AddForeignKey
ALTER TABLE "StickerMessage" ADD CONSTRAINT "StickerMessage_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
