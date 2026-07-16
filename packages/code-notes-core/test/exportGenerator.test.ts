import { describe, it, expect } from 'vitest';
import { buildIndex, buildDigest } from '../src/exportGenerator.js';
import { Note } from '../src/types.js';

const n = (overrides: Partial<Note>): Note => ({
  id: 'id',
  content: 'content',
  author: 'alice',
  filePath: '/ws/src/foo.ts',
  lineRange: { start: 0, end: 0 },
  contentHash: 'sha256:x',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  history: [],
  type: 'context',
  scope: 'line',
  tags: [],
  references: [],
  priority: 'normal',
  authorType: 'human',
  ...overrides,
});

describe('exportGenerator', () => {
  it('buildIndex contentPath honors a custom storage directory', () => {
    const idx = buildIndex([n({ id: 'a' })], '/ws', new Date('2026-05-01T00:00:00Z'), '.my-notes');
    expect(idx.notes[0].contentPath).toBe('.my-notes/a.md');
    // default stays .code-notes
    const idxDefault = buildIndex([n({ id: 'a' })], '/ws', new Date('2026-05-01T00:00:00Z'));
    expect(idxDefault.notes[0].contentPath).toBe('.code-notes/a.md');
  });

  it('buildIndex includes notes, byFile, byType, byTag', () => {
    const notes = [
      n({ id: 'a', filePath: '/ws/src/foo.ts', type: 'instruction', tags: ['security'] }),
      n({ id: 'b', filePath: '/ws/src/bar.ts', type: 'context' }),
    ];
    const idx = buildIndex(notes, '/ws');
    expect(idx.version).toBe(1);
    expect(idx.workspaceRoot).toBe('/ws');
    expect(idx.notes.length).toBe(2);
    expect(idx.byFile['src/foo.ts']).toEqual(['a']);
    expect(idx.byFile['src/bar.ts']).toEqual(['b']);
    expect(idx.byType['instruction']).toEqual(['a']);
    expect(idx.byType['context']).toEqual(['b']);
    expect(idx.byTag['security']).toEqual(['a']);
  });

  it('buildIndex marks expired notes', () => {
    const past = new Date('2025-01-01T00:00:00Z').toISOString();
    const idx = buildIndex(
      [n({ id: 'a', expiresAt: past })],
      '/ws',
      new Date('2026-05-01T00:00:00Z'),
    );
    expect(idx.notes[0].isExpired).toBe(true);
  });

  it('buildIndex output is deterministic for same input', () => {
    const notes = [
      n({ id: 'b', filePath: '/ws/b.ts' }),
      n({ id: 'a', filePath: '/ws/a.ts' }),
    ];
    const idx1 = buildIndex(notes, '/ws', new Date('2026-05-01T00:00:00Z'));
    const idx2 = buildIndex(notes, '/ws', new Date('2026-05-01T00:00:00Z'));
    expect(JSON.stringify(idx1)).toBe(JSON.stringify(idx2));
  });

  it('buildDigest hoists instructions and warnings', () => {
    const notes = [
      n({ id: 'i', type: 'instruction', priority: 'high', content: 'do not bypass auth', filePath: '/ws/auth.ts', lineRange: { start: 41, end: 41 } }),
      n({ id: 'c', type: 'context', content: 'just background', filePath: '/ws/auth.ts' }),
    ];
    const md = buildDigest(notes, '/ws');
    const instructionPos = md.indexOf('do not bypass auth');
    const contextPos = md.indexOf('just background');
    expect(instructionPos !== -1).toBe(true);
    expect(contextPos !== -1).toBe(true);
    expect(instructionPos < contextPos).toBe(true);
  });

  it('buildDigest hoists open handoffs to a dedicated section', () => {
    const md = buildDigest(
      [n({ id: 'h', type: 'handoff', content: 'pick up here', author: 'claude-code', authorType: 'agent' })],
      '/ws',
    );
    expect(md.includes('## Open handoffs')).toBe(true);
    expect(md.includes('pick up here')).toBe(true);
  });

  it('buildIndex surfaces passed-in errors', () => {
    const idx = buildIndex([], '/ws', undefined, undefined, [{ file: 'bad.md', message: 'broken' }]);
    expect(idx.errors).toEqual([{ file: 'bad.md', message: 'broken' }]);
  });
});
