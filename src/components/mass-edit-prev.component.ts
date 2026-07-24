import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  massEditPrevComponentDefinition,
} from './component-definitions/mass-edit.component-definition.js';
import {
  massEditStepComponentHandler,
} from './component-handlers/mass-edit.component-handler.js';

export const massEditPrevComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.MASS_EDIT_PREV,
  getDefinition: massEditPrevComponentDefinition,
  handle: massEditStepComponentHandler('prev'),
};
