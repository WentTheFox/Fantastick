import { ComponentType, MessageFlags } from 'discord-api-types/v10';
import { ComponentInLabelData } from 'discord.js';
import { getDeleteStickerOptions } from '../options/delete-sticker.options.js';
import { BotChatInputCommand, BotModalId } from '../types/bot-interaction.js';
import { DeleteStickerCommandOptionName } from '../types/localization.js';
import {
  getStickerNameAutocompleteHandler,
} from '../utils/autocomplete/sticker-name.autocomplete.js';
import { getFormattedPackName } from '../utils/get-formatted-pack-name.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import {
  DeleteStickerModalCustomIds,
  deleteStickerModalHandler,
  StickerDeletionMethods,
} from './modal-handlers/delete-sticker.modal-handler.js';

export const deleteStickerCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.delete-sticker.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.delete-sticker.name', { lng })),
    options: getDeleteStickerOptions(t),
  }),
  autocomplete: {
    [DeleteStickerCommandOptionName.NAME]: getStickerNameAutocompleteHandler(true),
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

    const id = interaction.options.getString(DeleteStickerCommandOptionName.NAME, true);
    const sticker = await db.sticker.findUnique({
      where: { id, deletedAt: null },
      include: { pack: true },
    });

    if (!sticker) {
      await interactionReply(context, interaction, {
        content: t('commands.delete-sticker.responses.stickerNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.showModal({
      customId: `${BotModalId.DELETE_STICKER}:${sticker.id}`,
      title: t('commands.delete-sticker.components.deleteStickerModalTitle', { name: sticker.name }),
      components: [
        {
          type: ComponentType.TextDisplay,
          content: t('commands.delete-sticker.components.deletingText', {
            name: `\`${sticker.name}\``,
            pack: getFormattedPackName(sticker.pack),
          }),
        },
        {
          type: ComponentType.Label,
          label: t('commands.delete-sticker.components.deletionMethodLabel'),
          description: t('commands.delete-sticker.components.deletionMethodDescription'),
          component: {
            type: ComponentType.RadioGroup,
            customId: DeleteStickerModalCustomIds.DELETION_METHOD_INPUT,
            options: [
              {
                value: StickerDeletionMethods.STICKER_ONLY,
                label: t('commands.delete-sticker.components.stickerOnlyMethodLabel'),
                description: t('commands.delete-sticker.components.stickerOnlyMethodDescription'),
                default: true,
              },
              {
                value: StickerDeletionMethods.DELETE_MESSAGES,
                label: t('commands.delete-sticker.components.deleteMessagesMethodLabel'),
                description: t('commands.delete-sticker.components.deleteMessagesMethodDescription'),
              },
            ],
          } as unknown as ComponentInLabelData,
        },
      ],
    });
  },
  modal: {
    [BotModalId.DELETE_STICKER]: deleteStickerModalHandler,
  },
};
