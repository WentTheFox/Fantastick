import { ComponentType, MessageFlags, TextInputStyle } from 'discord-api-types/v10';
import { ComponentInLabelData, TextInputComponentData } from 'discord.js';
import { getCreatePackOptions } from '../options/create-pack.options.js';
import { packNameOptionMeta } from '../options/metadata/pack-name.option-meta.js';
import { BotChatInputCommand, BotModalId } from '../types/bot-interaction.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { getPackNsfwEmoji } from '../utils/get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from '../utils/get-pack-visibility-emoji.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import {
  CreatePackModalBooleanOption,
  CreatePackModalCustomIds,
  createPackModalHandler,
} from './modal-handlers/create-pack.modal-handler.js';

export const createPackCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.create-pack.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.create-pack.name', { lng })),
    options: getCreatePackOptions(t),
  }),
  async handle(interaction, context) {
    const { t } = context;
    const user = await updateOrCreateUser(context, interaction);
    if (user.readOnly) {
      await interactionReply(context, interaction, {
        content: t('commands.global.responses.noPermission'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.showModal({
      customId: BotModalId.CREATE_PACK,
      title: t('commands.create-pack.components.createPackModalTitle'),
      components: [
        {
          type: ComponentType.Label,
          label: t('commands.create-pack.components.nameLabel'),
          description: t('commands.create-pack.components.nameDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: CreatePackModalCustomIds.NAME_INPUT,
            style: TextInputStyle.Short,
            minLength: packNameOptionMeta.min_length,
            maxLength: packNameOptionMeta.max_length,
            required: true,
          } as TextInputComponentData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-pack.components.publicChoiceLabel'),
          description: t('commands.create-pack.components.publicChoiceDescription'),
          component: {
            type: ComponentType.RadioGroup,
            customId: CreatePackModalCustomIds.PUBLIC_INPUT,
            options: [
              {
                value: CreatePackModalBooleanOption.TRUE,
                label: `${getPackVisibilityEmoji({ public: true })} ${t('commands.create-pack.components.publicTrueLabel')}`,
                description: t('commands.create-pack.components.publicTrueDescription'),
              },
              {
                value: CreatePackModalBooleanOption.FALSE,
                label: `${getPackVisibilityEmoji({ public: false })} ${t('commands.create-pack.components.publicFalseLabel')}`,
                description: t('commands.create-pack.components.publicFalseDescription'),
              },
            ],
          } as unknown as ComponentInLabelData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-pack.components.nsfwChoiceLabel'),
          description: t('commands.create-pack.components.nsfwChoiceDescription'),
          component: {
            type: ComponentType.RadioGroup,
            customId: CreatePackModalCustomIds.NSFW_INPUT,
            options: [
              {
                value: CreatePackModalBooleanOption.FALSE,
                label: t('commands.create-pack.components.nsfwFalseLabel'),
                description: t('commands.create-pack.components.nsfwFalseDescription', {
                  command: `/${t('commands.sticker.name')}`,
                }),
              },
              {
                value: CreatePackModalBooleanOption.TRUE,
                label: t('commands.create-pack.components.nsfwTrueLabel')
                  + getPackNsfwEmoji({ nsfw: true }),
                description: t('commands.create-pack.components.nsfwTrueDescription', {
                  command: `/${t('commands.nsfw-sticker.name')}`,
                }),
              },
            ],
          } as unknown as ComponentInLabelData,
        },
      ],
    });
  },
  modal: {
    [BotModalId.CREATE_PACK]: createPackModalHandler,
  },
};
