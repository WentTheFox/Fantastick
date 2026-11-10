import { boolFromString, defineEnv } from '@went.tf/discord-bot-framework/env';
import { z } from 'zod';

/**
 * Type-safe process.env
 */
export const env = defineEnv({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  // How the app receives interactions. "webhook" (default) runs an HTTP Interactions Endpoint
  // and needs DISCORD_PUBLIC_KEY; "gateway" holds a (sharded) gateway connection instead.
  INTERACTIONS_MODE: z.enum(['webhook', 'gateway']).default('webhook'),
  // Application public key from the Discord developer portal (webhook mode only)
  DISCORD_PUBLIC_KEY: z.string().nullable().default(null),
  WEBHOOK_HOST: z.string().min(1).default('127.0.0.1'),
  WEBHOOK_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /**
   * Long random URL-safe token the webhook server requires as the request path (`/<token>`);
   * anything else 404s. Set the Interactions Endpoint URL to `https://<host>/<token>`. Purely
   * obscurity, not a substitute for Ed25519 signature verification - it keeps scanner noise out
   * of the "invalid signature" logs. Required in webhook mode. Generate with
   * `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
   */
  WEBHOOK_PATH_SECRET: z.string().nullable().default(null),
  // Logs signature/timestamp details of rejected requests, for debugging proxy issues
  WEBHOOK_VERBOSE_DIAGNOSTICS: boolFromString(),
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
  // Optional OpenSearch-backed sticker autocomplete. Disabled (Postgres-only search) when
  // OPENSEARCH_URL is unset. See src/utils/search/ for the visibility/privacy model.
  OPENSEARCH_URL: z.string().nullable().default(null),
  OPENSEARCH_INDEX: z.string().min(1).default('fantastick-stickers'),
  OPENSEARCH_USERNAME: z.string().nullable().default(null),
  OPENSEARCH_PASSWORD: z.string().nullable().default(null),
  // Hot-reloads command/component handler implementations while running via `pnpm dev`.
  DEV_WATCH: boolFromString(),
});
