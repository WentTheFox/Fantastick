import { getStickerOptions } from '../options/sticker.options.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { stickerCommandAutocomplete } from './autocomplete/sticker.command-autocomplete.js';
import { stickerCommandHandler } from './command-handlers/sticker.command-handler.js';

const nsfw = false;

export const stickerCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.sticker.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.sticker.name', { lng })),
    options: getStickerOptions(t),
    nsfw,
  }),
  autocomplete: stickerCommandAutocomplete(nsfw),
  handle: stickerCommandHandler(nsfw),
};
