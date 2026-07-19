import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { EditPackCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';

export const editPackOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.EDIT_PACK, EditPackCommandOptionName.NAME),
    required: true,
    autocomplete: true,
    ...packNameOptionMeta,
  },
];
