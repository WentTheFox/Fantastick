import { env } from '../../env.js';
import { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { LoggerContext } from '../../types/contexts/logger.context.js';
import { createDb } from '../create-db.js';
import { getFormattedStickerName } from '../get-formatted-sticker-name.js';
import { isSearchEnabled, OpenSearchError, openSearchRequest } from './opensearch-client.js';

/**
 * One document per live sticker, keyed by sticker id. The document carries everything the
 * visibility rules need (pack owner, pack public flag, ratings) so that access control is
 * enforced *inside* every search query rather than after the fact. Soft-deleted stickers and
 * stickers in soft-deleted packs are removed from the index instead of flagged.
 */
export interface StickerSearchDocument {
  // Copy of the document _id (which isn't sortable), used as the final ranking tiebreak
  id: string;
  packId: string;
  // Stringified because Discord snowflakes exceed Number.MAX_SAFE_INTEGER
  packOwnerId: string;
  packPublic: boolean;
  packNsfw: boolean;
  // True only for stickers explicitly overridden to NSFW; see getNonNsfwStickerFilter
  stickerNsfw: boolean;
  imported: boolean;
  order: number;
  displayName: string;
}

const indexMapping = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: { normalizer: { lowercase: { type: 'custom', filter: ['lowercase'] } } },
  },
  mappings: {
    dynamic: 'strict',
    properties: {
      id: { type: 'keyword' },
      packId: { type: 'keyword' },
      packOwnerId: { type: 'keyword' },
      packPublic: { type: 'boolean' },
      packNsfw: { type: 'boolean' },
      stickerNsfw: { type: 'boolean' },
      imported: { type: 'boolean' },
      order: { type: 'integer' },
      // `wildcard` fields make `*substring*` queries fast; the normalizer makes them
      // case-insensitive, matching the previous in-memory `toLowerCase().includes()`
      displayName: { type: 'wildcard', normalizer: 'lowercase' },
    },
  },
};

const bulkBatchSize = 1000;

type IndexableSticker = Prisma.StickerGetPayload<{
  select: {
    id: true;
    name: true;
    order: true;
    nsfwOverride: true;
    telegramStickerId: true;
    telegramSticker: { select: { emoji: true; order: true } };
  };
}>;

type IndexablePack = { id: string; createdBy: bigint; public: boolean; nsfw: boolean };

const stickerSelect = {
  id: true,
  name: true,
  order: true,
  nsfwOverride: true,
  telegramStickerId: true,
  telegramSticker: { select: { emoji: true, order: true } },
} satisfies Prisma.StickerSelect;

export const buildStickerDocument = (sticker: IndexableSticker, pack: IndexablePack): StickerSearchDocument => ({
  id: sticker.id,
  packId: pack.id,
  packOwnerId: pack.createdBy.toString(),
  packPublic: pack.public,
  packNsfw: pack.nsfw,
  stickerNsfw: sticker.nsfwOverride === true,
  imported: sticker.telegramStickerId !== null,
  order: sticker.order,
  displayName: getFormattedStickerName(sticker),
});

let ensuredIndex: Promise<void> | null = null;

export const ensureStickerIndex = (): Promise<void> => {
  ensuredIndex ??= openSearchRequest('PUT', `/${env.OPENSEARCH_INDEX}`, indexMapping, { timeoutMs: 10_000 })
    .then(() => undefined)
    .catch((e: unknown) => {
      // Created concurrently by the other process (app vs. queue worker): that's fine
      if (e instanceof OpenSearchError && e.status === 400 && e.message.includes('resource_already_exists_exception')) return;
      ensuredIndex = null;
      throw e;
    });
  return ensuredIndex;
};

interface BulkResponse {
  errors: boolean;
  items: Record<string, { status: number; error?: unknown }>[];
}

type BulkAction = { index: { id: string; doc: StickerSearchDocument } } | { delete: { id: string } };

const sendBulk = async (actions: BulkAction[], refresh: boolean) => {
  if (actions.length === 0) return;
  const lines = actions.flatMap(action => 'index' in action
    ? [JSON.stringify({ index: { _id: action.index.id } }), JSON.stringify(action.index.doc)]
    : [JSON.stringify({ delete: { _id: action.delete.id } })]);
  const result = await openSearchRequest<BulkResponse>(
    'POST',
    `/${env.OPENSEARCH_INDEX}/_bulk${refresh ? '?refresh=true' : ''}`,
    `${lines.join('\n')}\n`,
    { ndjson: true, timeoutMs: 30_000 },
  );
  if (result.errors) {
    // Deleting a document that is already gone is the expected steady state
    const failures = result.items.filter(item => Object.values(item).some(r => r.error && r.status !== 404));
    if (failures.length > 0) throw new Error(`OpenSearch bulk request had ${failures.length} failure(s): ${JSON.stringify(failures[0])}`);
  }
};

/**
 * Brings the index in line with Postgres for a single pack. Call after anything that
 * creates/edits/deletes the pack or its stickers, or flips the pack's public/nsfw flags
 * (which affects every sticker in it). Never throws: a failed sync only means search is
 * briefly stale, and results are re-verified against Postgres before being returned (see
 * searchStickers), so staleness can hide a sticker but never expose one.
 */
export const syncPackToSearchIndex = async (context: LoggerContext & { db: PrismaClient }, packId: string): Promise<void> => {
  if (!isSearchEnabled()) return;
  try {
    await ensureStickerIndex();
    const pack = await context.db.pack.findUnique({
      where: { id: packId },
      select: {
        id: true,
        createdBy: true,
        public: true,
        nsfw: true,
        deletedAt: true,
        stickers: { select: { ...stickerSelect, deletedAt: true } },
      },
    });
    if (!pack || pack.deletedAt !== null) {
      await openSearchRequest('POST', `/${env.OPENSEARCH_INDEX}/_delete_by_query?refresh=true&conflicts=proceed`, {
        query: { term: { packId } },
      }, { timeoutMs: 10_000 });
      return;
    }
    await sendBulk(pack.stickers.map((sticker): BulkAction => sticker.deletedAt === null
      ? { index: { id: sticker.id, doc: buildStickerDocument(sticker, pack) } }
      : { delete: { id: sticker.id } }), true);
  } catch (e) {
    context.logger.warn(`Failed to sync pack ${packId} to the search index: ${e instanceof Error ? e.message : String(e)}`);
  }
};

/**
 * Full reconciliation: (re)indexes every live sticker, then removes index entries with no
 * live sticker behind them (hard deletes, missed soft deletes). Doubles as the initial
 * backfill and as the safety net for any write path that didn't call syncPackToSearchIndex.
 */
export const reconcileSearchIndex = async (logger: LoggerContext['logger']): Promise<void> => {
  if (!isSearchEnabled()) return;
  await ensureStickerIndex();
  const db = createDb();
  const liveIds = new Set<string>();
  let cursor: string | undefined;
  for (;;) {
    const stickers = await db.sticker.findMany({
      where: { deletedAt: null, pack: { deletedAt: null } },
      select: { ...stickerSelect, pack: { select: { id: true, createdBy: true, public: true, nsfw: true } } },
      orderBy: { id: 'asc' },
      take: bulkBatchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (stickers.length === 0) break;
    await sendBulk(stickers.map(sticker => {
      liveIds.add(sticker.id);
      return { index: { id: sticker.id, doc: buildStickerDocument(sticker, sticker.pack) } };
    }), false);
    cursor = stickers[stickers.length - 1].id;
  }

  const staleIds: string[] = [];
  let scroll = await openSearchRequest<ScrollResponse>('POST', `/${env.OPENSEARCH_INDEX}/_search?scroll=1m`, {
    size: bulkBatchSize, _source: false, query: { match_all: {} },
  }, { timeoutMs: 30_000 });
  while (scroll.hits.hits.length > 0) {
    for (const hit of scroll.hits.hits) {
      if (!liveIds.has(hit._id)) staleIds.push(hit._id);
    }
    scroll = await openSearchRequest<ScrollResponse>('POST', '/_search/scroll', {
      scroll: '1m', scroll_id: scroll._scroll_id,
    }, { timeoutMs: 30_000 });
  }
  await openSearchRequest('DELETE', '/_search/scroll', { scroll_id: scroll._scroll_id }).catch(() => undefined);

  for (let i = 0; i < staleIds.length; i += bulkBatchSize) {
    await sendBulk(staleIds.slice(i, i + bulkBatchSize).map(id => ({ delete: { id } })), false);
  }
  await openSearchRequest('POST', `/${env.OPENSEARCH_INDEX}/_refresh`);
  logger.info(`Reconciled sticker search index: ${liveIds.size} live sticker(s), removed ${staleIds.length} stale entr${staleIds.length === 1 ? 'y' : 'ies'}`);
};

interface ScrollResponse {
  _scroll_id: string;
  hits: { hits: { _id: string }[] };
}
