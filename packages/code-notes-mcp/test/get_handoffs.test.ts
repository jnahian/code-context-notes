import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  StorageManager, NoteManager, ContentHashTracker,
  AuthorProvider, NoteDocument,
} from '@jnahian/code-notes-core';
import { getHandoffs } from '../src/tools/get_handoffs.js';

function makeDoc(filePath: string): NoteDocument {
  return {
    lineCount: 1,
    lineAt: () => ({ text: 'function test() {}' }),
    uri: { fsPath: filePath },
  };
}

describe('get_handoffs', () => {
  let tempDir: string;
  let noteManager: NoteManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'get-handoffs-test-'));
    const storage = new StorageManager(tempDir, '.test-notes');
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

  it('excludes expired handoffs and non-handoff notes by default, sorted by updatedAt desc', async () => {
    const filePath = path.join(tempDir, 'file.ts');
    const doc = makeDoc(filePath);

    // Older fresh handoff
    const older = await noteManager.createNote({ content: 'older handoff', filePath, lineRange: { start: 0, end: 0 } }, doc);
    await noteManager.updateNoteMetadata(older.id, { type: 'handoff' });

    await new Promise(r => setTimeout(r, 5));

    // Newer fresh handoff
    const newer = await noteManager.createNote({ content: 'newer handoff', filePath, lineRange: { start: 0, end: 0 } }, doc);
    await noteManager.updateNoteMetadata(newer.id, { type: 'handoff' });

    // Expired handoff
    const expired = await noteManager.createNote({ content: 'expired handoff', filePath, lineRange: { start: 0, end: 0 } }, doc);
    await noteManager.updateNoteMetadata(expired.id, { type: 'handoff', expiresAt: new Date(Date.now() - 1000).toISOString() });

    // Non-handoff note
    await noteManager.createNote({ content: 'just context', filePath, lineRange: { start: 0, end: 0 } }, doc);

    const r = await getHandoffs({}, { noteManager });
    const parsed = JSON.parse(r.content[0].text);

    expect(parsed.map((n: any) => n.id)).toEqual([newer.id, older.id]);
  });

  it('includes expired handoffs when stale=true', async () => {
    const filePath = path.join(tempDir, 'file.ts');
    const doc = makeDoc(filePath);

    const expired = await noteManager.createNote({ content: 'expired handoff', filePath, lineRange: { start: 0, end: 0 } }, doc);
    await noteManager.updateNoteMetadata(expired.id, { type: 'handoff', expiresAt: new Date(Date.now() - 1000).toISOString() });

    const r = await getHandoffs({ stale: true }, { noteManager });
    const parsed = JSON.parse(r.content[0].text);

    expect(parsed.map((n: any) => n.id)).toContain(expired.id);
  });
});
