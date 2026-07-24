import { boolFromString, defineEnv } from '@went.tf/discord-bot-framework/env';
import { z } from 'zod';

/**
 * Type-safe process.env
 */
export const env = defineEnv({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_FEED_WEBHOOK_URL: z.string().nullable().default(null),
  DISCORD_LOG_WEBHOOK_URL: z.string().nullable().default(null),
  LOCAL: boolFromString(),
  DEBUG_I18N: boolFromString(),
  DISABLE_SETTINGS: boolFromString(),
  UA_STRING: z.string().min(1),
  DISCORD_INVITE_URL: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  // Generic remote file-upload API used to store sticker files instead of the local
  // filesystem. See src/utils/upload-api.ts for the (provider-agnostic) contract.
  UPLOAD_API_ENABLED: boolFromString(),
  UPLOAD_API_POST_URL: z.string().nullable().default(null),
  UPLOAD_API_RESPONSE_FIELD: z.string().nullable().default(null),
  UPLOAD_API_FILE_FIELD: z.string().nullable().default(null),
  UPLOAD_API_DELETE_URL_FIELD: z.string().nullable().default(null),
  // Hot-reloads command/component handler implementations while running via `pnpm dev`.
  DEV_WATCH: boolFromString(),
});
