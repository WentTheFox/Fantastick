import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  publishPrevComponentDefinition,
} from './component-definitions/publish.component-definition.js';
import {
  publishStepComponentHandler,
} from './component-handlers/publish.component-handler.js';

export const publishPrevComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.PUBLISH_PREV,
  getDefinition: publishPrevComponentDefinition,
  handle: publishStepComponentHandler('prev'),
};
