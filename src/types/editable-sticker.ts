import { Pack, Sticker, TelegramPack, TelegramSticker } from '../generated/prisma/client.js';

export type EditableSticker = Sticker & {
  pack: Pack & { telegramPack: TelegramPack | null };
  telegramSticker: TelegramSticker | null;
};
