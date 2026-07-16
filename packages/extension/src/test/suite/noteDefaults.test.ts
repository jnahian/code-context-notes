/**
 * Unit tests for noteDefaults
 * Tests schema default application and expiry checking
 */

import * as assert from 'assert';
import { applyDefaults, isExpired } from '../../noteDefaults.js';
import { Note } from '../../types.js';

const baseNote: Note = {
  id: 'n1',
  content: 'hi',
  author: 'alice',
  filePath: '/abs/foo.ts',
  lineRange: { start: 0, end: 0 },
  contentHash: 'sha256:abc',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  history: [],
};

suite('noteDefaults', () => {
  test('applyDefaults fills all optional fields on a legacy note', () => {
    const filled = applyDefaults({ ...baseNote });
    assert.strictEqual(filled.type, 'context');
    assert.strictEqual(filled.scope, 'line');
    assert.deepStrictEqual(filled.tags, []);
    assert.deepStrictEqual(filled.references, []);
    assert.strictEqual(filled.priority, 'normal');
    assert.strictEqual(filled.authorType, 'human');
    assert.strictEqual(filled.expiresAt, undefined);
  });

  test('applyDefaults preserves explicitly set fields', () => {
    const filled = applyDefaults({
      ...baseNote,
      type: 'instruction',
      priority: 'high',
      tags: ['security'],
    });
    assert.strictEqual(filled.type, 'instruction');
    assert.strictEqual(filled.priority, 'high');
    assert.deepStrictEqual(filled.tags, ['security']);
    assert.strictEqual(filled.scope, 'line'); // still defaulted
  });

  test('isExpired returns false when expiresAt is undefined', () => {
    assert.strictEqual(isExpired(baseNote, new Date('2099-01-01')), false);
  });

  test('isExpired returns true when expiresAt is in the past', () => {
    const n = { ...baseNote, expiresAt: '2026-04-01T00:00:00Z' };
    assert.strictEqual(isExpired(n, new Date('2026-05-01T00:00:00Z')), true);
  });

  test('isExpired returns false when expiresAt is in the future', () => {
    const n = { ...baseNote, expiresAt: '2026-06-01T00:00:00Z' };
    assert.strictEqual(isExpired(n, new Date('2026-05-01T00:00:00Z')), false);
  });
});
