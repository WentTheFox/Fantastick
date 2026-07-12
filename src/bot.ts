import { Logger } from '@wentthefox-org/discord-bot-framework/logger';
import { initI18next } from './constants/locales.js';
import { createClient } from './utils/client.js';
import { createDb } from './utils/create-db.js';
import { getCommandIdMap } from './utils/get-command-id-map.js';
import { getEmojiIdMap } from './utils/get-emoji-id-map.js';
import { initQueueManager } from './utils/init-queue-manager.js';

(async () => {
  const logger = Logger.fromShardInfo(process.env.SHARDS);
  const db = createDb();
  const [i18next, emojiIdMap, commandIdMap, qm] = await Promise.all([
    initI18next(logger),
    getEmojiIdMap({ logger }),
    getCommandIdMap({ logger }),
    initQueueManager(logger),
  ]);

  logger.log('Creating client');
  await createClient({ i18next, emojiIdMap, commandIdMap, logger, db, qm });
})();
