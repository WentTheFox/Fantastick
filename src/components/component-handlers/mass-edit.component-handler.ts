import { MessageFlags } from 'discord-api-types/v10';
import { BotMessageComponentHandler, BotModalId } from '../../types/bot-interaction.js';
import { getEditStickerModalContent } from '../../utils/get-edit-sticker-modal-content.js';
import { getMassEditStepContent } from '../../utils/get-mass-edit-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { updateOrCreateUser } from '../../utils/messaging.js';

export const massEditOpenComponentHandler: BotMessageComponentHandler = async (interaction, context, resourceId) => {
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

  const { title, components } = getEditStickerModalContent(t, sticker);
  await interaction.showModal({
    customId: `${BotModalId.MASS_EDIT_STICKER}:${sticker.id}`,
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
