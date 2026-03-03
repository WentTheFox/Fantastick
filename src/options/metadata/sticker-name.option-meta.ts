import { StringOptionMetadata } from '../../types/bot-interaction.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const stickerNameInvalidPattern = /[^\x20-\x7E]/g;

export const stickerNameOptionMeta = {
  type: ApplicationCommandOptionType.String,
  min_length: 1,
  max_length: 255,
} satisfies StringOptionMetadata;
