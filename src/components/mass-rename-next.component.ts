import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  massRenameNextComponentDefinition,
} from './component-definitions/mass-rename.component-definition.js';
import {
  massRenameStepComponentHandler,
} from './component-handlers/mass-rename.component-handler.js';

export const massRenameNextComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.MASS_RENAME_NEXT,
  getDefinition: massRenameNextComponentDefinition,
  handle: massRenameStepComponentHandler('next'),
};
