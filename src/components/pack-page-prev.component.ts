import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  packPagePrevComponentDefinition,
} from './component-definitions/pack-page.component-definition.js';
import {
  packPageComponentHandler,
} from './component-handlers/pack-page.component-handler.js';

export const packPagePrevComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.PACK_PAGE_PREV,
  getDefinition: packPagePrevComponentDefinition,
  handle: packPageComponentHandler('prev'),
};
