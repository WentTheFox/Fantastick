import { BotChatInputCommand } from '../types/bot-interaction.js';
import { packCommandAutocomplete } from './autocomplete/pack.command-autocomplete.js';
import { packCommandHandler } from './command-handlers/pack.command-handler.js';

const nsfw = true;

export const nsfwPackCommand: BotChatInputCommand = {
  name: 'nsfw-pack',
  autocomplete: packCommandAutocomplete(nsfw),
  handle: packCommandHandler(nsfw),
};
