import { MessageFlags } from 'discord-api-types/v10';
import { Readable } from 'node:stream';
import { ReplaceStickerModalCustomIds } from '../constants/edit-sticker-modal-fields.js';
import { env } from '../env.js';
import { ModalHandler } from '../types/bot-interaction.js';
import { EditableSticker } from './apply-sticker-edit.js';
import { deleteStickerFile } from './delete-sticker-file.js';
import { saveStickerFile } from './filesystem.js';
import { interactionReply } from './interaction-reply.js';
import { collectModalSubmittedData } from './messaging.js';
import { StickerSnapshot } from './post-sticker-to-feed.js';

export interface ApplyStickerFileReplaceResult {
  sticker: EditableSticker;
  snapshot: StickerSnapshot;
}

type ModalInteraction = Parameters<ModalHandler>[0];
type ModalContext = Parameters<ModalHandler>[1];

// Applies the file/URL replacement collected from /replace-sticker's modal. Returns
// null if validation failed and an error reply was already sent.
export const applyStickerFileReplace = async (
  interaction: ModalInteraction,
  context: ModalContext,
  sticker: EditableSticker,
): Promise<ApplyStickerFileReplaceResult | null> => {
  const { t, db } = context;
  const { indexedAttachments, data } = collectModalSubmittedData(interaction, ReplaceStickerModalCustomIds);

  let stickerUrl = data[ReplaceStickerModalCustomIds.URL_INPUT];
  let stickerDeleteUrl: string | null = sticker.deleteUrl;
  const stickerFileId = data[ReplaceStickerModalCustomIds.FILE_INPUT];
  const source = stickerUrl ? ReplaceStickerModalCustomIds.URL_INPUT : (stickerFileId ? ReplaceStickerModalCustomIds.FILE_INPUT : null);
  switch (source) {
    case ReplaceStickerModalCustomIds.URL_INPUT: {
      if (stickerUrl == null || !stickerUrl.startsWith('https://')) {
        await interactionReply(context, interaction, {
          content: t('commands.replace-sticker.responses.missingFile'),
          flags: MessageFlags.Ephemeral,
        });
        return null;
      }
      stickerDeleteUrl = null;
    }
      break;
    case ReplaceStickerModalCustomIds.FILE_INPUT: {
      const stickerFileMeta = stickerFileId ? indexedAttachments[stickerFileId] : undefined;
      if (!stickerFileMeta) {
        context.logger.warn(`Could not find attachment with id ${stickerFileId}`);
        await interactionReply(context, interaction, {
          content: t('commands.replace-sticker.responses.missingFile'),
          flags: MessageFlags.Ephemeral,
        });
        return null;
      }

      let stickerFileData: ReadableStream<Uint8Array<ArrayBuffer>> | null = null;
      try {
        stickerFileData = await fetch(stickerFileMeta.url, {
          headers: {
            'User-Agent': env.UA_STRING,
          },
        }).then(r => r.body);
      } catch (e) {
        context.logger.error(`Failed to fetch ${stickerFileMeta.url}`, e);
      }
      if (!stickerFileData) {
        context.logger.warn(`Could not read attachment url ${stickerFileMeta.url}`);
        await interactionReply(context, interaction, {
          content: t('commands.replace-sticker.responses.missingFile'),
          flags: MessageFlags.Ephemeral,
        });
        return null;
      }

      ({ stickerUrl, deleteUrl: stickerDeleteUrl } = await saveStickerFile(context, {
        stickerId: sticker.id,
        fileId: stickerFileMeta.id,
        fileName: stickerFileMeta.name,
        data: Readable.fromWeb(stickerFileData as never),
      }));
    }
      break;
    default: {
      await interactionReply(context, interaction, {
        content: t('commands.replace-sticker.responses.missingFile'),
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
  }

  const previousStickerFile = { url: sticker.url, deleteUrl: sticker.deleteUrl };
  const snapshot: StickerSnapshot = {
    name: sticker.name,
    description: sticker.description,
    url: sticker.url,
    nsfwOverride: sticker.nsfwOverride,
  };
  const updatedSticker = await db.sticker.update({
    where: { id: sticker.id },
    data: {
      url: stickerUrl,
      deleteUrl: stickerDeleteUrl,
    },
    include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
  });

  await deleteStickerFile(context, previousStickerFile);

  return { sticker: updatedSticker, snapshot };
};
