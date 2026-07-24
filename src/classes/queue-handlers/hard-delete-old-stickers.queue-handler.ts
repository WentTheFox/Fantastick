import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';
import { QueueHandler, QueueType } from '../../types/queue.js';
import { createDb } from '../../utils/create-db.js';
import { deleteStickerFile } from '../../utils/delete-sticker-file.js';

const retentionMs = 7 * 24 * 60 * 60 * 1000;

// Runs daily (see QueueManager). Sticker deletion only soft-deletes (deletedAt), which
// keeps the row around for a grace period — restoring it, or looking it up from message
// history — before it's actually gone. This permanently removes anything past that
// window: its message-history rows (a hard FK, so they must go first), its own file
// (imported stickers' files are shared and cleaned up separately once their whole
// Telegram pack is orphaned — see cleanupOrphanedTelegramPacksQueueHandler), then the
// Sticker row itself.
export const hardDeleteOldStickersQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.HardDeleteOldStickers> => async () => {
  const db = createDb();
  const cutoff = new Date(Date.now() - retentionMs);

  const staleStickers = await db.sticker.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, url: true, deleteUrl: true, telegramStickerId: true },
  });
  if (staleStickers.length === 0) return;

  for (const sticker of staleStickers) {
    await db.stickerMessage.deleteMany({ where: { stickerId: sticker.id } });
    if (sticker.telegramStickerId === null) {
      await deleteStickerFile({ logger }, sticker);
    }
    await db.sticker.delete({ where: { id: sticker.id } });
  }

  logger.info(`Hard-deleted ${staleStickers.length} sticker(s) soft-deleted for over ${retentionMs / (24 * 60 * 60 * 1000)} days`);
};
