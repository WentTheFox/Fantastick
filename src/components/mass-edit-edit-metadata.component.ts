import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  massEditOpenComponentDefinition,
} from './component-definitions/mass-edit.component-definition.js';
import {
  massEditOpenComponentHandler,
} from './component-handlers/mass-edit.component-handler.js';

export const massEditOpenComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.MASS_EDIT_OPEN,
  getDefinition: massEditOpenComponentDefinition,
  handle: massEditOpenComponentHandler,
};
