import { BotChatInputCommand } from '../types/bot-interaction.js';
import { stickerCommandAutocomplete } from './autocomplete/sticker.command-autocomplete.js';
import { stickerCommandHandler } from './command-handlers/sticker.command-handler.js';

const nsfw = false;

export const stickerCommand: BotChatInputCommand = {
  name: 'sticker',
  autocomplete: stickerCommandAutocomplete(nsfw),
  handle: stickerCommandHandler(nsfw),
};
