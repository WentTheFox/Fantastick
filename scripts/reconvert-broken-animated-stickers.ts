import { convertTgsToGif, convertWebmToGif, launchTgsRenderer } from '../src/utils/convert-sticker-to-gif.js';
import { createAppLogger } from '../src/utils/create-logger.js';
import { createDb } from '../src/utils/create-db.js';
import { getStickerFileFsUrl, getStickerFilePathFromFileName, getStickerFilePathFromUrl } from '../src/utils/filesystem.js';
import {
  createTelegramApiClient,
  createTelegramFileClient,
  TelegramApiGetFileResponse,
  TelegramApiGetStickerSetResponse,
} from '../src/utils/telegram-api.js';
import * as fs from 'node:fs';
import { Readable } from 'node:stream';

// One-off maintenance script: animated/video Telegram stickers converted to GIF before
// the ffmpeg alpha-preservation fix (see convert-sticker-to-gif.ts) got baked with an
// opaque black/white background instead of transparency. This finds every TelegramSticker
// whose file is a `.gif` (the only extension the animated/video conversion path produces —
// static imports always use `.webp`), re-downloads and re-converts it with the fixed
// pipeline, and overwrites the file in place at its existing `fs://` URL. Usually no DB
// rows are touched (bytes overwritten in place at the same url/id) — the one exception is
// a single-frame webm, which now converts to `.png` instead of `.gif`; for those the url
// is updated to the new extension and the stale `.gif` file is removed.
//
// Run with: pnpm exec tsx scripts/reconvert-broken-animated-stickers.ts
//
// Note: stickers already posted in past Discord messages won't retroactively update —
// Discord caches the attachment bytes it already received. Only future sends/re-imports
// will show the corrected image.

const logger = createAppLogger('reconvert-broken-animated-stickers');

const main = async () => {
  const db = createDb();
  const telegramClient = createTelegramApiClient(logger);
  const telegramFileClient = createTelegramFileClient(logger);

  const brokenStickers = await db.telegramSticker.findMany({
    where: { url: { endsWith: '.gif' }, deletedAt: null },
    include: { telegramPack: true },
  });

  if (brokenStickers.length === 0) {
    logger.info('No broken (.gif) animated stickers found — nothing to do.');
    return;
  }

  logger.info(`Found ${brokenStickers.length} animated/video sticker(s) to reconvert.`);

  const stickersByPack = new Map<string, typeof brokenStickers>();
  for (const sticker of brokenStickers) {
    const list = stickersByPack.get(sticker.telegramPackId) ?? [];
    list.push(sticker);
    stickersByPack.set(sticker.telegramPackId, list);
  }

  const renderer = await launchTgsRenderer();
  let reconverted = 0;
  let skippedNotInSet = 0;
  let failed = 0;

  try {
    for (const [telegramPackId, stickers] of stickersByPack) {
      const telegramPackName = stickers[0].telegramPack.telegramPackName;
      logger.info(`Fetching current sticker set for pack ${telegramPackName} (${telegramPackId})…`);

      let liveStickersByUniqueId: Map<string, { file_id: string; is_animated: boolean; is_video: boolean }>;
      try {
        const getStickerSetRequest = await telegramClient.request<TelegramApiGetStickerSetResponse>({
          path: '/getStickerSet',
          query: { name: telegramPackName },
        });
        const liveStickers = getStickerSetRequest.response.result?.stickers ?? [];
        liveStickersByUniqueId = new Map(liveStickers.map(s => [s.file_unique_id, s]));
      } catch (e) {
        logger.error(`Failed to fetch Telegram sticker set ${telegramPackName}, skipping its ${stickers.length} sticker(s)`, e);
        failed += stickers.length;
        continue;
      }

      for (const sticker of stickers) {
        const live = liveStickersByUniqueId.get(sticker.telegramFileUniqueId);
        if (!live) {
          logger.warn(`Sticker ${sticker.id} (${sticker.telegramFileUniqueId}) is no longer in the live Telegram set, skipping`);
          skippedNotInSet++;
          continue;
        }

        try {
          const getFileRequest = await telegramClient.request<TelegramApiGetFileResponse>({
            path: '/getFile',
            query: { file_id: live.file_id },
          });
          const telegramFilePath = getFileRequest.response.result!.file_path;

          const fileRequest = await telegramFileClient.request<Readable>({
            path: `/${telegramFilePath}`,
            raw: true,
          });
          const chunks: Buffer[] = [];
          for await (const chunk of fileRequest.response) {
            chunks.push(chunk as Buffer);
          }
          const buffer = Buffer.concat(chunks);

          const location = getStickerFilePathFromUrl(sticker.url);
          if (!location) {
            logger.error(`Sticker ${sticker.id} has an unrecognized url ${sticker.url}, skipping`);
            failed++;
            continue;
          }

          if (live.is_animated) {
            const gif = await convertTgsToGif({ logger }, renderer, buffer);
            await fs.promises.writeFile(location.filePath, gif);
          } else {
            const converted = await convertWebmToGif({ logger }, buffer);
            const currentExtension = location.stickerFileName.split('.').pop();
            if (converted.extension === currentExtension) {
              // Same extension (the common case, .gif -> .gif): overwrite in place, no DB change.
              await fs.promises.writeFile(location.filePath, converted.buffer);
            } else {
              // Extension changed (e.g. a single-frame webm now extracts as .png): write under
              // the same sticker file id with the new extension, update the DB url, then remove
              // the stale file so nothing is orphaned on disk.
              const stickerFileId = location.stickerFileName.slice(0, -(currentExtension!.length + 1));
              const newFileName = `${stickerFileId}.${converted.extension}`;
              const newLocation = getStickerFilePathFromFileName(newFileName);
              await fs.promises.mkdir(newLocation.folderPath, { recursive: true });
              await fs.promises.writeFile(newLocation.filePath, converted.buffer);
              await db.telegramSticker.update({
                where: { id: sticker.id },
                data: { url: getStickerFileFsUrl(newFileName) },
              });
              await fs.promises.unlink(location.filePath).catch(() => undefined);
            }
          }
          logger.info(`Reconverted sticker ${sticker.id} (${sticker.telegramFileUniqueId})`);
          reconverted++;
        } catch (e) {
          logger.error(`Failed to reconvert sticker ${sticker.id} (${sticker.telegramFileUniqueId})`, e);
          failed++;
        }
      }
    }
  } finally {
    await renderer.close();
  }

  logger.info(`Done: ${reconverted} reconverted, ${skippedNotInSet} skipped (no longer in Telegram set), ${failed} failed.`);
  logger.info('Note: stickers already posted in past Discord messages will not retroactively update.');
};

main().catch((e) => {
  logger.error('Unhandled error', e);
  process.exit(1);
});
