import { APIApplicationCommandOption, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { CreatePackCommandOptionName } from '../types/localization.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { getGlobalOptions } from './global.options.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';

export const getCreatePackOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    name: CreatePackCommandOptionName.NAME,
    ...getLocalizedObject('name', (lng) => t('commands.create-pack.options.name.name', { lng }), false),
    ...getLocalizedObject('description', (lng) => t('commands.create-pack.options.name.description', { lng })),
    required: true,
    ...packNameOptionMeta,
  },
  {
    name: CreatePackCommandOptionName.NSFW,
    ...getLocalizedObject('name', (lng) => t('commands.create-pack.options.nsfw.name', { lng }), false),
    ...getLocalizedObject('description', (lng) => t('commands.create-pack.options.nsfw.description', { lng })),
    required: true,
    type: ApplicationCommandOptionType.Boolean,
  },
  ...getGlobalOptions(t),
];
