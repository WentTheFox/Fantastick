import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { ImportCommandOptionName } from '../types/localization.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { getGlobalOptions } from './global.options.js';
import { importUrlOptionMeta } from './metadata/import-url.option-meta.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';

export const getImportOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    name: ImportCommandOptionName.PACK,
    ...getLocalizedObject('name', (lng) => t('commands.import.options.pack.name', { lng }), false),
    ...getLocalizedObject('description', (lng) => t('commands.import.options.pack.description', { lng })),
    required: true,
    ...packNameOptionMeta,
  },
  {
    name: ImportCommandOptionName.URL,
    ...getLocalizedObject('name', (lng) => t('commands.import.options.url.name', { lng }), false),
    ...getLocalizedObject('description', (lng) => t('commands.import.options.url.description', { lng })),
    required: true,
    ...importUrlOptionMeta,
  },
  ...getGlobalOptions(t),
];
