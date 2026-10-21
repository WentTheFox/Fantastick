import { Prisma } from '../../generated/prisma/client.js';
import { StickerWhereInput } from '../../generated/prisma/models/Sticker.js';
import { getAvailablePackWhere } from '../find-available-sticker-packs.js';
import { getPackDisplayName } from '../get-formatted-pack-name.js';
import { getFormattedStickerName } from '../get-formatted-sticker-name.js';
import { getNonNsfwStickerFilter } from '../get-non-nsfw-sticker-filter.js';

/**
 * Everything the OpenSearch and Postgres sticker searches have in common, so that both return
 * the same stickers in the same order: the visibility rules, the shape of a result, the
 * query matching and the ranking.
 */
export interface StickerSearchMatch {
  id: string;
  packId: string;
  order: number;
  displayName: string;
  packDisplayName: string;
}

export interface StickerSearchOptions {
  nsfw: boolean;
  excludeImported: boolean;
  query: string;
  limit: number;
}

export const defaultSearchLimit = 25;

/** The one definition of which stickers a user may see (own + public packs, rating, imports). */
export const getVisibleStickerWhere = (userId: string, { nsfw, excludeImported }: Pick<StickerSearchOptions, 'nsfw' | 'excludeImported'>): StickerWhereInput => ({
  deletedAt: null,
  ...getNonNsfwStickerFilter(nsfw),
  ...(excludeImported ? { telegramStickerId: null } : {}),
  pack: getAvailablePackWhere(userId, nsfw),
});

export const visibleStickerSelect = {
  id: true,
  name: true,
  packId: true,
  order: true,
  telegramSticker: { select: { emoji: true, order: true } },
  pack: { select: { name: true, telegramPack: { select: { title: true } } } },
} satisfies Prisma.StickerSelect;

export type VisibleSticker = Prisma.StickerGetPayload<{ select: typeof visibleStickerSelect }>;

export const normalizeSearchQuery = (query: string) => query.trim().toLowerCase();

export const toStickerSearchMatch = (sticker: VisibleSticker): StickerSearchMatch => ({
  id: sticker.id,
  packId: sticker.packId,
  order: sticker.order,
  displayName: getFormattedStickerName(sticker),
  packDisplayName: getPackDisplayName(sticker.pack),
});

export const matchesSearchQuery = (match: Pick<StickerSearchMatch, 'displayName'>, normalizedQuery: string) => (
  !normalizedQuery || match.displayName.toLowerCase().includes(normalizedQuery)
);

/**
 * The single ranking every search path uses: the caller's most-used stickers first, then by
 * sticker order, then by id. The id tiebreak makes the order total, so equal candidates can
 * never come out differently between paths (or between runs).
 */
export const compareStickerRank = (usageById: ReadonlyMap<string, number>) => (a: Pick<StickerSearchMatch, 'id' | 'order'>, b: Pick<StickerSearchMatch, 'id' | 'order'>) => (
  (usageById.get(b.id) ?? 0) - (usageById.get(a.id) ?? 0)
  || a.order - b.order
  || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
);
