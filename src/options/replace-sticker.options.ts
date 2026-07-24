import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { ReplaceStickerCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { stickerNameOptionMeta } from './metadata/sticker-name.option-meta.js';

export const getReplaceStickerOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.REPLACE_STICKER, ReplaceStickerCommandOptionName.NAME),
    required: true,
    autocomplete: true,
    ...stickerNameOptionMeta,
  },
  ...getGlobalOptions(t),
];
