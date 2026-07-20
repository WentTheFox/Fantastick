import { ButtonStyle } from 'discord-api-types/v10';
import { ComponentType } from 'discord.js';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import {
  BotMessageComponentCustomId,
  BotMessageComponentDefinitionGetter,
} from '../../types/bot-interaction.js';

export const massRenameOpenComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.MASS_RENAME_OPEN,
  label: t('commands.mass-rename-stickers.components.renameButton'),
  style: ButtonStyle.Primary,
  emoji: { name: EmojiCharacters.PENCIL },
});

export const massRenameSkipComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.MASS_RENAME_SKIP,
  label: t('commands.mass-rename-stickers.components.skipButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.SKIP_FORWARD },
});
