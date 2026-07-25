import { MessageFlags } from 'discord-api-types/v10';
import { BotChatInputCommand, BotModalId } from '../types/bot-interaction.js';
import { EditStickerMetadataCommandOptionName } from '../types/localization.js';
import {
  getStickerNameAutocompleteHandler,
} from '../utils/autocomplete/sticker-name.autocomplete.js';
import { getEditStickerMetadataModalContent } from '../utils/get-edit-sticker-metadata-modal-content.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import { editStickerMetadataModalHandler } from './modal-handlers/edit-sticker-metadata.modal-handler.js';

export const editStickerMetadataCommand: BotChatInputCommand = {
  name: 'edit-sticker-metadata',
  autocomplete: {
    [EditStickerMetadataCommandOptionName.NAME]: getStickerNameAutocompleteHandler(true),
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

    const id = interaction.options.getString(EditStickerMetadataCommandOptionName.NAME, true);
    const sticker = await db.sticker.findUnique({
      where: { id, deletedAt: null },
      include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
    });

    if (!sticker) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-sticker-metadata.responses.stickerNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { title, components } = getEditStickerMetadataModalContent(t, sticker);
    await interaction.showModal({
      customId: `${BotModalId.EDIT_STICKER_METADATA}:${sticker.id}`,
      title,
      components,
    });
  },
  modal: {
    [BotModalId.EDIT_STICKER_METADATA]: editStickerMetadataModalHandler,
  },
};
