import { NestableLogger } from '@went.tf/discord-bot-framework/logger';
import { initI18next } from '../constants/locales.js';
import { InteractionHandlerContext } from '../types/contexts/interaction-handler.context.js';
import { createDb } from './create-db.js';
import { getCommandIdMap } from './get-command-id-map.js';
import { getEmojiIdMap } from './get-emoji-id-map.js';
import { initQueueManager } from './init-queue-manager.js';

/**
 * Builds the shared context handed to every interaction handler. Must run after slash
 * commands were registered, since the command ID map is read back from Discord.
 */
export const createInteractionHandlerContext = async (logger: NestableLogger): Promise<InteractionHandlerContext> => {
  const [i18next, emojiIdMap, commandIdMap, qm] = await Promise.all([
    initI18next(logger),
    getEmojiIdMap({ logger }),
    getCommandIdMap({ logger }),
    initQueueManager(logger),
  ]);
  return { i18next, emojiIdMap, commandIdMap, logger, db: createDb(), qm };
};
