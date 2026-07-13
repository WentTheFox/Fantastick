import { QueueManager } from '../classes/queue-manager.js';
import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';

export const initQueueManager = async (logger: NestableLogger): Promise<QueueManager> => {
  const queueManager = new QueueManager(logger);

  await queueManager.init();

  return queueManager;
};
