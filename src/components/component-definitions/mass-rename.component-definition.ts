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

export const massRenamePrevComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.MASS_RENAME_PREV,
  label: t('commands.mass-rename-stickers.components.previousButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.ARROW_LEFT },
});

export const massRenameNextComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.MASS_RENAME_NEXT,
  label: t('commands.mass-rename-stickers.components.nextButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.ARROW_RIGHT },
});
