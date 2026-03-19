import { ContextMenuCommandInteraction } from 'discord.js';
import { updateMessageCommand } from '../../commands/update-message.command.js';
import {
  BotMessageContextMenuCommand,
  BotMessageContextMenuCommandName,
} from '../../types/bot-interaction.js';

export const messageContextMenuCommandMap: Record<BotMessageContextMenuCommandName, BotMessageContextMenuCommand> = {
  [BotMessageContextMenuCommandName.UPDATE_MESSAGE]: updateMessageCommand,
};

export const messageContextMenuCommands = (Object.keys(messageContextMenuCommandMap) as BotMessageContextMenuCommandName[]);

export const isKnownMessageContextMenuCommand = (commandName: string): commandName is BotMessageContextMenuCommandName => commandName in messageContextMenuCommandMap;

export const isKnownMessageContextmenuInteraction = <InteractionType extends ContextMenuCommandInteraction>(interaction: InteractionType): interaction is InteractionType & {
  commandName: BotMessageContextMenuCommandName
} => isKnownMessageContextMenuCommand(interaction.commandName);
