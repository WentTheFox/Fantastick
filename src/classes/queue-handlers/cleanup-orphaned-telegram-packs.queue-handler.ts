import { NestableLogger } from '@went.tf/discord-bot-framework/logger';
import { QueueHandler, QueueType } from '../../types/queue.js';
import { createDb } from '../../utils/create-db.js';
import { deleteStickerFile } from '../../utils/delete-sticker-file.js';

// Runs daily (see QueueManager). Shared TelegramSticker files aren't touched by pack
// deletion itself (they can still be referenced by other users' subscriber packs), so
// this sweeps for Telegram packs with zero *live* subscribers left — only soft-deleted
// ones — and cleans those up.
//
// The TelegramPack/TelegramSticker rows are hard-deleted, not soft-deleted: import
// treats an existing (even soft-deleted) TelegramSticker row as already-downloaded and
// only restores its metadata, so leaving rows behind pointing at files we just deleted
// would produce a pack that "re-imports" successfully but shows broken images. Hard
// deletion makes a future re-import of the same Telegram set start clean instead.
export const cleanupOrphanedTelegramPacksQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.CleanupOrphanedTelegramPacks> => async () => {
  const db = createDb();

  const orphanedTelegramPacks = await db.telegramPack.findMany({
    where: { packs: { none: { deletedAt: null } } },
    select: { id: true },
  });
  if (orphanedTelegramPacks.length === 0) return;

  let cleanedStickerFileCount = 0;
  for (const { id: telegramPackId } of orphanedTelegramPacks) {
    const telegramStickers = await db.telegramSticker.findMany({
      where: { telegramPackId },
      select: { id: true, url: true, deleteUrl: true },
    });

    await Promise.all(telegramStickers.map(sticker => deleteStickerFile({ logger }, sticker)));
    await db.telegramSticker.deleteMany({ where: { telegramPackId } });
    await db.telegramPack.delete({ where: { id: telegramPackId } }).catch((e) => {
      logger.warn(`Failed to delete orphaned Telegram pack ${telegramPackId}`, e);
    });
    cleanedStickerFileCount += telegramStickers.length;
  }

  logger.info(`Cleaned up ${orphanedTelegramPacks.length} orphaned Telegram pack(s) (${cleanedStickerFileCount} sticker file(s))`);
};
