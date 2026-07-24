import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  massEditReplaceComponentDefinition,
} from './component-definitions/mass-edit.component-definition.js';
import {
  massEditReplaceComponentHandler,
} from './component-handlers/mass-edit.component-handler.js';

export const massEditReplaceComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.MASS_EDIT_REPLACE,
  getDefinition: massEditReplaceComponentDefinition,
  handle: massEditReplaceComponentHandler,
};
