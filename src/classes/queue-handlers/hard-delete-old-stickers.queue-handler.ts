import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';
import { hardDeleteRetentionMs } from '../../constants/retention.js';
import { QueueHandler, QueueType } from '../../types/queue.js';
import { createDb } from '../../utils/create-db.js';
import { hardDeleteSticker } from '../../utils/hard-delete-sticker.js';

// Runs daily (see QueueManager). Sticker deletion only soft-deletes (deletedAt), which
// keeps the row around for a grace period — restoring it, or looking it up from message
// history — before it's actually gone. This permanently removes anything past that
// window. Stickers belonging to a Pack that's itself past the window are instead swept
// up by hardDeleteOldPacksQueueHandler; this only re-queries current DB state (no
// persisted cursor), so if the two jobs ever raced on the same row, the loser's
// individually-guarded delete just no-ops instead of erroring.
export const hardDeleteOldStickersQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.HardDeleteOldStickers> => async () => {
  const db = createDb();
  const cutoff = new Date(Date.now() - hardDeleteRetentionMs);

  const staleStickers = await db.sticker.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, url: true, deleteUrl: true, telegramStickerId: true },
  });
  if (staleStickers.length === 0) return;

  for (const sticker of staleStickers) {
    await hardDeleteSticker({ logger, db }, sticker);
  }

  logger.info(`Hard-deleted ${staleStickers.length} sticker(s) soft-deleted for over ${hardDeleteRetentionMs / (24 * 60 * 60 * 1000)} days`);
};
