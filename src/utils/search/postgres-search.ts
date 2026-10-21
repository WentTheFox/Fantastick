import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { InteractionContext } from '../../types/contexts/interaction.context.js';
import {
  compareStickerRank,
  defaultSearchLimit,
  getVisibleStickerWhere,
  matchesSearchQuery,
  normalizeSearchQuery,
  StickerSearchMatch,
  StickerSearchOptions,
  toStickerSearchMatch,
  visibleStickerSelect,
} from './visible-stickers.js';

/**
 * Sticker search straight from Postgres: the source of truth, and the fallback whenever
 * OpenSearch is disabled or unavailable. Returns exactly what the OpenSearch path would.
 */
export const searchStickersInPostgres = async (context: Pick<InteractionContext, 'db'>, interaction: CommandInteraction | AutocompleteInteraction, { nsfw = false, excludeImported = false, query = '', limit = defaultSearchLimit }: Partial<StickerSearchOptions> = {}): Promise<StickerSearchMatch[]> => {
  const { db } = context;
  const userId = interaction.user.id;
  const normalizedQuery = normalizeSearchQuery(query);

  const [stickers, usageRows] = await Promise.all([
    db.sticker.findMany({
      select: visibleStickerSelect,
      where: getVisibleStickerWhere(userId, { nsfw, excludeImported }),
    }),
    db.stickerUsage.findMany({
      select: { stickerId: true, count: true },
      where: { userId: BigInt(userId) },
    }),
  ]);
  const usageById = new Map(usageRows.map(row => [row.stickerId, row.count]));

  return stickers
    .map(toStickerSearchMatch)
    .filter(match => matchesSearchQuery(match, normalizedQuery))
    .sort(compareStickerRank(usageById))
    .slice(0, limit);
};
