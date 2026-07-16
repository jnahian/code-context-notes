import { describe, it, expect } from 'vitest';
import { resolveDirectoryScopedNotes } from '../src/scopeResolver.js';
import type { Note } from '../src/types.js';

const note = (overrides: Partial<Note>): Note => ({
  id: 'n', content: 'c', author: 'a',
  filePath: '/ws/src/auth.ts', lineRange: { start: 0, end: 0 },
  contentHash: 'sha256:x', createdAt: '', updatedAt: '', history: [],
  ...overrides,
});

describe('resolveDirectoryScopedNotes', () => {
  it('returns directory-scoped notes whose path is a prefix of target', () => {
    const all = [
      note({ id: 'dir-src', filePath: '/ws/src', scope: 'directory' }),
      note({ id: 'dir-other', filePath: '/ws/other', scope: 'directory' }),
      note({ id: 'line', filePath: '/ws/src/auth.ts', scope: 'line' }),
    ];
    const matched = resolveDirectoryScopedNotes(all, '/ws/src/auth.ts', '/ws');
    expect(matched.map(n => n.id)).toEqual(['dir-src']);
  });

  it('ranks closer ancestors higher', () => {
    const all = [
      note({ id: 'dir-ws', filePath: '/ws', scope: 'directory' }),
      note({ id: 'dir-src', filePath: '/ws/src', scope: 'directory' }),
      note({ id: 'dir-src-db', filePath: '/ws/src/db', scope: 'directory' }),
    ];
    const matched = resolveDirectoryScopedNotes(all, '/ws/src/db/user.ts', '/ws');
    expect(matched.map(n => n.id)).toEqual(['dir-src-db', 'dir-src', 'dir-ws']);
  });

  it('returns [] for non-workspace files', () => {
    const all = [note({ id: 'dir-src', filePath: '/ws/src', scope: 'directory' })];
    const matched = resolveDirectoryScopedNotes(all, '/elsewhere/foo.ts', '/ws');
    expect(matched).toEqual([]);
  });
});
