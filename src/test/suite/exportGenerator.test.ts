import * as assert from 'assert';
import { buildIndex, buildDigest } from '../../exportGenerator.js';
import { Note } from '../../types.js';

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

suite('exportGenerator', () => {
  test('buildIndex includes notes, byFile, byType, byTag', () => {
    const notes = [
      n({ id: 'a', filePath: '/ws/src/foo.ts', type: 'instruction', tags: ['security'] }),
      n({ id: 'b', filePath: '/ws/src/bar.ts', type: 'context' }),
    ];
    const idx = buildIndex(notes, '/ws');
    assert.strictEqual(idx.version, 1);
    assert.strictEqual(idx.workspaceRoot, '/ws');
    assert.strictEqual(idx.notes.length, 2);
    assert.deepStrictEqual(idx.byFile['src/foo.ts'], ['a']);
    assert.deepStrictEqual(idx.byFile['src/bar.ts'], ['b']);
    assert.deepStrictEqual(idx.byType['instruction'], ['a']);
    assert.deepStrictEqual(idx.byType['context'], ['b']);
    assert.deepStrictEqual(idx.byTag['security'], ['a']);
  });

  test('buildIndex marks expired notes', () => {
    const past = new Date('2025-01-01T00:00:00Z').toISOString();
    const idx = buildIndex(
      [n({ id: 'a', expiresAt: past })],
      '/ws',
      new Date('2026-05-01T00:00:00Z'),
    );
    assert.strictEqual(idx.notes[0].isExpired, true);
  });

  test('buildIndex output is deterministic for same input', () => {
    const notes = [
      n({ id: 'b', filePath: '/ws/b.ts' }),
      n({ id: 'a', filePath: '/ws/a.ts' }),
    ];
    const idx1 = buildIndex(notes, '/ws', new Date('2026-05-01T00:00:00Z'));
    const idx2 = buildIndex(notes, '/ws', new Date('2026-05-01T00:00:00Z'));
    assert.strictEqual(JSON.stringify(idx1), JSON.stringify(idx2));
  });

  test('buildDigest hoists instructions and warnings', () => {
    const notes = [
      n({ id: 'i', type: 'instruction', priority: 'high', content: 'do not bypass auth', filePath: '/ws/auth.ts', lineRange: { start: 41, end: 41 } }),
      n({ id: 'c', type: 'context', content: 'just background', filePath: '/ws/auth.ts' }),
    ];
    const md = buildDigest(notes, '/ws');
    const instructionPos = md.indexOf('do not bypass auth');
    const contextPos = md.indexOf('just background');
    assert.ok(instructionPos !== -1);
    assert.ok(contextPos !== -1);
    assert.ok(instructionPos < contextPos, 'instructions must appear before context');
  });

  test('buildDigest hoists open handoffs to a dedicated section', () => {
    const md = buildDigest(
      [n({ id: 'h', type: 'handoff', content: 'pick up here', author: 'claude-code', authorType: 'agent' })],
      '/ws',
    );
    assert.ok(md.includes('## Open handoffs'));
    assert.ok(md.includes('pick up here'));
  });
});
