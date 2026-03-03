import type { AutocompleteInteraction } from 'discord.js';
import { InteractionHandler } from '../../types/bot-interaction.js';
import { PackCommandOptionName } from '../../types/localization.js';
import { handlePackNameAutocomplete } from '../../utils/autocomplete/pack-name.autocomplete.js';

export const packCommandAutocomplete = (nsfw: boolean): InteractionHandler<AutocompleteInteraction> => async function autocomplete(interaction, context) {
  const focusedOption = interaction.options.getFocused(true);

  switch (focusedOption.name) {
    case PackCommandOptionName.NAME:
      await handlePackNameAutocomplete({
        interaction,
        context,
        optionName: focusedOption.name,
        nsfw,
      });
      break;
    default:
      throw new Error(`Unknown autocomplete option ${focusedOption.name}`);
  }
};
