import { RequestData } from '@discordjs/rest';
import {
  ComponentType,
  MessageFlags,
  RESTPatchAPIChannelMessageJSONBody,
  Routes,
} from 'discord-api-types/v10';
import fs from 'node:fs';
import { NestableLogger } from '@went.tf/discord-bot-framework/logger';
import { QueueHandler, QueueType } from '../../types/queue.js';
import { createDb } from '../../utils/create-db.js';
import { mapStickersToGalleryItems } from '../../utils/map-stickers-to-gallery-items.js';
import { resolveStickerNsfw } from '../../utils/resolve-sticker-nsfw.js';
import { rest } from '../../utils/rest.js';
import { runAttempts } from '@went.tf/discord-bot-framework/utils';

export const updateMessageQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.UpdateMessage> => async ([job]) => {
  const {
    messageId,
    channelId,
    stickerId,
    interactionId,
    interactionToken,
    action,
    newUrl,
    description,
  } = job.data;
  switch (action) {
    case 'delete': {
      const db = createDb();
      const attempts: (() => Promise<boolean>)[] = [];
      if (interactionId && interactionToken) {
        attempts.push(async () => {
          try {
            await rest.delete(Routes.webhookMessage(interactionId, interactionToken));
            return true;
          } catch (e) {
            logger.error('Failed to delete message for sticker via Webhook API', {
              interactionId,
              interactionToken,
            }, e);
            return false;
          }
        });
      }
      if (messageId && channelId) {
        attempts.push(async () => {
          try {
            await rest.delete(Routes.channelMessage(channelId, messageId));
            return true;
          } catch (e) {
            logger.error('Failed to delete message for sticker via REST API', {
              channelId,
              messageId,
            }, e);
            return false;
          }
        });
      }

      const success = await runAttempts(attempts);
      if (success) {
        await db.stickerMessage.update({
          where: {
            messageId_stickerId: {
              stickerId,
              messageId: BigInt(messageId),
            },
          },
          data: { deletedAt: new Date() },
        });
        logger.info(`Marked message ${messageId} for sticker ${stickerId} as deleted`);
      }
    }
      break;
    case 'update': {
      if (!newUrl) break;

      const db = createDb();
      const sticker = await db.sticker.findUnique({
        where: { id: stickerId },
        include: { pack: true },
      });
      const spoiler = sticker ? resolveStickerNsfw(sticker, sticker.pack) : false;
      const { files, items } = mapStickersToGalleryItems([{
        url: newUrl,
        description: description ?? null,
      }], spoiler);
      const patchRequest: RequestData = {
        body: {
          flags: MessageFlags.IsComponentsV2,
          components: [
            {
              type: ComponentType.MediaGallery,
              items,
            },
          ],
        } satisfies RESTPatchAPIChannelMessageJSONBody,
        files: files.map((file) => ({
          name: file.name!,
          data: fs.readFileSync(file.attachment as string),
        })),
      };

      const attempts: (() => Promise<boolean>)[] = [];
      if (interactionId && interactionToken) {
        attempts.push(async () => {
          try {
            await rest.patch(Routes.webhookMessage(interactionId, interactionToken), patchRequest);
            return true;
          } catch (e) {
            logger.error('Failed to update message for sticker via Webhook API', {
              interactionId,
              interactionToken,
            }, e);
            return false;
          }
        });
      }
      if (messageId && channelId) {
        attempts.push(async () => {
          try {
            await rest.patch(Routes.channelMessage(messageId, channelId), patchRequest);
            return true;
          } catch (e) {
            logger.error('Failed to update message for sticker via REST API', {
              messageId,
              channelId,
            }, e);
            return false;
          }
        });
      }

      const success = await runAttempts(attempts);
      if (success) {
        logger.info(`Update message ${messageId} for sticker ${stickerId} successfully`);
      }
    }
      break;
  }
};
