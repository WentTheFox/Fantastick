
import { Logger } from '@wentthefox-org/discord-bot-framework/logger';
import { initQueueManager } from './utils/init-queue-manager.js';

const logger = new Logger('queue-worker');
initQueueManager(logger).then(qm => qm.work());

