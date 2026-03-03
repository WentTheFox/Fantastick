import { StringOptionMetadata } from '../../types/bot-interaction.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const packNameInvalidPattern = /[^\w -]/g;

export const packNameOptionMeta = {
  type: ApplicationCommandOptionType.String,
  min_length: 3,
  max_length: 255,
} satisfies StringOptionMetadata;
