import { APIApplicationCommandOption, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { StickerCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { stickerNameOptionMeta } from './metadata/sticker-name.option-meta.js';

export const getStickerOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.STICKER, StickerCommandOptionName.NAME),
    required: true,
    autocomplete: true,
    ...stickerNameOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.STICKER, StickerCommandOptionName.PREVIEW),
    required: false,
    type: ApplicationCommandOptionType.Boolean,
  },
  ...getGlobalOptions(t),
];
