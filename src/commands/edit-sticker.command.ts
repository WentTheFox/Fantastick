import { MessageFlags } from 'discord-api-types/v10';
import { getEditStickerOptions } from '../options/edit-sticker.options.js';
import { BotChatInputCommand, BotChatInputCommandName, BotModalId } from '../types/bot-interaction.js';
import { EditStickerCommandOptionName } from '../types/localization.js';
import {
  getStickerNameAutocompleteHandler,
} from '../utils/autocomplete/sticker-name.autocomplete.js';
import { getEditStickerModalContent } from '../utils/get-edit-sticker-modal-content.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import { editStickerModalHandler } from './modal-handlers/edit-sticker.modal-handler.js';

export const editStickerCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.EDIT_STICKER,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.edit-sticker.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.edit-sticker.name', { lng })),
      options: getEditStickerOptions(t),
    };
  },
  autocomplete: {
    [EditStickerCommandOptionName.NAME]: getStickerNameAutocompleteHandler(true),
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

    const id = interaction.options.getString(EditStickerCommandOptionName.NAME, true);
    const sticker = await db.sticker.findUnique({
      where: { id, deletedAt: null },
      include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
    });

    if (!sticker) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-sticker.responses.stickerNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { title, components } = getEditStickerModalContent(t, sticker);
    await interaction.showModal({
      customId: `${BotModalId.EDIT_STICKER}:${sticker.id}`,
      title,
      components,
    });
  },
  modal: {
    [BotModalId.EDIT_STICKER]: editStickerModalHandler,
  },
};
