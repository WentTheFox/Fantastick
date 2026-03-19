import { BotMessageComponent } from '../types/bot-interaction.js';
import {
  updateMessageComponentDefinition,
} from './component-definitions/update-message.component-definition.js';
import {
  stickerButtonComponentHandler,
} from './component-handlers/sticker-button.component-handler.js';

export const updateMessageComponent: BotMessageComponent = {
  getDefinition: updateMessageComponentDefinition,
  handle: stickerButtonComponentHandler(false),
};
