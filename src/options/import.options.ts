import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { ImportCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { importUrlOptionMeta } from './metadata/import-url.option-meta.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';

export const getImportOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.IMPORT, ImportCommandOptionName.PACK),
    required: true,
    autocomplete: true,
    ...packNameOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.IMPORT, ImportCommandOptionName.URL),
    required: true,
    ...importUrlOptionMeta,
  },
  ...getGlobalOptions(t),
];
