import { MessageFlags } from 'discord-api-types/v10';
import { ModalHandler } from '../../types/bot-interaction.js';
import { applyStickerFileReplace } from '../../utils/apply-sticker-file-replace.js';
import { getMassEditStepContent } from '../../utils/get-mass-edit-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { updateOrCreateUser } from '../../utils/messaging.js';
import { postStickerToFeed } from '../../utils/post-sticker-to-feed.js';

export const massEditReplaceStickerModalHandler: ModalHandler = async (interaction, context, resourceId) => {
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

  const result = await applyStickerFileReplace(interaction, context, sticker);
  if (!result) return;

  const nextContent = await getMassEditStepContent({
    t,
    db,
    pack: result.sticker.pack,
    currentStickerId: result.sticker.id,
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

  await postStickerToFeed({
    context,
    interaction,
    sticker: result.sticker,
    userPack: result.sticker.pack,
    action: 'edit',
    snapshot: result.snapshot,
  });
};
