import { APIApplicationCommand, APIApplicationCommandOption } from 'discord-api-types/v10';
import {
  CreatePackCommandOptionName,
  CreateStickerCommandOptionName,
  DeletePackCommandOptionName,
  DeleteStickerCommandOptionName,
  EditPackCommandOptionName,
  EditStickerMetadataCommandOptionName,
  ImportCommandOptionName,
  MassEditStickersCommandOptionName,
  PackCommandOptionName,
  PublishImportedPackCommandOptionName,
  ReorderStickerCommandOptionName,
  ReplaceStickerCommandOptionName,
  StickerCommandOptionName,
} from './command-option-names.js';
import type { ChatInputCommandName } from '../utils/interactions.js';

// Compile-time-only checks (never used at runtime) keeping the maps below in sync with
// the real chat-input command registry - itself runtime-cross-checked against
// commands.json by buildApplicationCommandsBody - instead of letting command names
// silently drift as a third, hand-typed list. `Exact` requires every registry command
// to appear (and nothing else); `Subset` only forbids keys outside the registry, since
// CommandResponsesMap/ComponentsMap are legitimately partial (e.g. nsfw-sticker/nsfw-pack
// alias sticker/pack's responses instead of declaring their own).
type AssertKeysExact<Keys extends string, Expected extends string> =
  [Exclude<Keys, Expected>] extends [never]
    ? ([Exclude<Expected, Keys>] extends [never] ? true : { missingKeys: Exclude<Expected, Keys> })
    : { unexpectedKeys: Exclude<Keys, Expected> };
type AssertKeysSubset<Keys extends string, Allowed extends string> =
  [Exclude<Keys, Allowed>] extends [never] ? true : { unexpectedKeys: Exclude<Keys, Allowed> };

interface CommandOptionsMap {
  sticker: StickerCommandOptionName,
  'nsfw-sticker': StickerCommandOptionName,
  'create-pack': CreatePackCommandOptionName,
  'create-sticker': CreateStickerCommandOptionName,
  'import-telegram-pack': ImportCommandOptionName,
  pack: PackCommandOptionName,
  'nsfw-pack': PackCommandOptionName,
  'edit-sticker-metadata': EditStickerMetadataCommandOptionName,
  'replace-sticker': ReplaceStickerCommandOptionName,
  'delete-sticker': DeleteStickerCommandOptionName,
  'delete-pack': DeletePackCommandOptionName,
  'edit-pack': EditPackCommandOptionName,
  'reorder-sticker': ReorderStickerCommandOptionName,
  'mass-edit-stickers': MassEditStickersCommandOptionName,
  'publish-imported-pack': PublishImportedPackCommandOptionName,
}
const _commandOptionsMapKeys: AssertKeysExact<keyof CommandOptionsMap, ChatInputCommandName> = true;
void _commandOptionsMapKeys;

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

export const enum EditStickerMetadataCommandResponse {
  stickerNotFound = 'stickerNotFound',
  nameTooShort = 'nameTooShort',
  nameTooLong = 'nameTooLong',
  invalidName = 'invalidName',
  duplicateName = 'duplicateName',
  updated = 'updated',
}

export const enum ReplaceStickerCommandResponse {
  stickerNotFound = 'stickerNotFound',
  importedSticker = 'importedSticker',
  missingFile = 'missingFile',
  updated = 'updated',
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
  sticker: StickerCommandResponse,
  'create-pack': CreatePackCommandResponse,
  'import-telegram-pack': ImportCommandResponse,
  'create-sticker': CreateStickerCommandResponse,
  pack: PackCommandResponse,
  'edit-sticker-metadata': EditStickerMetadataCommandResponse,
  'replace-sticker': ReplaceStickerCommandResponse,
  'delete-sticker': DeleteStickerCommandResponse,
  'delete-pack': DeletePackCommandResponse,
  'edit-pack': EditPackCommandResponse,
  'reorder-sticker': ReorderStickerCommandResponse,
  'mass-edit-stickers': MassEditStickersCommandResponse,
  'publish-imported-pack': PublishImportedPackCommandResponse,
}
const _commandResponsesMapKeys: AssertKeysSubset<Exclude<keyof CommandResponsesMap, 'global'>, ChatInputCommandName> = true;
void _commandResponsesMapKeys;

interface ComponentsMap {
  sticker: [
    'updateMessageButton',
    'deleteMessageButton',
  ],
  'create-sticker': [
    'createStickerModalTitle',
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
  pack: [
    'emptyPack',
    'packPreview',
    'importedFrom',
    'firstPageButton',
    'previousPageButton',
    'nextPageButton',
    'lastPageButton',
    'pageIndicator',
  ],
  'edit-sticker-metadata': [
    'editStickerMetadataModalTitle',
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
  'replace-sticker': [
    'replaceStickerModalTitle',
    'fileLabel',
    'fileDescription',
    'urlLabel',
    'urlDescription',
    'urlPlaceholder',
  ],
  'delete-sticker': [
    'deleteStickerModalTitle',
    'deletingText',
    'deletionMethodLabel',
    'deletionMethodDescription',
    'stickerOnlyMethodLabel',
    'stickerOnlyMethodDescription',
    'deleteMessagesMethodLabel',
    'deleteMessagesMethodDescription',
  ],
  'delete-pack': [
    'deletePackModalTitle',
    'deletingText',
  ],
  'create-pack': [
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
  'edit-pack': [
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
  'mass-edit-stickers': [
    'reviewingText',
    'currentNameText',
    'editMetadataButton',
    'replaceButton',
    'previousButton',
    'nextButton',
    'allDoneText',
  ],
  'publish-imported-pack': [
    'reviewingText',
    'currentNameText',
    'currentRatingText',
    'ratingUnset',
    'criteriaNameLabel',
    'criteriaRatingLabel',
    'editButton',
    'previousButton',
    'nextButton',
    'publishButton',
    'jumpToInvalidButton',
    'allDoneText',
  ],
}
const _componentsMapKeys: AssertKeysSubset<keyof ComponentsMap, ChatInputCommandName> = true;
void _componentsMapKeys;

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
