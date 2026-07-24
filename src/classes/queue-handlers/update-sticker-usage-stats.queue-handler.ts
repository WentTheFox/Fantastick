import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';
import { QueueHandler, QueueType } from '../../types/queue.js';
import { createDb } from '../../utils/create-db.js';

// Runs hourly (see QueueManager). Recomputes StickerUsage from scratch each run rather
// than incrementing counters on send, because StickerMessage rows can be soft-deleted
// (message removed) or hard-deleted (sticker permanently removed, see hardDeleteSticker),
// either of which would otherwise leave stale counts with no signal to correct them. A
// full recompute is simple, always correct, and cheap relative to an hourly cadence.
export const updateStickerUsageStatsQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.UpdateStickerUsageStats> => async () => {
  const db = createDb();

  const counts = await db.stickerMessage.groupBy({
    by: ['userId', 'stickerId'],
    where: {
      isFeed: false,
      deletedAt: null,
      userId: { not: null },
    },
    _count: { _all: true },
  });

  await db.$transaction([
    db.stickerUsage.deleteMany({}),
    ...(counts.length > 0
      ? [db.stickerUsage.createMany({
        data: counts.map(row => ({
          userId: row.userId as bigint,
          stickerId: row.stickerId,
          count: row._count._all,
        })),
      })]
      : []),
  ]);

  logger.info(`Recomputed sticker usage stats for ${counts.length} user/sticker pair(s)`);
};
