import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { DeleteStickerCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { stickerNameOptionMeta } from './metadata/sticker-name.option-meta.js';

export const getDeleteStickerOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.DELETE_STICKER, DeleteStickerCommandOptionName.NAME),
    required: true,
    autocomplete: true,
    ...stickerNameOptionMeta,
  },
  ...getGlobalOptions(t),
];
