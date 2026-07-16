import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  StorageManager, NoteManager, ContentHashTracker, AuthorProvider, NoteDocument,
} from '@jnahian/code-notes-core';
import { FILE_RESOURCE_URI_PREFIX, fileResourceMimeType, readFileResource, renderFileNotesMarkdown } from '../src/resources/file.js';

describe('file/{path} resource', () => {
  let tempDir: string;
  let noteManager: NoteManager;
  const storageDir = '.test-notes';
  const fakeDoc = (lineCount: number): NoteDocument => ({
    lineCount,
    lineAt: (i: number) => ({ text: `line ${i}` }),
    uri: { fsPath: '' },
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-resource-test-'));
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
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

  it('renders notes for the file as markdown', async () => {
    await noteManager.createNote({
      content: 'watch out here',
      filePath: path.join(tempDir, 'src', 'auth.ts'),
      lineRange: { start: 4, end: 4 },
    }, fakeDoc(20));

    const uri = FILE_RESOURCE_URI_PREFIX + encodeURIComponent('src/auth.ts');
    const result = await readFileResource(uri, { workspace: tempDir, noteManager });

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe(uri);
    expect(result.contents[0].mimeType).toBe(fileResourceMimeType);
    expect(result.contents[0].text).toContain('watch out here');
    expect(result.contents[0].text).toContain('Test Author');
  });

  it('renders a friendly message when there are no notes for the file', async () => {
    const uri = FILE_RESOURCE_URI_PREFIX + encodeURIComponent('src/none.ts');
    const result = await readFileResource(uri, { workspace: tempDir, noteManager });

    expect(result.contents[0].text.length).toBeGreaterThan(0);
  });

  it('rejects path traversal attempts', async () => {
    const uri = FILE_RESOURCE_URI_PREFIX + encodeURIComponent('../../etc/passwd');
    const result = await readFileResource(uri, { workspace: tempDir, noteManager });

    expect(result.contents[0].text.toLowerCase()).toContain('error');
    expect(result.contents[0].text).not.toContain('root:'); // never actually reads the file
  });

  it('renderFileNotesMarkdown formats note header, metadata, and content', () => {
    const md = renderFileNotesMarkdown([
      {
        id: 'abc123',
        content: 'hello world',
        author: 'Alice',
        filePath: '/ws/src/x.ts',
        lineRange: { start: 9, end: 9 },
        contentHash: 'h',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        history: [],
        type: 'note',
      } as any,
    ]);

    expect(md).toContain('L10');
    expect(md).toContain('Alice');
    expect(md).toContain('hello world');
  });
});
