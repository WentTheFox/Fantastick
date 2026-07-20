import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  massRenameSkipComponentDefinition,
} from './component-definitions/mass-rename.component-definition.js';
import {
  massRenameSkipComponentHandler,
} from './component-handlers/mass-rename.component-handler.js';

export const massRenameSkipComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.MASS_RENAME_SKIP,
  getDefinition: massRenameSkipComponentDefinition,
  handle: massRenameSkipComponentHandler,
};
