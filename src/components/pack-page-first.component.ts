import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  packPageFirstComponentDefinition,
} from './component-definitions/pack-page.component-definition.js';
import {
  packPageComponentHandler,
} from './component-handlers/pack-page.component-handler.js';

export const packPageFirstComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.PACK_PAGE_FIRST,
  getDefinition: packPageFirstComponentDefinition,
  handle: packPageComponentHandler('first'),
};
