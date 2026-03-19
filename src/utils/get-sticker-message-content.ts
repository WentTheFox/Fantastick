import { ComponentType } from 'discord-api-types/v10';
import { MessageEditOptions } from 'discord.js';
import { Sticker } from '../generated/prisma/client.js';
import { mapStickersToGalleryItems } from './map-stickers-to-gallery-items.js';

export const getStickerMessageContent = (stickers: Sticker[]): Pick<MessageEditOptions, 'components' | 'files'> => {
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
