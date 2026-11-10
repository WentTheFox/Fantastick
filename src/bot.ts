import { createHandlerWatcher, createSourceReloader } from '@went.tf/discord-bot-framework/dev';
import { Registry } from '@went.tf/discord-bot-framework/interactions';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { createClient } from './utils/client.js';
import { createInteractionHandlerContext } from './utils/create-interaction-handler-context.js';
import { createShardLogger } from './utils/create-logger.js';
import {
  chatInputCommandRegistry,
  componentRegistry,
  contextMenuCommandRegistry,
  modalRegistry,
} from './utils/interactions.js';

// Merges a freshly-reloaded registry's entries into the live one in place — the live
// registry object is what `handleInteraction` already holds a reference to, so we can
// only update its contents, never swap the binding itself
const mergeRegistry = <Name extends string, T>(target: Registry<Name, T>, source: Registry<Name, T>): void => {
  Object.assign(target.byName, source.byName);
};

(async () => {
  const logger = createShardLogger(process.env.SHARDS);

  logger.log('Creating client');
  await createClient(await createInteractionHandlerContext(logger));

  if (env.DEV_WATCH) {
    const currentFolder = dirname(fileURLToPath(import.meta.url));
    const watcherLogger = logger.nest('DevWatcher');
    // Reloads the whole command/component/modal graph fresh on any source change, rather
    // than just the changed file — a plain cache-busted re-import of one file wouldn't
    // pick up changes to shared modal-handlers/utils it statically imports, since those
    // still resolve to Node's cached instances. Files outside `currentFolder` (discord.js,
    // this framework, the DB pool/gateway client set up above) are never touched, so the
    // bot's connection survives the reload.
    const reloader = createSourceReloader({ rootDir: currentFolder, logger: watcherLogger });
    const interactionsPath = join(currentFolder, 'utils', 'interactions.ts');

    const watcher = createHandlerWatcher({
      paths: [
        join(currentFolder, 'commands'),
        join(currentFolder, 'components'),
        join(currentFolder, 'utils'),
        join(currentFolder, 'options'),
        join(currentFolder, 'constants'),
      ],
      filter: filePath => filePath.endsWith('.ts'),
      logger: watcherLogger,
      onChange: async (filePath) => {
        const fresh = await reloader.reimport<typeof import('./utils/interactions.js')>(interactionsPath);
        mergeRegistry(chatInputCommandRegistry, fresh.chatInputCommandRegistry);
        mergeRegistry(componentRegistry, fresh.componentRegistry);
        mergeRegistry(contextMenuCommandRegistry, fresh.contextMenuCommandRegistry);
        mergeRegistry(modalRegistry, fresh.modalRegistry);
        watcherLogger.log(`Reloaded (changed: ${filePath})`);
      },
    });
    process.on('SIGINT', () => watcher.close());
  }
})();
