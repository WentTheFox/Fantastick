import { ShardingManager } from 'discord.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './classes/logger.js';
import { env } from './env.js';

// This file is the main entry point that starts the bot

(async function createShards() {
  const logger = new Logger('ShardingManager');

  const currentFolder = dirname(fileURLToPath(import.meta.url));
  const botScriptPath = `${currentFolder}/bot.js`;

  logger.log(`Starting recommended number of shards with path ${botScriptPath}`);
  const manager = new ShardingManager(botScriptPath, { token: env.DISCORD_BOT_TOKEN });

  manager.on('shardCreate', shard => {
    logger.log(`Shard ${shard.id} created`);

    shard.on('spawn', () => {
      logger.log(`Shard ${shard.id} spawned`);
    });
    shard.on('ready', () => {
      logger.log(`Shard ${shard.id} ready`);
    });
    shard.on('disconnect', () => {
      logger.log(`Shard ${shard.id} disconnected`);
    });
    shard.on('reconnecting', () => {
      logger.log(`Shard ${shard.id} reconnecting`);
    });
    shard.on('death', () => {
      logger.log(`Shard ${shard.id} died`);
    });
  });
  await manager.spawn();
})();
