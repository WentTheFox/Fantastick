import { BotChatInputCommand } from '../types/bot-interaction.js';
import { stickerCommandAutocomplete } from './autocomplete/sticker.command-autocomplete.js';
import { stickerCommandHandler } from './command-handlers/sticker.command-handler.js';

const nsfw = true;

export const nsfwStickerCommand: BotChatInputCommand = {
  name: 'nsfw-sticker',
  autocomplete: stickerCommandAutocomplete(nsfw),
  handle: stickerCommandHandler(nsfw),
};
