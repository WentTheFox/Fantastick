import { AutocompleteInteraction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionContext } from '../../types/contexts/interaction.context.js';
import { openSearchRequest } from './opensearch-client.js';
import { searchStickersInPostgres } from './postgres-search.js';
import { searchStickers } from './search-stickers.js';

vi.mock('../../env.js', () => ({ env: { OPENSEARCH_INDEX: 'test-index' } }));
vi.mock('./opensearch-client.js', () => ({ openSearchRequest: vi.fn(), isSearchEnabled: () => true }));

const interaction = { user: { id: '42' } } as unknown as AutocompleteInteraction;

const row = (id: string, name: string, order: number, packId = 'pack-1') => ({
  id, name, packId, order, telegramSticker: null, pack: { name: `Pack ${packId}`, telegramPack: null },
});

// Many ties on purpose: `order` is per-pack, so equal values across packs are the norm
const stickers = [
  row('d', 'fox delta', 0, 'pack-2'),
  row('b', 'fox bravo', 0),
  row('a', 'fox alpha', 0),
  row('e', 'fox echo', 1),
  row('c', 'fox charlie', 0, 'pack-2'),
  row('z', 'fox zulu', 2),
];
const usage = [
  { stickerId: 'e', count: 5 },
  { stickerId: 'z', count: 5 },
  { stickerId: 'c', count: 2 },
];

// Emulates the index: returns candidates the way the real query would, in (order, id) order
const fakeOpenSearch = (ids: string[]) => ids
  .map(id => stickers.find(s => s.id === id)!)
  .sort((x, y) => x.order - y.order || (x.id < y.id ? -1 : 1))
  .map(s => s.id);

describe('search path parity', () => {
  const db = {
    sticker: {
      findMany: vi.fn(async ({ where }: { where: { id?: { in: string[] } } }) => (
        where.id ? stickers.filter(s => where.id!.in.includes(s.id)) : stickers
      )),
    },
    stickerUsage: { findMany: vi.fn().mockResolvedValue(usage) },
  };
  const context = { db } as unknown as InteractionContext;

  beforeEach(() => {
    vi.mocked(openSearchRequest).mockImplementation(async (_method, _path, body) => {
      const { size, query } = body as { size: number; query: { bool: { filter: { ids?: { values: string[] } }[]; must_not: { ids?: { values: string[] } }[] } } };
      const onlyIds = query.bool.filter.find(clause => clause.ids)?.ids?.values;
      const excludedIds = query.bool.must_not.find(clause => clause.ids)?.ids?.values ?? [];
      const pool = onlyIds ?? stickers.map(s => s.id).filter(id => !excludedIds.includes(id));
      return { hits: { hits: fakeOpenSearch(pool).slice(0, size).map(_id => ({ _id })) } };
    });
  });

  it('ranks by usage, then sticker order, then id', async () => {
    const result = await searchStickersInPostgres(context, interaction, { query: 'fox' });

    expect(result.map(match => match.id)).toEqual(['e', 'z', 'c', 'a', 'b', 'd']);
  });

  it.each([
    { query: '', limit: 25 },
    { query: 'fox', limit: 25 },
    { query: 'FOX', limit: 4 },
    { query: 'fox', limit: 1 },
    { query: 'charlie', limit: 25 },
  ])('returns identical results from Postgres and OpenSearch for %o', async (options) => {
    const fromPostgres = await searchStickersInPostgres(context, interaction, options);
    const fromOpenSearch = await searchStickers(context, interaction, options);

    expect(fromOpenSearch).toEqual(fromPostgres);
  });
});
