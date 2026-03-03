import type { AutocompleteInteraction } from 'discord.js';
import { InteractionHandler } from '../../types/bot-interaction.js';
import { StickerCommandOptionName } from '../../types/localization.js';
import { handleStickerAutocomplete } from '../../utils/autocomplete/sticker-name.autocomplete.js';

export const stickerCommandAutocomplete = (nsfw: boolean): InteractionHandler<AutocompleteInteraction> => async function autocomplete(interaction, context) {
  const focusedOption = interaction.options.getFocused(true);

  switch (focusedOption.name) {
    case StickerCommandOptionName.NAME:
      await handleStickerAutocomplete({
        interaction: interaction,
        context: context,
        optionName: focusedOption.name,
        nsfw,
      });
      break;
    default:
      throw new Error(`Unknown autocomplete option ${focusedOption.name}`);
  }
};
