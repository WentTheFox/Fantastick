import { Locale } from 'discord-api-types/v10';
import type enUS from '../locales/en-US/translation.json';
import { Localization } from '../types/localization.js';


type TypeValidator<T extends Partial<Record<Locale, Localization>>> = T;
/* eslint-disable @typescript-eslint/no-unused-vars -- This type validates the structure of the i18n files at build time */
// noinspection JSUnusedLocalSymbols
type ValidatedLocalizationMap = TypeValidator<{
  [Locale.EnglishUS]: typeof enUS,
}>;
/* eslint-enable @typescript-eslint/no-unused-vars */
