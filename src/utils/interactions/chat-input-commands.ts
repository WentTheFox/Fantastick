import { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import { stickerCommand } from '../../commands/sticker.command.js';
import { BotChatInputCommand, BotChatInputCommandName } from '../../types/bot-interaction.js';

export const chatInputCommandMap: Record<BotChatInputCommandName, BotChatInputCommand> = {
  [BotChatInputCommandName.STICKER]: stickerCommand,
};

export const chatInputCommandNames = (Object.keys(chatInputCommandMap) as BotChatInputCommandName[]);

export const isKnownChatInputCommand = (commandName: string): commandName is BotChatInputCommandName => commandName in chatInputCommandMap;

export const isKnownChatInputCommandInteraction = <InteractionType extends ChatInputCommandInteraction | AutocompleteInteraction>(interaction: InteractionType): interaction is InteractionType & {
  commandName: BotChatInputCommandName
} => isKnownChatInputCommand(interaction.commandName);
