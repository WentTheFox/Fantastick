import { NestableLogger } from '@went.tf/discord-bot-framework/logger';
import { QueueHandler, QueueType } from '../../types/queue.js';
import { reconcileSearchIndex } from '../../utils/search/sticker-search-index.js';

// Runs every 15 minutes (see QueueManager). Diffs the whole OpenSearch sticker index against
// Postgres, so it both backfills a fresh index and repairs drift from any missed per-write sync.
export const reconcileStickerSearchIndexQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.ReconcileStickerSearchIndex> => async () => {
  await reconcileSearchIndex(logger);
};
