import { getStickerOptions } from '../options/sticker.options.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';

export const stickerCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.sticker.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.sticker.name', { lng })),
    options: getStickerOptions(t),
  }),
  async handle(interaction, context) {
    const {t} = context;
    await interaction.reply(t('commands.sticker.responses.invalidPack'));
  },
};
