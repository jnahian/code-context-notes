import * as fs from 'fs/promises';
import * as path from 'path';
import type { NoteManager } from '@jnahian/code-notes-core';

// Named indexResource.ts (not index.ts) to avoid Node16 directory-import
// ambiguity with a future src/resources/index.ts barrel file.
export const indexResourceDef = {
  uri: 'code-notes://index',
  name: 'INDEX.json',
  mimeType: 'application/json',
};

export interface IndexResourceDeps {
  workspace: string;
  storageDir: string;
  noteManager: NoteManager;
}

export async function readIndex(deps: IndexResourceDeps) {
  const raw = await fs
    .readFile(path.join(deps.workspace, deps.storageDir, 'INDEX.json'), 'utf-8')
    .catch(() => '{}');

  let index: Record<string, unknown>;
  try {
    index = JSON.parse(raw);
  } catch {
    index = {};
  }

  const notes = await deps.noteManager.getAllNotes();
  const newestUpdatedAt = notes.reduce((max, n) => (n.updatedAt > max ? n.updatedAt : max), '');
  const generatedAt = typeof index.generatedAt === 'string' ? index.generatedAt : '';
  const stale = newestUpdatedAt > generatedAt;

  const text = stale
    ? JSON.stringify({ ...index, stale: true, reason: 'regeneration pending' }, null, 2)
    : raw;

  return { contents: [{ uri: indexResourceDef.uri, mimeType: indexResourceDef.mimeType, text }] };
}
