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
  UNEXPECTED_ERROR = 'unexpectedError'
}

export const enum StickerCommandResponse {
  NO_PACKS = 'noPacks',
  INVALID_NAME = 'invalidName',
}

export const enum CreatePackCommandResponse {
  NAME_TOO_SHORT = 'nameTooShort',
  NAME_TOO_LONG = 'nameTooLong',
  INVALID_NAME = 'invalidName',
  DUPLICATE_NAME = 'duplicateName',
  TOO_MANY_PACKS = 'tooManyPacks',
  CREATED_PUBLIC = 'createdPublic',
  CREATED_PRIVATE = 'createdPrivate',
}

export const enum CreateStickerCommandResponse {
  NO_PACKS = 'noPacks',
  INVALID_PACK = 'invalidPack',
  NAME_TOO_SHORT = 'nameTooShort',
  NAME_TOO_LONG = 'nameTooLong',
  INVALID_NAME = 'invalidName',
  FILE_MISSING = 'missingFile',
  INVALID_URL = 'invalidUrl',
  MISSING_SOURCE = 'missingSource',
  CREATED = 'created',
}

export const enum ImportCommandResponse {
  PACK_NOT_FOUND = 'packNotFound',
  INVALID_URL = 'invalidUrl',
  IMPORT_FAILED = 'importFailed',
  IMPORTED = 'imported',
}

export const enum PackCommandResponse {
  INVALID_PACK = 'invalidPack',
  EMPTY_PACK = 'emptyPack',
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
