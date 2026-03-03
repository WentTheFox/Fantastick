import { ModalSubmitInteraction } from 'discord.js';
import { createStickerCommand } from '../../commands/create-sticker.command.js';
import { BotChatInputCommand, BotModalIds } from '../../types/bot-interaction.js';

export const modalSubmitMap: Record<BotModalIds, BotChatInputCommand> = {
  [BotModalIds.CREATE_STICKER]: createStickerCommand,
};

export const isKnownModalSubmitId = (customId: string): customId is BotModalIds => customId in modalSubmitMap;

export const isKnownModalSubmitInteraction = <InteractionType extends ModalSubmitInteraction>(interaction: InteractionType): interaction is InteractionType & {
  customId: BotModalIds
} => isKnownModalSubmitId(interaction.customId);
