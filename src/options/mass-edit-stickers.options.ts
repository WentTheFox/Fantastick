import { APIApplicationCommandOption, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { MassEditStickersCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';

export const getMassEditStickersOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.MASS_EDIT_STICKERS, MassEditStickersCommandOptionName.PACK),
    required: true,
    autocomplete: true,
    ...packNameOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.MASS_EDIT_STICKERS, MassEditStickersCommandOptionName.START),
    type: ApplicationCommandOptionType.Integer,
    required: false,
    min_value: 1,
  },
  ...getGlobalOptions(t),
];
