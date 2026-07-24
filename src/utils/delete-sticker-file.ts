import { LoggerContext } from '../types/contexts/logger.context.js';
import { getStickerFilePathFromUrl, isFileUploadStickerUrl } from './filesystem.js';
import { deleteUploadedFile, isUploadApiEnabled } from './upload-api.js';
import fs from 'node:fs';

export interface DeletableStickerFile {
  url: string | null;
  deleteUrl: string | null;
}

/**
 * Best-effort cleanup of a sticker's underlying file, local or remote. Never
 * throws - failures are logged and swallowed, since this always runs after
 * the owning DB row has already been updated/soft-deleted and shouldn't block
 * or fail the user-facing action.
 */
export const deleteStickerFile = async (context: LoggerContext, { url, deleteUrl }: DeletableStickerFile): Promise<void> => {
  try {
    if (url && isFileUploadStickerUrl(url)) {
      const location = getStickerFilePathFromUrl(url);
      if (location) {
        await fs.promises.unlink(location.filePath).catch(() => undefined);
      }
    } else if (deleteUrl && isUploadApiEnabled()) {
      await deleteUploadedFile(context.logger, deleteUrl);
    }
  } catch (e) {
    context.logger.error(`Failed to delete sticker file (url=${url}, deleteUrl=${deleteUrl})`, e);
  }
};
