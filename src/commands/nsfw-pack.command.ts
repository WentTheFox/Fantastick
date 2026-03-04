import { packOptions } from '../options/pack.options.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { packCommandAutocomplete } from './autocomplete/pack.command-autocomplete.js';
import { packCommandHandler } from './command-handlers/pack.command-handler.js';

const nsfw = true;

export const nsfwPackCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.nsfw-pack.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.nsfw-pack.name', { lng })),
    options: packOptions(t),
    nsfw,
  }),
  autocomplete: packCommandAutocomplete(nsfw),
  handle: packCommandHandler(nsfw),
};
