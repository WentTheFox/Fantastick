import { WorkHandler } from 'pg-boss/dist/types.js';

export enum QueueType {
  UpdateMessage = 'update-message',
  TelegramImport = 'telegram-import',
  CleanupOrphanedTelegramPacks = 'cleanup-orphaned-telegram-packs',
  HardDeleteOldStickers = 'hard-delete-old-stickers',
  HardDeleteOldPacks = 'hard-delete-old-packs',
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
}

export type QueueHandler<Type extends QueueType> = WorkHandler<QueueReqData[Type], void>;
