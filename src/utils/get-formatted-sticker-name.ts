import { Sticker } from '../generated/prisma/client.js';

export const getFormattedStickerName = (sticker: Pick<Sticker, 'name' | 'emoji' | 'order' | 'telegramFileUniqueId'>) =>
  sticker.telegramFileUniqueId !== null
    ? `${sticker.emoji ?? ''}#${sticker.order + 1}${sticker.name ? ` ${sticker.name}` : ''}`
    : sticker.name;
