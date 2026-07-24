import { QueueManager } from '../classes/queue-manager.js';
import { NestableLogger } from '@went.tf/discord-bot-framework/logger';

export const initQueueManager = async (logger: NestableLogger): Promise<QueueManager> => {
  const queueManager = new QueueManager(logger);

  await queueManager.init();

  return queueManager;
};
