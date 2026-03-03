import { APIApplicationCommandOption } from 'discord-api-types/v10';
import { TFunction } from 'i18next';
import { getLocalizedObject } from './get-localized-object.js';

export const getCommonOptionMeta = (t: TFunction, commandName: string, optionName: string): Pick<APIApplicationCommandOption, 'name' | 'name_localizations' | 'description' | 'description_localizations'> => ({
  ...getLocalizedObject('name', (lng) => t(`commands.${commandName}.options.${optionName}.name`, { lng })),
  ...getLocalizedObject('description', (lng) => t(`commands.${commandName}.options.${optionName}.description`, { lng })),
});
