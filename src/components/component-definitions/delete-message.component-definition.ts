import { ButtonStyle } from 'discord-api-types/v10';
import { ComponentType } from 'discord.js';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import {
  BotMessageComponentCustomId,
  BotMessageComponentDefinitionGetter,
} from '../../types/bot-interaction.js';

export const deleteMessageComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.DELETE_MESSAGE,
  label: t('commands.sticker.components.deleteMessageButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.TRASH_CAN }
});
