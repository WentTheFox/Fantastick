import { MessageFlags } from 'discord-api-types/v10';
import { Readable } from 'node:stream';
import {
  EditStickerModalCustomIds,
  parseRatingOption,
} from '../constants/edit-sticker-modal-fields.js';
import { env } from '../env.js';
import { Pack, Sticker, TelegramPack, TelegramSticker } from '../generated/prisma/client.js';
import {
  stickerNameInvalidPattern,
  stickerNameOptionMeta,
} from '../options/metadata/sticker-name.option-meta.js';
import { ModalHandler } from '../types/bot-interaction.js';
import { deleteStickerFile } from './delete-sticker-file.js';
import { saveStickerFile } from './filesystem.js';
import { interactionReply } from './interaction-reply.js';
import { collectModalSubmittedData } from './messaging.js';
import { normalizeStickerDescriptionInput } from './normalize-sticker-description-input.js';
import { StickerSnapshot } from './post-sticker-to-feed.js';

export type EditableSticker = Sticker & {
  pack: Pack & { telegramPack: TelegramPack | null };
  telegramSticker: TelegramSticker | null;
};

export interface ApplyStickerModalEditResult {
  sticker: EditableSticker;
  snapshot: StickerSnapshot;
}

type ModalInteraction = Parameters<ModalHandler>[0];
type ModalContext = Parameters<ModalHandler>[1];

// Applies the shared name/description/rating/file/URL edit fields collected from an
// edit-sticker-shaped modal, used by both /edit-sticker and the mass-edit stepping flow.
// Returns null if validation failed and an error reply was already sent.
export const applyStickerModalEdit = async (
  interaction: ModalInteraction,
  context: ModalContext,
  sticker: EditableSticker,
): Promise<ApplyStickerModalEditResult | null> => {
  const { t, db } = context;
  const { indexedAttachments, data } = collectModalSubmittedData(interaction, EditStickerModalCustomIds);

  // Imported stickers only carry an optional user-provided label; a blank name is
  // acceptable and their display name is derived from the emoji and order instead
  const isImportedSticker = sticker.telegramStickerId !== null;
  const stickerName = isImportedSticker
    ? (data[EditStickerModalCustomIds.NEW_NAME_INPUT] ?? '')
    : data[EditStickerModalCustomIds.NEW_NAME_INPUT];
  if (stickerName !== sticker.name) {
    if (stickerName === null || (!isImportedSticker && stickerName.length < stickerNameOptionMeta.min_length)) {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.nameTooShot'),
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
    if (stickerName.length > stickerNameOptionMeta.max_length) {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.nameTooLong'),
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
    const invalidChars = new Set(stickerName.match(stickerNameInvalidPattern));
    if (invalidChars.size > 0) {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.invalidName', {
          chars: '```\n' + Array.from(invalidChars).join('') + '\n```',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
    if (!isImportedSticker) {
      const otherStickersWithSameNameInPackCount = await db.sticker.count({
        where: {
          AND: [
            { packId: sticker.packId, name: stickerName },
            { NOT: { id: sticker.id } },
          ],
        },
      });
      if (otherStickersWithSameNameInPackCount !== 0) {
        await interactionReply(context, interaction, {
          content: t('commands.create-sticker.responses.duplicateName'),
          flags: MessageFlags.Ephemeral,
        });
        return null;
      }
    }
  }

  // Imported sticker images are managed by the Telegram import and cannot be replaced
  let stickerUrl = isImportedSticker ? null : data[EditStickerModalCustomIds.NEW_URL_INPUT];
  let stickerDeleteUrl: string | null = sticker.deleteUrl;
  const stickerFileId = isImportedSticker ? null : data[EditStickerModalCustomIds.NEW_FILE_INPUT];
  const source = stickerUrl ? EditStickerModalCustomIds.NEW_URL_INPUT : (stickerFileId ? EditStickerModalCustomIds.NEW_FILE_INPUT : null);
  switch (source) {
    case EditStickerModalCustomIds.NEW_URL_INPUT: {
      if (stickerUrl == null || !stickerUrl.startsWith('https://')) {
        await interactionReply(context, interaction, {
          content: t('commands.create-sticker.responses.missingFile'),
          flags: MessageFlags.Ephemeral,
        });
        return null;
      }
      stickerDeleteUrl = null;
    }
      break;
    case EditStickerModalCustomIds.NEW_FILE_INPUT: {
      const stickerFileMeta = stickerFileId ? indexedAttachments[stickerFileId] : undefined;
      if (!stickerFileMeta) {
        context.logger.warn(`Could not find attachment with id ${stickerFileId}`);
        await interactionReply(context, interaction, {
          content: t('commands.create-sticker.responses.missingFile'),
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
          content: t('commands.create-sticker.responses.missingFile'),
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
      stickerUrl = sticker.url;
      break;
    }
  }

  // Non-imported stickers have no description field in this modal (Discord caps modals
  // at 5 top-level fields, and this case also needs the rating/file/URL fields); their
  // existing description, if any, is left untouched
  const description = isImportedSticker
    ? normalizeStickerDescriptionInput(data[EditStickerModalCustomIds.NEW_ALT_INPUT])
    : sticker.description;
  const nsfwOverride = parseRatingOption(data[EditStickerModalCustomIds.RATING_INPUT]);
  const previousStickerFile = { url: sticker.url, deleteUrl: sticker.deleteUrl };
  const fileReplaced = source === EditStickerModalCustomIds.NEW_URL_INPUT || source === EditStickerModalCustomIds.NEW_FILE_INPUT;
  const snapshot: StickerSnapshot = {
    name: sticker.name,
    description: sticker.description,
    url: sticker.url,
    nsfwOverride: sticker.nsfwOverride,
  };
  const updatedSticker = await db.sticker.update({
    where: { id: sticker.id },
    data: {
      name: stickerName ?? sticker.name,
      description,
      url: stickerUrl,
      deleteUrl: stickerDeleteUrl,
      nsfwOverride,
    },
    include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
  });

  if (fileReplaced) {
    await deleteStickerFile(context, previousStickerFile);
  }

  return { sticker: updatedSticker, snapshot };
};
