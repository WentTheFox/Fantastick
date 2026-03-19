import { ButtonStyle } from 'discord-api-types/v10';
import { ComponentType } from 'discord.js';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import {
  BotMessageComponentCustomId,
  BotMessageComponentDefinitionGetter,
} from '../../types/bot-interaction.js';

export const updateMessageComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.UPDATE_MESSAGE,
  label: t('commands.sticker.components.updateMessageButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.RELOAD },
});
