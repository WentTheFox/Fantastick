import { ComponentType, TextInputStyle } from 'discord-api-types/v10';
import { ComponentInLabelData, TextInputComponentData } from 'discord.js';
import { TFunction } from 'i18next';
import {
  EditStickerModalCustomIds,
  EditStickerRatingOption,
} from '../constants/edit-sticker-modal-fields.js';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { stickerAltOptionMeta } from '../options/metadata/sticker-alt.option-meta.js';
import { stickerNameOptionMeta } from '../options/metadata/sticker-name.option-meta.js';
import { stickerUrlOptionMeta } from '../options/metadata/sticker-url.option-meta.js';
import { EditableSticker } from './apply-sticker-edit.js';
import { getFormattedPackName } from './get-formatted-pack-name.js';
import { getFormattedStickerName } from './get-formatted-sticker-name.js';

// The full sticker-edit modal (name, alt text, rating, file, URL), used by the mass-edit
// stepping flow's "Edit" button. /edit-sticker itself was split into /edit-sticker-metadata
// and /replace-sticker to fit Discord's 5-top-level-component modal cap with room for a
// description field; mass-edit keeps the combined modal (still without description on the
// non-imported branch, for the same reason) since its own 5-field budget is unaffected by
// that split.
export const getEditStickerModalContent = (t: TFunction, sticker: EditableSticker) => {
  const isImportedSticker = sticker.telegramStickerId !== null;
  const formattedStickerName = getFormattedStickerName(sticker);

  return {
    title: t('commands.mass-edit-stickers.components.editStickerModalTitle', { name: formattedStickerName }),
    components: [
      {
        type: ComponentType.TextDisplay as const,
        content: t('commands.mass-edit-stickers.components.editingText', {
          name: `\`${formattedStickerName}\``,
          pack: getFormattedPackName(sticker.pack),
        }),
      },
      // Imported stickers only carry an optional label; their emoji, position and image
      // are managed by the Telegram import and cannot be edited
      ...(isImportedSticker ? [
        {
          type: ComponentType.TextDisplay as const,
          content: `${EmojiCharacters.INFO} ${t('commands.mass-edit-stickers.components.importedStickerNote')}`,
        } as const,
        {
          type: ComponentType.Label as const,
          label: t('commands.mass-edit-stickers.components.importedNameLabel'),
          description: t('commands.mass-edit-stickers.components.importedNameDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: EditStickerModalCustomIds.NEW_NAME_INPUT,
            style: TextInputStyle.Short,
            maxLength: stickerNameOptionMeta.max_length,
            required: false,
            value: sticker.name || undefined,
          } as TextInputComponentData,
        },
        {
          type: ComponentType.Label as const,
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
      ] : [
        // No separate description field here (Discord caps modals at 5 top-level fields,
        // and this branch also needs the rating/file/URL fields) — description is only
        // editable for imported stickers, whose branch has room for it
        {
          type: ComponentType.Label as const,
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
      ]),
      {
        type: ComponentType.Label as const,
        label: t('commands.edit-sticker-metadata.components.ratingChoiceLabel'),
        description: t('commands.edit-sticker-metadata.components.ratingChoiceDescription'),
        component: {
          type: ComponentType.RadioGroup,
          customId: EditStickerModalCustomIds.RATING_INPUT,
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
      ...(isImportedSticker ? [] : [
        {
          type: ComponentType.Label as const,
          label: t('commands.mass-edit-stickers.components.newFileLabel'),
          description: t('commands.mass-edit-stickers.components.newFileDescription'),
          component: {
            type: ComponentType.FileUpload as const,
            customId: EditStickerModalCustomIds.NEW_FILE_INPUT,
            minValues: 1,
            maxValues: 1,
            required: false,
          },
        },
        {
          type: ComponentType.Label as const,
          label: t('commands.mass-edit-stickers.components.newUrlLabel'),
          description: t('commands.mass-edit-stickers.components.newUrlDescription'),
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
      ]),
    ],
  };
};
