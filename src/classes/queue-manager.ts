import { RequestData } from '@discordjs/rest';
import {
  ComponentType,
  MessageFlags,
  RESTPatchAPIChannelMessageJSONBody,
  Routes,
} from 'discord-api-types/v10';
import { i18n } from 'i18next';
import fs from 'node:fs';
import { Job, PgBoss, WorkHandler } from 'pg-boss';
import { SendOptions } from 'pg-boss/dist/types.js';
import { initI18next } from '../constants/locales.js';
import { env } from '../env.js';
import { NestableLogger } from '../types/logger-types.js';
import { createDb } from '../utils/create-db.js';
import { mapStickersToGalleryItems } from '../utils/map-stickers-to-gallery-items.js';
import { rest } from '../utils/rest.js';

export enum QueueType {
  UpdateMessage = 'update-message',
}

interface QueueReqData {
  [QueueType.UpdateMessage]: {
    channelId: string;
    stickerId: string;
    messageId: string;
    interactionId: string | null;
    interactionToken: string | null;
    action: 'delete' | 'update';
    newUrl?: string;
    description?: string;
  };
}

export class QueueManager {
  protected readonly boss: PgBoss;
  protected readonly i18next: Promise<i18n>;
  protected readonly queueWorkers: { [k in QueueType]: WorkHandler<QueueReqData[k], void> };
  protected readonly defaultOptions: Partial<{ [k in QueueType]: SendOptions }> = {
    [QueueType.UpdateMessage]: { group: { id: 'discord-api' } },
  };

  constructor(protected logger: NestableLogger) {
    this.boss = new PgBoss(env.DATABASE_URL);
    this.queueWorkers = {
      [QueueType.UpdateMessage]: (data) => this.updateMessage(data),
    };
    this.i18next = initI18next(this.logger);
  }

  async init(): Promise<void> {
    await this.i18next;
    this.boss.on('error', (...args) => this.logger.error(...args));
    this.boss.on('warning', (...args) => this.logger.warn(...args));

    await this.boss.start();

    await this.setupQueues();
  }

  protected async setupQueues(): Promise<void> {
    await Promise.all(Object.keys(this.queueWorkers).map(queueType => {
      return this.boss.createQueue(queueType);
    }));
  }

  async send<Name extends QueueType>(name: Name, data: QueueReqData[Name], options?: SendOptions): Promise<void> {
    await this.boss.send({
      name, data, options: {
        ...this.defaultOptions[name],
        ...options,
      },
    });
  }

  public async work(): Promise<void> {
    await Promise.all(Object.keys(this.queueWorkers).map(queueType => {
      this.logger.info(`Starting worker for queue ${queueType}…`);
      return this.boss.work(queueType, { groupConcurrency: 1 }, this.queueWorkers[queueType as QueueType]);
    }));
  }

  protected async updateMessage([job]: Job<QueueReqData[QueueType.UpdateMessage]>[]): Promise<void> {
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
              this.logger.error('Failed to delete message for sticker via Webhook API', {
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
              this.logger.error('Failed to delete message for sticker via REST API', {
                channelId,
                messageId,
              }, e);
              return false;
            }
          });
        }

        const success = await this.runAttempts(attempts);
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
          this.logger.info(`Marked message ${messageId} for sticker ${stickerId} as deleted`);
        }
      }
        break;
      case 'update': {
        if (!newUrl) break;

        const { files, items } = mapStickersToGalleryItems([{
          url: newUrl,
          description: description ?? null,
        }]);
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
              this.logger.error('Failed to update message for sticker via Webhook API', {
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
              this.logger.error('Failed to update message for sticker via REST API', {
                messageId,
                channelId,
              }, e);
              return false;
            }
          });
        }

        const success = await this.runAttempts(attempts);
        if (success) {
          this.logger.info(`Update message ${messageId} for sticker ${stickerId} successfully`);
        }
      }
        break;
    }
  }

  protected async runAttempts(attempts: (() => Promise<boolean>)[]): Promise<boolean> {
    const results: boolean[] = [];
    for (const attempt of attempts) {
      const result = await attempt();
      results.push(result);
      if (result) {
        break;
      }
    }
    return results.some(result => result);
  }
}
