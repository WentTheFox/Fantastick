import { AutocompleteHandler } from '../../types/bot-interaction.js';
import { findAvailableStickerPacks } from '../find-available-sticker-packs.js';
import { getPackDisplayName } from '../get-formatted-pack-name.js';
import { getNonNsfwStickerFilter } from '../get-non-nsfw-sticker-filter.js';
import { getFormattedStickerName } from '../get-formatted-sticker-name.js';
import { truncateToMaximumLength } from '../messaging.js';

interface StickerNameAutocompleteOptions {
  nsfw?: boolean;
  excludeImported?: boolean;
}

export const getStickerNameAutocompleteHandler = (nsfwOrOptions: boolean | StickerNameAutocompleteOptions = false): AutocompleteHandler => async (interaction, context, optionName) => {
  const { nsfw = false, excludeImported = false } = typeof nsfwOrOptions === 'boolean' ? { nsfw: nsfwOrOptions } : nsfwOrOptions;
  const value = interaction.options.getString(optionName, true).trim().toLowerCase();
  const { db } = context;
  const availablePacks = await findAvailableStickerPacks(context, interaction, nsfw);
  if (availablePacks.length === 0) {
    await interaction.respond([]);
    return;
  }

  const packNameIndex = availablePacks.reduce((acc, pack) => ({
    ...acc,
    [pack.id]: getPackDisplayName(pack),
  }), {} as Record<string, string>);
  const userStickers = await db.sticker.findMany({
    select: { id: true, name: true, packId: true, telegramSticker: { select: { emoji: true, order: true } } },
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

  await interaction.respond(userStickers
    .map(sticker => ({ id: sticker.id, packId: sticker.packId, displayName: getFormattedStickerName(sticker) }))
    .filter(sticker => sticker.displayName.toLowerCase().includes(value))
    .sort((a, b) => (usageByStickerId.get(b.id) ?? 0) - (usageByStickerId.get(a.id) ?? 0))
    .slice(0, 25)
    .map(sticker => {
      const name = truncateToMaximumLength(`${sticker.displayName} (${packNameIndex[sticker.packId]})`, 100);
      return ({ name, value: sticker.id });
    }));
};
