import { ComponentType, MessageFlags, TextInputStyle } from 'discord-api-types/v10';
import { TextInputComponentData } from 'discord.js';
import { getEditStickerOptions } from '../options/edit-sticker.options.js';
import { stickerAltOptionMeta } from '../options/metadata/sticker-alt.option-meta.js';
import { stickerNameOptionMeta } from '../options/metadata/sticker-name.option-meta.js';
import { stickerUrlOptionMeta } from '../options/metadata/sticker-url.option-meta.js';
import { BotChatInputCommand, BotModalId } from '../types/bot-interaction.js';
import { EditStickerCommandOptionName } from '../types/localization.js';
import {
  getStickerNameAutocompleteHandler,
} from '../utils/autocomplete/sticker-name.autocomplete.js';
import { getFormattedPackName } from '../utils/get-formatted-pack-name.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import {
  EditStickerModalCustomIds,
  editStickerModalHandler,
} from './modal-handlers/edit-sticker.modal-handler.js';

export const editStickerCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.edit-sticker.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.edit-sticker.name', { lng })),
    options: getEditStickerOptions(t),
  }),
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
      where: { id },
      include: { pack: true },
    });

    if (!sticker) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-sticker.responses.stickerNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.showModal({
      customId: `${BotModalId.EDIT_STICKER}:${sticker.id}`,
      title: t('commands.edit-sticker.components.editStickerModalTitle', { name: sticker.name }),
      components: [
        {
          type: ComponentType.TextDisplay,
          content: t('commands.edit-sticker.components.editingText', {
            name: `\`${sticker.name}\``,
            pack: getFormattedPackName(sticker.pack),
          }),
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.nameLabel'),
          description: t('commands.create-sticker.components.nameDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: EditStickerModalCustomIds.NEW_NAME_INPUT,
            style: TextInputStyle.Short,
            minLength: stickerNameOptionMeta.min_length,
            maxLength: stickerNameOptionMeta.max_length,
            required: true,
            value: sticker.name,
          } as TextInputComponentData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.altLabel'),
          description: t('commands.create-sticker.components.altDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: EditStickerModalCustomIds.NEW_ALT_INPUT,
            style: TextInputStyle.Paragraph,
            minLength: stickerAltOptionMeta.min_length,
            maxLength: stickerAltOptionMeta.max_length,
            required: false,
            value: sticker.description ?? undefined,
          } as TextInputComponentData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.edit-sticker.components.newFileLabel'),
          description: t('commands.edit-sticker.components.newFileDescription'),
          component: {
            type: ComponentType.FileUpload,
            customId: EditStickerModalCustomIds.NEW_FILE_INPUT,
            minValues: 1,
            maxValues: 1,
            required: false,
          },
        },
        {
          type: ComponentType.Label,
          label: t('commands.edit-sticker.components.newUrlLabel'),
          description: t('commands.edit-sticker.components.newUrlDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: EditStickerModalCustomIds.NEW_URL_INPUT,
            style: TextInputStyle.Short,
            minLength: stickerUrlOptionMeta.min_length,
            maxLength: stickerUrlOptionMeta.max_length,
            required: false,
            placeholder: t('commands.create-sticker.components.urlPlaceholder'),
          } as TextInputComponentData,
        },
      ],
    });
  },
  modal: {
    [BotModalId.EDIT_STICKER]: editStickerModalHandler,
  },
};
