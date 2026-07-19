import { ButtonStyle } from 'discord-api-types/v10';
import { ComponentType } from 'discord.js';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import {
  BotMessageComponentCustomId,
  BotMessageComponentDefinitionGetter,
} from '../../types/bot-interaction.js';

export const packPageFirstComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.PACK_PAGE_FIRST,
  label: t('commands.pack.components.firstPageButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.SKIP_BACK },
});

export const packPagePrevComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.PACK_PAGE_PREV,
  label: t('commands.pack.components.previousPageButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.ARROW_LEFT },
});

export const packPageNextComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.PACK_PAGE_NEXT,
  label: t('commands.pack.components.nextPageButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.ARROW_RIGHT },
});

export const packPageLastComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.PACK_PAGE_LAST,
  label: t('commands.pack.components.lastPageButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.SKIP_FORWARD },
});
