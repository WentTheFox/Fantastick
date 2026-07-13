import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  deleteMessageComponentDefinition,
} from './component-definitions/delete-message.component-definition.js';
import {
  stickerButtonComponentHandler,
} from './component-handlers/sticker-button.component-handler.js';

export const deleteMessageComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.DELETE_MESSAGE,
  getDefinition: deleteMessageComponentDefinition,
  handle: stickerButtonComponentHandler(true),
};
