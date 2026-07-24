import { MessageFlags } from 'discord-api-types/v10';
import {
  EditStickerMetadataModalCustomIds,
  parseRatingOption,
} from '../constants/edit-sticker-modal-fields.js';
import {
  stickerNameInvalidPattern,
  stickerNameOptionMeta,
} from '../options/metadata/sticker-name.option-meta.js';
import { ModalHandler } from '../types/bot-interaction.js';
import { EditableSticker } from '../types/editable-sticker.js';
import { interactionReply } from './interaction-reply.js';
import { collectModalSubmittedData } from './messaging.js';
import { normalizeStickerDescriptionInput } from './normalize-sticker-description-input.js';
import { StickerSnapshot } from './post-sticker-to-feed.js';

export interface ApplyStickerMetadataEditResult {
  sticker: EditableSticker;
  snapshot: StickerSnapshot;
}

type ModalInteraction = Parameters<ModalHandler>[0];
type ModalContext = Parameters<ModalHandler>[1];

// Applies the name/description/rating fields collected from /edit-sticker-metadata's
// modal. Returns null if validation failed and an error reply was already sent.
export const applyStickerMetadataEdit = async (
  interaction: ModalInteraction,
  context: ModalContext,
  sticker: EditableSticker,
): Promise<ApplyStickerMetadataEditResult | null> => {
  const { t, db } = context;
  const { data } = collectModalSubmittedData(interaction, EditStickerMetadataModalCustomIds);

  // Imported stickers only carry an optional user-provided label; a blank name is
  // acceptable and their display name is derived from the emoji and order instead
  const isImportedSticker = sticker.telegramStickerId !== null;
  const stickerName = isImportedSticker
    ? (data[EditStickerMetadataModalCustomIds.NAME_INPUT] ?? '')
    : data[EditStickerMetadataModalCustomIds.NAME_INPUT];
  if (stickerName !== sticker.name) {
    if (stickerName === null || (!isImportedSticker && stickerName.length < stickerNameOptionMeta.min_length)) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-sticker-metadata.responses.nameTooShort'),
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
    if (stickerName.length > stickerNameOptionMeta.max_length) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-sticker-metadata.responses.nameTooLong'),
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
    const invalidChars = new Set(stickerName.match(stickerNameInvalidPattern));
    if (invalidChars.size > 0) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-sticker-metadata.responses.invalidName', {
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
          content: t('commands.edit-sticker-metadata.responses.duplicateName'),
          flags: MessageFlags.Ephemeral,
        });
        return null;
      }
    }
  }

  const description = normalizeStickerDescriptionInput(data[EditStickerMetadataModalCustomIds.ALT_INPUT]);
  const nsfwOverride = parseRatingOption(data[EditStickerMetadataModalCustomIds.RATING_INPUT]);
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
      nsfwOverride,
    },
    include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
  });

  return { sticker: updatedSticker, snapshot };
};
