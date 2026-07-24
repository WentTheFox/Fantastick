import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  publishOpenComponentDefinition,
} from './component-definitions/publish.component-definition.js';
import {
  publishOpenComponentHandler,
} from './component-handlers/publish.component-handler.js';

export const publishOpenComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.PUBLISH_OPEN,
  getDefinition: publishOpenComponentDefinition,
  handle: publishOpenComponentHandler,
};
