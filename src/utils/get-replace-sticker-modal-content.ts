import { ComponentType, TextInputStyle } from 'discord-api-types/v10';
import { TextInputComponentData } from 'discord.js';
import { TFunction } from 'i18next';
import { ReplaceStickerModalCustomIds } from '../constants/edit-sticker-modal-fields.js';
import { MODAL_TITLE_MAX_LENGTH } from '../constants/discord-limits.js';
import { stickerUrlOptionMeta } from '../options/metadata/sticker-url.option-meta.js';
import { EditableSticker } from '../types/editable-sticker.js';
import { getFormattedStickerName } from './get-formatted-sticker-name.js';
import { truncateToMaximumLength } from './messaging.js';

// The file/URL-only replacement modal used by /replace-sticker. Only ever built for
// non-imported stickers — imported stickers' images are managed by the Telegram import
// and cannot be replaced, so the command rejects those before ever showing this modal.
export const getReplaceStickerModalContent = (t: TFunction, sticker: EditableSticker) => ({
  title: truncateToMaximumLength(t('commands.replace-sticker.components.replaceStickerModalTitle', { name: getFormattedStickerName(sticker) }), MODAL_TITLE_MAX_LENGTH),
  components: [
    {
      type: ComponentType.Label as const,
      label: t('commands.replace-sticker.components.fileLabel'),
      description: t('commands.replace-sticker.components.fileDescription'),
      component: {
        type: ComponentType.FileUpload as const,
        customId: ReplaceStickerModalCustomIds.FILE_INPUT,
        minValues: 1,
        maxValues: 1,
        required: false,
      },
    },
    {
      type: ComponentType.Label as const,
      label: t('commands.replace-sticker.components.urlLabel'),
      description: t('commands.replace-sticker.components.urlDescription'),
      component: {
        type: ComponentType.TextInput,
        customId: ReplaceStickerModalCustomIds.URL_INPUT,
        style: TextInputStyle.Short,
        minLength: stickerUrlOptionMeta.min_length,
        maxLength: stickerUrlOptionMeta.max_length,
        required: false,
        placeholder: t('commands.replace-sticker.components.urlPlaceholder'),
      } as TextInputComponentData,
    },
  ],
});
