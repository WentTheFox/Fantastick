import { MessageFlags } from 'discord-api-types/v10';
import * as fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import typia from 'typia';
import { ApiResponse } from '../classes/api-client.js';
import { ApiHttpException } from '../classes/api-http-exception.class.js';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { env } from '../env.js';
import { Sticker } from '../generated/prisma/client.js';
import type * as Prisma from '../generated/prisma/internal/prismaNamespace.js';
import { getImportOptions } from '../options/import.options.js';
import { stickerUrlPrefix } from '../options/metadata/import-url.option-meta.js';
import { packNameOptionMeta } from '../options/metadata/pack-name.option-meta.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
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
  async handle(interaction, context) {
    const { t, db } = context;
    const pack = interaction.options.getString('pack', true);
    const url = interaction.options.getString('url', true);

    if (pack.length < packNameOptionMeta.min_length || pack.length > packNameOptionMeta.max_length) {
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.packNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const appPack = await db.pack.findFirst({
      where: {
        name: pack,
      },
    });

    if (!appPack) {
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.packNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = await updateOrCreateUser(context, interaction);

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

    await interaction.deferReply();

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
      console.error(`Failed to import Telegram sticker set ${telegramPackName}, no stickers found`, getStickerSetRequest);
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.importFailed'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const completedSet = new Set<number>();
    const getProgressString = () => t('commands.import.responses.importProgress', {
      current: completedSet.size,
      total,
    });

    await interactionReply(context, interaction, {
      content: getProgressString(),
      flags: MessageFlags.Ephemeral,
    });

    console.debug(`Importing Telegram stickers from sticker set ${telegramPackName}…`);
    const createStickerRecords: Prisma.PrismaPromise<Sticker>[] = [];
    const createdFiles = new Set<string>();
    await getStickerSetRequest.response.result.stickers.reduce((awaiter, sticker, order) => {
      return awaiter.then(async () => {
        let filePath: string;
        try {
          const getFileRequest = await telegramClient.request({
            path: '/getFile',
            query: { file_id: sticker.file_id },
            validator: typia.createValidate<TelegramApiGetFileResponse>(),
          });
          filePath = getFileRequest.response.result!.file_path;
        } catch (e) {
          console.error(`Failed to import Telegram sticker ${sticker.file_id} (#${order}), no file path found`, e);
          completedSet.add(order);
          return;
        }

        const getFileRequest = await telegramFileClient.request({
          path: `/${filePath}`,
          raw: true,
          validator: typia.createValidate<Readable>(),
        });
        const stickerId = crypto.randomUUID();
        console.info(`Saving sticker ${stickerId}: ID generated for file ${sticker.file_id} (#${order})`);
        const stickerFileName = `${stickerId}.webp`;
        const fsFolderPath = path.join(process.cwd(), 'fs', stickerFileName[0], stickerFileName.substring(1, 3));

        console.info(`Saving sticker ${stickerId}: creating output directory ${fsFolderPath}`);
        await fs.promises.mkdir(fsFolderPath, { recursive: true });

        const outputPath = path.join(fsFolderPath, stickerFileName);
        console.info(`Saving sticker ${stickerId}: writing file to ${outputPath}`);
        await fs.promises.writeFile(outputPath, getFileRequest.response);
        createdFiles.add(outputPath);

        createStickerRecords.push(db.sticker.create({
          data: {
            id: stickerId,
            name: stickerId,
            emoji: sticker.emoji,
            packId: appPack.id,
            createdBy: user.id,
            order,
            // TODO Use upload service once it supports webp
            url: `fs://${stickerFileName}`,
          },
        }));
        console.info(`Imported Telegram sticker ${sticker.file_id} (#${order}) as ${stickerId}`);
        completedSet.add(order);
        await interaction.editReply({
          content: getProgressString(),
        });
      });
    }, Promise.resolve());

    console.info('Creating local sticker records…');
    try {
      await db.$transaction(createStickerRecords);
    } catch (e) {
      console.info('Creating local sticker records failed, deleting newly created files…');
      if (createdFiles.size > 0) {
        await Promise.all(Array.from(createdFiles).map(async (filePath) => {
          console.info(`Deleting ${filePath}…`);
          await fs.promises.unlink(filePath);
        }));
      }
      throw e;
    }

    await interactionReply(context, interaction, {
      content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.import.responses.imported')}`,
    });
  },
};
