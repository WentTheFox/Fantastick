import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { MigrateToTelegramStickerCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';
import { stickerNameOptionMeta } from './metadata/sticker-name.option-meta.js';

// Discord requires required options to precede optional ones, so source-pack
// (optional; omitting it searches every non-imported pack the user owns) is
// listed last, after the other three required options.
export const getMigrateToTelegramStickerOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.MIGRATE_TO_TELEGRAM_STICKER, MigrateToTelegramStickerCommandOptionName.SOURCE_STICKER),
    required: true,
    autocomplete: true,
    ...stickerNameOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.MIGRATE_TO_TELEGRAM_STICKER, MigrateToTelegramStickerCommandOptionName.TARGET_PACK),
    required: true,
    autocomplete: true,
    ...packNameOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.MIGRATE_TO_TELEGRAM_STICKER, MigrateToTelegramStickerCommandOptionName.TARGET_STICKER),
    required: true,
    autocomplete: true,
    ...stickerNameOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.MIGRATE_TO_TELEGRAM_STICKER, MigrateToTelegramStickerCommandOptionName.SOURCE_PACK),
    required: false,
    autocomplete: true,
    ...packNameOptionMeta,
  },
  ...getGlobalOptions(t),
];
