import { StringOptionMetadata } from '../../types/bot-interaction.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const packNameInvalidPattern = /[^\x20-\x7E]/g;

export const packNameOptionMeta = {
  type: ApplicationCommandOptionType.String,
  min_length: 3,
  max_length: 255,
} satisfies StringOptionMetadata;
