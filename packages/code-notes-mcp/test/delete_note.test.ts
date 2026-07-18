import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { StorageManager, NoteManager, ContentHashTracker, AuthorProvider, NoteDocument } from '@jnahian/code-notes-core';
import { deleteNote } from '../src/tools/delete_note.js';

describe('delete_note', () => {
  let tempDir: string;
  let noteManager: NoteManager;
  const doc = (filePath: string): NoteDocument => ({
    lineCount: 3,
    lineAt: () => ({ text: 'line' }),
    uri: { fsPath: filePath },
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'delete-note-test-'));
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

  it('soft-deletes a note: it disappears from getNotesForFile', async () => {
    const filePath = path.join(tempDir, 'file.ts');
    await fs.writeFile(filePath, 'a\nb\nc\n');
    const note = await noteManager.createNote(
      { content: 'gone soon', filePath, lineRange: { start: 0, end: 0 } },
      doc(filePath),
    );

    const r = await deleteNote({ id: note.id }, { noteManager });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed).toEqual({ ok: true, id: note.id });

    const remaining = await noteManager.getNotesForFile(filePath);
    expect(remaining.find(n => n.id === note.id)).toBeUndefined();
  });

  it('returns not_found in-band for an unknown id', async () => {
    const r = await deleteNote({ id: 'does-not-exist' }, { noteManager });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
