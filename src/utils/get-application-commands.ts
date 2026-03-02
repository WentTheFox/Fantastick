import {
  ApplicationIntegrationType,
  InteractionContextType,
  RESTPostAPIApplicationCommandsJSONBody as ApplicationCommand,
  RESTPostAPIApplicationGuildCommandsJSONBody as ApplicationGuildCommand,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { chatInputCommandMap, chatInputCommandNames } from './interactions/chat-input-commands.js';

const commonCommandOptions: Pick<RESTPostAPIChatInputApplicationCommandsJSONBody, 'integration_types' | 'contexts'> = {
  integration_types: [ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
};

const onlyApplicableChatInputCommands = (commandName: BotChatInputCommandName) =>
  chatInputCommandMap[commandName].registerCondition?.() ?? true;

const sortCommandDefinitionOptions = (commandDefinition: RESTPostAPIChatInputApplicationCommandsJSONBody) => {
  if (commandDefinition.options && commandDefinition.options.length > 0) {
    commandDefinition.options.sort((a, b) => {
      const aRequired = 'required' in a ? a.required : false;
      const bRequired = 'required' in b ? b.required : false;
      if (aRequired && !bRequired) return -1;
      if (!aRequired && bRequired) return 1;
      return 0;
    });
  }
  return commandDefinition;
};

export type BotCommandItem = (ApplicationGuildCommand & ApplicationCommand);
export type BotCommands = BotCommandItem[];
export const getApplicationCommands = (t: TFunction): BotCommands => [
  ...chatInputCommandNames
    .filter(onlyApplicableChatInputCommands)
    .map((commandName): RESTPostAPIChatInputApplicationCommandsJSONBody => ({
      ...commonCommandOptions,
      ...sortCommandDefinitionOptions(chatInputCommandMap[commandName].getDefinition(t)),
    })),
];
