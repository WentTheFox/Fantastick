import { join } from 'path';
import { Locale } from 'discord-api-types/v10';
import { createI18nInitializer } from '@wentthefox-org/discord-bot-framework/i18n';
import { env } from '../env.js';

// Type-safe language constants
export const SUPPORTED_LANGUAGES = [Locale.Hungarian, Locale.EnglishUS] as Locale[];
export const DEFAULT_LANGUAGE = Locale.EnglishUS;

export const initI18next = createI18nInitializer({
  localesDir: join('.', 'src', 'locales'),
  supportedLngs: SUPPORTED_LANGUAGES,
  fallbackLng: DEFAULT_LANGUAGE,
  debug: env.DEBUG_I18N,
});
