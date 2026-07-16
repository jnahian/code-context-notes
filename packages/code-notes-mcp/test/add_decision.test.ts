import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { StorageManager, NoteManager, ContentHashTracker, AuthorProvider } from '@jnahian/code-notes-core';
import { addDecision } from '../src/tools/add_decision.js';

describe('add_decision', () => {
  let tempDir: string;
  let noteManager: NoteManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'add-decision-test-'));
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

  it('rejects an empty references array in-band', async () => {
    const filePath = path.join(tempDir, 'file.ts');
    await fs.writeFile(filePath, 'a\nb\nc\n');

    const r = await addDecision(
      { file: filePath, lineRange: { start: 0, end: 0 }, content: 'we chose X', references: [] },
      { noteManager, workspace: tempDir },
    );
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.error).toBe('references_required');
  });

  it('creates a decision note with type=decision and the given references', async () => {
    const filePath = path.join(tempDir, 'file.ts');
    await fs.writeFile(filePath, 'a\nb\nc\n');

    const references = [{ kind: 'pr' as const, value: '#123' }];
    const r = await addDecision(
      { file: filePath, lineRange: { start: 0, end: 0 }, content: 'we chose X', references },
      { noteManager, workspace: tempDir },
    );
    const note = JSON.parse(r.content[0].text);

    expect(note.type).toBe('decision');
    expect(note.references).toEqual(references);
  });
});
