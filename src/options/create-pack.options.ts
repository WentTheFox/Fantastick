import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { getGlobalOptions } from './global.options.js';

export const getCreatePackOptions = (t: TFunction): APIApplicationCommandOption[] => [
  ...getGlobalOptions(t),
];
