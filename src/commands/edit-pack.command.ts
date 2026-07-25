import { ComponentType, MessageFlags, TextInputStyle } from 'discord-api-types/v10';
import { ComponentInLabelData, TextInputComponentData } from 'discord.js';
import { MODAL_TITLE_MAX_LENGTH } from '../constants/discord-limits.js';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { packNameOptionMeta } from '../options/metadata/pack-name.option-meta.js';
import { BotChatInputCommand, BotModalId } from '../types/bot-interaction.js';
import { EditPackCommandOptionName } from '../types/localization.js';
import { getPackNameAutocompleteHandler } from '../utils/autocomplete/pack-name.autocomplete.js';
import { getPackDisplayName } from '../utils/get-formatted-pack-name.js';
import { getPackNsfwEmoji } from '../utils/get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from '../utils/get-pack-visibility-emoji.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { truncateToMaximumLength, updateOrCreateUser } from '../utils/messaging.js';
import {
  EditPackModalBooleanOption,
  EditPackModalCustomIds,
  editPackModalHandler,
} from './modal-handlers/edit-pack.modal-handler.js';

export const editPackCommand: BotChatInputCommand = {
  name: 'edit-pack',
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
      include: { telegramPack: true },
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
      title: truncateToMaximumLength(t('commands.edit-pack.components.editPackModalTitle', { name: getPackDisplayName(pack) }), MODAL_TITLE_MAX_LENGTH),
      components: [
        // Imported pack names come from Telegram and cannot be edited here
        ...(pack.telegramPackId !== null ? [
          {
            type: ComponentType.TextDisplay as const,
            content: `${EmojiCharacters.INFO} ${t('commands.edit-pack.components.importedNameNote')}`,
          } as const,
          // Unpublished imported packs can only become public via /publish-imported-pack
          ...(pack.public ? [] : [
            {
              type: ComponentType.TextDisplay as const,
              content: `${EmojiCharacters.INFO} ${t('commands.edit-pack.components.importedUnpublishedNote')}`,
            } as const,
          ]),
        ] : [
          {
            type: ComponentType.Label as const,
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
        ]),
        // Imported packs can only ever go from public back to private here — becoming
        // public in the first place requires /publish-imported-pack — so the choice is
        // only offered once a pack is already published; unpublished imported packs
        // get the informational note above instead
        ...(pack.telegramPackId === null || pack.public ? [
          {
            type: ComponentType.Label as const,
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
                  description: t(pack.telegramPackId !== null
                    ? 'commands.edit-pack.components.publicFalseDescriptionImported'
                    : 'commands.edit-pack.components.publicFalseDescription'),
                  default: !pack.public,
                },
              ],
            } as unknown as ComponentInLabelData,
          },
        ] : []),
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
