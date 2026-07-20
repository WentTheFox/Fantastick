import { Sticker, TelegramSticker } from '../generated/prisma/client.js';

export type FormattableSticker = Pick<Sticker, 'name'> & {
  telegramSticker: Pick<TelegramSticker, 'emoji' | 'order'> | null;
};

export const getFormattedStickerName = (sticker: FormattableSticker) =>
  sticker.telegramSticker !== null
    ? `${sticker.telegramSticker.emoji}#${sticker.telegramSticker.order + 1}${sticker.name ? ` ${sticker.name}` : ''}`
    : sticker.name;
