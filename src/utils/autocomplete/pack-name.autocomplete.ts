import { AutocompleteHandler } from '../../types/bot-interaction.js';
import { findAvailableStickerPacks } from '../find-available-sticker-packs.js';
import { getFormattedPackName } from '../get-formatted-pack-name.js';

export const getPackNameAutocompleteHandler = (nsfw = false): AutocompleteHandler => async (interaction, context, optionName) => {
  const value = interaction.options.getString(optionName, true).trim().toLowerCase();
  const availablePacks = await findAvailableStickerPacks(context, interaction, nsfw);
  if (availablePacks.length === 0) {
    await interaction.respond([]);
    return;
  }

  await interaction.respond(availablePacks.filter(pack => pack.name.toLowerCase().includes(value)).map(pack => ({
    name: getFormattedPackName(pack),
    value: pack.id,
  })));
};
