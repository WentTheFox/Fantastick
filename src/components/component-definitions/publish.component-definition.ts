import { ButtonStyle } from 'discord-api-types/v10';
import { ComponentType } from 'discord.js';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import {
  BotMessageComponentCustomId,
  BotMessageComponentDefinitionGetter,
} from '../../types/bot-interaction.js';

export const publishOpenComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.PUBLISH_OPEN,
  label: t('commands.publish-imported-pack.components.editButton'),
  style: ButtonStyle.Primary,
  emoji: { name: EmojiCharacters.PENCIL },
});

export const publishPrevComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.PUBLISH_PREV,
  label: t('commands.publish-imported-pack.components.previousButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.ARROW_LEFT },
});

export const publishNextComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.PUBLISH_NEXT,
  label: t('commands.publish-imported-pack.components.nextButton'),
  style: ButtonStyle.Secondary,
  emoji: { name: EmojiCharacters.ARROW_RIGHT },
});

export const publishConfirmComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.PUBLISH_CONFIRM,
  label: t('commands.publish-imported-pack.components.publishButton'),
  style: ButtonStyle.Success,
  emoji: { name: EmojiCharacters.ROCKET },
});

export const publishJumpInvalidComponentDefinition: BotMessageComponentDefinitionGetter = (t) => ({
  type: ComponentType.Button,
  custom_id: BotMessageComponentCustomId.PUBLISH_JUMP_INVALID,
  label: t('commands.publish-imported-pack.components.jumpToInvalidButton'),
  style: ButtonStyle.Secondary,
});
