import { Pack, Sticker } from '../generated/prisma/client.js';

// A sticker's own rating override takes precedence over its pack's default rating
export const resolveStickerNsfw = (sticker: Pick<Sticker, 'nsfwOverride'>, pack: Pick<Pack, 'nsfw'>) => (
  sticker.nsfwOverride ?? pack.nsfw
);
