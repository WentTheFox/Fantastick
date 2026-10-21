import { AutocompleteInteraction } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { InteractionContext } from '../../types/contexts/interaction.context.js';
import { searchStickersInPostgres } from './postgres-search.js';

const interaction = { user: { id: '42' } } as unknown as AutocompleteInteraction;

const row = (id: string, name: string, order: number, telegramSticker: { emoji: string; order: number } | null = null) => ({
  id, name, packId: 'pack-1', order, telegramSticker, pack: { name: 'My pack', telegramPack: null },
});

const buildContext = (usageRows: { stickerId: string; count: number }[] = []) => {
  const db = {
    sticker: { findMany: vi.fn().mockResolvedValue([row('a', 'apple', 0), row('b', 'apricot', 1), row('c', 'banana', 2)]) },
    stickerUsage: { findMany: vi.fn().mockResolvedValue(usageRows) },
  };
  return { db, context: { db } as unknown as InteractionContext };
};

describe('searchStickersInPostgres', () => {
  it('filters by query against the display name, case-insensitively', async () => {
    const { context } = buildContext();

    const result = await searchStickersInPostgres(context, interaction, { query: ' AP ' });

    expect(result.map(match => match.id)).toEqual(['a', 'b']);
  });

  it('matches the Telegram emoji prefix of imported stickers', async () => {
    const { db, context } = buildContext();
    db.sticker.findMany.mockResolvedValue([row('t', 'wave', 0, { emoji: '👋', order: 2 })]);

    const result = await searchStickersInPostgres(context, interaction, { query: '👋#3' });

    expect(result.map(match => match.displayName)).toEqual(['👋#3 wave']);
  });

  it('ranks matches by the requesting user\'s usage count, most-used first', async () => {
    const { context } = buildContext([{ stickerId: 'a', count: 1 }, { stickerId: 'c', count: 5 }]);

    const result = await searchStickersInPostgres(context, interaction);

    expect(result.map(match => match.id)).toEqual(['c', 'a', 'b']);
  });

  it('breaks usage ties by sticker order', async () => {
    const { context } = buildContext();

    const result = await searchStickersInPostgres(context, interaction);

    expect(result.map(match => match.id)).toEqual(['a', 'b', 'c']);
  });

  it('applies the limit after ranking', async () => {
    const { context } = buildContext([{ stickerId: 'c', count: 5 }]);

    const result = await searchStickersInPostgres(context, interaction, { limit: 1 });

    expect(result.map(match => match.id)).toEqual(['c']);
  });

  it('only queries stickers in packs the caller can see', async () => {
    const { db, context } = buildContext();

    await searchStickersInPostgres(context, interaction, { nsfw: false });

    expect(db.sticker.findMany.mock.calls[0][0].where).toMatchObject({
      deletedAt: null,
      pack: { OR: [{ createdBy: 42n }, { public: true }], nsfw: false, deletedAt: null },
    });
  });
});
