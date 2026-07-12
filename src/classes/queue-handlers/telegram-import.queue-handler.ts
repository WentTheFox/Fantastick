import { Routes } from 'discord-api-types/v10';
import { MessageFlags, userMention, WebhookClient } from 'discord.js';
import * as fs from 'node:fs';
import { Readable } from 'node:stream';
import { filledBar } from 'string-progressbar';
import typia from 'typia';
import { ApiHttpException } from '@wentthefox-org/discord-bot-framework/api-client';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import { env } from '../../env.js';
import { Pack, Sticker } from '../../generated/prisma/client.js';
import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';
import { QueueHandler, QueueType } from '../../types/queue.js';
import { createDb } from '../../utils/create-db.js';
import { saveStickerFile } from '../../utils/filesystem.js';
import { getPackNsfwEmoji } from '../../utils/get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from '../../utils/get-pack-visibility-emoji.js';
import { mapStickersToGalleryItems } from '../../utils/map-stickers-to-gallery-items.js';
import { rest } from '../../utils/rest.js';
import {
  createTelegramApiClient,
  createTelegramFileClient,
  TelegramApiGetFileResponse,
  TelegramApiGetStickerSetResponse,
} from '../../utils/telegram-api.js';

const buildProgressContent = (total: number, current: number, failed = false, finalizing = false) => {
  const [bar] = filledBar(total, current, 18, EmojiCharacters.WHITE_SQUARE, failed ? EmojiCharacters.RED_SQUARE : EmojiCharacters.GREEN_SQUARE);
  const icon = failed ? EmojiCharacters.OCTAGONAL_SIGN : EmojiCharacters.RELOAD;
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

export const telegramImportQueueHandler = (logger: NestableLogger): QueueHandler<QueueType.TelegramImport> => async ([job]) => {
  const { importJobId } = job.data;
  const db = createDb();

  const importJob = await db.importJob.findUnique({
    where: { id: importJobId },
    include: { pack: true },
  });
  if (!importJob) {
    logger.error(`Import job ${importJobId} not found`);
    return;
  }

  const { interactionId, interactionToken, telegramPackName, packId, importedBy, pack } = importJob;

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

  const failJob = async (errorMessage: string, discordMessage: string) => {
    await db.importJob.update({ where: { id: importJobId }, data: { status: 'FAILED', errorMessage } });
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
    const isNotFound = e instanceof ApiHttpException && e.status === 400;
    await failJob(
      isNotFound ? 'Telegram pack not found' : `Failed to fetch sticker set: ${e}`,
      'Failed to fetch Telegram sticker set.',
    );
    logger.error(`Failed to fetch Telegram sticker set ${telegramPackName}`, e);
    return;
  }

  const allStickers = getStickerSetRequest.response.result?.stickers ?? [];
  const telegramStickers = allStickers.filter(s => !s.is_animated && !s.is_video);
  const skippedAnimated = allStickers.length - telegramStickers.length;
  if (skippedAnimated > 0) {
    logger.info(`Skipping ${skippedAnimated} animated/video sticker(s) from set ${telegramPackName}`);
  }
  const total = telegramStickers.length;
  if (total === 0) {
    await failJob('No supported stickers found in Telegram pack', 'No supported (non-animated) stickers found in this Telegram pack.');
    logger.error(`Telegram sticker set ${telegramPackName} has no non-animated stickers`);
    return;
  }

  await db.importJob.update({ where: { id: importJobId }, data: { status: 'IMPORTING', total } });
  await updateDiscordProgress(buildProgressContent(total, 0));
  logger.debug(`Importing ${total} stickers from Telegram set ${telegramPackName}…`);

  const createStickerRecords: Parameters<typeof db.sticker.create>[0][] = [];
  const createdFiles = new Set<string>();
  let completed = 0;
  let failedCount = 0;

  for (const [order, sticker] of telegramStickers.entries()) {
    const existing = await db.sticker.findFirst({
      where: { packId, telegramFileUniqueId: sticker.file_unique_id, deletedAt: null },
    });
    if (existing) {
      logger.info(`Skipping sticker ${sticker.file_unique_id} (already imported as ${existing.id})`);
      completed++;
      await db.importJob.update({ where: { id: importJobId }, data: { completed } });
      await updateDiscordProgress(buildProgressContent(total, completed));
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
      await updateDiscordProgress(buildProgressContent(total, completed));
      continue;
    }

    const fileRequest = await telegramFileClient.request({
      path: `/${telegramFilePath}`,
      raw: true,
      validator: typia.createValidate<Readable>(),
    });

    const { stickerFileId: stickerId, filePath, stickerUrl } = await saveStickerFile({ logger }, {
      fileId: sticker.file_id,
      fileName: 'sticker.webp',
      data: fileRequest.response,
    });
    createdFiles.add(filePath);

    createStickerRecords.push({
      data: {
        id: stickerId,
        name: `${sticker.emoji}#${order + 1}`,
        description: null,
        packId,
        createdBy: importedBy,
        order,
        url: stickerUrl,
        telegramFileUniqueId: sticker.file_unique_id,
      },
    });

    completed++;
    logger.info(`Downloaded sticker ${sticker.file_id} (#${order}) → ${stickerId}`);
    await db.importJob.update({ where: { id: importJobId }, data: { completed, failed: failedCount } });
    await updateDiscordProgress(buildProgressContent(total, completed));
  }

  // Finalize: write sticker records and update pack
  await db.importJob.update({ where: { id: importJobId }, data: { status: 'FINALIZING' } });
  await updateDiscordProgress(buildProgressContent(total, completed, false, true));
  logger.info('Creating sticker records and updating pack…');

  let createdStickers: Sticker[] | null = null;
  try {
    createdStickers = await db.$transaction(createStickerRecords.map(args => db.sticker.create(args)));
    await db.pack.update({ where: { id: packId }, data: { telegramPackName } });
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
        await updateDiscordProgress(buildProgressContent(total, total - rolled, true));
      }
      logger.info(`Rolled back ${fileList.length} files`);
    }

    await db.importJob.update({ where: { id: importJobId }, data: { status: 'FAILED', errorMessage: String(e) } });
    await updateDiscordProgress(`${EmojiCharacters.OCTAGONAL_SIGN} Import failed. Please try again.`);
    return;
  }

  await db.importJob.update({
    where: { id: importJobId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  const importedCount = createdStickers.length;
  await updateDiscordProgress(`${EmojiCharacters.GREEN_CHECK} Imported ${importedCount} sticker${importedCount !== 1 ? 's' : ''}.`);
  logger.info(`Import job ${importJobId} completed: ${importedCount} stickers imported into pack ${packId}`);

  // Post each sticker to the feed
  if (env.DISCORD_FEED_WEBHOOK_URL !== null && createdStickers.length > 0) {
    await postImportedStickersToFeed({ db, stickers: createdStickers, pack, importedBy: String(importedBy), logger });
  }
};

interface PostImportedStickersToFeedParams {
  db: ReturnType<typeof createDb>;
  stickers: Sticker[];
  pack: Pack;
  importedBy: string;
  logger: NestableLogger;
}

const postImportedStickersToFeed = async ({ db, stickers, pack, importedBy, logger }: PostImportedStickersToFeedParams) => {
  const webhookClient = new WebhookClient({ url: env.DISCORD_FEED_WEBHOOK_URL! });

  for (const sticker of stickers) {
    try {
      const { items, files } = mapStickersToGalleryItems([sticker], pack.nsfw);
      const replyMessage = await webhookClient.send({
        flags: MessageFlags.SuppressNotifications,
        content: [
          '# Sticker imported',
          `**Name:** \`${sticker.name}\` (\`${sticker.id}\`)`,
          `**Description:** _(empty)_`,
          `**Pack:** \`${pack.name}\` (\`${pack.id}\`) ${getPackVisibilityEmoji(pack)}${getPackNsfwEmoji(pack)}`,
          `**Imported by:** ${userMention(importedBy)} (\`${importedBy}\`)`,
          `**Image:** ${items.filter(item => !item.media.url.startsWith('attachment://')).map(item => pack.nsfw ? `||${item.media.url}||` : item.media.url).join(' ')}`,
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
