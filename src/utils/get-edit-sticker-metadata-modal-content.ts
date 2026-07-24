import { ComponentType, TextInputStyle } from 'discord-api-types/v10';
import { ComponentInLabelData, TextInputComponentData } from 'discord.js';
import { TFunction } from 'i18next';
import { MODAL_TITLE_MAX_LENGTH } from '../constants/discord-limits.js';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { stickerAltOptionMeta } from '../options/metadata/sticker-alt.option-meta.js';
import { stickerNameOptionMeta } from '../options/metadata/sticker-name.option-meta.js';
import { EditableSticker } from '../types/editable-sticker.js';
import { getFormattedStickerName } from './get-formatted-sticker-name.js';
import { truncateToMaximumLength } from './messaging.js';
import { EditStickerMetadataModalCustomIds, EditStickerRatingOption } from '../constants/edit-sticker-modal-fields.js';

// The name/description/rating-only edit modal used by /edit-sticker-metadata — file and
// URL replacement live in the separate /replace-sticker command instead, since a modal
// combining all five fields would exceed Discord's 5-top-level-component cap
export const getEditStickerMetadataModalContent = (t: TFunction, sticker: EditableSticker) => {
  const isImportedSticker = sticker.telegramStickerId !== null;
  const formattedStickerName = getFormattedStickerName(sticker);

  return {
    title: truncateToMaximumLength(t('commands.edit-sticker-metadata.components.editStickerMetadataModalTitle', { name: formattedStickerName }), MODAL_TITLE_MAX_LENGTH),
    components: [
      // Imported stickers only carry an optional label; their emoji, position and image
      // are managed by the Telegram import and cannot be edited
      ...(isImportedSticker ? [
        {
          type: ComponentType.TextDisplay as const,
          content: `${EmojiCharacters.INFO} ${t('commands.edit-sticker-metadata.components.importedStickerNote')}`,
        } as const,
        {
          type: ComponentType.Label as const,
          label: t('commands.edit-sticker-metadata.components.importedNameLabel'),
          description: t('commands.edit-sticker-metadata.components.importedNameDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: EditStickerMetadataModalCustomIds.NAME_INPUT,
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
            customId: EditStickerMetadataModalCustomIds.NAME_INPUT,
            style: TextInputStyle.Short,
            minLength: stickerNameOptionMeta.min_length,
            maxLength: stickerNameOptionMeta.max_length,
            required: true,
            value: sticker.name,
          } as TextInputComponentData,
        },
      ]),
      {
        type: ComponentType.Label as const,
        label: t('commands.create-sticker.components.altLabel'),
        description: t('commands.create-sticker.components.altDescription'),
        component: {
          type: ComponentType.TextInput,
          customId: EditStickerMetadataModalCustomIds.ALT_INPUT,
          style: TextInputStyle.Paragraph,
          minLength: stickerAltOptionMeta.min_length,
          maxLength: stickerAltOptionMeta.max_length,
          required: false,
          value: sticker.description ?? undefined,
        } as TextInputComponentData,
      },
      {
        type: ComponentType.Label as const,
        label: t('commands.edit-sticker-metadata.components.ratingChoiceLabel'),
        description: t('commands.edit-sticker-metadata.components.ratingChoiceDescription'),
        component: {
          type: ComponentType.RadioGroup,
          customId: EditStickerMetadataModalCustomIds.RATING_INPUT,
          options: [
            {
              value: EditStickerRatingOption.DEFAULT,
              label: t('commands.edit-sticker-metadata.components.ratingDefaultLabel'),
              description: t('commands.edit-sticker-metadata.components.ratingDefaultDescription'),
              default: sticker.nsfwOverride === null,
            },
            {
              value: EditStickerRatingOption.SFW,
              label: t('commands.edit-sticker-metadata.components.ratingSfwLabel'),
              description: t('commands.edit-sticker-metadata.components.ratingSfwDescription'),
              default: sticker.nsfwOverride === false,
            },
            {
              value: EditStickerRatingOption.NSFW,
              label: t('commands.edit-sticker-metadata.components.ratingNsfwLabel'),
              description: t('commands.edit-sticker-metadata.components.ratingNsfwDescription'),
              default: sticker.nsfwOverride === true,
            },
          ],
        } as unknown as ComponentInLabelData,
      },
    ],
  };
};
