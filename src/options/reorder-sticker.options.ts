import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { ReorderStickerCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { stickerNameOptionMeta } from './metadata/sticker-name.option-meta.js';

export const getReorderStickerOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.REORDER_STICKER, ReorderStickerCommandOptionName.STICKER),
    required: true,
    autocomplete: true,
    ...stickerNameOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.REORDER_STICKER, ReorderStickerCommandOptionName.BEFORE),
    required: false,
    autocomplete: true,
    ...stickerNameOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.REORDER_STICKER, ReorderStickerCommandOptionName.AFTER),
    required: false,
    autocomplete: true,
    ...stickerNameOptionMeta,
  },
  ...getGlobalOptions(t),
];
