import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  packPageNextComponentDefinition,
} from './component-definitions/pack-page.component-definition.js';
import {
  packPageComponentHandler,
} from './component-handlers/pack-page.component-handler.js';

export const packPageNextComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.PACK_PAGE_NEXT,
  getDefinition: packPageNextComponentDefinition,
  handle: packPageComponentHandler('next'),
};
