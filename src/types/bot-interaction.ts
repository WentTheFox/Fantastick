import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import type {
  AutocompleteInteraction,
  BaseInteraction,
  ChatInputCommandInteraction,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';
import { MessageContextMenuCommandInteraction } from 'discord.js';
import { i18n, TFunction } from 'i18next';

import { NestableLogger } from './logger-types.js';

export const enum BotChatInputCommandName {
  STICKER = 'sticker',
}

export interface LoggerContext {
  logger: NestableLogger;
}

export interface InteractionHandlerContext extends LoggerContext {
  i18next: i18n;
  emojiIdMap: Record<string, string>;
  commandIdMap: Record<string, string | undefined>;
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
}

export interface IntegerOptionMetadata {
  type: ApplicationCommandOptionType.Integer;
  min_value?: number;
  max_value?: number;
}

export interface NumberOptionMetadata {
  type: ApplicationCommandOptionType.Number;
  min_value?: number;
  max_value?: number;
}

export interface StringOptionMetadata {
  type: ApplicationCommandOptionType.String;
  min_length?: number;
  max_length?: number;
  autocomplete?: boolean;
}
