import { ButtonStyle } from 'discord-api-types/v10';
import { ComponentType } from 'discord.js';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import {
  BotMessageComponentCustomId,
  BotMessageComponentDefinitionGetter,
} from '../../types/bot-interaction.js';

export const massEditOpenComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.MASS_EDIT_OPEN,
  label: t('commands.mass-edit-stickers.components.editButton'),
  style: ButtonStyle.Primary,
  emoji: { name: EmojiCharacters.PENCIL },
});

export const massEditPrevComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.MASS_EDIT_PREV,
  label: t('commands.mass-edit-stickers.components.previousButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.ARROW_LEFT },
});

export const massEditNextComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.MASS_EDIT_NEXT,
  label: t('commands.mass-edit-stickers.components.nextButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.ARROW_RIGHT },
});
