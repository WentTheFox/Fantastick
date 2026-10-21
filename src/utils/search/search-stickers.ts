import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { env } from '../../env.js';
import { InteractionContext } from '../../types/contexts/interaction.context.js';
import { openSearchRequest } from './opensearch-client.js';
import {
  compareStickerRank,
  defaultSearchLimit,
  getVisibleStickerWhere,
  matchesSearchQuery,
  normalizeSearchQuery,
  StickerSearchMatch,
  StickerSearchOptions,
  toStickerSearchMatch,
  visibleStickerSelect,
} from './visible-stickers.js';

type SearchOptions = Pick<StickerSearchOptions, 'nsfw' | 'excludeImported' | 'query'>;

interface SearchResponse {
  hits: { hits: { _id: string }[] };
}

// Wildcard metacharacters in user input must match literally, not widen the query
const escapeWildcard = (value: string) => value.replace(/[\\*?]/g, '\\$&');

// Matches are fetched in the same total order the final ranking uses (see compareStickerRank):
// sticker order, then id. Ties on `order` are everywhere (it is per-pack), so without the id
// tiebreak the top-N cut itself would be arbitrary and differ from the Postgres path.
const candidateSort = [{ order: 'asc' }, { id: 'asc' }];
// OpenSearch's default result window and terms limit; a user with more distinct used stickers
// than this is served by the Postgres path instead, which has no such limit
const maxUsedStickers = 10_000;

/**
 * Builds the filter that makes a search safe to run on behalf of one user. Everything
 * security-relevant derives from `userId` (the Discord-authenticated caller) and the
 * command's own flags; the user's typed text only ever reaches the `wildcard` clause, where
 * it cannot alter the visibility clauses.
 */
export const buildVisibilityFilter = (userId: string, { nsfw, excludeImported, query }: SearchOptions) => {
  const filter: unknown[] = [
    {
      bool: {
        should: [{ term: { packOwnerId: userId } }, { term: { packPublic: true } }],
        minimum_should_match: 1,
      },
    },
  ];
  const mustNot: unknown[] = [];
  if (!nsfw) {
    filter.push({ term: { packNsfw: false } });
    mustNot.push({ term: { stickerNsfw: true } });
  }
  if (excludeImported) filter.push({ term: { imported: false } });
  if (query) filter.push({ wildcard: { displayName: { value: `*${escapeWildcard(query)}*` } } });
  return { filter, mustNot };
};

const runSearch = async (body: unknown) => {
  const response = await openSearchRequest<SearchResponse>('POST', `/${env.OPENSEARCH_INDEX}/_search`, body);
  return response.hits.hits.map(hit => hit._id);
};

/**
 * Sticker search backed by OpenSearch, ranked identically to searchStickersInPostgres: the
 * caller's most-used matches first, then by sticker order, then id.
 *
 * Privacy: the index is only a *candidate generator*. Every candidate id is re-read from
 * Postgres under the canonical visibility rules before being returned, so a stale or
 * mis-synced index entry (e.g. a pack that was just made private) can never surface.
 */
export const searchStickers = async (context: Pick<InteractionContext, 'db'>, interaction: CommandInteraction | AutocompleteInteraction, { nsfw = false, excludeImported = false, query = '', limit = defaultSearchLimit }: Partial<StickerSearchOptions> = {}): Promise<StickerSearchMatch[]> => {
  const { db } = context;
  const userId = interaction.user.id;
  const normalizedQuery = normalizeSearchQuery(query);
  const { filter, mustNot } = buildVisibilityFilter(userId, { nsfw, excludeImported, query: normalizedQuery });

  const usageRows = await db.stickerUsage.findMany({
    select: { stickerId: true, count: true },
    where: { userId: BigInt(userId) },
  });
  if (usageRows.length > maxUsedStickers) throw new Error(`User has ${usageRows.length} used stickers, too many for an OpenSearch ids query`);
  const usageById = new Map(usageRows.map(row => [row.stickerId, row.count]));
  const usedIds = [...usageById.keys()];

  const [usedMatches, otherMatches] = await Promise.all([
    usedIds.length > 0
      ? runSearch({
        size: usedIds.length,
        _source: false,
        sort: candidateSort,
        query: { bool: { filter: [...filter, { ids: { values: usedIds } }], must_not: mustNot } },
      })
      : Promise.resolve<string[]>([]),
    runSearch({
      size: limit,
      _source: false,
      sort: candidateSort,
      query: { bool: { filter, must_not: [...mustNot, ...(usedIds.length > 0 ? [{ ids: { values: usedIds } }] : [])] } },
    }),
  ]);

  // Array#sort is stable, so equal-usage candidates keep the (order, id) sequence from above
  const candidateIds = [
    ...usedMatches.sort((a, b) => (usageById.get(b) ?? 0) - (usageById.get(a) ?? 0)),
    ...otherMatches,
  ].slice(0, limit);
  if (candidateIds.length === 0) return [];

  const verified = await db.sticker.findMany({
    select: visibleStickerSelect,
    where: { id: { in: candidateIds }, ...getVisibleStickerWhere(userId, { nsfw, excludeImported }) },
  });

  return verified
    .map(toStickerSearchMatch)
    // The index may hold an outdated name; the fresh Postgres name is authoritative
    .filter(match => matchesSearchQuery(match, normalizedQuery))
    // Re-rank on fresh Postgres data so a stale indexed `order` can't misorder the result
    .sort(compareStickerRank(usageById))
    .slice(0, limit);
};
