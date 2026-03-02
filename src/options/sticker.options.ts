import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { StickerCommandOptionName } from '../types/localization.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { getGlobalOptions } from './global.options.js';
import { packNameOptionMeta } from './metadata/pack-name.option-meta.js';
import { stickerNameOptionMeta } from './metadata/sticker-name.option-meta.js';

export const getStickerOptions = (t: TFunction): APIApplicationCommandOption[] => [
  {
    name: StickerCommandOptionName.PACK,
    ...getLocalizedObject('name', (lng) => t('commands.sticker.options.pack.name', { lng }), false),
    ...getLocalizedObject('description', (lng) => t('commands.sticker.options.pack.description', { lng })),
    required: false,
    ...packNameOptionMeta,
  },
  {
    name: StickerCommandOptionName.NAME,
    ...getLocalizedObject('name', (lng) => t('commands.sticker.options.name.name', { lng }), false),
    ...getLocalizedObject('description', (lng) => t('commands.sticker.options.name.description', { lng })),
    required: true,
    ...stickerNameOptionMeta,
  },
  ...getGlobalOptions(t),
];
