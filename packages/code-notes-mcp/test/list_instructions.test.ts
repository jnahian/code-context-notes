import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { StorageManager, NoteManager, ContentHashTracker, AuthorProvider, Note } from '@jnahian/code-notes-core';
import { listInstructions } from '../src/tools/list_instructions.js';

describe('list_instructions', () => {
  let tempDir: string;
  let storage: StorageManager;
  let noteManager: NoteManager;

  const n = (overrides: Partial<Note>): Note => ({
    id: overrides.id!,
    content: 'content',
    author: 'alice',
    filePath: path.join(tempDir, 'foo.ts'),
    lineRange: { start: 0, end: 0 },
    contentHash: 'sha256:x',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    history: [],
    type: 'context',
    scope: 'line',
    tags: [],
    references: [],
    priority: 'normal',
    authorType: 'human',
    ...overrides,
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'list-instructions-test-'));
    storage = new StorageManager(tempDir, '.test-notes');
    const hashTracker = new ContentHashTracker();
    const authorProvider: AuthorProvider = {
      getAuthorName: async () => 'Test Author',
      updateConfigOverride: () => {},
    };
    noteManager = new NoteManager(storage, hashTracker, authorProvider);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns only instruction/warning notes, excludes expired, ranked by priority then recency, filterable by scope', async () => {
    await storage.saveNote(n({ id: 'context-note', type: 'context', priority: 'critical' }));
    await storage.saveNote(n({ id: 'low-instruction', type: 'instruction', priority: 'low', scope: 'file', updatedAt: '2026-05-01T00:00:00Z' }));
    await storage.saveNote(n({ id: 'high-warning', type: 'warning', priority: 'high', scope: 'line', updatedAt: '2026-05-01T00:00:00Z' }));
    await storage.saveNote(n({ id: 'critical-old', type: 'instruction', priority: 'critical', scope: 'file', updatedAt: '2026-01-01T00:00:00Z' }));
    await storage.saveNote(n({ id: 'critical-new', type: 'warning', priority: 'critical', scope: 'file', updatedAt: '2026-06-01T00:00:00Z' }));
    await storage.saveNote(n({ id: 'expired-instruction', type: 'instruction', priority: 'critical', expiresAt: '2025-01-01T00:00:00Z' }));

    const r = await listInstructions({}, { noteManager });
    const notes = JSON.parse(r.content[0].text) as Note[];
    const ids = notes.map(x => x.id);

    // type filter: context excluded
    expect(ids).not.toContain('context-note');
    // expiry exclusion
    expect(ids).not.toContain('expired-instruction');
    // priority (critical > high > low) then recency (updatedAt desc within same priority)
    expect(ids).toEqual(['critical-new', 'critical-old', 'high-warning', 'low-instruction']);

    // scope filter
    const scoped = await listInstructions({ scope: 'file' }, { noteManager });
    const scopedIds = (JSON.parse(scoped.content[0].text) as Note[]).map(x => x.id);
    expect(scopedIds).toEqual(['critical-new', 'critical-old', 'low-instruction']);
  });
});
