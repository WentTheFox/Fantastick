import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createShardManager } from '@wentthefox-org/discord-bot-framework/client';
import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';
import { initI18next } from './constants/locales.js';
import { env } from './env.js';
import { InteractionHandlerContext } from './types/contexts/interaction-handler.context.js';
import { createDb } from './utils/create-db.js';
import { createAppLogger } from './utils/create-logger.js';
import { getCommandIdMap } from './utils/get-command-id-map.js';
import { getEmojiIdMap } from './utils/get-emoji-id-map.js';
import { initQueueManager } from './utils/init-queue-manager.js';
import { updateCommands } from './utils/update-commands.js';

// This file is the main entry point that starts the bot

async function startupCommandsUpdate(parentLogger: NestableLogger): Promise<void> {
  const logger = parentLogger.nest('startupCommandsUpdate');
  logger.log('Updating…');
  const i18next = await initI18next(logger);
  const context: InteractionHandlerContext = {
    commandIdMap: await getCommandIdMap({ logger }),
    logger,
    emojiIdMap: await getEmojiIdMap({ logger }),
    i18next,
    db: createDb(),
    qm: await initQueueManager(logger),
  };

  await Promise.all([
    updateCommands(context),
  ]);

  logger.log('Completed.');
}

(async function createShards() {
  const logger = createAppLogger('ShardingManager');
  const currentFolder = dirname(fileURLToPath(import.meta.url));
  // Running via `tsx` from source (e.g. `pnpm dev`) rather than the compiled build/ output.
  const isTsDevMode = process.env.npm_lifecycle_script?.includes('.ts') ?? false;
  const botScriptPath = `${currentFolder}/bot.${isTsDevMode ? 'ts' : 'js'}`;

  await createShardManager({
    token: env.DISCORD_BOT_TOKEN,
    botScriptPath,
    logger,
    mode: isTsDevMode ? 'worker' : 'process',
    // Worker threads don't inherit CLI flags by default - forward tsx's own loader
    // flags so shards spawned from `bot.ts` can be loaded without a separate build.
    execArgv: isTsDevMode ? process.execArgv : undefined,
    beforeSpawn: () => startupCommandsUpdate(logger),
  });
})();
