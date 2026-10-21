import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { LoggerContext } from '../types/contexts/logger.context.js';
import { syncPackToSearchIndex } from '../utils/search/sticker-search-index.js';

/**
 * The only place that writes stickers and packs. Everything the search index depends on
 * (names, ratings, visibility, deletion) flows through here, so the OpenSearch sync is hooked
 * in one spot instead of being remembered at every call site. The `sticker` and `pack`
 * delegates mirror the Prisma methods of the same name (same arguments, same typed results).
 *
 * After each write, every pack it touched is re-synced to the index, because a change to one
 * sticker or to the pack's `public`/`nsfw` flags is cheap to express as "reindex this pack".
 * Inside `transaction()` the sync is deferred until the transaction has committed. A failed
 * sync never fails the write (see syncPackToSearchIndex); the periodic reconcile repairs it.
 *
 * Intentionally not routed through here: hard deletes of rows that are already soft-deleted
 * (hardDeleteSticker, the hard-delete-old-packs sweep). They are long gone from the index,
 * and syncing once per row would turn a bulk sweep into thousands of pointless requests.
 */
type Client = PrismaClient | Prisma.TransactionClient;

export type SearchableStoreContext = LoggerContext & { db: PrismaClient };

type Touch = (packIds: Iterable<string | null | undefined>) => void | Promise<void>;

const buildStore = (client: Client, touch: Touch, transaction: SearchableStore['transaction']) => {
  // Resolved *before* the write: after a delete (or an update that changes the filtered
  // columns) the original `where` would no longer find the rows we need to re-sync
  const stickerPackIds = async (where: Prisma.StickerWhereInput | undefined) => (
    await client.sticker.findMany({ where, select: { packId: true }, distinct: ['packId'] })
  ).map(row => row.packId);
  const packIds = async (where: Prisma.PackWhereInput | undefined) => (
    await client.pack.findMany({ where, select: { id: true } })
  ).map(row => row.id);

  return {
    sticker: {
      create: async <T extends Prisma.StickerCreateArgs>(args: Prisma.SelectSubset<T, Prisma.StickerCreateArgs>) => {
        const sticker = await client.sticker.create(args);
        await touch([(sticker as { packId?: string }).packId]);
        return sticker;
      },
      update: async <T extends Prisma.StickerUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.StickerUpdateArgs>) => {
        const affected = await stickerPackIds(args.where);
        const sticker = await client.sticker.update(args);
        await touch(affected);
        return sticker;
      },
      updateMany: async <T extends Prisma.StickerUpdateManyArgs>(args: Prisma.SelectSubset<T, Prisma.StickerUpdateManyArgs>) => {
        const affected = await stickerPackIds(args.where);
        const result = await client.sticker.updateMany(args);
        await touch(affected);
        return result;
      },
    },
    pack: {
      // A new pack has no stickers yet, so there is nothing to index
      create: <T extends Prisma.PackCreateArgs>(args: Prisma.SelectSubset<T, Prisma.PackCreateArgs>) => client.pack.create(args),
      update: async <T extends Prisma.PackUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.PackUpdateArgs>) => {
        const affected = await packIds(args.where);
        const pack = await client.pack.update(args);
        await touch(affected);
        return pack;
      },
    },
    /** Re-syncs packs after a change the store can't observe (e.g. raw SQL). */
    syncPacks: async (ids: Iterable<string>) => touch(ids),
    transaction,
  };
};

export type SearchableStore = {
  sticker: ReturnType<typeof buildStore>['sticker'];
  pack: ReturnType<typeof buildStore>['pack'];
  syncPacks: (ids: Iterable<string>) => Promise<void>;
  /**
   * Runs `fn` in a database transaction with a store bound to it, then syncs every pack the
   * transaction touched once it has committed (nothing is synced if it rolls back). The raw
   * transaction client is the second argument, for queries the store doesn't cover.
   */
  transaction: <R>(fn: (store: Omit<SearchableStore, 'transaction'>, tx: Prisma.TransactionClient) => Promise<R>, options?: Parameters<PrismaClient['$transaction']>[1]) => Promise<R>;
};

export const createSearchableStore = (context: SearchableStoreContext): SearchableStore => {
  const syncNow: Touch = async (ids) => {
    for (const id of new Set(ids)) {
      if (id) await syncPackToSearchIndex(context, id);
    }
  };

  const transaction: SearchableStore['transaction'] = async (fn, options) => {
    const touched = new Set<string>();
    const result = await context.db.$transaction(async (tx) => {
      const txStore = buildStore(tx, ids => {
        for (const id of ids) if (id) touched.add(id);
      }, transaction);
      return fn(txStore as Omit<SearchableStore, 'transaction'>, tx);
    }, options);
    await syncNow(touched);
    return result;
  };

  return buildStore(context.db, syncNow, transaction) as unknown as SearchableStore;
};
