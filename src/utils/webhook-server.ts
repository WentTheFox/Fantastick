import { createServer, IncomingMessage, Server } from 'node:http';
import { NestableLogger } from '@went.tf/discord-bot-framework/logger';
import {
  createWebhookOnlyClient,
  handleWebhookInteractionRequest,
  interactionFromWebhookPayload,
} from '@went.tf/discord-bot-framework/webhook';
import { env } from '../env.js';
import { InteractionHandlerContext } from '../types/contexts/interaction-handler.context.js';
import { handleInteraction } from './handle-interaction.js';

// Discord interaction payloads are far below this; it only guards against abusive bodies
const MAX_BODY_BYTES = 1024 * 1024;

class BodyTooLargeError extends Error {}

const readBody = async (req: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new BodyTooLargeError();
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
};

const headerValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/**
 * Starts the HTTP Interactions Endpoint Discord delivers interactions to when the app
 * runs in webhook mode (no gateway connection is ever opened).
 */
export const startWebhookServer = (context: InteractionHandlerContext, parentLogger: NestableLogger): Promise<Server> => {
  const logger = parentLogger.nest('Webhook');
  const publicKey = env.DISCORD_PUBLIC_KEY;
  if (publicKey === null || publicKey === '') {
    throw new Error('DISCORD_PUBLIC_KEY must be set when INTERACTIONS_MODE=webhook');
  }

  const secret = env.WEBHOOK_PATH_SECRET;
  if (secret === null || secret === '') {
    throw new Error('WEBHOOK_PATH_SECRET must be set when INTERACTIONS_MODE=webhook');
  }
  const webhookPath = `/${secret}`;

  const client = createWebhookOnlyClient({ token: env.DISCORD_BOT_TOKEN, applicationId: env.DISCORD_CLIENT_ID });

  const server = createServer(async (req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
    };

    // The secret path is the "is this actually Discord" check; everything else gets a bare 404
    if (req.method !== 'POST' || req.url !== webhookPath) {
      res.writeHead(404).end();
      return;
    }

    try {
      const rawBody = await readBody(req);
      const { status, body } = await handleWebhookInteractionRequest(
        {
          signature: headerValue(req.headers['x-signature-ed25519']),
          timestamp: headerValue(req.headers['x-signature-timestamp']),
          rawBody,
          headers: Object.fromEntries(
            Object.entries(req.headers).map(([key, value]) => [key, headerValue(value)]),
          ),
        },
        {
          publicKey,
          logger,
          applicationId: env.DISCORD_CLIENT_ID,
          verboseSignatureDiagnostics: env.WEBHOOK_VERBOSE_DIAGNOSTICS,
          // Handlers answer through `.reply()`/`.deferReply()` (REST), so nothing is returned here
          onInteraction: async (data) => {
            await handleInteraction(interactionFromWebhookPayload(client, data), context);
          },
        },
      );
      send(status, body);
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        send(413, { error: 'Payload too large' });
        return;
      }
      logger.error('Unhandled error while processing request', error);
      send(500, { error: 'Internal error' });
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(env.WEBHOOK_PORT, env.WEBHOOK_HOST, () => {
      server.off('error', reject);
      logger.log(`Listening for interactions on http://${env.WEBHOOK_HOST}:${env.WEBHOOK_PORT}/<WEBHOOK_PATH_SECRET>`);
      resolve(server);
    });
  });
};
