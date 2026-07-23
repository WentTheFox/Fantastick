import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  publishNextComponentDefinition,
} from './component-definitions/publish.component-definition.js';
import {
  publishStepComponentHandler,
} from './component-handlers/publish.component-handler.js';

export const publishNextComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.PUBLISH_NEXT,
  getDefinition: publishNextComponentDefinition,
  handle: publishStepComponentHandler('next'),
};
