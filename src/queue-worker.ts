
import { Logger } from './classes/logger.js';
import { initQueueManager } from './utils/init-queue-manager.js';

const logger = new Logger('queue-worker');
initQueueManager(logger).then(qm => qm.work());

