import { ComponentType, MessageFlags, TextInputStyle } from 'discord-api-types/v10';
import { ComponentInLabelData, TextInputComponentData } from 'discord.js';
import { editPackOptions } from '../options/edit-pack.options.js';
import { packNameOptionMeta } from '../options/metadata/pack-name.option-meta.js';
import { BotChatInputCommand, BotChatInputCommandName, BotModalId } from '../types/bot-interaction.js';
import { EditPackCommandOptionName } from '../types/localization.js';
import { getPackNameAutocompleteHandler } from '../utils/autocomplete/pack-name.autocomplete.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { getPackNsfwEmoji } from '../utils/get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from '../utils/get-pack-visibility-emoji.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import {
  EditPackModalBooleanOption,
  EditPackModalCustomIds,
  editPackModalHandler,
} from './modal-handlers/edit-pack.modal-handler.js';

export const editPackCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.EDIT_PACK,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.edit-pack.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.edit-pack.name', { lng })),
      options: editPackOptions(t),
    };
  },
  autocomplete: {
    [EditPackCommandOptionName.NAME]: getPackNameAutocompleteHandler({ nsfw: true, ownedOnly: true }),
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

    const id = interaction.options.getString(EditPackCommandOptionName.NAME, true);
    const pack = await db.pack.findUnique({
      where: { id, deletedAt: null, createdBy: user.id },
    });

    if (!pack) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-pack.responses.packNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.showModal({
      customId: `${BotModalId.EDIT_PACK}:${pack.id}`,
      title: t('commands.edit-pack.components.editPackModalTitle', { name: pack.name }),
      components: [
        {
          type: ComponentType.Label,
          label: t('commands.edit-pack.components.nameLabel'),
          description: t('commands.edit-pack.components.nameDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: EditPackModalCustomIds.NAME_INPUT,
            style: TextInputStyle.Short,
            minLength: packNameOptionMeta.min_length,
            maxLength: packNameOptionMeta.max_length,
            required: true,
            value: pack.name,
          } as TextInputComponentData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.edit-pack.components.publicChoiceLabel'),
          description: t('commands.edit-pack.components.publicChoiceDescription'),
          component: {
            type: ComponentType.RadioGroup,
            customId: EditPackModalCustomIds.PUBLIC_INPUT,
            options: [
              {
                value: EditPackModalBooleanOption.TRUE,
                label: `${getPackVisibilityEmoji({ public: true })} ${t('commands.edit-pack.components.publicTrueLabel')}`,
                description: t('commands.edit-pack.components.publicTrueDescription'),
                default: pack.public,
              },
              {
                value: EditPackModalBooleanOption.FALSE,
                label: `${getPackVisibilityEmoji({ public: false })} ${t('commands.edit-pack.components.publicFalseLabel')}`,
                description: t('commands.edit-pack.components.publicFalseDescription'),
                default: !pack.public,
              },
            ],
          } as unknown as ComponentInLabelData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.edit-pack.components.nsfwChoiceLabel'),
          description: t('commands.edit-pack.components.nsfwChoiceDescription'),
          component: {
            type: ComponentType.RadioGroup,
            customId: EditPackModalCustomIds.NSFW_INPUT,
            options: [
              {
                value: EditPackModalBooleanOption.FALSE,
                label: t('commands.edit-pack.components.nsfwFalseLabel'),
                description: t('commands.edit-pack.components.nsfwFalseDescription', {
                  command: `/${t('commands.sticker.name')}`,
                }),
                default: !pack.nsfw,
              },
              {
                value: EditPackModalBooleanOption.TRUE,
                label: t('commands.edit-pack.components.nsfwTrueLabel')
                  + getPackNsfwEmoji({ nsfw: true }),
                description: t('commands.edit-pack.components.nsfwTrueDescription', {
                  command: `/${t('commands.nsfw-sticker.name')}`,
                }),
                default: pack.nsfw,
              },
            ],
          } as unknown as ComponentInLabelData,
        },
      ],
    });
  },
  modal: {
    [BotModalId.EDIT_PACK]: editPackModalHandler,
  },
};
