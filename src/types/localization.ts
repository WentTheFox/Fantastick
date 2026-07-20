import { APIApplicationCommand, APIApplicationCommandOption } from 'discord-api-types/v10';
import { BotChatInputCommandName } from './bot-interaction.js';

export const enum GlobalCommandOptionName {
}

export const enum StickerCommandOptionName {
  NAME = 'name',
  PREVIEW = 'preview',
}

export const enum CreatePackCommandOptionName {
  NAME = 'name',
}

export const enum ImportCommandOptionName {
  PACK = 'pack',
  URL = 'url',
}

export const enum PackCommandOptionName {
  NAME = 'name',
}

export const enum EditStickerCommandOptionName {
  NAME = 'name',
}

export const enum DeleteStickerCommandOptionName {
  NAME = 'name',
}

export const enum DeletePackCommandOptionName {
  NAME = 'name',
}

export const enum EditPackCommandOptionName {
  NAME = 'name',
}

export const enum ReorderStickerCommandOptionName {
  STICKER = 'sticker',
  BEFORE = 'before',
  AFTER = 'after',
}

interface CommandOptionsMap {
  [BotChatInputCommandName.STICKER]: StickerCommandOptionName,
  [BotChatInputCommandName.NSFW_STICKER]: StickerCommandOptionName,
  [BotChatInputCommandName.CREATE_PACK]: CreatePackCommandOptionName,
  [BotChatInputCommandName.IMPORT]: ImportCommandOptionName,
  [BotChatInputCommandName.PACK]: PackCommandOptionName,
  [BotChatInputCommandName.NSFW_PACK]: PackCommandOptionName,
  [BotChatInputCommandName.EDIT_STICKER]: EditStickerCommandOptionName,
  [BotChatInputCommandName.DELETE_STICKER]: DeleteStickerCommandOptionName,
  [BotChatInputCommandName.DELETE_PACK]: DeletePackCommandOptionName,
  [BotChatInputCommandName.EDIT_PACK]: EditPackCommandOptionName,
  [BotChatInputCommandName.REORDER_STICKER]: ReorderStickerCommandOptionName,
}

export const enum GlobalCommandResponse {
  unexpectedError = 'unexpectedError',
  noPermission = 'noPermission',
  dmsUnsupported = 'dmsUnsupported',
}

export const enum StickerCommandResponse {
  noPacks = 'noPacks',
  invalidName = 'invalidName',
  messageNotFound = 'messageNotFound',
  onlyExecutorCanDelete = 'onlyExecutorCanDelete',
  recentlyUpdated = 'recentlyUpdated',
  updated = 'updated',
  deleted = 'deleted',
}

export const enum CreatePackCommandResponse {
  nameTooShort = 'nameTooShort',
  nameTooLong = 'nameTooLong',
  invalidName = 'invalidName',
  duplicateName = 'duplicateName',
  tooManyPacks = 'tooManyPacks',
  createdPublic = 'createdPublic',
  createdPrivate = 'createdPrivate',
}

export const enum CreateStickerCommandResponse {
  noPacks = 'noPacks',
  invalidPack = 'invalidPack',
  nameTooShort = 'nameTooShort',
  nameTooLong = 'nameTooLong',
  invalidName = 'invalidName',
  missingFile = 'missingFile',
  invalidUrl = 'invalidUrl',
  missingSource = 'missingSource',
  created = 'created',
}

export const enum ImportCommandResponse {
  packNotFound = 'packNotFound',
  invalidUrl = 'invalidUrl',
  importFailed = 'importFailed',
  importProgress = 'importProgress',
  finalizingImport = 'finalizingImport',
  rollbackProgress = 'rollbackProgress',
  imported = 'imported',
  importQueued = 'importQueued',
  importAlreadyRunning = 'importAlreadyRunning',
}

export const enum PackCommandResponse {
  invalidPack = 'invalidPack',
}

export const enum EditStickerCommandResponse {
  stickerNotFound = 'stickerNotFound',
}

export const enum DeleteStickerCommandResponse {
  stickerNotFound = 'stickerNotFound',
  deleteFailed = 'deleteFailed',
  unsupportedMethod = 'unsupportedMethod',
  deleted = 'deleted',
}

export const enum DeletePackCommandResponse {
  packNotFound = 'packNotFound',
  deleteFailed = 'deleteFailed',
  deleted = 'deleted',
}

export const enum EditPackCommandResponse {
  packNotFound = 'packNotFound',
  nameTooShort = 'nameTooShort',
  nameTooLong = 'nameTooLong',
  invalidName = 'invalidName',
  duplicateName = 'duplicateName',
  updated = 'updated',
}

export const enum ReorderStickerCommandResponse {
  stickerNotFound = 'stickerNotFound',
  targetNotFound = 'targetNotFound',
  bothProvided = 'bothProvided',
  noneProvided = 'noneProvided',
  conflict = 'conflict',
  movedBefore = 'movedBefore',
  movedAfter = 'movedAfter',
}

interface CommandResponsesMap {
  global: GlobalCommandResponse,
  [BotChatInputCommandName.STICKER]: StickerCommandResponse,
  [BotChatInputCommandName.CREATE_PACK]: CreatePackCommandResponse,
  [BotChatInputCommandName.IMPORT]: ImportCommandResponse,
  [BotChatInputCommandName.CREATE_STICKER]: CreateStickerCommandResponse,
  [BotChatInputCommandName.PACK]: PackCommandResponse,
  [BotChatInputCommandName.EDIT_STICKER]: EditStickerCommandResponse,
  [BotChatInputCommandName.DELETE_STICKER]: DeleteStickerCommandResponse,
  [BotChatInputCommandName.DELETE_PACK]: DeletePackCommandResponse,
  [BotChatInputCommandName.EDIT_PACK]: EditPackCommandResponse,
  [BotChatInputCommandName.REORDER_STICKER]: ReorderStickerCommandResponse,
}

interface ComponentsMap {
  [BotChatInputCommandName.STICKER]: [
    'updateMessageButton',
    'deleteMessageButton',
  ],
  [BotChatInputCommandName.CREATE_STICKER]: [
    'createStickerModalTitle',
    'packLabel',
    'packDescription',
    'nameLabel',
    'nameDescription',
    'altLabel',
    'altDescription',
    'fileLabel',
    'fileDescription',
    'urlLabel',
    'urlDescription',
    'urlPlaceholder',
  ],
  [BotChatInputCommandName.PACK]: [
    'emptyPack',
    'packPreview',
    'firstPageButton',
    'previousPageButton',
    'nextPageButton',
    'lastPageButton',
    'pageIndicator',
  ],
  [BotChatInputCommandName.EDIT_STICKER]: [
    'editStickerModalTitle',
    'editingText'
  ],
  [BotChatInputCommandName.DELETE_STICKER]: [
    'deleteStickerModalTitle',
    'deletingText',
    'deletionMethodLabel',
    'deletionMethodDescription',
    'stickerOnlyMethodLabel',
    'stickerOnlyMethodDescription',
    'deleteMessagesMethodLabel',
    'deleteMessagesMethodDescription',
  ],
  [BotChatInputCommandName.DELETE_PACK]: [
    'deletePackModalTitle',
    'deletingText',
  ],
  [BotChatInputCommandName.CREATE_PACK]: [
    'createPackModalTitle',
    'nameLabel',
    'nameDescription',
    'publicChoiceLabel',
    'publicChoiceDescription',
    'publicTrueLabel',
    'publicTrueDescription',
    'publicFalseLabel',
    'publicFalseDescription',
    'nsfwChoiceLabel',
    'nsfwChoiceDescription',
    'nsfwTrueLabel',
    'nsfwTrueDescription',
    'nsfwFalseLabel',
    'nsfwFalseDescription',
  ],
  [BotChatInputCommandName.EDIT_PACK]: [
    'editPackModalTitle',
    'nameLabel',
    'nameDescription',
    'publicChoiceLabel',
    'publicChoiceDescription',
    'publicTrueLabel',
    'publicTrueDescription',
    'publicFalseLabel',
    'publicFalseDescription',
    'nsfwChoiceLabel',
    'nsfwChoiceDescription',
    'nsfwTrueLabel',
    'nsfwTrueDescription',
    'nsfwFalseLabel',
    'nsfwFalseDescription',
  ],
}

export type OptionLocalization =
  Pick<APIApplicationCommandOption, 'name' | 'description'>
  & ({ choices?: Record<string, never> });

export type ResponsesLocalization<CommandKey extends keyof CommandResponsesMap> = CommandResponsesMap[CommandKey] extends never ? unknown : {
  responses: { [l in CommandResponsesMap[CommandKey]]: string };
};

export type CommandLocalization<CommandKey extends keyof CommandOptionsMap & keyof CommandResponsesMap = keyof CommandOptionsMap & keyof CommandResponsesMap> =
  Pick<APIApplicationCommand, 'name' | 'description'>
  & (
  ({
    options: { [l in CommandOptionsMap[CommandKey]]: OptionLocalization };
  } & ResponsesLocalization<CommandKey>))
  & (
  CommandKey extends keyof ComponentsMap
    ? { components: Record<ComponentsMap[CommandKey][number], string> }
    : { components?: undefined }
  );

export type Localization = {
  commands: {
    [k in keyof CommandOptionsMap & keyof CommandResponsesMap]: CommandLocalization<k>;
  };
};
