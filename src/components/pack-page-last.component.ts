import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  packPageLastComponentDefinition,
} from './component-definitions/pack-page.component-definition.js';
import {
  packPageComponentHandler,
} from './component-handlers/pack-page.component-handler.js';

export const packPageLastComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.PACK_PAGE_LAST,
  getDefinition: packPageLastComponentDefinition,
  handle: packPageComponentHandler('last'),
};
