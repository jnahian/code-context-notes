/**
 * Unit tests for ContentHashTracker
 * Tests content hashing, normalization, and content finding
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ContentHashTracker } from '../../contentHashTracker';
import { LineRange } from '../../types';

suite('ContentHashTracker Test Suite', () => {
	let tracker: ContentHashTracker;

	setup(() => {
		tracker = new ContentHashTracker();
	});

	suite('Content Hashing', () => {
		test('should generate consistent hash for same content', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const hash1 = tracker.generateHash(doc, range);
			const hash2 = tracker.generateHash(doc, range);

			assert.strictEqual(hash1, hash2);
		});

		test('should generate different hashes for different content', async () => {
			const content1 = 'function test1() {\n  return true;\n}';
			const content2 = 'function test2() {\n  return false;\n}';

			const doc1 = await createMockDocument(content1);
			const doc2 = await createMockDocument(content2);
			const range: LineRange = { start: 0, end: 2 };

			const hash1 = tracker.generateHash(doc1, range);
			const hash2 = tracker.generateHash(doc2, range);

			assert.notStrictEqual(hash1, hash2);
		});

		test('should normalize whitespace before hashing', async () => {
			const content1 = 'function test() {\n  return true;\n}';
			const content2 = 'function test() {\n    return true;\n}'; // Extra spaces

			const doc1 = await createMockDocument(content1);
			const doc2 = await createMockDocument(content2);
			const range: LineRange = { start: 0, end: 2 };

			const hash1 = tracker.generateHash(doc1, range);
			const hash2 = tracker.generateHash(doc2, range);

			// Should be same after normalization
			assert.strictEqual(hash1, hash2);
		});

		test('should handle empty lines in content', async () => {
			const content = 'function test() {\n\n  return true;\n}';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 0, end: 3 };

			const hash = tracker.generateHash(doc, range);
			assert.ok(hash);
			assert.strictEqual(typeof hash, 'string');
		});
	});

	suite('Content Extraction', () => {
		test('should extract content for valid range', async () => {
			const content = 'line 1\nline 2\nline 3';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const extracted = tracker.getContentForRange(doc, range);
			assert.strictEqual(extracted, content);
		});

		test('should extract single line', async () => {
			const content = 'line 1\nline 2\nline 3';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 1, end: 1 };

			const extracted = tracker.getContentForRange(doc, range);
			assert.strictEqual(extracted, 'line 2');
		});

		test('should handle range at document boundaries', async () => {
			const content = 'line 1\nline 2\nline 3';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const extracted = tracker.getContentForRange(doc, range);
			assert.strictEqual(extracted, content);
		});

		test('should handle out-of-bounds range gracefully', async () => {
			const content = 'line 1\nline 2';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 0, end: 10 }; // Beyond document

			const extracted = tracker.getContentForRange(doc, range);
			assert.ok(extracted); // Should not throw
		});
	});

	suite('Content Finding', () => {
		test('should find content at original location', async () => {
			const content = 'line 1\nfunction test() {\n  return true;\n}\nline 5';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 1, end: 3 };
			const hash = tracker.generateHash(doc, range);

			const result = await tracker.findContentByHash(doc, hash, range);

			assert.strictEqual(result.found, true);
			assert.deepStrictEqual(result.newLineRange, range);
			assert.strictEqual(result.similarity, 1.0);
		});

		test('should find content when moved to different location', async () => {
			const originalContent = 'line 1\nfunction test() {\n  return true;\n}\nline 5';
			const originalDoc = await createMockDocument(originalContent);
			const originalRange: LineRange = { start: 1, end: 3 };
			const hash = tracker.generateHash(originalDoc, originalRange);

			// Content moved down by 2 lines
			const newContent = 'line 1\nline 2\nline 3\nfunction test() {\n  return true;\n}\nline 7';
			const newDoc = await createMockDocument(newContent);

			const result = await tracker.findContentByHash(newDoc, hash, originalRange);

			assert.strictEqual(result.found, true);
			assert.deepStrictEqual(result.newLineRange, { start: 3, end: 5 });
			assert.strictEqual(result.similarity, 1.0);
		});

		test('should return not found when content deleted', async () => {
			const originalContent = 'line 1\nfunction test() {\n  return true;\n}\nline 5';
			const originalDoc = await createMockDocument(originalContent);
			const originalRange: LineRange = { start: 1, end: 3 };
			const hash = tracker.generateHash(originalDoc, originalRange);

			// Content removed
			const newContent = 'line 1\nline 5';
			const newDoc = await createMockDocument(newContent);

			const result = await tracker.findContentByHash(newDoc, hash, originalRange);

			assert.strictEqual(result.found, false);
		});
	});

	suite('Content Validation', () => {
		test('should validate matching content hash', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };
			const hash = tracker.generateHash(doc, range);

			const isValid = tracker.validateContentHash(doc, range, hash);
			assert.strictEqual(isValid, true);
		});

		test('should invalidate non-matching content hash', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const isValid = tracker.validateContentHash(doc, range, 'wrong-hash');
			assert.strictEqual(isValid, false);
		});
	});

	suite('Current Hash', () => {
		test('should get current hash for range', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };

			const hash = tracker.getCurrentHash(doc, range);
			assert.ok(hash);
			assert.strictEqual(typeof hash, 'string');
			assert.strictEqual(hash.length, 64); // SHA-256 hex length
		});
	});

	suite('Content Change Detection', () => {
		test('should detect unchanged content', async () => {
			const content = 'function test() {\n  return true;\n}';
			const doc = await createMockDocument(content);
			const range: LineRange = { start: 0, end: 2 };
			const hash = tracker.generateHash(doc, range);

			const hasChanged = await tracker.hasContentChangedSignificantly(doc, range, hash);
			assert.strictEqual(hasChanged, false);
		});

		test('should detect changed content', async () => {
			const originalContent = 'function test() {\n  return true;\n}';
			const originalDoc = await createMockDocument(originalContent);
			const range: LineRange = { start: 0, end: 2 };
			const originalHash = tracker.generateHash(originalDoc, range);

			const newContent = 'function test() {\n  return false;\n}'; // Changed
			const newDoc = await createMockDocument(newContent);

			const hasChanged = await tracker.hasContentChangedSignificantly(newDoc, range, originalHash);
			assert.strictEqual(hasChanged, true);
		});
	});
});

/**
 * Helper function to create a mock VSCode document
 */
async function createMockDocument(content: string): Promise<vscode.TextDocument> {
	const lines = content.split('\n');

	return {
		lineCount: lines.length,
		lineAt: (lineOrPosition: number | vscode.Position) => {
			const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
			return {
				text: lines[line] || '',
				lineNumber: line,
				range: new vscode.Range(line, 0, line, (lines[line] || '').length),
				rangeIncludingLineBreak: new vscode.Range(line, 0, line, (lines[line] || '').length),
				firstNonWhitespaceCharacterIndex: 0,
				isEmptyOrWhitespace: (lines[line] || '').trim().length === 0
			};
		},
		getText: (range?: vscode.Range) => {
			if (!range) {
				return content;
			}
			const start = range.start.line;
			const end = range.end.line;
			return lines.slice(start, end + 1).join('\n');
		},
		uri: vscode.Uri.file('/test/file.ts'),
		fileName: '/test/file.ts',
		isUntitled: false,
		languageId: 'typescript',
		version: 1,
		isDirty: false,
		isClosed: false,
		save: async () => true,
		eol: vscode.EndOfLine.LF,
		encoding: 'utf8',
		positionAt: (offset: number) => new vscode.Position(0, offset),
		offsetAt: (position: vscode.Position) => position.character,
		validateRange: (range: vscode.Range) => range,
		validatePosition: (position: vscode.Position) => position,
		getWordRangeAtPosition: () => undefined
	} as vscode.TextDocument;
}
