import { StringOptionMetadata } from '../../types/bot-interaction.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const stickerUrlMinLength = 'https://a.b/c'.length;

export const stickerUrlOptionMeta = {
  type: ApplicationCommandOptionType.String,
  min_length: stickerUrlMinLength,
  max_length: 255,
} satisfies StringOptionMetadata;
