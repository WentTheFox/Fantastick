import { Routes } from 'discord-api-types/v10';
import { MessageFlags, userMention, WebhookClient } from 'discord.js';
import * as fs from 'node:fs';
import { Readable } from 'node:stream';
import { filledBar } from 'string-progressbar';
import typia from 'typia';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import { env } from '../../env.js';
import { Pack, Sticker, TelegramPack, TelegramSticker } from '../../generated/prisma/client.js';
import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';
import { QueueHandler, QueueType } from '../../types/queue.js';
import {
  convertTgsToGif,
  convertWebmToGif,
  isChromiumUnavailableError,
  isFfmpegUnavailableError,
  launchTgsRenderer,
  TgsRenderer,
} from '../../utils/convert-sticker-to-gif.js';
import { createDb } from '../../utils/create-db.js';
import { saveStickerFile, SaveStickerInput } from '../../utils/filesystem.js';
import { getEmojiIdMap } from '../../utils/get-emoji-id-map.js';
import { getFormattedStickerName } from '../../utils/get-formatted-sticker-name.js';
import { getPackNsfwEmoji } from '../../utils/get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from '../../utils/get-pack-visibility-emoji.js';
import { mapStickersToGalleryItems } from '../../utils/map-stickers-to-gallery-items.js';
import { emoji } from '../../utils/messaging.js';
import { resolveStickerNsfw } from '../../utils/resolve-sticker-nsfw.js';
import { rest } from '../../utils/rest.js';
import {
  createTelegramApiClient,
  createTelegramFileClient,
  isTelegramNotFoundError,
  TelegramApiGetFileResponse,
  TelegramApiGetStickerSetResponse,
} from '../../utils/telegram-api.js';
import { wrapUrlsInAngleBrackets } from '../../utils/wrap-urls-in-angle-brackets.js';

const buildProgressContent = (emojiIdMap: Record<string, string>, total: number, current: number, failed = false, finalizing = false) => {
  const [bar] = filledBar(total, current, 18, EmojiCharacters.WHITE_SQUARE, failed ? EmojiCharacters.RED_SQUARE : EmojiCharacters.GREEN_SQUARE);
  const icon = emoji({ emojiIdMap }, failed ? 'loadingerror' : 'loading', true);
  let text: string;
  if (finalizing) {
    text = 'Finalizing import…';
  } else if (failed) {
    text = `Rolling back: ${total - current} / ${total} files remaining`;
  } else {
    text = `Importing: ${current} / ${total}`;
  }
  return `${icon} ${text}\n-# ${bar}`;
};

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
};

export const telegramImportQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.TelegramImport> => async ([job]) => {
  const { importJobId } = job.data;
  const db = createDb();

  const importJob = await db.importJob.findUnique({
    where: { id: importJobId },
    include: { pack: { include: { telegramPack: true } } },
  });
  if (!importJob) {
    logger.error(`Import job ${importJobId} not found`);
    return;
  }

  const { interactionId, interactionToken, telegramPackName, packId, importedBy, pack } = importJob;
  const telegramPack = pack.telegramPack;
  if (!telegramPack) {
    logger.error(`Import job ${importJobId} references pack ${packId} without a linked Telegram pack`);
    await db.importJob.update({ where: { id: importJobId }, data: { status: 'FAILED', errorMessage: 'Pack is not linked to a Telegram pack' } });
    return;
  }

  const emojiIdMap = await getEmojiIdMap({ logger });

  const updateDiscordProgress = async (content: string) => {
    if (!interactionId || !interactionToken) return;
    try {
      await rest.patch(Routes.webhookMessage(env.DISCORD_CLIENT_ID, interactionToken, '@original'), {
        body: { content },
      });
    } catch (e) {
      logger.warn('Failed to update Discord progress message', e);
    }
  };

  // A pack freshly auto-created for this import (no live stickers yet) is removed again
  // when the job fails so a bad URL doesn't leave an orphan placeholder pack
  const cleanUpFreshlyCreatedPack = async () => {
    const liveStickerCount = await db.sticker.count({ where: { packId, deletedAt: null } });
    if (liveStickerCount > 0) return;
    await db.pack.update({
      where: { id: packId },
      data: { deletedAt: new Date(), deletedBy: importedBy },
    });
    logger.info(`Soft-deleted freshly created pack ${packId} after failed import`);
  };

  const failJob = async (errorMessage: string, discordMessage: string) => {
    await db.importJob.update({ where: { id: importJobId }, data: { status: 'FAILED', errorMessage } });
    await cleanUpFreshlyCreatedPack();
    await updateDiscordProgress(`${EmojiCharacters.OCTAGONAL_SIGN} ${discordMessage}`);
  };

  // Fetch sticker set from Telegram
  await db.importJob.update({ where: { id: importJobId }, data: { status: 'FETCHING' } });

  const telegramClient = createTelegramApiClient(logger);
  const telegramFileClient = createTelegramFileClient(logger);

  let getStickerSetRequest;
  try {
    getStickerSetRequest = await telegramClient.request({
      path: '/getStickerSet',
      query: { name: telegramPackName },
      validator: typia.createValidate<TelegramApiGetStickerSetResponse>(),
    });
  } catch (e) {
    const isNotFound = isTelegramNotFoundError(e);
    await failJob(
      isNotFound ? 'Telegram pack not found' : `Failed to fetch sticker set: ${e}`,
      'Failed to fetch Telegram sticker set.',
    );
    logger.error(`Failed to fetch Telegram sticker set ${telegramPackName}`, e);
    return;
  }

  const packTitle = getStickerSetRequest.response.result?.title ?? telegramPackName;
  const telegramStickers = getStickerSetRequest.response.result?.stickers ?? [];
  const total = telegramStickers.length;
  if (total === 0) {
    await failJob('No stickers found in Telegram pack', 'No stickers found in this Telegram pack.');
    logger.error(`Telegram sticker set ${telegramPackName} has no stickers`);
    return;
  }

  await db.importJob.update({ where: { id: importJobId }, data: { status: 'IMPORTING', total } });
  await updateDiscordProgress(buildProgressContent(emojiIdMap, total, 0));
  logger.debug(`Importing ${total} stickers from Telegram set ${telegramPackName}…`);

  // Phase 1: sync the shared TelegramSticker rows (files are stored exactly once)
  const createTelegramStickerRecords: Parameters<typeof db.telegramSticker.create>[0][] = [];
  const updateTelegramStickerRecords: Parameters<typeof db.telegramSticker.update>[0][] = [];
  const createdFiles = new Set<string>();
  let completed = 0;
  let failedCount = 0;
  let skippedAnimatedCount = 0;
  let tgsConversionDisabled = false;
  let webmConversionDisabled = false;
  const buildAnimatedSkipNote = () => (tgsConversionDisabled || webmConversionDisabled)
    ? `\n-# ${EmojiCharacters.WARNING_SIGN} Animated sticker conversion unavailable (ffmpeg/Chromium not found) — ${skippedAnimatedCount} skipped so far`
    : '';

  let renderer: TgsRenderer | null = null;
  if (telegramStickers.some(s => s.is_animated)) {
    try {
      renderer = await launchTgsRenderer();
    } catch (e) {
      logger.error('Failed to launch animated sticker renderer, animated (.tgs) stickers will be skipped for this import', e);
      tgsConversionDisabled = true;
    }
  }

  try {
    for (const [order, sticker] of telegramStickers.entries()) {
      const needsTgsConversion = sticker.is_animated;
      const needsWebmConversion = sticker.is_video;
      if ((needsTgsConversion && tgsConversionDisabled) || (needsWebmConversion && webmConversionDisabled)) {
        skippedAnimatedCount++;
        completed++;
        logger.info(`Skipping sticker ${sticker.file_id} (#${order}): animated sticker conversion unavailable`);
        await db.importJob.update({ where: { id: importJobId }, data: { completed } });
        await updateDiscordProgress(buildProgressContent(emojiIdMap, total, completed) + buildAnimatedSkipNote());
        continue;
      }

      // Includes soft-deleted rows: a sticker re-added to the Telegram set is restored
      const existing = await db.telegramSticker.findUnique({
        where: {
          telegramPackId_telegramFileUniqueId: {
            telegramPackId: telegramPack.id,
            telegramFileUniqueId: sticker.file_unique_id,
          },
        },
      });
      if (existing) {
        if (existing.deletedAt !== null || existing.emoji !== sticker.emoji || existing.order !== order) {
          updateTelegramStickerRecords.push({
            where: { id: existing.id },
            data: { emoji: sticker.emoji, order, deletedAt: null },
          });
        }
        completed++;
        await db.importJob.update({ where: { id: importJobId }, data: { completed } });
        await updateDiscordProgress(buildProgressContent(emojiIdMap, total, completed) + buildAnimatedSkipNote());
        continue;
      }

      let telegramFilePath: string;
      try {
        const getFileRequest = await telegramClient.request({
          path: '/getFile',
          query: { file_id: sticker.file_id },
          validator: typia.createValidate<TelegramApiGetFileResponse>(),
        });
        telegramFilePath = getFileRequest.response.result!.file_path;
      } catch (e) {
        logger.error(`Failed to get file path for sticker ${sticker.file_id} (#${order})`, e);
        failedCount++;
        completed++;
        await db.importJob.update({ where: { id: importJobId }, data: { completed, failed: failedCount } });
        await updateDiscordProgress(buildProgressContent(emojiIdMap, total, completed) + buildAnimatedSkipNote());
        continue;
      }

      const fileRequest = await telegramFileClient.request({
        path: `/${telegramFilePath}`,
        raw: true,
        validator: typia.createValidate<Readable>(),
      });

      let fileName: string;
      let data: SaveStickerInput['data'];
      try {
        if (sticker.is_animated) {
          data = await convertTgsToGif({ logger }, renderer!, await streamToBuffer(fileRequest.response));
          fileName = 'sticker.gif';
        } else if (sticker.is_video) {
          const converted = await convertWebmToGif({ logger }, await streamToBuffer(fileRequest.response));
          data = converted.buffer;
          fileName = `sticker.${converted.extension}`;
        } else {
          data = fileRequest.response;
          fileName = 'sticker.webp';
        }
      } catch (e) {
        logger.error(`Failed to convert sticker ${sticker.file_id} (#${order}) to GIF`, e);
        if (isFfmpegUnavailableError(e)) {
          logger.error('ffmpeg is unavailable, animated/video stickers will be skipped for the rest of this import');
          tgsConversionDisabled = true;
          webmConversionDisabled = true;
          skippedAnimatedCount++;
        } else if (isChromiumUnavailableError(e)) {
          logger.error('Chromium is unavailable, animated (.tgs) stickers will be skipped for the rest of this import');
          tgsConversionDisabled = true;
          skippedAnimatedCount++;
        } else {
          failedCount++;
        }
        completed++;
        await db.importJob.update({ where: { id: importJobId }, data: { completed, failed: failedCount } });
        await updateDiscordProgress(buildProgressContent(emojiIdMap, total, completed) + buildAnimatedSkipNote());
        continue;
      }

      const { stickerFileId: telegramStickerId, filePath, stickerUrl } = await saveStickerFile({ logger }, {
        fileId: sticker.file_id,
        fileName,
        data,
      });
      createdFiles.add(filePath);

      createTelegramStickerRecords.push({
        data: {
          id: telegramStickerId,
          telegramPackId: telegramPack.id,
          telegramFileUniqueId: sticker.file_unique_id,
          emoji: sticker.emoji,
          order,
          url: stickerUrl,
        },
      });

      completed++;
      logger.info(`Downloaded sticker ${sticker.file_id} (#${order}) → ${telegramStickerId}`);
      await db.importJob.update({ where: { id: importJobId }, data: { completed, failed: failedCount } });
      await updateDiscordProgress(buildProgressContent(emojiIdMap, total, completed) + buildAnimatedSkipNote());
    }
  } finally {
    await renderer?.close();
  }

  // Telegram stickers no longer part of the set
  const staleTelegramStickers = await db.telegramSticker.findMany({
    where: {
      telegramPackId: telegramPack.id,
      deletedAt: null,
      telegramFileUniqueId: { notIn: telegramStickers.map(s => s.file_unique_id) },
    },
  });

  // Phase 2: finalize shared rows and fan the changes out to every subscribed pack
  await db.importJob.update({ where: { id: importJobId }, data: { status: 'FINALIZING' } });
  await updateDiscordProgress(buildProgressContent(emojiIdMap, total, completed, false, true));
  logger.info('Creating sticker records and updating pack…');

  let initiatingPackStickerIds: string[];
  try {
    initiatingPackStickerIds = await db.$transaction(async (tx) => {
      const createdTelegramStickers: TelegramSticker[] = [];
      for (const args of createTelegramStickerRecords) {
        createdTelegramStickers.push(await tx.telegramSticker.create(args));
      }
      for (const args of updateTelegramStickerRecords) {
        await tx.telegramSticker.update(args);
      }
      if (staleTelegramStickers.length > 0) {
        await tx.telegramSticker.updateMany({
          where: { id: { in: staleTelegramStickers.map(s => s.id) } },
          data: { deletedAt: new Date() },
        });
      }
      await tx.telegramPack.update({
        where: { id: telegramPack.id },
        data: { title: packTitle, lastImportedAt: new Date() },
      });

      const liveTelegramStickers = await tx.telegramSticker.findMany({
        where: { telegramPackId: telegramPack.id, deletedAt: null },
        select: { id: true },
      });
      const liveTelegramStickerIds = new Set(liveTelegramStickers.map(ts => ts.id));
      const staleTelegramStickerIds = staleTelegramStickers.map(s => s.id);

      // If this Telegram pack already has a published (public) copy, seed brand-new
      // sticker rows for every other subscriber from its names/ratings instead of
      // leaving them blank; existing rows are never touched, so nobody's own edits
      // are overwritten
      const publishedPack = await tx.pack.findFirst({
        where: { telegramPackId: telegramPack.id, public: true, deletedAt: null },
      });
      const publishedStickers = publishedPack
        ? await tx.sticker.findMany({
          where: { packId: publishedPack.id, telegramStickerId: { not: null }, deletedAt: null },
        })
        : [];
      const publishedByTelegramStickerId = new Map(publishedStickers.map(s => [s.telegramStickerId as string, s]));

      // Every user's view of this Telegram pack mirrors the shared rows
      const subscriberPacks = await tx.pack.findMany({
        where: { telegramPackId: telegramPack.id, deletedAt: null },
      });
      const newInitiatingPackStickerIds: string[] = [];
      for (const subscriberPack of subscriberPacks) {
        const existingRows = await tx.sticker.findMany({
          where: { packId: subscriberPack.id, telegramStickerId: { not: null } },
        });
        const rowsByTelegramStickerId = new Map(existingRows.map(row => [row.telegramStickerId as string, row]));

        for (const telegramStickerId of liveTelegramStickerIds) {
          const row = rowsByTelegramStickerId.get(telegramStickerId);
          if (!row) {
            const publishedSticker = publishedByTelegramStickerId.get(telegramStickerId);
            const created = await tx.sticker.create({
              data: {
                name: publishedSticker?.name ?? '',
                description: null,
                packId: subscriberPack.id,
                createdBy: subscriberPack.createdBy,
                telegramStickerId,
                nsfwOverride: publishedSticker?.nsfwOverride ?? null,
              },
            });
            if (subscriberPack.id === packId) {
              newInitiatingPackStickerIds.push(created.id);
            }
          } else if (row.deletedAt !== null) {
            // Restored on Telegram: bring the user's row (and their label) back
            await tx.sticker.update({
              where: { id: row.id },
              data: { deletedAt: null, deletedBy: null },
            });
          }
        }

        if (staleTelegramStickerIds.length > 0) {
          await tx.sticker.updateMany({
            where: {
              packId: subscriberPack.id,
              telegramStickerId: { in: staleTelegramStickerIds },
              deletedAt: null,
            },
            data: { deletedAt: new Date() },
          });
        }
      }
      return newInitiatingPackStickerIds;
    }, { timeout: 60_000 });
  } catch (e) {
    logger.error('Failed to create sticker records', e);

    if (createdFiles.size > 0) {
      await db.importJob.update({ where: { id: importJobId }, data: { status: 'ROLLING_BACK' } });
      const fileList = Array.from(createdFiles);
      let rolled = 0;
      for (const filePath of fileList) {
        try {
          await fs.promises.unlink(filePath);
        } catch (unlinkErr) {
          logger.error(`Failed to delete ${filePath} during rollback`, unlinkErr);
        }
        rolled++;
        await updateDiscordProgress(buildProgressContent(emojiIdMap, total, total - rolled, true));
      }
      logger.info(`Rolled back ${fileList.length} files`);
    }

    await failJob(String(e), 'Import failed. Please try again.');
    return;
  }

  await db.importJob.update({
    where: { id: importJobId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  const importedCount = createTelegramStickerRecords.length;
  const summaryParts = [
    ...(importedCount > 0 ? [`${importedCount} new sticker${importedCount !== 1 ? 's' : ''} imported`] : []),
    ...(updateTelegramStickerRecords.length > 0 ? [`${updateTelegramStickerRecords.length} updated`] : []),
    ...(staleTelegramStickers.length > 0 ? [`${staleTelegramStickers.length} removed`] : []),
    ...(skippedAnimatedCount > 0 ? [`${skippedAnimatedCount} animated sticker${skippedAnimatedCount !== 1 ? 's' : ''} skipped (ffmpeg/Chromium unavailable)`] : []),
  ];
  if (summaryParts.length === 0) {
    summaryParts.push('No stickers needed updating');
  }
  await updateDiscordProgress(`${EmojiCharacters.GREEN_CHECK} ${summaryParts.join(', ')}.`);
  logger.info(`Import job ${importJobId} completed: ${importedCount} created, ${updateTelegramStickerRecords.length} updated, ${staleTelegramStickers.length} removed, ${skippedAnimatedCount} animated skipped in Telegram pack ${telegramPack.id}`);

  // Post the initiating user's new stickers to the feed
  if (env.DISCORD_FEED_WEBHOOK_URL !== null && initiatingPackStickerIds.length > 0) {
    const newStickers = await db.sticker.findMany({
      where: { id: { in: initiatingPackStickerIds } },
      include: { telegramSticker: true },
    });
    await postImportedStickersToFeed({
      db,
      stickers: newStickers,
      pack,
      telegramPack: { ...telegramPack, title: packTitle },
      importedBy: String(importedBy),
      logger,
    });
  }
};

interface PostImportedStickersToFeedParams {
  db: ReturnType<typeof createDb>;
  stickers: (Sticker & { telegramSticker: TelegramSticker | null })[];
  pack: Pack;
  telegramPack: TelegramPack;
  importedBy: string;
  logger: NestableLogger;
}

const postImportedStickersToFeed = async ({ db, stickers, pack, telegramPack, importedBy, logger }: PostImportedStickersToFeedParams) => {
  const webhookClient = new WebhookClient({ url: env.DISCORD_FEED_WEBHOOK_URL! });

  for (const sticker of stickers) {
    try {
      const spoiler = resolveStickerNsfw(sticker, pack);
      const { items, files } = mapStickersToGalleryItems([sticker], spoiler);
      const replyMessage = await webhookClient.send({
        flags: MessageFlags.SuppressNotifications,
        content: [
          '# Sticker imported',
          `**Name:** \`${getFormattedStickerName(sticker)}\` (\`${sticker.id}\`)`,
          '**Description:** _(empty)_',
          `**Pack:** \`${wrapUrlsInAngleBrackets(telegramPack.title)}\` (\`${pack.id}\`) ${getPackVisibilityEmoji(pack)}${getPackNsfwEmoji(pack)}`,
          `**Imported by:** ${userMention(importedBy)} (\`${importedBy}\`)`,
          `**Image:** ${items.filter(item => !item.media.url.startsWith('attachment://')).map(item => spoiler ? `||${item.media.url}||` : item.media.url).join(' ')}`,
        ].join('\n'),
        files,
      });

      await db.stickerMessage.create({
        data: {
          messageId: BigInt(replyMessage.id),
          channelId: replyMessage.channel_id ? BigInt(replyMessage.channel_id) : null,
          stickerId: sticker.id,
          interactionId: null,
          interactionToken: null,
          isFeed: true,
        },
      });
    } catch (e) {
      logger.error(`Failed to post sticker ${sticker.id} to feed`, e);
    }
  }
};
