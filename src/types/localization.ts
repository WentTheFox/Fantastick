import { APIApplicationCommand, APIApplicationCommandOption } from 'discord-api-types/v10';
import { BotChatInputCommandName } from './bot-interaction.js';

export const enum GlobalCommandOptionName {
}

export const enum StickerCommandOptionName {
  NAME = 'name',
}

export const enum CreatePackCommandOptionName {
  NAME = 'name',
  NSFW = 'nsfw',
  PUBLIC = 'public',
}

export const enum ImportCommandOptionName {
  PACK = 'pack',
  URL = 'url',
}

export const enum PackCommandOptionName {
  NAME = 'name',
}

interface CommandOptionsMap {
  [BotChatInputCommandName.STICKER]: StickerCommandOptionName,
  [BotChatInputCommandName.NSFW_STICKER]: StickerCommandOptionName,
  [BotChatInputCommandName.CREATE_PACK]: CreatePackCommandOptionName,
  [BotChatInputCommandName.IMPORT]: ImportCommandOptionName,
  [BotChatInputCommandName.PACK]: PackCommandOptionName,
  [BotChatInputCommandName.NSFW_PACK]: PackCommandOptionName,
}

export const enum GlobalCommandResponse {
  unexpectedError = 'unexpectedError'
}

export const enum StickerCommandResponse {
  noPacks = 'noPacks',
  invalidName = 'invalidName',
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
}

export const enum PackCommandResponse {
  invalidPack = 'invalidPack',
}

interface CommandResponsesMap {
  global: GlobalCommandResponse,
  [BotChatInputCommandName.STICKER]: StickerCommandResponse,
  [BotChatInputCommandName.CREATE_PACK]: CreatePackCommandResponse,
  [BotChatInputCommandName.IMPORT]: ImportCommandResponse,
  [BotChatInputCommandName.CREATE_STICKER]: CreateStickerCommandResponse,
  [BotChatInputCommandName.PACK]: PackCommandResponse,
}

interface ComponentsMap {
  global: [],
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
    'packPreview'
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
