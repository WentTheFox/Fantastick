import { packOptions } from '../options/pack.options.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { packCommandAutocomplete } from './autocomplete/pack.command-autocomplete.js';
import { packCommandHandler } from './handlers/pack.command-handler.js';

const nsfw = false;

export const packCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.pack.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.pack.name', { lng })),
    options: packOptions(t),
    nsfw,
  }),
  autocomplete: packCommandAutocomplete(nsfw),
  handle: packCommandHandler(nsfw),
};
