import { APIApplicationCommandOption, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { ImportCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { importUrlOptionMeta } from './metadata/import-url.option-meta.js';

export const getImportTelegramPackOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.IMPORT_TELEGRAM_PACK, ImportCommandOptionName.URL),
    required: true,
    ...importUrlOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.IMPORT_TELEGRAM_PACK, ImportCommandOptionName.NSFW),
    required: false,
    type: ApplicationCommandOptionType.Boolean,
  },
  ...getGlobalOptions(t),
];
