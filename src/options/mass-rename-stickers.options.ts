import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { MassRenameStickersCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';

export const getMassRenameStickersOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.MASS_RENAME_STICKERS, MassRenameStickersCommandOptionName.PACK),
    required: true,
    autocomplete: true,
    ...packNameOptionMeta,
  },
  ...getGlobalOptions(t),
];
