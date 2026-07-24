import { ComponentType, MessageFlags, TextInputStyle } from 'discord-api-types/v10';
import { ComponentInLabelData, TextInputComponentData } from 'discord.js';
import { stickerAltOptionMeta } from '../options/metadata/sticker-alt.option-meta.js';
import { stickerNameOptionMeta } from '../options/metadata/sticker-name.option-meta.js';
import { stickerUrlOptionMeta } from '../options/metadata/sticker-url.option-meta.js';
import { BotChatInputCommand, BotChatInputCommandName, BotModalId } from '../types/bot-interaction.js';
import { getFormattedPackName } from '../utils/get-formatted-pack-name.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import { EditStickerRatingOption } from '../constants/edit-sticker-modal-fields.js';
import {
  CreateStickerModalCustomIds,
  createStickerModalHandler,
} from './modal-handlers/create-sticker.modal-handler.js';

export const createStickerCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.CREATE_STICKER,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.create-sticker.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.create-sticker.name', { lng })),
    };
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

    // Imported packs mirror their Telegram set, so manual stickers cannot be added to them
    const userPacks = await db.pack.findMany({
      where: {
        createdBy: user.id,
        deletedAt: null,
        telegramPackId: null,
      },
      include: { telegramPack: true },
    });

    if (userPacks.length === 0) {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.noPacks'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.showModal({
      customId: BotModalId.CREATE_STICKER,
      title: t('commands.create-sticker.components.createStickerModalTitle'),
      components: [
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.packLabel'),
          description: t('commands.create-sticker.components.packDescription'),
          component: {
            type: ComponentType.StringSelect,
            customId: CreateStickerModalCustomIds.PACK_INPUT,
            required: true,
            minValues: 1,
            maxValues: 1,
            options: userPacks.map(pack => ({
              label: getFormattedPackName(pack),
              value: pack.name,
            })),
          },
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.nameLabel'),
          description: t('commands.create-sticker.components.nameDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: CreateStickerModalCustomIds.NAME_INPUT,
            style: TextInputStyle.Short,
            minLength: stickerNameOptionMeta.min_length,
            maxLength: stickerNameOptionMeta.max_length,
            required: true,
          } as TextInputComponentData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.altLabel'),
          description: t('commands.create-sticker.components.altDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: CreateStickerModalCustomIds.ALT_INPUT,
            style: TextInputStyle.Paragraph,
            minLength: stickerAltOptionMeta.min_length,
            maxLength: stickerAltOptionMeta.max_length,
            required: false,
          } as TextInputComponentData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.edit-sticker.components.ratingChoiceLabel'),
          description: t('commands.edit-sticker.components.ratingChoiceDescription'),
          component: {
            type: ComponentType.RadioGroup,
            customId: CreateStickerModalCustomIds.RATING_INPUT,
            options: [
              {
                value: EditStickerRatingOption.DEFAULT,
                label: t('commands.edit-sticker.components.ratingDefaultLabel'),
                description: t('commands.edit-sticker.components.ratingDefaultDescription'),
                default: true,
              },
              {
                value: EditStickerRatingOption.SFW,
                label: t('commands.edit-sticker.components.ratingSfwLabel'),
                description: t('commands.edit-sticker.components.ratingSfwDescription'),
                default: false,
              },
              {
                value: EditStickerRatingOption.NSFW,
                label: t('commands.edit-sticker.components.ratingNsfwLabel'),
                description: t('commands.edit-sticker.components.ratingNsfwDescription'),
                default: false,
              },
            ],
          } as unknown as ComponentInLabelData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.fileLabel'),
          description: t('commands.create-sticker.components.fileDescription'),
          component: {
            type: ComponentType.FileUpload,
            customId: CreateStickerModalCustomIds.FILE_INPUT,
            minValues: 1,
            maxValues: 1,
            required: false,
          },
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.urlLabel'),
          description: t('commands.create-sticker.components.urlDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: CreateStickerModalCustomIds.URL_INPUT,
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
    [BotModalId.CREATE_STICKER]: createStickerModalHandler,
  },
};
