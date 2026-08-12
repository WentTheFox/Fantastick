import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';
import { AvailableStickerPack } from './find-available-sticker-packs.js';
import { getFormattedStickerName } from './get-formatted-sticker-name.js';
import { getNonNsfwStickerFilter } from './get-non-nsfw-sticker-filter.js';

export interface RankedStickerMatch {
  id: string;
  packId: string;
  order: number;
  displayName: string;
}

interface FindRankedStickersOptions {
  nsfw?: boolean;
  excludeImported?: boolean;
  query?: string;
}

/**
 * Ranks the given user's own stickers (within `availablePacks`) by their personal usage count
 * (most-used first, ties broken by sticker order), optionally filtered to those whose display
 * name contains `query`. Shared between the sticker-name autocomplete handler and the sticker
 * command handler's fallback lookup for free-typed (non-UUID) input.
 */
export const findRankedStickers = async (context: Pick<InteractionContext, 'db'>, interaction: CommandInteraction | AutocompleteInteraction, availablePacks: AvailableStickerPack[], { nsfw = false, excludeImported = false, query }: FindRankedStickersOptions = {}): Promise<RankedStickerMatch[]> => {
  const { db } = context;
  if (availablePacks.length === 0) return [];

  const userStickers = await db.sticker.findMany({
    select: { id: true, name: true, packId: true, order: true, telegramSticker: { select: { emoji: true, order: true } } },
    where: {
      deletedAt: null,
      packId: {
        in: availablePacks.map(pack => pack.id),
      },
      ...getNonNsfwStickerFilter(nsfw),
      ...(excludeImported ? { telegramStickerId: null } : {}),
    },
  });

  const usageRows = await db.stickerUsage.findMany({
    select: { stickerId: true, count: true },
    where: {
      userId: BigInt(interaction.user.id),
      stickerId: { in: userStickers.map(sticker => sticker.id) },
    },
  });
  const usageByStickerId = new Map(usageRows.map(row => [row.stickerId, row.count]));

  const normalizedQuery = query?.trim().toLowerCase();

  return userStickers
    .map(sticker => ({ id: sticker.id, packId: sticker.packId, order: sticker.order, displayName: getFormattedStickerName(sticker) }))
    .filter(sticker => !normalizedQuery || sticker.displayName.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => {
      const usageDiff = (usageByStickerId.get(b.id) ?? 0) - (usageByStickerId.get(a.id) ?? 0);
      if (usageDiff !== 0) return usageDiff;
      return a.order - b.order;
    });
};
