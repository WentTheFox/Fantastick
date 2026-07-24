
import { createAppLogger } from './utils/create-logger.js';
import { initQueueManager } from './utils/init-queue-manager.js';

const logger = createAppLogger('queue-worker');
initQueueManager(logger).then(qm => qm.work());

