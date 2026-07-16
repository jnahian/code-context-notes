import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  StorageManager, NoteManager, ContentHashTracker,
  AuthorProvider, NoteDocument,
} from '@jnahian/code-notes-core';
import { getNote } from '../src/tools/get_note.js';

// Stub NoteManager
const fakeMgr: any = { getNoteByIdGlobal: async (id: string) => id === 'a' ? { id: 'a', content: 'hi' } : undefined };

describe('get_note', () => {
  it('returns a note when found', async () => {
    const r = await getNote({ id: 'a' }, { noteManager: fakeMgr });
    expect(JSON.parse(r.content[0].text).id).toBe('a');
  });

  it('returns error JSON when not found', async () => {
    const r = await getNote({ id: 'missing' }, { noteManager: fakeMgr });
    expect(JSON.parse(r.content[0].text).error).toBe('not_found');
  });

  describe('integration with a real workspace', () => {
    let tempDir: string;
    let noteManager: NoteManager;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'get-note-test-'));
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

    it('round-trips a note written to disk through the tool', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      const doc: NoteDocument = {
        lineCount: 1,
        lineAt: () => ({ text: 'function test() {}' }),
        uri: { fsPath: filePath },
      };
      const note = await noteManager.createNote({
        content: 'Real note on disk',
        filePath,
        lineRange: { start: 0, end: 0 },
      }, doc);

      const r = await getNote({ id: note.id }, { noteManager });
      const parsed = JSON.parse(r.content[0].text);
      expect(parsed.id).toBe(note.id);
      expect(parsed.content).toBe('Real note on disk');
    });
  });
});
