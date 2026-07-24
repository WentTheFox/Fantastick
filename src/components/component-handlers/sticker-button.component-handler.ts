import { time, userMention } from '@discordjs/formatters';
import { addMinutes, differenceInMinutes } from 'date-fns';
import { MessageFlags } from 'discord-api-types/v10';
import { TimestampStyles } from 'discord.js';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import { StickerMessageUpdateInput } from '../../generated/prisma/models/StickerMessage.js';
import { BotMessageComponentHandler } from '../../types/bot-interaction.js';
import { getStickerMessageContent } from '../../utils/get-sticker-message-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { updateOrCreateUser } from '../../utils/messaging.js';

const updateRateLimitMinutes = 1;

export const stickerButtonComponentHandler = (deleteOnly: boolean): BotMessageComponentHandler => async (interaction, context) => {
  if (!interaction.isButton) {
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
  if (interaction.message.channel.isDMBased()) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.dmsUnsupported'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (deleteOnly) {
    const originalExecutionUserId = interaction.message.interactionMetadata?.user.id;
    if (typeof originalExecutionUserId !== 'undefined' && interaction.user.id !== originalExecutionUserId) {
      await interaction.followUp({
        content: t('commands.sticker.responses.onlyExecutorCanDelete', {
          user: userMention(originalExecutionUserId),
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const stickerMessages = await db.stickerMessage.findMany({
    where: {
      messageId: BigInt(interaction.message.id),
      channelId: BigInt(interaction.message.channelId),
    },
  });

  if (stickerMessages.length === 0) {
    await interaction.followUp({
      content: t('commands.sticker.responses.messageNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!deleteOnly) {
    const lastUpdatedAt = stickerMessages?.[0].updatedAt ?? null;
    if (lastUpdatedAt !== null && differenceInMinutes(new Date(), lastUpdatedAt) < updateRateLimitMinutes) {
      const retryAt = addMinutes(lastUpdatedAt, updateRateLimitMinutes);
      await interaction.followUp({
        content: t('commands.sticker.responses.recentlyUpdated', {
          ts: time(retryAt, TimestampStyles.RelativeTime),
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  const stickers = deleteOnly ? [] : await db.sticker.findMany({
    where: {
      id: {
        in: stickerMessages.map(sm => sm.stickerId),
      },
      deletedAt: null,
    },
    include: { telegramSticker: true, pack: true },
  });

  const updateData: StickerMessageUpdateInput = {};
  if (stickers.length === 0) {
    await interaction.message.delete();
    updateData.deletedAt = new Date();
  } else {
    await interaction.message.edit({
      flags: MessageFlags.IsComponentsV2,
      ...getStickerMessageContent({ stickers }),
    });
    updateData.updatedAt = new Date();
  }

  await db.stickerMessage.updateMany({
    where: {
      id: {
        in: stickerMessages.map(sm => sm.id),
      },
    },
    data: updateData,
  });

  await interaction.followUp({
    content: `${EmojiCharacters.GREEN_CHECK} ${t(
      updateData.deletedAt
        ? 'commands.sticker.responses.deleted'
        : 'commands.sticker.responses.updated',
    )}`,
    flags: MessageFlags.Ephemeral,
  });
};
