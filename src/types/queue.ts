import { WorkHandler } from 'pg-boss/dist/types.js';

export enum QueueType {
  UpdateMessage = 'update-message',
  TelegramImport = 'telegram-import',
  CleanupOrphanedTelegramPacks = 'cleanup-orphaned-telegram-packs',
  HardDeleteOldStickers = 'hard-delete-old-stickers',
  HardDeleteOldPacks = 'hard-delete-old-packs',
  HardDeleteStaleTelegramStickers = 'hard-delete-stale-telegram-stickers',
  UpdateStickerUsageStats = 'update-sticker-usage-stats',
}

export interface QueueReqData {
  [QueueType.UpdateMessage]: {
    channelId: string;
    stickerId: string;
    messageId: string;
    interactionId: string | null;
    interactionToken: string | null;
    action: 'delete' | 'update';
    newUrl?: string;
    description?: string;
  };
  [QueueType.TelegramImport]: {
    importJobId: string;
  };
  // Both maintenance jobs run on a daily schedule (plus once at startup) and sweep the
  // whole table rather than targeting a single record, so neither needs job data
  [QueueType.CleanupOrphanedTelegramPacks]: Record<string, never>;
  [QueueType.HardDeleteOldStickers]: Record<string, never>;
  [QueueType.HardDeleteOldPacks]: Record<string, never>;
  [QueueType.HardDeleteStaleTelegramStickers]: Record<string, never>;
  // Runs hourly (see QueueManager) and does a full recompute of aggregate counts, so it
  // needs no job data — it always operates over the entire StickerMessage table
  [QueueType.UpdateStickerUsageStats]: Record<string, never>;
}

export type QueueHandler<Type extends QueueType> = WorkHandler<QueueReqData[Type], void>;
