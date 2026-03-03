import { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import { createPackCommand } from '../../commands/create-pack.command.js';
import { createStickerCommand } from '../../commands/create-sticker.command.js';
import { importCommand } from '../../commands/import.command.js';
import { stickerCommand } from '../../commands/sticker.command.js';
import { BotChatInputCommand, BotChatInputCommandName } from '../../types/bot-interaction.js';

export const chatInputCommandMap: Record<BotChatInputCommandName, BotChatInputCommand> = {
  [BotChatInputCommandName.STICKER]: stickerCommand,
  [BotChatInputCommandName.CREATE_PACK]: createPackCommand,
  [BotChatInputCommandName.IMPORT]: importCommand,
  [BotChatInputCommandName.CREATE_STICKER]: createStickerCommand,
};

export const chatInputCommandNames = (Object.keys(chatInputCommandMap) as BotChatInputCommandName[]);

export const isKnownChatInputCommand = (commandName: string): commandName is BotChatInputCommandName => commandName in chatInputCommandMap;

export const isKnownChatInputCommandInteraction = <InteractionType extends ChatInputCommandInteraction | AutocompleteInteraction>(interaction: InteractionType): interaction is InteractionType & {
  commandName: BotChatInputCommandName
} => isKnownChatInputCommand(interaction.commandName);
