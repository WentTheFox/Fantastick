import { TFunction } from 'i18next';

import { InteractionHandlerContext } from './interaction-handler.context.js';

export interface InteractionContext extends Omit<InteractionHandlerContext, 'i18next'> {
  t: TFunction;
}
