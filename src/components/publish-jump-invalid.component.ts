import { BotMessageComponent, BotMessageComponentCustomId } from '../types/bot-interaction.js';
import {
  publishJumpInvalidComponentDefinition,
} from './component-definitions/publish.component-definition.js';
import {
  publishJumpInvalidComponentHandler,
} from './component-handlers/publish.component-handler.js';

export const publishJumpInvalidComponent: BotMessageComponent = {
  id: BotMessageComponentCustomId.PUBLISH_JUMP_INVALID,
  getDefinition: publishJumpInvalidComponentDefinition,
  handle: publishJumpInvalidComponentHandler,
};
