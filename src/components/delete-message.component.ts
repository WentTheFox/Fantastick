import { BotMessageComponent } from '../types/bot-interaction.js';
import {
  deleteMessageComponentDefinition,
} from './component-definitions/delete-message.component-definition.js';
import {
  stickerButtonComponentHandler,
} from './component-handlers/sticker-button.component-handler.js';

export const deleteMessageComponent: BotMessageComponent = {
  getDefinition: deleteMessageComponentDefinition,
  handle: stickerButtonComponentHandler(true),
};
