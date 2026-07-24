import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { DeletePackCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';

export const deletePackOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.DELETE_PACK, DeletePackCommandOptionName.NAME),
    required: true,
    autocomplete: true,
    ...packNameOptionMeta,
  },
];
