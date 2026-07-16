import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  StorageManager, NoteManager, ContentHashTracker,
  AuthorProvider, NoteDocument,
} from '@jnahian/code-notes-core';
import { getNotesForFile, getNotesForFileInput } from '../src/tools/get_notes_for_file.js';

describe('get_notes_for_file', () => {
  let tempDir: string;
  let noteManager: NoteManager;
  const fakeDoc = (lineCount: number): NoteDocument => ({
    lineCount,
    lineAt: (i: number) => ({ text: `line ${i}` }),
    uri: { fsPath: '' },
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'get-notes-for-file-test-'));
    const storage = new StorageManager(tempDir, '.test-notes');
    const hashTracker = new ContentHashTracker();
    const authorProvider: AuthorProvider = {
      getAuthorName: async () => 'Test Author',
      updateConfigOverride: () => {},
    };
    noteManager = new NoteManager(storage, hashTracker, authorProvider);

    // directory tree: <tempDir>/src/auth.ts, <tempDir>/src/other.ts
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });

    // Direct note #2 on the target file (later line — should sort after #1)
    const targetFile = path.join(tempDir, 'src', 'auth.ts');
    await noteManager.createNote({
      content: 'second direct note',
      filePath: targetFile,
      lineRange: { start: 10, end: 10 },
    }, fakeDoc(20));

    // Direct note #1 on the target file (earlier line — should sort first)
    await noteManager.createNote({
      content: 'first direct note',
      filePath: targetFile,
      lineRange: { start: 2, end: 2 },
    }, fakeDoc(20));

    // Directory-scoped note on the parent directory `src`
    const dirNote = await noteManager.createNote({
      content: 'directory scoped note',
      filePath: path.join(tempDir, 'src'),
      lineRange: { start: 0, end: 0 },
    }, fakeDoc(1));
    await noteManager.updateNoteMetadata(dirNote.id, { scope: 'directory' });

    // Unrelated note on a sibling file — must never appear
    await noteManager.createNote({
      content: 'unrelated note',
      filePath: path.join(tempDir, 'src', 'other.ts'),
      lineRange: { start: 0, end: 0 },
    }, fakeDoc(20));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('includes direct and scoped notes when includeScopeMatches is true (default)', async () => {
    const r = await getNotesForFile(
      { file: path.join(tempDir, 'src', 'auth.ts'), includeScopeMatches: true },
      { noteManager, workspace: tempDir },
    );
    const parsed = JSON.parse(r.content[0].text);

    expect(parsed.direct).toHaveLength(2);
    expect(parsed.direct.map((n: any) => n.content)).toEqual(['first direct note', 'second direct note']);
    expect(parsed.direct[0].lineRange.start).toBeLessThan(parsed.direct[1].lineRange.start);

    expect(parsed.scoped).toHaveLength(1);
    expect(parsed.scoped[0].content).toBe('directory scoped note');
  });

  it('excludes scoped notes when includeScopeMatches is false', async () => {
    const r = await getNotesForFile(
      { file: path.join(tempDir, 'src', 'auth.ts'), includeScopeMatches: false },
      { noteManager, workspace: tempDir },
    );
    const parsed = JSON.parse(r.content[0].text);

    expect(parsed.direct).toHaveLength(2);
    expect(parsed.scoped).toHaveLength(0);
  });

  it('accepts a workspace-relative file path', async () => {
    const r = await getNotesForFile(
      { file: path.join('src', 'auth.ts'), includeScopeMatches: true },
      { noteManager, workspace: tempDir },
    );
    const parsed = JSON.parse(r.content[0].text);

    expect(parsed.direct).toHaveLength(2);
    expect(parsed.scoped).toHaveLength(1);
  });

  it('defaults includeScopeMatches to true when omitted, as a real server call would parse it', async () => {
    const parsedArgs = getNotesForFileInput.parse({ file: path.join(tempDir, 'src', 'auth.ts') });
    const r = await getNotesForFile(parsedArgs, { noteManager, workspace: tempDir });
    const parsed = JSON.parse(r.content[0].text);

    expect(parsed.direct).toHaveLength(2);
    expect(parsed.scoped).toHaveLength(1);
  });
});
