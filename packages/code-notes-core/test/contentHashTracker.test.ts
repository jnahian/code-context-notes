/**
 * Unit tests for ContentHashTracker
 * Tests content hashing, normalization, and content finding
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentHashTracker } from '../src/contentHashTracker.js';
import { LineRange, NoteDocument } from '../src/types.js';

describe('ContentHashTracker Test Suite', () => {
	let tracker: ContentHashTracker;

	beforeEach(() => {
		tracker = new ContentHashTracker();
	});

	describe('Content Hashing', () => {
		it('should generate consistent hash for same content', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const hash1 = tracker.generateHash(doc, range);
			const hash2 = tracker.generateHash(doc, range);

			expect(hash1).toBe(hash2);
		});

		it('should generate different hashes for different content', async () => {
			const content1 = 'function test1() {\n  return true;\n}';
			const content2 = 'function test2() {\n  return false;\n}';

			const doc1 = createMockDocument(content1);
			const doc2 = createMockDocument(content2);
			const range: LineRange = { start: 0, end: 2 };

			const hash1 = tracker.generateHash(doc1, range);
			const hash2 = tracker.generateHash(doc2, range);

			expect(hash1).not.toBe(hash2);
		});

		it('should normalize whitespace before hashing', async () => {
			const content1 = 'function test() {\n  return true;\n}';
			const content2 = 'function test() {\n    return true;\n}'; // Extra spaces

			const doc1 = createMockDocument(content1);
			const doc2 = createMockDocument(content2);
			const range: LineRange = { start: 0, end: 2 };

			const hash1 = tracker.generateHash(doc1, range);
			const hash2 = tracker.generateHash(doc2, range);

			// Should be same after normalization
			expect(hash1).toBe(hash2);
		});

		it('should handle empty lines in content', async () => {
			const content = 'function test() {\n\n  return true;\n}';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 0, end: 3 };

			const hash = tracker.generateHash(doc, range);
			expect(hash).toBeTruthy();
			expect(typeof hash).toBe('string');
		});
	});

	describe('Content Extraction', () => {
		it('should extract content for valid range', async () => {
			const content = 'line 1\nline 2\nline 3';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const extracted = tracker.getContentForRange(doc, range);
			expect(extracted).toBe(content);
		});

		it('should extract single line', async () => {
			const content = 'line 1\nline 2\nline 3';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 1, end: 1 };

			const extracted = tracker.getContentForRange(doc, range);
			expect(extracted).toBe('line 2');
		});

		it('should handle range at document boundaries', async () => {
			const content = 'line 1\nline 2\nline 3';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const extracted = tracker.getContentForRange(doc, range);
			expect(extracted).toBe(content);
		});

		it('should handle out-of-bounds range gracefully', async () => {
			const content = 'line 1\nline 2';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 0, end: 10 }; // Beyond document

			const extracted = tracker.getContentForRange(doc, range);
			expect(extracted).toBeTruthy(); // Should not throw
		});
	});

	describe('Content Finding', () => {
		it('should find content at original location', async () => {
			const content = 'line 1\nfunction test() {\n  return true;\n}\nline 5';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 1, end: 3 };
			const hash = tracker.generateHash(doc, range);

			const result = await tracker.findContentByHash(doc, hash, range);

			expect(result.found).toBe(true);
			expect(result.newLineRange).toEqual(range);
			expect(result.similarity).toBe(1.0);
		});

		it('should find content when moved to different location', async () => {
			const originalContent = 'line 1\nfunction test() {\n  return true;\n}\nline 5';
			const originalDoc = createMockDocument(originalContent);
			const originalRange: LineRange = { start: 1, end: 3 };
			const hash = tracker.generateHash(originalDoc, originalRange);

			// Content moved down by 2 lines
			const newContent = 'line 1\nline 2\nline 3\nfunction test() {\n  return true;\n}\nline 7';
			const newDoc = createMockDocument(newContent);

			const result = await tracker.findContentByHash(newDoc, hash, originalRange);

			expect(result.found).toBe(true);
			expect(result.newLineRange).toEqual({ start: 3, end: 5 });
			expect(result.similarity).toBe(1.0);
		});

		it('should return not found when content deleted', async () => {
			const originalContent = 'line 1\nfunction test() {\n  return true;\n}\nline 5';
			const originalDoc = createMockDocument(originalContent);
			const originalRange: LineRange = { start: 1, end: 3 };
			const hash = tracker.generateHash(originalDoc, originalRange);

			// Content removed
			const newContent = 'line 1\nline 5';
			const newDoc = createMockDocument(newContent);

			const result = await tracker.findContentByHash(newDoc, hash, originalRange);

			expect(result.found).toBe(false);
		});
	});

	describe('Content Validation', () => {
		it('should validate matching content hash', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };
			const hash = tracker.generateHash(doc, range);

			const isValid = tracker.validateContentHash(doc, range, hash);
			expect(isValid).toBe(true);
		});

		it('should invalidate non-matching content hash', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const isValid = tracker.validateContentHash(doc, range, 'wrong-hash');
			expect(isValid).toBe(false);
		});
	});

	describe('Current Hash', () => {
		it('should get current hash for range', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const hash = tracker.getCurrentHash(doc, range);
			expect(hash).toBeTruthy();
			expect(typeof hash).toBe('string');
			expect(hash.length).toBe(64); // SHA-256 hex length
		});
	});

	describe('Content Change Detection', () => {
		it('should detect unchanged content', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };
			const hash = tracker.generateHash(doc, range);

			const hasChanged = await tracker.hasContentChangedSignificantly(doc, range, hash);
			expect(hasChanged).toBe(false);
		});

		it('should detect changed content', async () => {
			const originalContent = 'function test() {\n  return true;\n}';
			const originalDoc = createMockDocument(originalContent);
			const range: LineRange = { start: 0, end: 2 };
			const originalHash = tracker.generateHash(originalDoc, range);

			const newContent = 'function test() {\n  return false;\n}'; // Changed
			const newDoc = createMockDocument(newContent);

			const hasChanged = await tracker.hasContentChangedSignificantly(newDoc, range, originalHash);
			expect(hasChanged).toBe(true);
		});
	});
});

/**
 * Helper function to create a mock document satisfying NoteDocument
 */
function createMockDocument(content: string): NoteDocument {
	const lines = content.split('\n');

	return {
		lineCount: lines.length,
		lineAt: (line: number) => ({ text: lines[line] || '' }),
		uri: { fsPath: '/test/file.ts' },
	};
}
