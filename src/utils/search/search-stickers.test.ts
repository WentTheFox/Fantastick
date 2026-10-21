import { AutocompleteInteraction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionContext } from '../../types/contexts/interaction.context.js';
import { openSearchRequest } from './opensearch-client.js';
import { buildVisibilityFilter, searchStickers } from './search-stickers.js';

vi.mock('../../env.js', () => ({ env: { OPENSEARCH_INDEX: 'test-index' } }));
vi.mock('./opensearch-client.js', () => ({ openSearchRequest: vi.fn(), isSearchEnabled: () => true }));

const interaction = { user: { id: '42' } } as unknown as AutocompleteInteraction;

const hits = (...ids: string[]) => ({ hits: { hits: ids.map(_id => ({ _id })) } });

const sticker = (id: string, name: string) => ({
  id, name, packId: 'pack-1', order: 0, telegramSticker: null, pack: { name: 'Pack', telegramPack: null },
});

describe('buildVisibilityFilter', () => {
  const base = { nsfw: false, excludeImported: false, query: '' };

  it('always restricts to the caller\'s own packs or public packs', () => {
    const { filter } = buildVisibilityFilter('42', base);

    expect(filter[0]).toEqual({
      bool: { should: [{ term: { packOwnerId: '42' } }, { term: { packPublic: true } }], minimum_should_match: 1 },
    });
  });

  it('keeps NSFW content out of non-NSFW searches, including per-sticker overrides', () => {
    const { filter, mustNot } = buildVisibilityFilter('42', base);

    expect(filter).toContainEqual({ term: { packNsfw: false } });
    expect(mustNot).toEqual([{ term: { stickerNsfw: true } }]);
  });

  it('does not add NSFW restrictions to NSFW searches', () => {
    const { filter, mustNot } = buildVisibilityFilter('42', { ...base, nsfw: true });

    expect(filter).not.toContainEqual({ term: { packNsfw: false } });
    expect(mustNot).toEqual([]);
  });

  it('treats wildcard characters in the typed text literally and cannot add clauses', () => {
    const { filter } = buildVisibilityFilter('42', { ...base, query: '*" }}, {"match_all":{} ?\\' });

    // owner/public clause, packNsfw clause, and the wildcard clause: nothing more
    expect(filter).toHaveLength(3);
    expect(filter[2]).toEqual({ wildcard: { displayName: { value: '*\\*" }}, {"match_all":{} \\?\\\\*' } } });
  });
});

describe('searchStickers', () => {
  const findStickers = vi.fn();
  const context = {
    db: {
      stickerUsage: { findMany: vi.fn().mockResolvedValue([{ stickerId: 'used', count: 3 }]) },
      sticker: { findMany: findStickers },
    },
  } as unknown as InteractionContext;

  beforeEach(() => {
    vi.mocked(openSearchRequest).mockReset();
    findStickers.mockReset();
  });

  it('drops candidates that Postgres does not confirm as visible (stale index entries)', async () => {
    vi.mocked(openSearchRequest)
      .mockResolvedValueOnce(hits('used'))
      .mockResolvedValueOnce(hits('now-private', 'visible'));
    findStickers.mockResolvedValue([sticker('visible', 'fox'), sticker('used', 'fox2')]);

    const result = await searchStickers(context, interaction, { query: 'fox' });

    expect(result.map(match => match.id)).toEqual(['used', 'visible']);
    // The confirmation query itself carries the visibility rules, not just the ids
    expect(findStickers.mock.calls[0][0].where).toMatchObject({
      id: { in: ['used', 'now-private', 'visible'] },
      deletedAt: null,
      pack: { OR: [{ createdBy: 42n }, { public: true }], nsfw: false, deletedAt: null },
    });
  });

  it('drops candidates whose current name no longer matches the query', async () => {
    vi.mocked(openSearchRequest).mockResolvedValue(hits());
    vi.mocked(openSearchRequest).mockResolvedValueOnce(hits()).mockResolvedValueOnce(hits('renamed'));
    findStickers.mockResolvedValue([sticker('renamed', 'banana')]);

    expect(await searchStickers(context, interaction, { query: 'fox' })).toEqual([]);
  });

  it('ranks the caller\'s used stickers before the rest', async () => {
    vi.mocked(openSearchRequest).mockResolvedValueOnce(hits('used')).mockResolvedValueOnce(hits('other'));
    findStickers.mockResolvedValue([sticker('other', 'a'), sticker('used', 'b')]);

    const result = await searchStickers(context, interaction);

    expect(result.map(match => match.id)).toEqual(['used', 'other']);
  });
});
