import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { StorageManager, NoteManager, ContentHashTracker, AuthorProvider, NoteDocument } from '@jnahian/code-notes-core';
import { editNote } from '../src/tools/edit_note.js';

describe('edit_note', () => {
  let tempDir: string;
  let noteManager: NoteManager;
  const doc = (filePath: string): NoteDocument => ({
    lineCount: 3,
    lineAt: () => ({ text: 'line' }),
    uri: { fsPath: filePath },
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'edit-note-test-'));
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

  it('round-trips an edit: content and history are updated', async () => {
    const filePath = path.join(tempDir, 'file.ts');
    await fs.writeFile(filePath, 'a\nb\nc\n');
    const note = await noteManager.createNote(
      { content: 'original', filePath, lineRange: { start: 0, end: 0 } },
      doc(filePath),
    );

    const r = await editNote({ id: note.id, content: 'updated content' }, { noteManager });
    const updated = JSON.parse(r.content[0].text);

    expect(updated.content).toBe('updated content');
    expect(updated.history.at(-1).action).toBe('edited');
    expect(updated.history.at(-1).content).toBe('updated content');
  });

  it('returns not_found in-band for an unknown id', async () => {
    const r = await editNote({ id: 'does-not-exist', content: 'x' }, { noteManager });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('returns note_deleted in-band when core throws "Cannot update deleted note" (e.g. a race with a concurrent delete)', async () => {
    const filePath = path.join(tempDir, 'file2.ts');
    await fs.writeFile(filePath, 'a\nb\nc\n');
    // getNoteByIdGlobal reports the note as present (not deleted), but the
    // underlying updateNote call throws the deleted-note guard — simulating
    // a delete that lands between edit_note's lookup and its update call.
    const fakeMgr: any = {
      getNoteByIdGlobal: async () => ({ id: 'x', filePath }),
      updateNote: async () => { throw new Error('Cannot update deleted note x'); },
    };
    const r = await editNote({ id: 'x', content: 'new content' }, { noteManager: fakeMgr });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.error).toBe('note_deleted');
  });
});
