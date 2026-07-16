import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { StorageManager, NoteManager, ContentHashTracker, AuthorProvider } from '@jnahian/code-notes-core';
import { createNote } from '../src/tools/create_note.js';

describe('create_note', () => {
  let tempDir: string;
  let noteManager: NoteManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-note-test-'));
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

  it('creates a note with structured metadata and sets authorType to agent', async () => {
    const filePath = path.join(tempDir, 'file.ts');
    await fs.writeFile(filePath, 'line0\nline1\nline2\n');

    const r = await createNote(
      {
        file: filePath,
        lineRange: { start: 0, end: 1 },
        content: 'Watch out here',
        type: 'warning',
        tags: ['security'],
        priority: 'high',
      },
      { noteManager, workspace: tempDir },
    );
    const note = JSON.parse(r.content[0].text);

    expect(note.content).toBe('Watch out here');
    expect(note.type).toBe('warning');
    expect(note.tags).toEqual(['security']);
    expect(note.priority).toBe('high');
    expect(note.authorType).toBe('agent');

    // Assert it round-trips from disk with the same metadata.
    const onDisk = await noteManager.getNoteByIdGlobal(note.id);
    expect(onDisk!.type).toBe('warning');
    expect(onDisk!.authorType).toBe('agent');
  });

  it('returns file_not_found in-band for a missing file', async () => {
    const r = await createNote(
      { file: path.join(tempDir, 'missing.ts'), lineRange: { start: 0, end: 0 }, content: 'hi' },
      { noteManager, workspace: tempDir },
    );
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.error).toBe('file_not_found');
  });

  it('returns invalid_line_range in-band when the range exceeds the file', async () => {
    const filePath = path.join(tempDir, 'short.ts');
    await fs.writeFile(filePath, 'only one line\n');

    const r = await createNote(
      { file: filePath, lineRange: { start: 0, end: 50 }, content: 'hi' },
      { noteManager, workspace: tempDir },
    );
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.error).toBe('invalid_line_range');
  });

  it('accepts a workspace-relative file path', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'x\n');

    const r = await createNote(
      { file: path.join('src', 'a.ts'), lineRange: { start: 0, end: 0 }, content: 'relative path note' },
      { noteManager, workspace: tempDir },
    );
    const note = JSON.parse(r.content[0].text);
    expect(note.content).toBe('relative path note');
    expect(note.filePath).toBe(path.join(tempDir, 'src', 'a.ts'));
  });
});
