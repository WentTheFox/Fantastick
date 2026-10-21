import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../generated/prisma/client.js';
import { syncPackToSearchIndex } from '../utils/search/sticker-search-index.js';
import { createSearchableStore } from './searchable-store.js';

vi.mock('../utils/search/sticker-search-index.js', () => ({ syncPackToSearchIndex: vi.fn().mockResolvedValue(undefined) }));

const buildClient = () => ({
  sticker: {
    findMany: vi.fn().mockResolvedValue([{ packId: 'pack-1' }]),
    create: vi.fn().mockResolvedValue({ id: 's-new', packId: 'pack-2' }),
    update: vi.fn().mockResolvedValue({ id: 's-1', packId: 'pack-1' }),
    updateMany: vi.fn().mockResolvedValue({ count: 2 }),
  },
  pack: {
    findMany: vi.fn().mockResolvedValue([{ id: 'pack-1' }]),
    create: vi.fn().mockResolvedValue({ id: 'pack-new' }),
    update: vi.fn().mockResolvedValue({ id: 'pack-1' }),
  },
});

describe('createSearchableStore', () => {
  let client: ReturnType<typeof buildClient>;
  let db: PrismaClient;
  const logger = {} as never;

  beforeEach(() => {
    vi.mocked(syncPackToSearchIndex).mockClear();
    client = buildClient();
    db = {
      ...client,
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(client)),
    } as unknown as PrismaClient;
  });

  it('syncs the pack of a created sticker', async () => {
    await createSearchableStore({ db, logger }).sticker.create({ data: {} as never });

    expect(syncPackToSearchIndex).toHaveBeenCalledExactlyOnceWith({ db, logger }, 'pack-2');
  });

  it('resolves affected packs before the write and syncs them afterwards', async () => {
    const order: string[] = [];
    client.sticker.findMany.mockImplementation(async () => (order.push('resolve'), [{ packId: 'pack-1' }]));
    client.sticker.updateMany.mockImplementation(async () => (order.push('write'), { count: 2 }));
    vi.mocked(syncPackToSearchIndex).mockImplementation(async () => void order.push('sync'));

    await createSearchableStore({ db, logger }).sticker.updateMany({ where: { packId: 'pack-1' }, data: {} });

    expect(order).toEqual(['resolve', 'write', 'sync']);
  });

  it('syncs a pack whose flags changed', async () => {
    await createSearchableStore({ db, logger }).pack.update({ where: { id: 'pack-1' }, data: { public: false } });

    expect(syncPackToSearchIndex).toHaveBeenCalledExactlyOnceWith({ db, logger }, 'pack-1');
  });

  it('does not sync a freshly created, still-empty pack', async () => {
    await createSearchableStore({ db, logger }).pack.create({ data: {} as never });

    expect(syncPackToSearchIndex).not.toHaveBeenCalled();
  });

  it('defers syncing until the transaction committed, once per pack', async () => {
    await createSearchableStore({ db, logger }).transaction(async (store) => {
      await store.sticker.update({ where: { id: 's-1' }, data: {} });
      await store.sticker.update({ where: { id: 's-2' }, data: {} });
      expect(syncPackToSearchIndex).not.toHaveBeenCalled();
    });

    expect(syncPackToSearchIndex).toHaveBeenCalledExactlyOnceWith({ db, logger }, 'pack-1');
  });

  it('does not sync when the transaction rolls back', async () => {
    await expect(createSearchableStore({ db, logger }).transaction(async (store) => {
      await store.sticker.update({ where: { id: 's-1' }, data: {} });
      throw new Error('boom');
    })).rejects.toThrow('boom');

    expect(syncPackToSearchIndex).not.toHaveBeenCalled();
  });
});
