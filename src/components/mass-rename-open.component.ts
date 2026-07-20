import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  massRenameOpenComponentDefinition,
} from './component-definitions/mass-rename.component-definition.js';
import {
  massRenameOpenComponentHandler,
} from './component-handlers/mass-rename.component-handler.js';

export const massRenameOpenComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.MASS_RENAME_OPEN,
  getDefinition: massRenameOpenComponentDefinition,
  handle: massRenameOpenComponentHandler,
};
