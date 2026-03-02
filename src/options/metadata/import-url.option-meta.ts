import { StringOptionMetadata } from '../../types/bot-interaction.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const stickerUrlPrefix = 'https://t.me/addstickers/';
const stickerUrlMinLength = `${stickerUrlPrefix}a`.length;

export const importUrlOptionMeta = {
  type: ApplicationCommandOptionType.String,
  min_length: stickerUrlMinLength,
  max_length: 255,
} satisfies StringOptionMetadata;
