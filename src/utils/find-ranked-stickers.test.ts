import { AutocompleteInteraction } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { InteractionContext } from '../types/contexts/interaction.context.js';
import { AvailableStickerPack } from './find-available-sticker-packs.js';
import { findRankedStickers } from './find-ranked-stickers.js';

const availablePacks = [{ id: 'pack-1' }] as unknown as AvailableStickerPack[];

const interaction = { user: { id: '42' } } as unknown as AutocompleteInteraction;

const userStickers = [
  { id: 'sticker-a', name: 'apple', packId: 'pack-1', order: 0, telegramSticker: null },
  { id: 'sticker-b', name: 'apricot', packId: 'pack-1', order: 1, telegramSticker: null },
  { id: 'sticker-c', name: 'banana', packId: 'pack-1', order: 2, telegramSticker: null },
];

const buildDb = (usageRows: { stickerId: string; count: number }[]) => ({
  sticker: { findMany: vi.fn().mockResolvedValue(userStickers) },
  stickerUsage: { findMany: vi.fn().mockResolvedValue(usageRows) },
});

describe('findRankedStickers', () => {
  it('returns an empty list without querying when there are no available packs', async () => {
    const db = buildDb([]);
    const context = { db } as unknown as InteractionContext;

    const result = await findRankedStickers(context, interaction, []);

    expect(result).toEqual([]);
    expect(db.sticker.findMany).not.toHaveBeenCalled();
  });

  it('filters by query against the display name, case-insensitively', async () => {
    const db = buildDb([]);
    const context = { db } as unknown as InteractionContext;

    const result = await findRankedStickers(context, interaction, availablePacks, { query: 'AP' });

    expect(result.map(sticker => sticker.id)).toEqual(['sticker-a', 'sticker-b']);
  });

  it('ranks matches by the requesting user\'s usage count, most-used first', async () => {
    const db = buildDb([
      { stickerId: 'sticker-a', count: 1 },
      { stickerId: 'sticker-c', count: 5 },
    ]);
    const context = { db } as unknown as InteractionContext;

    const result = await findRankedStickers(context, interaction, availablePacks);

    expect(result.map(sticker => sticker.id)).toEqual(['sticker-c', 'sticker-a', 'sticker-b']);
  });

  it('breaks usage ties by sticker order', async () => {
    const db = buildDb([]);
    const context = { db } as unknown as InteractionContext;

    const result = await findRankedStickers(context, interaction, availablePacks);

    expect(result.map(sticker => sticker.id)).toEqual(['sticker-a', 'sticker-b', 'sticker-c']);
  });
});
