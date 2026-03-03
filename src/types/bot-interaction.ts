import {
  ApplicationCommandOptionType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import type {
  AutocompleteInteraction,
  BaseInteraction,
  ChatInputCommandInteraction, ModalSubmitInteraction,
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
}

export const enum BotModalIds {
  CREATE_STICKER = 'createStickerModal',
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

export interface BotChatInputCommand {
  registerCondition?: () => boolean;
  getDefinition: (t: TFunction) => RESTPostAPIChatInputApplicationCommandsJSONBody;
  handle: InteractionHandler<ChatInputCommandInteraction & {
    commandName: BotChatInputCommandName
  }>;
  autocomplete?: InteractionHandler<AutocompleteInteraction & {
    commandName: BotChatInputCommandName
  }>;
  modal?: InteractionHandler<ModalSubmitInteraction & {
    customId: BotModalIds
  }>;
}

export interface StringOptionMetadata {
  type: ApplicationCommandOptionType.String;
  min_length?: number;
  max_length?: number;
  autocomplete?: boolean;
}
