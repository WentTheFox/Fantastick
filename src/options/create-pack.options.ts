import { APIApplicationCommandOption, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { BotChatInputCommandName } from '../types/bot-interaction.js';
import { CreatePackCommandOptionName } from '../types/localization.js';
import { getCommonOptionMeta } from '../utils/get-common-option-meta.js';
import { getGlobalOptions } from './global.options.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';

export const getCreatePackOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.CREATE_PACK, CreatePackCommandOptionName.NAME),
    required: true,
    ...packNameOptionMeta,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.CREATE_PACK, CreatePackCommandOptionName.NSFW),
    type: ApplicationCommandOptionType.Boolean,
  },
  {
    ...getCommonOptionMeta(t, BotChatInputCommandName.CREATE_PACK, CreatePackCommandOptionName.PUBLIC),
    type: ApplicationCommandOptionType.Boolean,
  },
  ...getGlobalOptions(t),
];
