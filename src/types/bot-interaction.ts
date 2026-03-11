import {
  ApplicationCommandOptionType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import type {
  AutocompleteInteraction,
  BaseInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import { i18n, TFunction } from 'i18next';
import { PrismaClient } from '../generated/prisma/client.js';

import { NestableLogger } from './logger-types.js';

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

export const enum BotModalId {
  CREATE_STICKER = 'createStickerModal',
  EDIT_STICKER = 'editStickerModal',
  DELETE_STICKER = 'deleteStickerModal',
}

export interface LoggerContext {
  logger: NestableLogger;
}

export interface InteractionHandlerContext extends LoggerContext {
  i18next: i18n;
  emojiIdMap: Record<string, string>;
  commandIdMap: Record<string, string | undefined>;
  db: PrismaClient;
}

export interface InteractionContext extends Omit<InteractionHandlerContext, 'i18next'> {
  t: TFunction;
}

export type UserInteractionContext = InteractionContext;

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

export interface BotChatInputCommand {
  registerCondition?: () => boolean;
  getDefinition: (t: TFunction) => RESTPostAPIChatInputApplicationCommandsJSONBody;
  handle: InteractionHandler<ChatInputCommandInteraction & {
    commandName: BotChatInputCommandName
  }>;
  autocomplete?: AutocompleteHandlers;
  modal?: ModalHandlers;
}

export interface StringOptionMetadata {
  type: ApplicationCommandOptionType.String;
  min_length?: number;
  max_length?: number;
  autocomplete?: boolean;
}
