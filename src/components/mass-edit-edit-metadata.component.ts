import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  massEditEditMetadataComponentDefinition,
} from './component-definitions/mass-edit.component-definition.js';
import {
  massEditEditMetadataComponentHandler,
} from './component-handlers/mass-edit.component-handler.js';

export const massEditEditMetadataComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.MASS_EDIT_EDIT_METADATA,
  getDefinition: massEditEditMetadataComponentDefinition,
  handle: massEditEditMetadataComponentHandler,
};
