import { AutocompleteHandler } from '../../types/bot-interaction.js';
import { findRankedStickers } from '../find-ranked-stickers.js';
import { getPackDisplayName } from '../get-formatted-pack-name.js';
import { truncateToMaximumLength } from '../messaging.js';
import { findAvailableStickerPacks } from '../find-available-sticker-packs.js';

interface StickerNameAutocompleteOptions {
  nsfw?: boolean;
  excludeImported?: boolean;
}

export const getStickerNameAutocompleteHandler = (nsfwOrOptions: boolean | StickerNameAutocompleteOptions = false): AutocompleteHandler => async (interaction, context, optionName) => {
  const { nsfw = false, excludeImported = false } = typeof nsfwOrOptions === 'boolean' ? { nsfw: nsfwOrOptions } : nsfwOrOptions;
  const value = interaction.options.getString(optionName, true);
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

  const matches = await findRankedStickers({ db }, interaction, availablePacks, { nsfw, excludeImported, query: value });

  await interaction.respond(matches
    .slice(0, 25)
    .map(sticker => {
      const name = truncateToMaximumLength(`${sticker.displayName} (${packNameIndex[sticker.packId]})`, 100);
      return ({ name, value: sticker.id });
    }));
};
