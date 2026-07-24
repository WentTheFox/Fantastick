import { packOptions } from '../options/pack.options.js';
import { BotChatInputCommand, BotChatInputCommandName } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { packCommandAutocomplete } from './autocomplete/pack.command-autocomplete.js';
import { packCommandHandler } from './command-handlers/pack.command-handler.js';

const nsfw = false;

export const packCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.PACK,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.pack.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.pack.name', { lng })),
      options: packOptions(t),
      nsfw,
    };
  },
  autocomplete: packCommandAutocomplete(nsfw),
  handle: packCommandHandler(nsfw),
};
