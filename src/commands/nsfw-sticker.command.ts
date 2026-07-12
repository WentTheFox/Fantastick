import { getStickerOptions } from '../options/sticker.options.js';
import { BotChatInputCommand, BotChatInputCommandName } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { stickerCommandAutocomplete } from './autocomplete/sticker.command-autocomplete.js';
import { stickerCommandHandler } from './command-handlers/sticker.command-handler.js';

const nsfw = true;

export const nsfwStickerCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.NSFW_STICKER,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.nsfw-sticker.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.nsfw-sticker.name', { lng })),
      options: getStickerOptions(t),
      nsfw,
    };
  },
  autocomplete: stickerCommandAutocomplete(nsfw),
  handle: stickerCommandHandler(nsfw),
};
