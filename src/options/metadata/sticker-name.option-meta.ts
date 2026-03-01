import { StringOptionMetadata } from '../../types/bot-interaction.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const stickerNameOptionMeta: StringOptionMetadata = {
  type: ApplicationCommandOptionType.String,
  min_length: 1,
  max_length: 255,
};
