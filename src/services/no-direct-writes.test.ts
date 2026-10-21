import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Every sticker/pack write must go through the searchable store so the search index stays in
// sync (see src/services/searchable-store.ts). Hard deletes of rows that are already
// soft-deleted (hence already absent from the index) are the documented exception.
const allowedFiles = new Set([
  'src/services/searchable-store.ts',
  'src/utils/hard-delete-sticker.ts',
  'src/classes/queue-handlers/hard-delete-old-packs.queue-handler.ts',
]);
const directWrite = /\b(?:db|tx|client)\.(?:sticker|pack)\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\b/;

const listSourceFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  if (entry.isDirectory()) return entry.name === 'generated' ? [] : listSourceFiles(path);
  return path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : [];
});

describe('sticker and pack writes', () => {
  it('only happen through the searchable store', () => {
    const root = process.cwd();
    const offenders = listSourceFiles(join(root, 'src'))
      .map(path => relative(root, path))
      .filter(path => !allowedFiles.has(path))
      .filter(path => directWrite.test(readFileSync(join(root, path), 'utf8')));

    expect(offenders).toEqual([]);
  });
});
