import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  publishConfirmComponentDefinition,
} from './component-definitions/publish.component-definition.js';
import {
  publishConfirmComponentHandler,
} from './component-handlers/publish.component-handler.js';

export const publishConfirmComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.PUBLISH_CONFIRM,
  getDefinition: publishConfirmComponentDefinition,
  handle: publishConfirmComponentHandler,
};
