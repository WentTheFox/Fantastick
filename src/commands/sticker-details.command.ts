import { ApplicationCommandType, MessageFlags } from 'discord-api-types/v10';
import { AttachmentBuilder, userMention } from 'discord.js';
import { BotMessageContextMenuCommand, BotMessageContextMenuCommandName } from '../types/bot-interaction.js';
import { getFormattedPackName } from '../utils/get-formatted-pack-name.js';
import { getFormattedStickerName } from '../utils/get-formatted-sticker-name.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { mapStickersToGalleryItems } from '../utils/map-stickers-to-gallery-items.js';
import { resolveStickerNsfw } from '../utils/resolve-sticker-nsfw.js';

export const stickerDetailsCommand: BotMessageContextMenuCommand = {
  name: BotMessageContextMenuCommandName.STICKER_DETAILS,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      type: ApplicationCommandType.Message,
      ...getLocalizedObject('name', (lng) => t('commands.Sticker Details.name', { lng }), true, false),
    };
  },
  async handle(interaction, context) {
    if (!interaction.isMessageContextMenuCommand()) {
      throw new Error('Expected message context menu interaction');
    }
    const { t, db } = context;

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

    const stickerMessageByStickerId = new Map(stickerMessages.map(sm => [sm.stickerId, sm]));

    const stickers = await db.sticker.findMany({
      where: {
        id: { in: stickerMessages.map(sm => sm.stickerId) },
      },
      include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
    });

    const allFiles: AttachmentBuilder[] = [];

    const lines = stickers.map(sticker => {
      if (sticker.deletedAt !== null) {
        return `~~**\`${getFormattedStickerName(sticker)}\`**~~ (\`${sticker.id}\`) - ${t('commands.Sticker Details.responses.alreadyDeleted')}`;
      }

      const sm = stickerMessageByStickerId.get(sticker.id);
      const lastRefreshed = sm?.updatedAt ?? sm?.createdAt;
      const isOutdated = sticker.updatedAt !== null && lastRefreshed !== undefined && sticker.updatedAt > lastRefreshed;

      const outdatedLines: string[] = [];
      if (isOutdated) {
        const spoiler = resolveStickerNsfw(sticker, sticker.pack);
        const { files, items } = mapStickersToGalleryItems([sticker], spoiler);
        allFiles.push(...files);
        const externalUrls = items
          .filter(item => !item.media.url.startsWith('attachment://'))
          .map(item => spoiler ? `||${item.media.url}||` : item.media.url);
        if (externalUrls.length > 0) {
          outdatedLines.push(`**${t('commands.Sticker Details.responses.latestImage')}:** ${externalUrls.join(' ')}`);
        }
        outdatedLines.push(`-# ${t('commands.Sticker Details.responses.outdatedNote', { updateMessageCommand: t('commands.Update Message.name') })}`);
      }

      return [
        `**${t('commands.Sticker Details.responses.name')}:** \`${getFormattedStickerName(sticker)}\` (\`${sticker.id}\`)`,
        `**${t('commands.Sticker Details.responses.pack')}:** ${getFormattedPackName(sticker.pack)}`,
        `**${t('commands.Sticker Details.responses.uploadedBy')}:** ${userMention(String(sticker.createdBy))} (\`${sticker.createdBy}\`)`,
        ...outdatedLines,
      ].join('\n');
    });

    await interactionReply(context, interaction, {
      content: lines.join('\n\n'),
      files: allFiles,
      flags: MessageFlags.Ephemeral,
    });
  },
};
