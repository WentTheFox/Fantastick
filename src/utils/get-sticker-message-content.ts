import { ComponentType } from 'discord-api-types/v10';
import { MessageEditOptions } from 'discord.js';
import { Pack, Sticker, TelegramSticker } from '../generated/prisma/client.js';
import { mapStickersToGalleryItems, StickerGalleryItems } from './map-stickers-to-gallery-items.js';
import { resolveStickerNsfw } from './resolve-sticker-nsfw.js';

interface GetStickerMessageContentParams {
  stickers: (Sticker & { telegramSticker?: TelegramSticker | null, pack: Pick<Pack, 'nsfw'> })[];
}

export const getStickerMessageContent = ({
  stickers,
}: GetStickerMessageContentParams): Pick<MessageEditOptions, 'components'> & {
  files?: StickerGalleryItems['files']
} => {
  const { files, items } = mapStickersToGalleryItems(stickers, stickers.map(sticker => resolveStickerNsfw(sticker, sticker.pack)));

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
