import { MessageFlags } from 'discord-api-types/v10';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { getMigrateToTelegramStickerOptions } from '../options/migrate-to-telegram-sticker.options.js';
import { BotChatInputCommand, BotChatInputCommandName } from '../types/bot-interaction.js';
import { MigrateToTelegramStickerCommandOptionName } from '../types/localization.js';
import { getPackNameAutocompleteHandler } from '../utils/autocomplete/pack-name.autocomplete.js';
import {
  getPackScopedStickerAutocompleteHandler,
} from '../utils/autocomplete/pack-scoped-sticker.autocomplete.js';
import { deleteStickerFile } from '../utils/delete-sticker-file.js';
import { getFormattedStickerName } from '../utils/get-formatted-sticker-name.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import { postStickerToFeed, StickerSnapshot } from '../utils/post-sticker-to-feed.js';

const stickerInclude = { pack: { include: { telegramPack: true } }, telegramSticker: true } as const;

export const migrateToTelegramStickerCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.MIGRATE_TO_TELEGRAM_STICKER,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.migrate-to-telegram-sticker.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.migrate-to-telegram-sticker.name', { lng })),
      options: getMigrateToTelegramStickerOptions(t),
    };
  },
  autocomplete: {
    [MigrateToTelegramStickerCommandOptionName.SOURCE_PACK]: getPackNameAutocompleteHandler({ nsfw: true, ownedOnly: true, excludeImported: true }),
    [MigrateToTelegramStickerCommandOptionName.SOURCE_STICKER]: getPackScopedStickerAutocompleteHandler(
      MigrateToTelegramStickerCommandOptionName.SOURCE_PACK, { imported: false },
    ),
    [MigrateToTelegramStickerCommandOptionName.TARGET_PACK]: getPackNameAutocompleteHandler({ nsfw: true, ownedOnly: true, importedOnly: true }),
    [MigrateToTelegramStickerCommandOptionName.TARGET_STICKER]: getPackScopedStickerAutocompleteHandler(
      MigrateToTelegramStickerCommandOptionName.TARGET_PACK, { imported: true },
    ),
  },
  async handle(interaction, context) {
    const { t, db } = context;
    const user = await updateOrCreateUser(context, interaction);
    if (user.readOnly) {
      await interactionReply(context, interaction, {
        content: t('commands.global.responses.noPermission'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const sourcePackId = interaction.options.getString(MigrateToTelegramStickerCommandOptionName.SOURCE_PACK, true);
    const sourceStickerId = interaction.options.getString(MigrateToTelegramStickerCommandOptionName.SOURCE_STICKER, true);
    const targetPackId = interaction.options.getString(MigrateToTelegramStickerCommandOptionName.TARGET_PACK, true);
    const targetStickerId = interaction.options.getString(MigrateToTelegramStickerCommandOptionName.TARGET_STICKER, true);

    const sourceSticker = await db.sticker.findFirst({
      where: {
        id: sourceStickerId,
        packId: sourcePackId,
        deletedAt: null,
        telegramStickerId: null,
        pack: { telegramPackId: null, deletedAt: null, createdBy: user.id },
      },
      include: stickerInclude,
    });
    if (!sourceSticker) {
      await interactionReply(context, interaction, {
        content: t('commands.migrate-to-telegram-sticker.responses.sourceStickerNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetSticker = await db.sticker.findFirst({
      where: {
        id: targetStickerId,
        packId: targetPackId,
        deletedAt: null,
        telegramStickerId: { not: null },
        pack: { telegramPackId: { not: null }, deletedAt: null, createdBy: user.id },
      },
      include: stickerInclude,
    });
    if (!targetSticker) {
      await interactionReply(context, interaction, {
        content: t('commands.migrate-to-telegram-sticker.responses.targetStickerNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sourceSticker.id === targetSticker.id) {
      await interactionReply(context, interaction, {
        content: t('commands.migrate-to-telegram-sticker.responses.sameSticker'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const sourceSnapshot: StickerSnapshot = {
      name: sourceSticker.name,
      description: sourceSticker.description,
      url: sourceSticker.url,
      nsfwOverride: sourceSticker.nsfwOverride,
    };
    const targetSnapshot: StickerSnapshot = {
      name: targetSticker.name,
      description: targetSticker.description,
      url: targetSticker.url,
      nsfwOverride: targetSticker.nsfwOverride,
    };

    const { updatedTarget, deletedSource } = await db.$transaction(async (tx) => {
      const updatedTarget = await tx.sticker.update({
        where: { id: targetSticker.id },
        data: {
          name: sourceSticker.name,
          description: sourceSticker.description,
          nsfwOverride: sourceSticker.nsfwOverride,
        },
        include: stickerInclude,
      });

      // Re-point message history so it follows the sticker; if a message somehow already
      // has a record for the target (e.g. it contained both stickers), keep the target's
      // row and drop the now-redundant source one instead of colliding on the unique index
      const sourceMessages = await tx.stickerMessage.findMany({ where: { stickerId: sourceSticker.id } });
      if (sourceMessages.length > 0) {
        const targetMessageIds = new Set((await tx.stickerMessage.findMany({
          where: { stickerId: targetSticker.id },
          select: { messageId: true },
        })).map(message => message.messageId));
        for (const message of sourceMessages) {
          if (targetMessageIds.has(message.messageId)) {
            await tx.stickerMessage.delete({ where: { id: message.id } });
          } else {
            await tx.stickerMessage.update({ where: { id: message.id }, data: { stickerId: targetSticker.id } });
          }
        }
      }

      const deletedSource = await tx.sticker.update({
        where: { id: sourceSticker.id },
        data: { deletedBy: user.id, deletedAt: new Date() },
        include: stickerInclude,
      });

      return { updatedTarget, deletedSource };
    });

    await deleteStickerFile(context, { url: deletedSource.url, deleteUrl: deletedSource.deleteUrl });

    await interactionReply(context, interaction, {
      content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.migrate-to-telegram-sticker.responses.migrated', {
        source: `\`${getFormattedStickerName(deletedSource)}\``,
        target: `\`${getFormattedStickerName(updatedTarget)}\``,
      })}`,
      flags: MessageFlags.Ephemeral,
    });

    await postStickerToFeed({
      context,
      interaction,
      sticker: updatedTarget,
      userPack: updatedTarget.pack,
      action: 'edit',
      snapshot: targetSnapshot,
    });
    await postStickerToFeed({
      context,
      interaction,
      sticker: deletedSource,
      userPack: deletedSource.pack,
      action: 'delete',
      snapshot: sourceSnapshot,
    });
  },
};
