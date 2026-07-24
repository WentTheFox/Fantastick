import { createHandlerWatcher } from '@wentthefox-org/discord-bot-framework/dev';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initI18next } from './constants/locales.js';
import { env } from './env.js';
import { createClient } from './utils/client.js';
import { createDb } from './utils/create-db.js';
import { createShardLogger } from './utils/create-logger.js';
import { getCommandIdMap } from './utils/get-command-id-map.js';
import { getEmojiIdMap } from './utils/get-emoji-id-map.js';
import { initQueueManager } from './utils/init-queue-manager.js';
import { chatInputCommandRegistry, componentRegistry, contextMenuCommandRegistry } from './utils/interactions.js';

(async () => {
  const logger = createShardLogger(process.env.SHARDS);
  const db = createDb();
  const [i18next, emojiIdMap, commandIdMap, qm] = await Promise.all([
    initI18next(logger),
    getEmojiIdMap({ logger }),
    getCommandIdMap({ logger }),
    initQueueManager(logger),
  ]);

  logger.log('Creating client');
  await createClient({ i18next, emojiIdMap, commandIdMap, logger, db, qm });

  if (env.DEV_WATCH) {
    const currentFolder = dirname(fileURLToPath(import.meta.url));
    const watcherLogger = logger.nest('DevWatcher');
    const watcher = createHandlerWatcher({
      paths: [join(currentFolder, 'commands'), join(currentFolder, 'components')],
      filter: filePath => filePath.endsWith('.ts'),
      logger: watcherLogger,
      onChange: async (filePath) => {
        const fresh = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`) as Record<string, unknown>;
        const [definition] = Object.values(fresh) as [Record<string, unknown> | undefined];
        if (!definition) {
          return;
        }
        if ('getDefinition' in definition && typeof definition.name === 'string') {
          if (chatInputCommandRegistry.isKnown(definition.name)) {
            chatInputCommandRegistry.byName[definition.name] = definition as never;
          } else if (contextMenuCommandRegistry.isKnown(definition.name)) {
            contextMenuCommandRegistry.byName[definition.name] = definition as never;
          } else {
            return;
          }
        } else if ('handle' in definition && typeof definition.id === 'string' && componentRegistry.isKnown(definition.id)) {
          componentRegistry.byName[definition.id] = definition as never;
        } else {
          return;
        }
        watcherLogger.log(`Reloaded ${filePath}`);
      },
    });
    process.on('SIGINT', () => watcher.close());
  }
})();
