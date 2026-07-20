import { ComponentType, MessageFlags, TextInputStyle } from 'discord-api-types/v10';
import { TextInputComponentData } from 'discord.js';
import {
  MassRenameStickerModalCustomIds,
} from '../../commands/modal-handlers/mass-rename-sticker.modal-handler.js';
import { stickerNameOptionMeta } from '../../options/metadata/sticker-name.option-meta.js';
import { BotMessageComponentHandler, BotModalId } from '../../types/bot-interaction.js';
import { getMassRenameNextContent } from '../../utils/get-mass-rename-content.js';
import { getFormattedPackName } from '../../utils/get-formatted-pack-name.js';
import { getFormattedStickerName } from '../../utils/get-formatted-sticker-name.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { updateOrCreateUser } from '../../utils/messaging.js';

export const massRenameOpenComponentHandler: BotMessageComponentHandler = async (interaction, context, resourceId) => {
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
      content: t('commands.mass-rename-stickers.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const isImportedSticker = sticker.telegramStickerId !== null;
  const formattedStickerName = getFormattedStickerName(sticker);
  await interaction.showModal({
    customId: `${BotModalId.MASS_RENAME_STICKER}:${sticker.id}`,
    title: t('commands.mass-rename-stickers.components.renameModalTitle', { name: formattedStickerName }),
    components: [
      {
        type: ComponentType.TextDisplay,
        content: t('commands.edit-sticker.components.editingText', {
          name: `\`${formattedStickerName}\``,
          pack: getFormattedPackName(sticker.pack),
        }),
      },
      // Imported stickers only carry an optional label, so a blank submission is allowed
      ...(isImportedSticker ? [
        {
          type: ComponentType.Label as const,
          label: t('commands.edit-sticker.components.importedNameLabel'),
          description: t('commands.edit-sticker.components.importedNameDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: MassRenameStickerModalCustomIds.NEW_NAME_INPUT,
            style: TextInputStyle.Short,
            maxLength: stickerNameOptionMeta.max_length,
            required: false,
            value: sticker.name || undefined,
          } as TextInputComponentData,
        },
      ] : [
        {
          type: ComponentType.Label as const,
          label: t('commands.create-sticker.components.nameLabel'),
          description: t('commands.create-sticker.components.nameDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: MassRenameStickerModalCustomIds.NEW_NAME_INPUT,
            style: TextInputStyle.Short,
            minLength: stickerNameOptionMeta.min_length,
            maxLength: stickerNameOptionMeta.max_length,
            required: true,
            value: sticker.name,
          } as TextInputComponentData,
        },
      ]),
    ],
  });
};

export const massRenameSkipComponentHandler: BotMessageComponentHandler = async (interaction, context, resourceId) => {
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
      content: t('commands.mass-rename-stickers.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const nextContent = await getMassRenameNextContent({
    t,
    db,
    pack: sticker.pack,
    currentStickerId: sticker.id,
  });
  await interaction.update({ flags: MessageFlags.IsComponentsV2, ...nextContent });
};
