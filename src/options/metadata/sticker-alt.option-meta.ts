import { StringOptionMetadata } from '../../types/bot-interaction.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const stickerAltOptionMeta = {
  type: ApplicationCommandOptionType.String,
  min_length: 0,
  max_length: 255,
} satisfies StringOptionMetadata;
