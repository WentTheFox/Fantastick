import { LoggerContext } from '../types/contexts/logger.context.js';
import { createDb } from './create-db.js';
import { deleteStickerFile } from './delete-sticker-file.js';

export interface HardDeletableSticker {
  id: string;
  url: string | null;
  deleteUrl: string | null;
  telegramStickerId: string | null;
}

/**
 * Permanently removes a single sticker: its message-history rows (a hard FK, so they
 * must go first), its own file, then the row itself. Imported stickers' files are
 * shared via TelegramSticker and are cleaned up separately once their whole Telegram
 * pack is orphaned (see cleanupOrphanedTelegramPacksQueueHandler), so those are left
 * alone here.
 *
 * Every step is safe to re-run: deleteMany on an already-empty set is a no-op,
 * deleteStickerFile never throws, and the final delete swallows "already gone" so a
 * sweep interrupted mid-run (e.g. by an app restart) can simply be re-queried and
 * re-attempted from scratch without erroring on items it already finished.
 */
export const hardDeleteSticker = async (context: LoggerContext & { db: ReturnType<typeof createDb> }, sticker: HardDeletableSticker): Promise<void> => {
  const { db } = context;
  await db.stickerMessage.deleteMany({ where: { stickerId: sticker.id } });
  if (sticker.telegramStickerId === null) {
    await deleteStickerFile(context, sticker);
  }
  await db.sticker.delete({ where: { id: sticker.id } }).catch(() => undefined);
};
