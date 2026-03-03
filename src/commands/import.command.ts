import { MessageFlags } from 'discord-api-types/v10';
import * as fs from 'node:fs';
import { Readable } from 'node:stream';
import { filledBar } from 'string-progressbar';
import typia from 'typia';
import { ApiResponse } from '../classes/api-client.js';
import { ApiHttpException } from '../classes/api-http-exception.class.js';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { env } from '../env.js';
import { Sticker } from '../generated/prisma/client.js';
import type * as Prisma from '../generated/prisma/internal/prismaNamespace.js';
import { getImportOptions } from '../options/import.options.js';
import { stickerUrlPrefix } from '../options/metadata/import-url.option-meta.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { ImportCommandOptionName } from '../types/localization.js';
import { handlePackNameAutocomplete } from '../utils/autocomplete/pack-name.autocomplete.js';
import { saveStickerFile } from '../utils/filesystem.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { emoji, updateOrCreateUser } from '../utils/messaging.js';
import { postStickerToFeed } from '../utils/post-sticker-to-feed.js';
import {
  createTelegramApiClient,
  createTelegramFileClient,
  TelegramApiGetFileResponse,
  TelegramApiGetStickerSetResponse,
} from '../utils/telegram-api.js';

export const importCommand: BotChatInputCommand = {
  registerCondition: () => env.LOCAL,
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.import.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.import.name', { lng })),
    options: getImportOptions(t),
  }),
  async autocomplete(interaction, context) {
    const focusedOption = interaction.options.getFocused(true);

    switch (focusedOption.name) {
      case ImportCommandOptionName.PACK:
        await handlePackNameAutocomplete({
          interaction,
          context,
          optionName: focusedOption.name,
          nsfw: true,
        });
        break;
      default:
        throw new Error(`Unknown autocomplete option ${focusedOption.name}`);
    }
  },
  async handle(interaction, context) {
    const { t, db } = context;
    const user = await updateOrCreateUser(context, interaction);
    if (user.readOnly) {
      await interactionReply(context, interaction, {
        content: t('commands.global.responses.noPermission'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const packId = interaction.options.getString(ImportCommandOptionName.PACK, true);
    const url = interaction.options.getString('url', true);

    const appPack = await db.pack.findUnique({
      where: {
        id: packId,
      },
    });

    if (!appPack) {
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.packNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let telegramPackName: string | undefined = undefined;
    if (url.startsWith(stickerUrlPrefix)) {
      const packNameFromUrl = decodeURIComponent(url.substring(stickerUrlPrefix.length));
      if (/^[^/()]+$/.test(packNameFromUrl)) {
        telegramPackName = packNameFromUrl;
      }
    }
    if (!telegramPackName) {
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.invalidUrl'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const telegramClient = createTelegramApiClient();
    const telegramFileClient = createTelegramFileClient();

    let getStickerSetRequest: ApiResponse<TelegramApiGetStickerSetResponse>;
    try {
      getStickerSetRequest = await telegramClient.request({
        path: '/getStickerSet',
        query: { name: telegramPackName },
        validator: typia.createValidate<TelegramApiGetStickerSetResponse>(),
      });
    } catch (e) {
      if (e instanceof ApiHttpException && e.status === 400) {
        await interactionReply(context, interaction, {
          content: t('commands.import.responses.invalidUrl'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      throw e;
    }

    const total = getStickerSetRequest.response.result?.stickers.length ?? 0;
    if (!getStickerSetRequest.response.result || total === 0) {
      context.logger.error(`Failed to import Telegram sticker set ${telegramPackName}, no stickers found`, getStickerSetRequest);
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.importFailed'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const completedSet = new Set<number>();
    const createdFiles = new Set<string>();
    const updateProgress = async (failed = false, finalizing = false) => {
      const current = failed ? createdFiles.size : completedSet.size;
      const progressbar = filledBar(total, current, 18, EmojiCharacters.WHITE_SQUARE, failed ? EmojiCharacters.RED_SQUARE : EmojiCharacters.GREEN_SQUARE)[0];
      const progressString = `${emoji(context, failed ? 'loadingerror' : 'loading', true)} ${
        finalizing ? t('commands.import.responses.finalizingImport') : t((
          failed
            ? 'commands.import.responses.rollbackProgress'
            : 'commands.import.responses.importProgress'
        ), {
          current: failed ? total - current : current,
          total,
        })}`;
      await interactionReply(context, interaction, {
        content: `${progressString}\n-# ${progressbar}`,
      });
    };

    await updateProgress();

    context.logger.debug(`Importing Telegram stickers from sticker set ${telegramPackName}…`);
    const createStickerRecords: Prisma.PrismaPromise<Sticker>[] = [];
    await getStickerSetRequest.response.result.stickers.reduce((awaiter, sticker, order) => {
      return awaiter.then(async () => {
        let telegramFilePath: string;
        try {
          const getFileRequest = await telegramClient.request({
            path: '/getFile',
            query: { file_id: sticker.file_id },
            validator: typia.createValidate<TelegramApiGetFileResponse>(),
          });
          telegramFilePath = getFileRequest.response.result!.file_path;
        } catch (e) {
          context.logger.error(`Failed to import Telegram sticker ${sticker.file_id} (#${order}), no file path found`, e);
          completedSet.add(order);
          return;
        }

        const getFileRequest = await telegramFileClient.request({
          path: `/${telegramFilePath}`,
          raw: true,
          validator: typia.createValidate<Readable>(),
        });
        const { stickerId, filePath, stickerUrl } = await saveStickerFile(context, {
          fileId: sticker.file_id,
          fileName: 'sticker.webp',
          data: getFileRequest.response,
        });
        createdFiles.add(filePath);

        createStickerRecords.push(db.sticker.create({
          data: {
            id: stickerId,
            name: stickerId,
            description: sticker.emoji,
            packId: appPack.id,
            createdBy: user.id,
            order,
            url: stickerUrl,
          },
        }));
        context.logger.info(`Imported Telegram sticker ${sticker.file_id} (#${order}) as ${stickerId}`);
        completedSet.add(order);

        await updateProgress();
      });
    }, Promise.resolve());

    context.logger.info('Creating local sticker records…');
    await updateProgress(false, true);
    let stickers: Sticker[] | null = null;
    try {
      stickers = await db.$transaction(createStickerRecords);
    } catch (e) {
      context.logger.error('Creating local sticker records failed', e);

      if (createdFiles.size > 0) {
        context.logger.info('Deleting newly created files…');
        await updateProgress(true);
        const createdFilesList = Array.from(createdFiles);
        await Promise.all(createdFilesList.map(async (filePath) => {
          context.logger.info(`Deleting ${filePath}…`);
          await fs.promises.unlink(filePath);
          createdFiles.delete(filePath);
          await updateProgress(true);
        }));
        context.logger.info(`Successfully deleted ${createdFilesList.length} newly created files`);
      }

      await interactionReply(context, interaction, {
        content: `${EmojiCharacters.OCTAGONAL_SIGN} ${t('commands.import.responses.importFailed')}`,
      });
      return;
    }

    await interactionReply(context, interaction, {
      content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.import.responses.imported')}`,
    });

    if (stickers !== null) {
      await stickers.reduce((promise, sticker) => promise.then(() => (
        postStickerToFeed(context, interaction, sticker, appPack)
      )), Promise.resolve());
    }
  },
};
