import { ApplicationCommandType, MessageFlags } from 'discord-api-types/v10';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { StickerMessageUpdateInput } from '../generated/prisma/models/StickerMessage.js';
import { BotMessageContextMenuCommand, BotMessageContextMenuCommandName } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { getStickerMessageContent } from '../utils/get-sticker-message-content.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';

export const updateMessageCommand: BotMessageContextMenuCommand = {
  name: BotMessageContextMenuCommandName.UPDATE_MESSAGE,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      type: ApplicationCommandType.Message,
      ...getLocalizedObject('name', (lng) => t('commands.Update Message.name', { lng }), true, false),
    };
  },
  async handle(interaction, context) {
    if (!interaction.isMessageContextMenuCommand()) {
      throw new Error('Expected message context menu interaction');
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

    if (interaction.targetMessage.channel?.isDMBased()) {
      await interactionReply(context, interaction, {
        content: t('commands.global.responses.dmsUnsupported'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const stickerMessages = await db.stickerMessage.findMany({
      where: {
        messageId: BigInt(interaction.targetMessage.id),
        channelId: BigInt(interaction.targetMessage.channelId),
        isFeed: false,
      },
    });

    if (stickerMessages.length === 0) {
      await interactionReply(context, interaction, {
        content: t('commands.sticker.responses.messageNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const stickers = await db.sticker.findMany({
      where: {
        id: {
          in: stickerMessages.map(sm => sm.stickerId),
        },
        deletedAt: null,
      },
    });

    const stickerMessageByStickerId = new Map(stickerMessages.map(sm => [sm.stickerId, sm]));
    const someStickersDeleted = stickers.length < stickerMessages.length;
    const someStickersUpdated = stickers.some(sticker => {
      const sm = stickerMessageByStickerId.get(sticker.id);
      const lastRefreshed = sm?.updatedAt ?? sm?.createdAt;
      return sticker.updatedAt !== null && lastRefreshed !== undefined && sticker.updatedAt > lastRefreshed;
    });

    if (!someStickersDeleted && !someStickersUpdated) {
      await interactionReply(context, interaction, {
        content: t('commands.Update Message.responses.upToDate'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const updateData: StickerMessageUpdateInput = {};
    if (stickers.length === 0) {
      await interaction.targetMessage.delete();
      updateData.deletedAt = new Date();
    } else {
      await interaction.targetMessage.edit({
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

    await interactionReply(context, interaction, {
      content: `${EmojiCharacters.GREEN_CHECK} ${t(
        updateData.deletedAt
          ? 'commands.sticker.responses.deleted'
          : 'commands.sticker.responses.updated',
      )}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
