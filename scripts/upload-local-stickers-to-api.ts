import * as fs from 'node:fs';
import { createAppLogger } from '../src/utils/create-logger.js';
import { createDb } from '../src/utils/create-db.js';
import { getStickerFilePathFromUrl, isFileUploadStickerUrl } from '../src/utils/filesystem.js';
import { isUploadApiEnabled, uploadFile, UploadApiError } from '../src/utils/upload-api.js';

// One-off migration: uploads every active sticker file still stored on the local
// filesystem (a `fs://` url) to the configured remote upload API, and updates the
// owning row's `url`/`deleteUrl` to point at it instead. A local file is only ever
// removed after its row has been successfully updated in the database - if the
// upload or the DB write fails, the row and file are left untouched so the script
// is safe to re-run.
//
// Requires UPLOAD_API_ENABLED=true and the other UPLOAD_API_* vars configured.
//
// Run with: pnpm exec tsx scripts/upload-local-stickers-to-api.ts

const logger = createAppLogger('upload-local-stickers-to-api');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Throttle between uploads, and back off with retries on 429 - the migration
// otherwise fires requests as fast as the filesystem/network allow, which
// trips the upload API's rate limit well before all files are processed.
const uploadFileWithRetry = async (fileName: string, data: Buffer) => {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await uploadFile(logger, fileName, data);
    } catch (e) {
      const isRateLimited = e instanceof UploadApiError && e.status === 429;
      if (!isRateLimited || attempt === maxAttempts) {
        throw e;
      }
      const delayMs = e.retryAfterMs ?? 2_000 * attempt;
      logger.warn(`Rate limited uploading ${fileName}, retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})`);
      await sleep(delayMs);
    }
  }
  throw new Error('unreachable');
};

const uploadThrottleMs = 300;

const main = async () => {
  if (!isUploadApiEnabled()) {
    logger.error('UPLOAD_API_ENABLED is not set to true - configure the UPLOAD_API_* env vars before running this script');
    process.exit(1);
  }

  const db = createDb();

  let uploaded = 0;
  let skippedMissingFile = 0;
  let failedUpload = 0;
  let failedDbUpdate = 0;

  const stickers = await db.sticker.findMany({ where: { url: { startsWith: 'fs://' }, deletedAt: null } });
  logger.info(`Found ${stickers.length} local Sticker file(s) to migrate.`);
  for (const sticker of stickers) {
    if (!sticker.url || !isFileUploadStickerUrl(sticker.url)) {
      continue;
    }
    const location = getStickerFilePathFromUrl(sticker.url);
    if (!location || !fs.existsSync(location.filePath)) {
      logger.warn(`Sticker ${sticker.id} references a missing file (${sticker.url}), skipping`);
      skippedMissingFile++;
      continue;
    }

    let result: { url: string; deleteUrl: string | null };
    try {
      const data = await fs.promises.readFile(location.filePath);
      result = await uploadFileWithRetry(location.stickerFileName, data);
      await sleep(uploadThrottleMs);
    } catch (e) {
      logger.error(`Failed to upload file for sticker ${sticker.id}`, e);
      failedUpload++;
      continue;
    }

    try {
      await db.sticker.update({ where: { id: sticker.id }, data: { url: result.url, deleteUrl: result.deleteUrl } });
    } catch (e) {
      logger.error(`Uploaded file for sticker ${sticker.id} but failed to update its DB row - leaving local file in place`, e);
      failedDbUpdate++;
      continue;
    }

    await fs.promises.unlink(location.filePath).catch(() => undefined);
    logger.info(`Migrated sticker ${sticker.id} -> ${result.url}`);
    uploaded++;
  }

  const telegramStickers = await db.telegramSticker.findMany({ where: { url: { startsWith: 'fs://' }, deletedAt: null } });
  logger.info(`Found ${telegramStickers.length} local TelegramSticker file(s) to migrate.`);
  for (const telegramSticker of telegramStickers) {
    const location = getStickerFilePathFromUrl(telegramSticker.url);
    if (!location || !fs.existsSync(location.filePath)) {
      logger.warn(`TelegramSticker ${telegramSticker.id} references a missing file (${telegramSticker.url}), skipping`);
      skippedMissingFile++;
      continue;
    }

    let result: { url: string; deleteUrl: string | null };
    try {
      const data = await fs.promises.readFile(location.filePath);
      result = await uploadFileWithRetry(location.stickerFileName, data);
      await sleep(uploadThrottleMs);
    } catch (e) {
      logger.error(`Failed to upload file for TelegramSticker ${telegramSticker.id}`, e);
      failedUpload++;
      continue;
    }

    try {
      await db.telegramSticker.update({ where: { id: telegramSticker.id }, data: { url: result.url, deleteUrl: result.deleteUrl } });
    } catch (e) {
      logger.error(`Uploaded file for TelegramSticker ${telegramSticker.id} but failed to update its DB row - leaving local file in place`, e);
      failedDbUpdate++;
      continue;
    }

    await fs.promises.unlink(location.filePath).catch(() => undefined);
    logger.info(`Migrated TelegramSticker ${telegramSticker.id} -> ${result.url}`);
    uploaded++;
  }

  logger.info(`Done: ${uploaded} migrated, ${skippedMissingFile} skipped (missing file), ${failedUpload} failed to upload, ${failedDbUpdate} failed to update (file kept).`);
};

main().catch((e) => {
  logger.error('Unhandled error', e);
  process.exit(1);
});
