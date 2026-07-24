import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';
import { hardDeleteRetentionMs } from '../../constants/retention.js';
import { QueueHandler, QueueType } from '../../types/queue.js';
import { createDb } from '../../utils/create-db.js';
import { deleteStickerFile } from '../../utils/delete-sticker-file.js';

// Runs daily (see QueueManager). A Telegram import soft-deletes a TelegramSticker row
// (and every Sticker row across every subscriber pack that pointed at it) whenever that
// sticker is removed from the set, or replaced with a different image — Telegram assigns
// a new file_unique_id on replacement, so the old row and its file become orphaned rather
// than reused. Nothing else ever purges those files; this is that cleanup, separate from
// hardDeleteOldStickersQueueHandler (which only touches the Sticker model) and
// cleanupOrphanedTelegramPacksQueueHandler (which only fires once a whole Telegram pack
// has no live subscribers left, not for individual stale stickers within a live one).
export const hardDeleteStaleTelegramStickersQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.HardDeleteStaleTelegramStickers> => async () => {
  const db = createDb();
  const cutoff = new Date(Date.now() - hardDeleteRetentionMs);

  // Guard against hard-deleting a row a still-live Sticker depends on — in practice the
  // import handler soft-deletes every dependent Sticker in the same transaction it stales
  // the TelegramSticker, so this should never exclude anything, but it's cheap insurance
  // against a bad race leaving a live Sticker pointing at a row we're about to remove
  // (Sticker.telegramStickerId is ON DELETE SET NULL, which would silently turn an
  // imported sticker into what every other code path reads as an owned one)
  const staleTelegramStickers = await db.telegramSticker.findMany({
    where: {
      deletedAt: { lt: cutoff },
      stickers: { none: { deletedAt: null } },
    },
    select: { id: true, url: true, deleteUrl: true },
  });
  if (staleTelegramStickers.length === 0) return;

  for (const telegramSticker of staleTelegramStickers) {
    await deleteStickerFile({ logger }, telegramSticker);
    await db.telegramSticker.delete({ where: { id: telegramSticker.id } }).catch((e) => {
      logger.warn(`Failed to delete stale Telegram sticker ${telegramSticker.id}`, e);
    });
  }

  logger.info(`Hard-deleted ${staleTelegramStickers.length} stale Telegram sticker(s) soft-deleted for over ${hardDeleteRetentionMs / (24 * 60 * 60 * 1000)} days`);
};
