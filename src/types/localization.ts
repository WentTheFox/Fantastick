import { APIApplicationCommand, APIApplicationCommandOption } from 'discord-api-types/v10';
import { BotChatInputCommandName } from './bot-interaction.js';

export const enum GlobalCommandOptionName {
}

export const enum StickerCommandOptionName {
  NAME = 'name',
  PACK = 'pack',
}

export const enum CreatePackCommandOptionName {
  NAME = 'name',
  NSFW = 'nsfw',
}

interface CommandOptionsMap {
  [BotChatInputCommandName.STICKER]: StickerCommandOptionName,
  [BotChatInputCommandName.CREATE_PACK]: CreatePackCommandOptionName,
}

export const enum GlobalCommandResponse {
  UNEXPECTED_ERROR = 'unexpectedError'
}

export const enum StickerCommandResponse {
  INVALID_NAME = 'invalidName',
  INVALID_PACK = 'invalidPack',
}
export const enum CreatePackCommandResponse {
  NAME_TOO_SHORT = 'nameTooShort',
  NAME_TOO_LONG = 'nameTooLong',
  INVALID_NAME = 'invalidName',
  CREATED = 'created',
}

interface CommandResponsesMap {
  global: GlobalCommandResponse,
  [BotChatInputCommandName.STICKER]: StickerCommandResponse,
  [BotChatInputCommandName.CREATE_PACK]: CreatePackCommandResponse,
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
  } & ResponsesLocalization<CommandKey>));

export type Localization = {
  commands: {
    [k in keyof CommandOptionsMap & keyof CommandResponsesMap]: CommandLocalization<k>;
  };
};
