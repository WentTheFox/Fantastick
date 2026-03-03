import { AutocompleteInteraction } from 'discord.js';
import { InteractionContext } from '../../types/bot-interaction.js';
import { findAvailableStickerPacks } from '../find-available-sticker-packs.js';
import { getFormattedPackName } from '../get-formatted-pack-name.js';

interface HandlePackNameAutocompleteParams {
  interaction: AutocompleteInteraction;
  context: InteractionContext;
  optionName: string;
  nsfw?: boolean;
}

export const handlePackNameAutocomplete = async ({
  interaction,
  context,
  optionName,
  nsfw = false,
}: HandlePackNameAutocompleteParams) => {
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
