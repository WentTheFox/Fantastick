import { QueueManager } from '../classes/queue-manager.js';
import { NestableLogger } from '../types/logger-types.js';

export const initQueueManager = async (logger: NestableLogger): Promise<QueueManager> => {
  const queueManager = new QueueManager(logger);

  await queueManager.init();

  return queueManager;
};
