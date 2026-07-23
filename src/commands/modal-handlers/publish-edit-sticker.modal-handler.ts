import { MessageFlags } from 'discord-api-types/v10';
import {
  stickerNameInvalidPattern,
  stickerNameOptionMeta,
} from '../../options/metadata/sticker-name.option-meta.js';
import { ModalHandler } from '../../types/bot-interaction.js';
import { getPublishStepContent } from '../../utils/get-publish-pack-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { collectModalSubmittedData, updateOrCreateUser } from '../../utils/messaging.js';
import { postStickerToFeed, StickerSnapshot } from '../../utils/post-sticker-to-feed.js';

export enum PublishEditStickerModalCustomIds {
  NEW_NAME_INPUT = 'newNameInput',
  RATING_INPUT = 'ratingInput',
}

export enum PublishRatingOption {
  SFW = 'sfw',
  NSFW = 'nsfw',
}

export const publishEditStickerModalHandler: ModalHandler = async (interaction, context, resourceId) => {
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
      content: t('commands.publish-imported-pack.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { data } = collectModalSubmittedData(interaction, PublishEditStickerModalCustomIds);

  const stickerName = data[PublishEditStickerModalCustomIds.NEW_NAME_INPUT];
  if (stickerName === null || stickerName.length < stickerNameOptionMeta.min_length) {
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

  const nsfwOverride = data[PublishEditStickerModalCustomIds.RATING_INPUT] === PublishRatingOption.NSFW;

  const nameChanged = stickerName !== sticker.name;
  const ratingChanged = nsfwOverride !== sticker.nsfwOverride;
  const stickerSnapshot: StickerSnapshot = {
    name: sticker.name,
    description: sticker.description,
    url: sticker.url,
    nsfwOverride: sticker.nsfwOverride,
  };
  if (nameChanged || ratingChanged) {
    sticker = await db.sticker.update({
      where: { id: sticker.id },
      data: { name: stickerName, nsfwOverride },
      include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
    });
  }

  const nextContent = await getPublishStepContent({
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

  if (nameChanged || ratingChanged) {
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
