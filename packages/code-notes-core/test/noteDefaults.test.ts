/**
 * Unit tests for noteDefaults
 * Tests schema default application and expiry checking
 */

import { describe, it, expect } from 'vitest';
import { applyDefaults, isExpired } from '../src/noteDefaults.js';
import { Note } from '../src/types.js';

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

describe('noteDefaults', () => {
  it('applyDefaults fills all optional fields on a legacy note', () => {
    const filled = applyDefaults({ ...baseNote });
    expect(filled.type).toBe('context');
    expect(filled.scope).toBe('line');
    expect(filled.tags).toEqual([]);
    expect(filled.references).toEqual([]);
    expect(filled.priority).toBe('normal');
    expect(filled.authorType).toBe('human');
    expect(filled.expiresAt).toBeUndefined();
  });

  it('applyDefaults preserves explicitly set fields', () => {
    const filled = applyDefaults({
      ...baseNote,
      type: 'instruction',
      priority: 'high',
      tags: ['security'],
    });
    expect(filled.type).toBe('instruction');
    expect(filled.priority).toBe('high');
    expect(filled.tags).toEqual(['security']);
    expect(filled.scope).toBe('line'); // still defaulted
  });

  it('isExpired returns false when expiresAt is undefined', () => {
    expect(isExpired(baseNote, new Date('2099-01-01'))).toBe(false);
  });

  it('isExpired returns true when expiresAt is in the past', () => {
    const n = { ...baseNote, expiresAt: '2026-04-01T00:00:00Z' };
    expect(isExpired(n, new Date('2026-05-01T00:00:00Z'))).toBe(true);
  });

  it('isExpired returns false when expiresAt is in the future', () => {
    const n = { ...baseNote, expiresAt: '2026-06-01T00:00:00Z' };
    expect(isExpired(n, new Date('2026-05-01T00:00:00Z'))).toBe(false);
  });
});
