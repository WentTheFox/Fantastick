import { NestableLogger } from '@went.tf/discord-bot-framework/logger';
import { hardDeleteRetentionMs } from '../../constants/retention.js';
import { QueueHandler, QueueType } from '../../types/queue.js';
import { createDb } from '../../utils/create-db.js';
import { hardDeleteSticker } from '../../utils/hard-delete-sticker.js';

// Runs daily (see QueueManager). Mirrors hardDeleteOldStickersQueueHandler for whole
// Packs: past the retention window, permanently removes every sticker still under the
// pack (regardless of the sticker's own deletedAt — the pack going away takes
// everything under it with it), its ImportJob rows (a hard FK, so they must go before
// the pack), then the Pack row itself.
//
// Only re-queries current DB state each run (no persisted cursor), and every delete is
// individually guarded/idempotent, so a sweep interrupted by an app restart is simply
// re-attempted from scratch on the next run and skips whatever already finished.
export const hardDeleteOldPacksQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.HardDeleteOldPacks> => async () => {
  const db = createDb();
  const cutoff = new Date(Date.now() - hardDeleteRetentionMs);

  const stalePacks = await db.pack.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true },
  });
  if (stalePacks.length === 0) return;

  for (const { id: packId } of stalePacks) {
    const stickers = await db.sticker.findMany({
      where: { packId },
      select: { id: true, url: true, deleteUrl: true, telegramStickerId: true },
    });
    for (const sticker of stickers) {
      await hardDeleteSticker({ logger, db }, sticker);
    }

    await db.importJob.deleteMany({ where: { packId } });
    await db.pack.delete({ where: { id: packId } }).catch((e) => {
      logger.warn(`Failed to delete old pack ${packId}`, e);
    });
  }

  logger.info(`Hard-deleted ${stalePacks.length} pack(s) soft-deleted for over ${hardDeleteRetentionMs / (24 * 60 * 60 * 1000)} days`);
};
