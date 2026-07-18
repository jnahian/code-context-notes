import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  StorageManager, NoteManager, ContentHashTracker,
  AuthorProvider, NoteDocument, Note,
} from '@jnahian/code-notes-core';
import { searchNotes } from '../src/tools/search_notes.js';

describe('search_notes', () => {
  let tempDir: string;
  let noteManager: NoteManager;
  const doc = (filePath: string): NoteDocument => ({
    lineCount: 10,
    lineAt: () => ({ text: 'const x = 1;' }),
    uri: { fsPath: filePath },
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-notes-test-'));
    const storage = new StorageManager(tempDir, '.test-notes');
    const hashTracker = new ContentHashTracker();
    const authorProvider: AuthorProvider = {
      getAuthorName: async () => 'Test Author',
      updateConfigOverride: () => {},
    };
    noteManager = new NoteManager(storage, hashTracker, authorProvider);

    // alpha and beta both match the query 'authentication' but differ on
    // type/tags/file, so each filter test can assert the *wrong* one is excluded
    // rather than passing vacuously on a query that only ever matched one note.
    const alpha = await noteManager.createNote({
      content: 'This handles authentication tokens',
      filePath: path.join(tempDir, 'auth.ts'),
      lineRange: { start: 0, end: 0 },
    }, doc(path.join(tempDir, 'auth.ts')));
    await noteManager.updateNoteMetadata(alpha.id, { type: 'warning', tags: ['security', 'auth'] });

    const beta = await noteManager.createNote({
      content: 'This handles authentication for the dashboard widget',
      filePath: path.join(tempDir, 'widget.ts'),
      lineRange: { start: 0, end: 0 },
    }, doc(path.join(tempDir, 'widget.ts')));
    await noteManager.updateNoteMetadata(beta.id, { type: 'context', tags: ['ui'] });

    const gamma = await noteManager.createNote({
      content: 'This handles authentication bypass hack',
      filePath: path.join(tempDir, 'auth.ts'),
      lineRange: { start: 5, end: 5 },
    }, doc(path.join(tempDir, 'auth.ts')));
    await noteManager.updateNoteMetadata(gamma.id, {
      type: 'todo',
      tags: ['security'],
      expiresAt: '2000-01-01T00:00:00.000Z', // in the past
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('finds notes by full-text query, excluding notes that do not match', async () => {
    // 'tokens' only appears in alpha's content
    const r = await searchNotes({ query: 'tokens' }, { noteManager });
    const notes: Note[] = JSON.parse(r.content[0].text);
    const contents = notes.map(n => n.content);
    expect(contents).toContain('This handles authentication tokens');
    expect(contents).not.toContain('This handles authentication for the dashboard widget');
  });

  it('filters by type', async () => {
    // Both alpha (warning) and beta (context) match 'authentication'; only beta should survive.
    const r = await searchNotes({ query: 'authentication', type: 'context' }, { noteManager });
    const notes: Note[] = JSON.parse(r.content[0].text);
    expect(notes.every(n => n.type === 'context')).toBe(true);
    expect(notes.some(n => n.content === 'This handles authentication for the dashboard widget')).toBe(true);
    expect(notes.some(n => n.content === 'This handles authentication tokens')).toBe(false);
  });

  it('filters by tags (any match)', async () => {
    // alpha has tags [security, auth], beta has [ui]; only beta should survive.
    const r = await searchNotes({ query: 'authentication', tags: ['ui'] }, { noteManager });
    const notes: Note[] = JSON.parse(r.content[0].text);
    expect(notes.every(n => n.tags?.includes('ui'))).toBe(true);
    expect(notes.some(n => n.content === 'This handles authentication tokens')).toBe(false);
  });

  it('excludes expired notes by default', async () => {
    const r = await searchNotes({ query: 'authentication' }, { noteManager });
    const notes: Note[] = JSON.parse(r.content[0].text);
    expect(notes.some(n => n.content === 'This handles authentication bypass hack')).toBe(false);
  });

  it('includes expired notes when includeExpired is true', async () => {
    const r = await searchNotes({ query: 'authentication', includeExpired: true }, { noteManager });
    const notes: Note[] = JSON.parse(r.content[0].text);
    expect(notes.some(n => n.content === 'This handles authentication bypass hack')).toBe(true);
  });

  it('filters by file (workspace-relative)', async () => {
    // alpha is in auth.ts, beta is in widget.ts; only beta should survive.
    const r = await searchNotes(
      { query: 'authentication', file: 'widget.ts' },
      { noteManager, workspace: tempDir },
    );
    const notes: Note[] = JSON.parse(r.content[0].text);
    expect(notes.every(n => n.filePath.endsWith('widget.ts'))).toBe(true);
    expect(notes.some(n => n.content === 'This handles authentication tokens')).toBe(false);
    expect(notes.length).toBeGreaterThan(0);
  });

  it('does not match a file filter mid-filename (path-boundary aware)', async () => {
    // 'th.ts' is a suffix of 'auth.ts' but not a path-boundary match, so it must not match.
    const r = await searchNotes(
      { query: 'authentication', file: 'th.ts' },
      { noteManager, workspace: tempDir },
    );
    const notes: Note[] = JSON.parse(r.content[0].text);
    expect(notes.some(n => n.filePath.endsWith('auth.ts'))).toBe(false);
  });
});
