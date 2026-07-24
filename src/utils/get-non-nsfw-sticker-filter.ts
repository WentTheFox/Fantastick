import { StickerWhereInput } from '../generated/prisma/models/Sticker.js';

// Stickers explicitly overridden to NSFW never appear in non-NSFW commands, even inside an
// otherwise safe-for-all-audiences pack. This must stay an inclusive OR over {null, false},
// not `NOT: { nsfwOverride: true }` — under SQL's three-valued NULL logic, a plain inequality
// comparison against `true` evaluates to NULL (not true) for every row where nsfwOverride is
// NULL, which is the *default*, no-override state most stickers are in, silently excluding
// them all instead of just the NSFW ones.
export const getNonNsfwStickerFilter = (nsfw: boolean): StickerWhereInput =>
  nsfw ? {} : { OR: [{ nsfwOverride: null }, { nsfwOverride: false }] };
