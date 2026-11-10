import { DEFAULT_LANGUAGE } from '../constants/locales.js';
import { InteractionHandlerContext } from '../types/contexts/interaction-handler.context.js';

interface CreateTFunctionOptions {
  i18next: InteractionHandlerContext['i18next'];
  ephemeral: boolean | null;
  locale: string;
  /** The server's preferred locale (`interaction.guildLocale`), available in both gateway and webhook mode */
  guildLocale: string | undefined | null;
}

export const createTFunction = ({ i18next, ephemeral, locale, guildLocale }: CreateTFunctionOptions) => {
  return i18next.getFixedT(
    // Always use user's locale for ephemeral responses, otherwise use server's preferred locale when available
    ephemeral
      ? [locale, DEFAULT_LANGUAGE] :
      (
        guildLocale
          ? [guildLocale, DEFAULT_LANGUAGE]
          : DEFAULT_LANGUAGE
      ),
  );
};
