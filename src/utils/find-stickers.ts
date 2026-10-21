import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';
import { isSearchEnabled } from './search/opensearch-client.js';
import { searchStickersInPostgres } from './search/postgres-search.js';
import { searchStickers } from './search/search-stickers.js';
import { StickerSearchMatch, StickerSearchOptions } from './search/visible-stickers.js';

/**
 * The one entry point for finding stickers by typed text: used by every sticker-name
 * autocomplete and by the sticker command's free-typed (non-UUID) input. OpenSearch is only
 * an accelerator: both backends apply the same visibility rules and the same ranking
 * (most-used first, see compareStickerRank), so callers get identical results either way.
 */
export const findStickers = async (context: Pick<InteractionContext, 'db' | 'logger'>, interaction: CommandInteraction | AutocompleteInteraction, options: Partial<StickerSearchOptions> = {}): Promise<StickerSearchMatch[]> => {
  if (isSearchEnabled()) {
    try {
      return await searchStickers(context, interaction, options);
    } catch (e) {
      context.logger.warn(`OpenSearch sticker search failed, falling back to Postgres: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return searchStickersInPostgres(context, interaction, options);
};
