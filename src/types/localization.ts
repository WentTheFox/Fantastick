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
  URL = 'url',
  NSFW = 'nsfw',
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

export const enum MassEditStickersCommandOptionName {
  PACK = 'pack',
  START = 'start',
}

export const enum PublishImportedPackCommandOptionName {
  PACK = 'pack',
}

export const enum MigrateToTelegramStickerCommandOptionName {
  SOURCE_PACK = 'source-pack',
  SOURCE_STICKER = 'source-sticker',
  TARGET_PACK = 'target-pack',
  TARGET_STICKER = 'target-sticker',
}

interface CommandOptionsMap {
  [BotChatInputCommandName.STICKER]: StickerCommandOptionName,
  [BotChatInputCommandName.NSFW_STICKER]: StickerCommandOptionName,
  [BotChatInputCommandName.CREATE_PACK]: CreatePackCommandOptionName,
  [BotChatInputCommandName.IMPORT_TELEGRAM_PACK]: ImportCommandOptionName,
  [BotChatInputCommandName.PACK]: PackCommandOptionName,
  [BotChatInputCommandName.NSFW_PACK]: PackCommandOptionName,
  [BotChatInputCommandName.EDIT_STICKER]: EditStickerCommandOptionName,
  [BotChatInputCommandName.DELETE_STICKER]: DeleteStickerCommandOptionName,
  [BotChatInputCommandName.DELETE_PACK]: DeletePackCommandOptionName,
  [BotChatInputCommandName.EDIT_PACK]: EditPackCommandOptionName,
  [BotChatInputCommandName.REORDER_STICKER]: ReorderStickerCommandOptionName,
  [BotChatInputCommandName.MASS_EDIT_STICKERS]: MassEditStickersCommandOptionName,
  [BotChatInputCommandName.PUBLISH_IMPORTED_PACK]: PublishImportedPackCommandOptionName,
  [BotChatInputCommandName.MIGRATE_TO_TELEGRAM_STICKER]: MigrateToTelegramStickerCommandOptionName,
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
  nsfwRequiredForNewPack = 'nsfwRequiredForNewPack',
  packImportAlreadyRunning = 'packImportAlreadyRunning',
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
  importedSticker = 'importedSticker',
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
  importedStickerImmutable = 'importedStickerImmutable',
}

export const enum MassEditStickersCommandResponse {
  packNotFound = 'packNotFound',
  emptyPack = 'emptyPack',
  stickerNotFound = 'stickerNotFound',
}

export const enum MigrateToTelegramStickerCommandResponse {
  sourceStickerNotFound = 'sourceStickerNotFound',
  targetStickerNotFound = 'targetStickerNotFound',
  sameSticker = 'sameSticker',
  migrated = 'migrated',
}

export const enum PublishImportedPackCommandResponse {
  packNotFound = 'packNotFound',
  emptyPack = 'emptyPack',
  stickerNotFound = 'stickerNotFound',
  alreadyPublished = 'alreadyPublished',
  alreadyPublishedElsewhere = 'alreadyPublishedElsewhere',
  notReady = 'notReady',
  published = 'published',
  publishedRatingAllSfw = 'publishedRatingAllSfw',
  publishedRatingAllNsfw = 'publishedRatingAllNsfw',
  publishedRatingMixed = 'publishedRatingMixed',
}

interface CommandResponsesMap {
  global: GlobalCommandResponse,
  [BotChatInputCommandName.STICKER]: StickerCommandResponse,
  [BotChatInputCommandName.CREATE_PACK]: CreatePackCommandResponse,
  [BotChatInputCommandName.IMPORT_TELEGRAM_PACK]: ImportCommandResponse,
  [BotChatInputCommandName.CREATE_STICKER]: CreateStickerCommandResponse,
  [BotChatInputCommandName.PACK]: PackCommandResponse,
  [BotChatInputCommandName.EDIT_STICKER]: EditStickerCommandResponse,
  [BotChatInputCommandName.DELETE_STICKER]: DeleteStickerCommandResponse,
  [BotChatInputCommandName.DELETE_PACK]: DeletePackCommandResponse,
  [BotChatInputCommandName.EDIT_PACK]: EditPackCommandResponse,
  [BotChatInputCommandName.REORDER_STICKER]: ReorderStickerCommandResponse,
  [BotChatInputCommandName.MASS_EDIT_STICKERS]: MassEditStickersCommandResponse,
  [BotChatInputCommandName.PUBLISH_IMPORTED_PACK]: PublishImportedPackCommandResponse,
  [BotChatInputCommandName.MIGRATE_TO_TELEGRAM_STICKER]: MigrateToTelegramStickerCommandResponse,
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
    'importedFrom',
    'firstPageButton',
    'previousPageButton',
    'nextPageButton',
    'lastPageButton',
    'pageIndicator',
  ],
  [BotChatInputCommandName.EDIT_STICKER]: [
    'editStickerModalTitle',
    'editingText',
    'importedStickerNote',
    'importedNameLabel',
    'importedNameDescription',
    'ratingChoiceLabel',
    'ratingChoiceDescription',
    'ratingDefaultLabel',
    'ratingDefaultDescription',
    'ratingSfwLabel',
    'ratingSfwDescription',
    'ratingNsfwLabel',
    'ratingNsfwDescription',
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
    'importedNameNote',
    'importedUnpublishedNote',
    'nameLabel',
    'nameDescription',
    'publicChoiceLabel',
    'publicChoiceDescription',
    'publicTrueLabel',
    'publicTrueDescription',
    'publicFalseLabel',
    'publicFalseDescription',
    'publicFalseDescriptionImported',
    'nsfwChoiceLabel',
    'nsfwChoiceDescription',
    'nsfwTrueLabel',
    'nsfwTrueDescription',
    'nsfwFalseLabel',
    'nsfwFalseDescription',
  ],
  [BotChatInputCommandName.MASS_EDIT_STICKERS]: [
    'reviewingText',
    'currentNameText',
    'editButton',
    'previousButton',
    'nextButton',
    'allDoneText',
  ],
  [BotChatInputCommandName.PUBLISH_IMPORTED_PACK]: [
    'reviewingText',
    'currentNameText',
    'currentRatingText',
    'ratingUnset',
    'criteriaNameLabel',
    'criteriaRatingLabel',
    'editingModalText',
    'nameLabel',
    'nameDescription',
    'ratingChoiceLabel',
    'ratingChoiceDescription',
    'ratingSfwLabel',
    'ratingSfwDescription',
    'ratingNsfwLabel',
    'ratingNsfwDescription',
    'editButton',
    'previousButton',
    'nextButton',
    'publishButton',
    'jumpToInvalidButton',
    'editModalTitle',
    'allDoneText',
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
