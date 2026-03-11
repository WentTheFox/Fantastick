import { MessageFlags } from 'discord-api-types/v10';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import { ModalHandler } from '../../types/bot-interaction.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { collectModalSubmittedData, updateOrCreateUser } from '../../utils/messaging.js';
import { postStickerToFeed, StickerSnapshot } from '../../utils/post-sticker-to-feed.js';

export enum DeleteStickerModalCustomIds {
  DELETION_METHOD_INPUT = 'deletionMethodInput',
}

export enum StickerDeletionMethods {
  STICKER_ONLY = 'stickerOnly',
  DELETE_MESSAGES = 'deleteMessages',
}

export const deleteStickerModalHandler: ModalHandler = async (interaction, context, resourceId) => {
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
    include: { pack: true },
  }) : null;

  if (!sticker) {
    await interactionReply(context, interaction, {
      content: t('commands.delete-sticker.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const stickerSnapshot: StickerSnapshot = {
    name: sticker.name,
    description: sticker.description,
    url: sticker.url,
  };

  const {
    data,
  } = collectModalSubmittedData(interaction, DeleteStickerModalCustomIds);

  const deletionMethod = data[DeleteStickerModalCustomIds.DELETION_METHOD_INPUT];
  switch (deletionMethod) {
    case StickerDeletionMethods.STICKER_ONLY:
      // noop, just delete the sticker
      break;
    default: {
      await interactionReply(context, interaction, {
        content: t('commands.delete-sticker.responses.unsupportedMethod', {
          method: `\`${deletionMethod}\``,
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  try {
    sticker = await db.sticker.update({
      where: { id: sticker.id },
      data: {
        deletedBy: user.id,
        deletedAt: new Date(),
      },
      include: { pack: true },
    });
  } catch (e) {
    context.logger.error('Failed to delete sticker record', e);
    await interactionReply(context, interaction, {
      content: t('commands.delete-sticker.responses.deleteFailed'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interactionReply(context, interaction, {
    content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.delete-sticker.responses.deleted', {
      name: `\`${sticker.name}\``,
    })}`,
    flags: MessageFlags.Ephemeral,
  });

  await postStickerToFeed({
    context,
    interaction,
    sticker,
    userPack: sticker.pack,
    action: 'delete',
    snapshot: stickerSnapshot,
  });
};
