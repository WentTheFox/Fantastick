import { createLogger, NestableLogger } from '@went.tf/discord-bot-framework/logger';
import { env } from '../env.js';

/**
 * Builds the app's root logger: always logs to console, and additionally fans
 * warn/error/fatal out to DISCORD_LOG_WEBHOOK_URL when it's configured.
 */
export function createAppLogger(prefix: string | string[] = []): NestableLogger {
  return createLogger({
    prefix,
    discordWebhook: env.DISCORD_LOG_WEBHOOK_URL === null ? undefined : { url: env.DISCORD_LOG_WEBHOOK_URL },
  });
}

export function createShardLogger(shards: string | string[] = ''): NestableLogger {
  const shardsSuffix = Array.isArray(shards) ? shards.join(',') : shards;
  return createAppLogger(`Shard#${shardsSuffix}`);
}
