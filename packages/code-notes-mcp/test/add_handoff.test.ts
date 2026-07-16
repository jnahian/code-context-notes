import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { StorageManager, NoteManager, ContentHashTracker, AuthorProvider } from '@jnahian/code-notes-core';
import { addHandoff } from '../src/tools/add_handoff.js';

describe('add_handoff', () => {
  let tempDir: string;
  let noteManager: NoteManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'add-handoff-test-'));
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

  it('creates a handoff note that expires roughly 7 days from now', async () => {
    const filePath = path.join(tempDir, 'file.ts');
    await fs.writeFile(filePath, 'a\nb\nc\n');

    const before = Date.now();
    const r = await addHandoff(
      { file: filePath, lineRange: { start: 0, end: 0 }, content: 'pick up here' },
      { noteManager, workspace: tempDir },
    );
    const note = JSON.parse(r.content[0].text);

    expect(note.type).toBe('handoff');
    const expiresInMs = new Date(note.expiresAt).getTime() - before;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(expiresInMs - sevenDaysMs)).toBeLessThan(5000);
  });
});
