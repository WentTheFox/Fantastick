import { i18n } from 'i18next';
import { PgBoss } from 'pg-boss';
import { SendOptions } from 'pg-boss/dist/types.js';
import { initI18next } from '../constants/locales.js';
import { env } from '../env.js';
import { NestableLogger } from '../types/logger-types.js';
import { QueueHandler, QueueReqData, QueueType } from '../types/queue.js';
import { updateMessageQueueHandler } from './queue-handlers/update-message.queue-handler.js';

export class QueueManager {
  protected readonly boss: PgBoss;
  protected readonly i18next: Promise<i18n>;
  protected readonly queueWorkers: { [k in QueueType]: (logger: NestableLogger) => QueueHandler<k> };
  protected readonly defaultOptions: Partial<{ [k in QueueType]: SendOptions }> = {
    [QueueType.UpdateMessage]: { group: { id: 'discord-api' } },
  };

  constructor(protected logger: NestableLogger) {
    this.boss = new PgBoss(env.DATABASE_URL);
    this.queueWorkers = {
      [QueueType.UpdateMessage]: updateMessageQueueHandler,
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
      return this.boss.work(
        queueType,
        { groupConcurrency: 1 },
        this.queueWorkers[queueType as QueueType](this.logger),
      );
    }));
  }
}

