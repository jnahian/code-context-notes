import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  StorageManager, NoteManager, ContentHashTracker, AuthorProvider, NoteDocument,
} from '@jnahian/code-notes-core';
import { indexResourceDef, readIndex } from '../src/resources/indexResource.js';

describe('index resource', () => {
  let tempDir: string;
  let noteManager: NoteManager;
  const storageDir = '.test-notes';
  const fakeDoc = (lineCount: number): NoteDocument => ({
    lineCount,
    lineAt: (i: number) => ({ text: `line ${i}` }),
    uri: { fsPath: '' },
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'index-resource-test-'));
    await fs.mkdir(path.join(tempDir, storageDir), { recursive: true });
    const storage = new StorageManager(tempDir, storageDir);
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

  it('exposes the expected resource descriptor', () => {
    expect(indexResourceDef).toEqual({
      uri: 'code-notes://index',
      name: 'INDEX.json',
      mimeType: 'application/json',
    });
  });

  it('falls back to {} when INDEX.json is absent', async () => {
    const result = await readIndex({ workspace: tempDir, storageDir, noteManager });

    expect(result.contents[0].uri).toBe('code-notes://index');
    expect(result.contents[0].mimeType).toBe('application/json');
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed).toEqual({});
  });

  it('returns index content unchanged when fresh (no stale flag)', async () => {
    const generatedAt = new Date(Date.now() + 60_000).toISOString(); // future — always newer than any note
    await fs.writeFile(
      path.join(tempDir, storageDir, 'INDEX.json'),
      JSON.stringify({ version: 1, generatedAt, notes: [] }),
      'utf-8',
    );

    await noteManager.createNote({
      content: 'a note',
      filePath: path.join(tempDir, 'a.ts'),
      lineRange: { start: 0, end: 0 },
    }, fakeDoc(5));

    const result = await readIndex({ workspace: tempDir, storageDir, noteManager });
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.generatedAt).toBe(generatedAt);
    expect(parsed.stale).toBeFalsy();
  });

  it('flags stale:true when a note is newer than the index', async () => {
    const oldGeneratedAt = new Date(Date.now() - 60_000).toISOString(); // past
    await fs.writeFile(
      path.join(tempDir, storageDir, 'INDEX.json'),
      JSON.stringify({ version: 1, generatedAt: oldGeneratedAt, notes: [] }),
      'utf-8',
    );

    // Note created after the index was generated
    await noteManager.createNote({
      content: 'a fresh note',
      filePath: path.join(tempDir, 'a.ts'),
      lineRange: { start: 0, end: 0 },
    }, fakeDoc(5));

    const result = await readIndex({ workspace: tempDir, storageDir, noteManager });
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.stale).toBe(true);
    expect(parsed.reason).toBe('regeneration pending');
    expect(parsed.generatedAt).toBe(oldGeneratedAt); // original fields preserved
  });
});
