import { boolFromString, defineEnv } from '@wentthefox-org/discord-bot-framework/env';
import { z } from 'zod';

/**
 * Type-safe process.env
 */
export const env = defineEnv({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_FEED_WEBHOOK_URL: z.string().nullable().default(null),
  LOCAL: boolFromString(),
  DEBUG_I18N: boolFromString(),
  DISABLE_SETTINGS: boolFromString(),
  UA_STRING: z.string().min(1),
  DISCORD_INVITE_URL: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  UPLOAD_API_HOST: z.string().min(1),
  UPLOAD_KEY: z.string().min(1),
  UPLOAD_API_DOMAIN: z.string().min(1),
});
