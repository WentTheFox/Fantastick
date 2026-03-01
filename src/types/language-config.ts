import { TranslationCreditOverride } from './translation-credit-override.js';

export interface LanguageConfigV1 {
  /**
   * Language name in English
   */
  name: string;
  emoji?: string;
  crowdinLocale?: string;
  creditOverrides?: Record<string | number, TranslationCreditOverride | null>;
}


export type LatestLanguageConfigType = LanguageConfigV1;
