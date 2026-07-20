import { Sticker, TelegramSticker } from '../generated/prisma/client.js';

export type StickerUrlSource = Pick<Sticker, 'url'> & {
  telegramSticker?: Pick<TelegramSticker, 'url'> | null;
};

// Imported stickers store their file on the shared TelegramSticker row; regular stickers on their own row
export const getStickerUrl = (sticker: StickerUrlSource): string => sticker.telegramSticker?.url ?? sticker.url ?? '';
