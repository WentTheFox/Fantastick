import { APIApplicationCommand, APIApplicationCommandOption } from 'discord-api-types/v10';
import { BotChatInputCommandName } from './bot-interaction.js';

export const enum GlobalCommandOptionName {
}

export const enum StickerCommandOptionName {
  NAME = 'name',
  PACK = 'pack',
}

interface CommandOptionsMap {
  [BotChatInputCommandName.STICKER]: StickerCommandOptionName,
}

export const enum GlobalCommandResponse {
}

export const enum StickerCommandResponse {
  INVALID_NAME = 'invalidName',
  INVALID_PACK = 'invalidPack',
}

interface CommandResponsesMap {
  global: GlobalCommandResponse,
  [BotChatInputCommandName.STICKER]: StickerCommandResponse,
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
