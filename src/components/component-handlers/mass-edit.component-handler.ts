import { MessageFlags } from 'discord-api-types/v10';
import { BotMessageComponentHandler, BotModalId } from '../../types/bot-interaction.js';
import { getEditStickerMetadataModalContent } from '../../utils/get-edit-sticker-metadata-modal-content.js';
import { getMassEditStepContent } from '../../utils/get-mass-edit-content.js';
import { getReplaceStickerModalContent } from '../../utils/get-replace-sticker-modal-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { updateOrCreateUser } from '../../utils/messaging.js';

export const massEditEditMetadataComponentHandler: BotMessageComponentHandler = async (interaction, context, resourceId) => {
  if (!interaction.isButton()) {
    throw new Error('Button interaction expected');
  }

  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sticker = resourceId ? await db.sticker.findUnique({
    where: { id: resourceId, deletedAt: null, createdBy: user.id },
    include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
  }) : null;

  if (!sticker) {
    await interactionReply(context, interaction, {
      content: t('commands.mass-edit-stickers.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { title, components } = getEditStickerMetadataModalContent(t, sticker);
  await interaction.showModal({
    customId: `${BotModalId.MASS_EDIT_STICKER_METADATA}:${sticker.id}`,
    title,
    components,
  });
};

export const massEditReplaceComponentHandler: BotMessageComponentHandler = async (interaction, context, resourceId) => {
  if (!interaction.isButton()) {
    throw new Error('Button interaction expected');
  }

  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Imported stickers' images are managed by the Telegram import; this button is
  // disabled for them in getMassEditStickerContent, but guard against a stale click
  const sticker = resourceId ? await db.sticker.findUnique({
    where: { id: resourceId, deletedAt: null, createdBy: user.id, telegramStickerId: null },
    include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
  }) : null;

  if (!sticker) {
    await interactionReply(context, interaction, {
      content: t('commands.mass-edit-stickers.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { title, components } = getReplaceStickerModalContent(t, sticker);
  await interaction.showModal({
    customId: `${BotModalId.MASS_EDIT_REPLACE_STICKER}:${sticker.id}`,
    title,
    components,
  });
};

export const massEditStepComponentHandler = (direction: 'prev' | 'next'): BotMessageComponentHandler => async (interaction, context, resourceId) => {
  if (!interaction.isButton()) {
    throw new Error('Button interaction expected');
  }

  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sticker = resourceId ? await db.sticker.findUnique({
    where: { id: resourceId, deletedAt: null, createdBy: user.id },
    include: { pack: { include: { telegramPack: true } } },
  }) : null;

  if (!sticker) {
    await interactionReply(context, interaction, {
      content: t('commands.mass-edit-stickers.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const nextContent = await getMassEditStepContent({
    t,
    db,
    pack: sticker.pack,
    currentStickerId: sticker.id,
    direction,
  });
  await interaction.update({ flags: MessageFlags.IsComponentsV2, ...nextContent });
};
