import {
  APIMessageComponent,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import type {
  AutocompleteInteraction,
  BaseInteraction,
  ChatInputCommandInteraction,
  MessageComponentInteraction,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import { TFunction } from 'i18next';

import { UserInteractionContext } from './contexts/user-interaction.context.js';

export const enum BotChatInputCommandName {
  STICKER = 'sticker',
  NSFW_STICKER = 'nsfw-sticker',
  CREATE_PACK = 'create-pack',
  IMPORT = 'import',
  CREATE_STICKER = 'create-sticker',
  PACK = 'pack',
  NSFW_PACK = 'nsfw-pack',
  EDIT_STICKER = 'edit-sticker',
  DELETE_STICKER = 'delete-sticker',
}

export const enum BotMessageContextMenuCommandName {
  UPDATE_MESSAGE = 'Update Message',
  STICKER_DETAILS = 'Sticker Details',
}

export const enum BotModalId {
  CREATE_STICKER = 'createStickerModal',
  EDIT_STICKER = 'editStickerModal',
  DELETE_STICKER = 'deleteStickerModal',
  CREATE_PACK = 'createPackModal',
}

export const enum BotMessageComponentCustomId {
  UPDATE_MESSAGE = 'update-message',
  DELETE_MESSAGE = 'delete-message',
}

export type InteractionHandler<T extends BaseInteraction> = (
  interaction: T,
  context: UserInteractionContext,
) => void | Promise<void>;

export type AutocompleteHandler = (
  interaction: AutocompleteInteraction,
  context: UserInteractionContext,
  optionName: string,
) => void | Promise<void>;

export type AutocompleteHandlers = Record<string, AutocompleteHandler>;

export type ModalHandler = (
  interaction: ModalSubmitInteraction,
  context: UserInteractionContext,
  resourceId: string | undefined,
) => void | Promise<void>;
export type ModalHandlers = Record<string, ModalHandler>;

export type BotMessageComponentHandler = InteractionHandler<MessageComponentInteraction & {
  customId: BotMessageComponentCustomId
}>;
export type BotMessageComponentDefinitionGetter = (t: TFunction, emojiIdMap: Record<string, string>) => APIMessageComponent;

export interface BotChatInputCommand {
  registerCondition?: () => boolean;
  getDefinition: (t: TFunction) => RESTPostAPIChatInputApplicationCommandsJSONBody;
  handle: InteractionHandler<ChatInputCommandInteraction & {
    commandName: BotChatInputCommandName
  }>;
  autocomplete?: AutocompleteHandlers;
  modal?: ModalHandlers;
}

export interface BotMessageContextMenuCommand {
  getDefinition: (t: TFunction) => Omit<RESTPostAPIContextMenuApplicationCommandsJSONBody, 'type'> & {
    type: ApplicationCommandType.Message
  };
  handle: InteractionHandler<MessageContextMenuCommandInteraction & {
    commandName: BotMessageContextMenuCommandName
  }>;
}

export interface BotMessageComponent {
  getDefinition: BotMessageComponentDefinitionGetter;
  handle: BotMessageComponentHandler;
}

export interface StringOptionMetadata {
  type: ApplicationCommandOptionType.String;
  min_length?: number;
  max_length?: number;
  autocomplete?: boolean;
}
