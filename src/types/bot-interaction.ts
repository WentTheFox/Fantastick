import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { APIMessageComponent } from 'discord.js';
import { TFunction } from 'i18next';
import type {
  AutocompleteHandler as FrameworkAutocompleteHandler,
  CommandHandler as FrameworkCommandHandler,
  ComponentHandler as FrameworkComponentHandler,
  ModalHandler as FrameworkModalHandler,
  NamedChatInputCommand,
  NamedComponent,
  NamedContextMenuCommand,
} from '@wentthefox-org/discord-bot-framework/interactions';

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
  DELETE_PACK = 'delete-pack',
  EDIT_PACK = 'edit-pack',
  REORDER_STICKER = 'reorder-sticker',
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
  DELETE_PACK = 'deletePackModal',
  EDIT_PACK = 'editPackModal',
}

export const enum BotMessageComponentCustomId {
  UPDATE_MESSAGE = 'update-message',
  DELETE_MESSAGE = 'delete-message',
  PACK_PAGE_FIRST = 'pack-page-first',
  PACK_PAGE_PREV = 'pack-page-prev',
  PACK_PAGE_NEXT = 'pack-page-next',
  PACK_PAGE_LAST = 'pack-page-last',
}

export type CommandHandler = FrameworkCommandHandler<UserInteractionContext>;
export type AutocompleteHandler = FrameworkAutocompleteHandler<UserInteractionContext>;
export type AutocompleteHandlers = Record<string, AutocompleteHandler>;
export type ModalHandler = FrameworkModalHandler<UserInteractionContext>;
export type ModalHandlers = Record<string, ModalHandler>;
export type BotMessageComponentHandler = FrameworkComponentHandler<UserInteractionContext>;

export type BotChatInputCommand = NamedChatInputCommand<UserInteractionContext, BotChatInputCommandName, TFunction>;

export type BotMessageContextMenuCommand = NamedContextMenuCommand<UserInteractionContext, BotMessageContextMenuCommandName, TFunction>;

export type BotMessageComponentDefinitionGetter = (t: TFunction, emojiIdMap: Record<string, string>) => APIMessageComponent;

export type BotMessageComponent = NamedComponent<UserInteractionContext, BotMessageComponentCustomId> & {
  getDefinition: BotMessageComponentDefinitionGetter;
};

export interface StringOptionMetadata {
  type: ApplicationCommandOptionType.String;
  min_length?: number;
  max_length?: number;
  autocomplete?: boolean;
}
