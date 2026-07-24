import { i18n } from 'i18next';
import { PgBoss } from 'pg-boss';
import { SendOptions, WorkHandler, WorkOptions } from 'pg-boss/dist/types.js';
import { initI18next } from '../constants/locales.js';
import { env } from '../env.js';
import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';
import { QueueHandler, QueueReqData, QueueType } from '../types/queue.js';
import { cleanupOrphanedTelegramPacksQueueHandler } from './queue-handlers/cleanup-orphaned-telegram-packs.queue-handler.js';
import { hardDeleteOldStickersQueueHandler } from './queue-handlers/hard-delete-old-stickers.queue-handler.js';
import { telegramImportQueueHandler } from './queue-handlers/telegram-import.queue-handler.js';
import { updateMessageQueueHandler } from './queue-handlers/update-message.queue-handler.js';

// Run daily at 03:00 UTC (low-traffic hours), plus once immediately at startup so a
// freshly deployed/restarted app doesn't wait a full day for its first sweep
const dailyMaintenanceQueues: QueueType[] = [
  QueueType.CleanupOrphanedTelegramPacks,
  QueueType.HardDeleteOldStickers,
];
const dailyMaintenanceCron = '0 3 * * *';

export class QueueManager {
  protected readonly boss: PgBoss;
  protected readonly i18next: Promise<i18n>;
  protected readonly queueWorkers: { [k in QueueType]: (logger: NestableLogger) => QueueHandler<k> };
  protected readonly defaultOptions: Partial<{ [k in QueueType]: SendOptions }> = {
    [QueueType.UpdateMessage]: { group: { id: 'discord-api' } },
  };
  protected readonly workOptions: Partial<{ [k in QueueType]: WorkOptions }> = {
    [QueueType.UpdateMessage]: { batchSize: 1 },
  };

  constructor(protected logger: NestableLogger) {
    this.boss = new PgBoss(env.DATABASE_URL);
    this.queueWorkers = {
      [QueueType.UpdateMessage]: updateMessageQueueHandler,
      [QueueType.TelegramImport]: telegramImportQueueHandler,
      [QueueType.CleanupOrphanedTelegramPacks]: cleanupOrphanedTelegramPacksQueueHandler,
      [QueueType.HardDeleteOldStickers]: hardDeleteOldStickersQueueHandler,
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

  // Only called by the queue-worker process (the one actually running `.work()`), not
  // by every place that constructs a QueueManager just to `.send()` jobs — otherwise
  // every shard would independently schedule/kick off the same maintenance sweep
  async setupDailyMaintenance(): Promise<void> {
    await Promise.all(dailyMaintenanceQueues.map(async (queueType) => {
      await this.boss.schedule(queueType, dailyMaintenanceCron, {});
      await this.send(queueType, {});
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
      const type = queueType as QueueType;
      this.logger.info(`Starting worker for queue ${type}…`);
      const handler = this.queueWorkers[type](this.logger) as unknown as WorkHandler<unknown, void>;
      const options = this.workOptions[type];
      return options
        ? this.boss.work(type, options, handler)
        : this.boss.work(type, handler);
    }));
  }
}

