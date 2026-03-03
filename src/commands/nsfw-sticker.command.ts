import { getStickerOptions } from '../options/sticker.options.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { stickerCommandAutocomplete } from './autocomplete/sticker.command-autocomplete.js';
import { stickerCommandHandler } from './handlers/sticker.command-handler.js';

const nsfw = true;

export const nsfwStickerCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.nsfw-sticker.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.nsfw-sticker.name', { lng })),
    options: getStickerOptions(t),
    nsfw,
  }),
  autocomplete: stickerCommandAutocomplete(nsfw),
  handle: stickerCommandHandler(nsfw),
};
