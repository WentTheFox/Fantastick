import { ComponentType } from 'discord-api-types/v10';
import { MessageEditOptions } from 'discord.js';
import { Sticker, TelegramSticker } from '../generated/prisma/client.js';
import { mapStickersToGalleryItems, StickerGalleryItems } from './map-stickers-to-gallery-items.js';

interface GetStickerMessageContentParams {
  stickers: (Sticker & { telegramSticker?: TelegramSticker | null })[];
}

export const getStickerMessageContent = ({
  stickers,
}: GetStickerMessageContentParams): Pick<MessageEditOptions, 'components'> & {
  files?: StickerGalleryItems['files']
} => {
  const { files, items } = mapStickersToGalleryItems(stickers);

  return {
    components: [
      {
        type: ComponentType.MediaGallery,
        items,
      },
    ],
    files,
  };
};
