import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  StorageManager, NoteManager, ContentHashTracker,
  AuthorProvider, NoteDocument,
} from '@jnahian/code-notes-core';
import { getNotesForChanges } from '../src/tools/get_notes_for_changes.js';

describe('get_notes_for_changes', () => {
  let tempDir: string;
  let noteManager: NoteManager;
  const fakeDoc = (lineCount: number): NoteDocument => ({
    lineCount,
    lineAt: (i: number) => ({ text: `line ${i}` }),
    uri: { fsPath: '' },
  });

  // Diff touches exactly one post-image line: line 5 of src/auth.ts.
  const diff = `--- a/src/auth.ts
+++ b/src/auth.ts
@@ -3,4 +3,4 @@
 line3
 line4
-line5
+line5-changed
 line6
`;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'get-notes-for-changes-test-'));
    const storage = new StorageManager(tempDir, '.test-notes');
    const hashTracker = new ContentHashTracker();
    const authorProvider: AuthorProvider = {
      getAuthorName: async () => 'Test Author',
      updateConfigOverride: () => {},
    };
    noteManager = new NoteManager(storage, hashTracker, authorProvider);

    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    const targetFile = path.join(tempDir, 'src', 'auth.ts');

    // Overlaps the diff's changed line (5) -> bucket 0 (line-overlap)
    await noteManager.createNote({
      content: 'overlapping context note',
      filePath: targetFile,
      lineRange: { start: 4, end: 4 },
    }, fakeDoc(20));

    // Direct context note, but NOT on a changed line -> bucket 3 (other), not bucket 0
    await noteManager.createNote({
      content: 'non-overlapping context note',
      filePath: targetFile,
      lineRange: { start: 10, end: 10 },
    }, fakeDoc(20));

    // Directory-scoped instruction on the parent dir -> bucket 1 (instruction, incl. dir scope)
    const dirNote = await noteManager.createNote({
      content: 'directory scoped instruction',
      filePath: path.join(tempDir, 'src'),
      lineRange: { start: 0, end: 0 },
    }, fakeDoc(1));
    await noteManager.updateNoteMetadata(dirNote.id, { type: 'instruction', scope: 'directory' });

    // Decision note -> bucket 2
    const decisionNote = await noteManager.createNote({
      content: 'decision note',
      filePath: targetFile,
      lineRange: { start: 15, end: 15 },
    }, fakeDoc(20));
    await noteManager.updateNoteMetadata(decisionNote.id, { type: 'decision' });

    // Handoff note -> bucket 4
    const handoffNote = await noteManager.createNote({
      content: 'handoff note',
      filePath: targetFile,
      lineRange: { start: 18, end: 18 },
    }, fakeDoc(20));
    await noteManager.updateNoteMetadata(handoffNote.id, { type: 'handoff' });

    // Expired but critical -> still included (bucket 3, other)
    const criticalExpired = await noteManager.createNote({
      content: 'critical expired note',
      filePath: targetFile,
      lineRange: { start: 12, end: 12 },
    }, fakeDoc(20));
    await noteManager.updateNoteMetadata(criticalExpired.id, {
      priority: 'critical',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    // Expired, non-critical -> excluded entirely
    const normalExpired = await noteManager.createNote({
      content: 'normal expired note',
      filePath: targetFile,
      lineRange: { start: 13, end: 13 },
    }, fakeDoc(20));
    await noteManager.updateNoteMetadata(normalExpired.id, {
      priority: 'normal',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    // Unrelated note on a sibling file -> must never appear
    await noteManager.createNote({
      content: 'unrelated note',
      filePath: path.join(tempDir, 'src', 'other.ts'),
      lineRange: { start: 0, end: 0 },
    }, fakeDoc(20));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('diff mode: ranks line-overlap > instruction (incl. dir scope) > decision > other > handoff', async () => {
    const r = await getNotesForChanges({ diff }, { noteManager, workspace: tempDir });
    const parsed = JSON.parse(r.content[0].text);
    const contents: string[] = parsed.notes.map((n: any) => n.content);
    const idx = (c: string) => contents.indexOf(c);

    expect(idx('overlapping context note')).toBe(0);
    expect(idx('directory scoped instruction')).toBeGreaterThan(idx('overlapping context note'));
    expect(idx('decision note')).toBeGreaterThan(idx('directory scoped instruction'));
    expect(idx('non-overlapping context note')).toBeGreaterThan(idx('decision note'));
    expect(idx('non-overlapping context note')).toBeLessThan(idx('handoff note'));
    expect(idx('critical expired note')).toBeGreaterThan(idx('decision note'));
    expect(idx('critical expired note')).toBeLessThan(idx('handoff note'));

    expect(idx('normal expired note')).toBe(-1);
    expect(idx('unrelated note')).toBe(-1);

    expect(parsed.truncated).toBe(false);
    expect(parsed.appliedFiles).toEqual(['src/auth.ts']);
  });

  it('files[] mode: all direct notes on the file enter bucket 0, regardless of line', async () => {
    const r = await getNotesForChanges({ files: ['src/auth.ts'] }, { noteManager, workspace: tempDir });
    const parsed = JSON.parse(r.content[0].text);
    const contents: string[] = parsed.notes.map((n: any) => n.content);

    const direct = [
      'overlapping context note',
      'non-overlapping context note',
      'decision note',
      'handoff note',
      'critical expired note',
    ];
    for (const c of direct) expect(contents).toContain(c);
    expect(contents).not.toContain('normal expired note');
    expect(contents).not.toContain('unrelated note');

    const maxDirectIdx = Math.max(...direct.map(c => contents.indexOf(c)));
    expect(contents.indexOf('directory scoped instruction')).toBeGreaterThan(maxDirectIdx);
    expect(parsed.appliedFiles).toEqual(['src/auth.ts']);
  });

  it('returns diff_parse_failed in-band for a malformed diff', async () => {
    const r = await getNotesForChanges({ diff: 'not a diff at all' }, { noteManager, workspace: tempDir });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.error).toBe('diff_parse_failed');
    expect(typeof parsed.detail).toBe('string');
  });

  it('returns invalid_arguments in-band when neither files nor diff is given', async () => {
    const r = await getNotesForChanges({}, { noteManager, workspace: tempDir });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.error).toBe('invalid_arguments');
  });
});

describe('get_notes_for_changes truncation', () => {
  it('caps results at 100 and sets truncated: true', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'get-notes-for-changes-trunc-'));
    try {
      const storage = new StorageManager(tempDir, '.test-notes');
      const hashTracker = new ContentHashTracker();
      const authorProvider: AuthorProvider = {
        getAuthorName: async () => 'Test Author',
        updateConfigOverride: () => {},
      };
      const noteManager = new NoteManager(storage, hashTracker, authorProvider);
      const targetFile = path.join(tempDir, 'big.ts');
      const now = new Date().toISOString();

      for (let i = 0; i < 105; i++) {
        await storage.saveNote({
          id: `note-${i}`,
          content: `note ${i}`,
          author: 'Test Author',
          filePath: targetFile,
          lineRange: { start: 0, end: 0 },
          contentHash: 'x',
          createdAt: now,
          updatedAt: now,
          history: [],
        });
      }

      const r = await getNotesForChanges({ files: ['big.ts'] }, { noteManager, workspace: tempDir });
      const parsed = JSON.parse(r.content[0].text);
      expect(parsed.notes).toHaveLength(100);
      expect(parsed.truncated).toBe(true);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
