import { AutocompleteHandler } from '../../types/bot-interaction.js';
import { findStickers } from '../find-stickers.js';
import { truncateToMaximumLength } from '../messaging.js';

interface StickerNameAutocompleteOptions {
  nsfw?: boolean;
  excludeImported?: boolean;
}

export const getStickerNameAutocompleteHandler = (nsfwOrOptions: boolean | StickerNameAutocompleteOptions = false): AutocompleteHandler => async (interaction, context, optionName) => {
  const { nsfw = false, excludeImported = false } = typeof nsfwOrOptions === 'boolean' ? { nsfw: nsfwOrOptions } : nsfwOrOptions;
  const value = interaction.options.getString(optionName, true);

  const matches = await findStickers(context, interaction, { nsfw, excludeImported, query: value });

  await interaction.respond(matches.map(sticker => ({
    name: truncateToMaximumLength(`${sticker.displayName} (${sticker.packDisplayName})`, 100),
    value: sticker.id,
  })));
};
