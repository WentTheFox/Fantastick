import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  massEditNextComponentDefinition,
} from './component-definitions/mass-edit.component-definition.js';
import {
  massEditStepComponentHandler,
} from './component-handlers/mass-edit.component-handler.js';

export const massEditNextComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.MASS_EDIT_NEXT,
  getDefinition: massEditNextComponentDefinition,
  handle: massEditStepComponentHandler('next'),
};
