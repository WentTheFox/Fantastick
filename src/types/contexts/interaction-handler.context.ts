import { i18n } from 'i18next';
import { QueueManager } from '../../classes/queue-manager.js';
import { PrismaClient } from '../../generated/prisma/client.js';

import { LoggerContext } from './logger.context.js';

export interface InteractionHandlerContext extends LoggerContext {
  i18next: i18n;
  emojiIdMap: Record<string, string>;
  commandIdMap: Record<string, string | undefined>;
  db: PrismaClient;
  qm: QueueManager;
}
