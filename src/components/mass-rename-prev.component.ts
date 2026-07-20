import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  massRenamePrevComponentDefinition,
} from './component-definitions/mass-rename.component-definition.js';
import {
  massRenameStepComponentHandler,
} from './component-handlers/mass-rename.component-handler.js';

export const massRenamePrevComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.MASS_RENAME_PREV,
  getDefinition: massRenamePrevComponentDefinition,
  handle: massRenameStepComponentHandler('prev'),
};
