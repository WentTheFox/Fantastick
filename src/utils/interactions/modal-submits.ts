import { ModalSubmitInteraction } from 'discord.js';
import { createPackCommand } from '../../commands/create-pack.command.js';
import { createStickerCommand } from '../../commands/create-sticker.command.js';
import { deleteStickerCommand } from '../../commands/delete-sticker.command.js';
import { editStickerCommand } from '../../commands/edit-sticker.command.js';
import { BotChatInputCommand, BotModalId } from '../../types/bot-interaction.js';
import { getModalCustomIdSegments } from '../messaging.js';

export const modalSubmitMap: Record<BotModalId, BotChatInputCommand> = {
  [BotModalId.CREATE_STICKER]: createStickerCommand,
  [BotModalId.EDIT_STICKER]: editStickerCommand,
  [BotModalId.DELETE_STICKER]: deleteStickerCommand,
  [BotModalId.CREATE_PACK]: createPackCommand,
};

export const isKnownModalSubmitId = (customId: string): customId is BotModalId => customId in modalSubmitMap;

export const isKnownModalSubmitInteraction = <InteractionType extends ModalSubmitInteraction>(interaction: InteractionType): interaction is InteractionType & {
  customId: BotModalId
} => {
  const { modalId } = getModalCustomIdSegments(interaction.customId);
  return isKnownModalSubmitId(modalId);
};
