import { MessageFlags } from 'discord-api-types/v10';
import {
  stickerNameInvalidPattern,
  stickerNameOptionMeta,
} from '../../options/metadata/sticker-name.option-meta.js';
import { ModalHandler } from '../../types/bot-interaction.js';
import { getMassRenameStepContent } from '../../utils/get-mass-rename-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { collectModalSubmittedData, updateOrCreateUser } from '../../utils/messaging.js';
import { postStickerToFeed, StickerSnapshot } from '../../utils/post-sticker-to-feed.js';

export enum MassRenameStickerModalCustomIds {
  NEW_NAME_INPUT = 'newNameInput',
}

export const massRenameStickerModalHandler: ModalHandler = async (interaction, context, resourceId) => {
  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let sticker = resourceId ? await db.sticker.findUnique({
    where: { id: resourceId, deletedAt: null, createdBy: user.id },
    include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
  }) : null;

  if (!sticker) {
    await interactionReply(context, interaction, {
      content: t('commands.mass-rename-stickers.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { data } = collectModalSubmittedData(interaction, MassRenameStickerModalCustomIds);

  // Imported stickers only carry an optional user-provided label; a blank name is
  // acceptable and their display name is derived from the emoji and order instead
  const isImportedSticker = sticker.telegramStickerId !== null;
  const stickerName = isImportedSticker
    ? (data[MassRenameStickerModalCustomIds.NEW_NAME_INPUT] ?? '')
    : data[MassRenameStickerModalCustomIds.NEW_NAME_INPUT];
  if (stickerName !== sticker.name) {
    if (stickerName === null || (!isImportedSticker && stickerName.length < stickerNameOptionMeta.min_length)) {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.nameTooShot'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (stickerName.length > stickerNameOptionMeta.max_length) {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.nameTooLong'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const invalidChars = new Set(stickerName.match(stickerNameInvalidPattern));
    if (invalidChars.size > 0) {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.invalidName', {
          chars: '```\n' + Array.from(invalidChars).join('') + '\n```',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
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
        return;
      }
    }
  }

  // Re-submitting the pre-filled name unchanged is a no-op
  const nameChanged = stickerName !== null && stickerName !== sticker.name;
  const stickerSnapshot: StickerSnapshot = {
    name: sticker.name,
    description: sticker.description,
    url: sticker.url,
    nsfwOverride: sticker.nsfwOverride,
  };
  if (nameChanged) {
    sticker = await db.sticker.update({
      where: { id: sticker.id },
      data: { name: stickerName },
      include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
    });
  }

  const nextContent = await getMassRenameStepContent({
    t,
    db,
    pack: sticker.pack,
    currentStickerId: sticker.id,
    direction: 'next',
  });
  if (interaction.isFromMessage()) {
    await interaction.update({ flags: MessageFlags.IsComponentsV2, ...nextContent });
  } else {
    await interactionReply(context, interaction, {
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      ...nextContent,
    });
  }

  if (nameChanged) {
    await postStickerToFeed({
      context,
      interaction,
      sticker,
      userPack: sticker.pack,
      action: 'edit',
      snapshot: stickerSnapshot,
    });
  }
};
