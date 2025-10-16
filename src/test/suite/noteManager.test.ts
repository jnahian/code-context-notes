/**
 * Unit tests for NoteManager
 * Tests CRUD operations, caching, and note position updates
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as vscode from 'vscode';
import { NoteManager } from '../../noteManager';
import { StorageManager } from '../../storageManager';
import { ContentHashTracker } from '../../contentHashTracker';
import { GitIntegration } from '../../gitIntegration';
import { CreateNoteParams, UpdateNoteParams, LineRange } from '../../types';

suite('NoteManager Test Suite', () => {
	let tempDir: string;
	let noteManager: NoteManager;
	let storage: StorageManager;
	let hashTracker: ContentHashTracker;
	let gitIntegration: GitIntegration;

	setup(async () => {
		// Create temporary directory
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'note-manager-test-'));

		// Initialize components
		storage = new StorageManager(tempDir, '.test-notes');
		hashTracker = new ContentHashTracker();
		gitIntegration = new GitIntegration(tempDir, 'Test Author');
		noteManager = new NoteManager(storage, hashTracker, gitIntegration);
	});

	teardown(async () => {
		// Clean up
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch (error) {
			console.error('Failed to clean up temp directory:', error);
		}
	});

	suite('Note Creation', () => {
		test('should create a new note', async () => {
			const doc = await createMockDocument('function test() {\n  return true;\n}');
			const params: CreateNoteParams = {
				content: 'This is a test note',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 2 }
			};

			const note = await noteManager.createNote(params, doc);

			assert.ok(note.id);
			assert.strictEqual(note.content, 'This is a test note');
			assert.strictEqual(note.author, 'Test Author');
			assert.strictEqual(note.filePath, '/test/file.ts');
			assert.deepStrictEqual(note.lineRange, { start: 0, end: 2 });
			assert.ok(note.contentHash);
			assert.ok(note.createdAt);
			assert.ok(note.updatedAt);
			assert.strictEqual(note.isDeleted, false);
			assert.strictEqual(note.history.length, 1);
			assert.strictEqual(note.history[0].action, 'created');
		});

		test('should trim note content', async () => {
			const doc = await createMockDocument('function test() {}');
			const params: CreateNoteParams = {
				content: '  This is a test note  ',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 0 }
			};

			const note = await noteManager.createNote(params, doc);
			assert.strictEqual(note.content, 'This is a test note');
		});

		test('should use provided author if specified', async () => {
			const doc = await createMockDocument('function test() {}');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 0 },
				author: 'Custom Author'
			};

			const note = await noteManager.createNote(params, doc);
			assert.strictEqual(note.author, 'Custom Author');
		});

		test('should generate content hash', async () => {
			const doc = await createMockDocument('function test() {\n  return true;\n}');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 2 }
			};

			const note = await noteManager.createNote(params, doc);
			assert.ok(note.contentHash);
			assert.strictEqual(typeof note.contentHash, 'string');
			assert.strictEqual(note.contentHash.length, 64); // SHA-256 hex
		});

		test('should throw error for invalid line range', async () => {
			const doc = await createMockDocument('line 1\nline 2');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 10 } // Beyond document
			};

			await assert.rejects(
				async () => await noteManager.createNote(params, doc),
				/exceeds document line count/
			);
		});

		test('should throw error for negative line numbers', async () => {
			const doc = await createMockDocument('line 1\nline 2');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: -1, end: 1 }
			};

			await assert.rejects(
				async () => await noteManager.createNote(params, doc),
				/cannot contain negative numbers/
			);
		});

		test('should throw error for inverted line range', async () => {
			const doc = await createMockDocument('line 1\nline 2');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: 2, end: 0 } // Start > end
			};

			await assert.rejects(
				async () => await noteManager.createNote(params, doc),
				/start must be less than or equal to end/
			);
		});
	});

	suite('Note Updates', () => {
		test('should update an existing note', async () => {
			const doc = await createMockDocument('function test() {\n  return true;\n}');

			// Create note
			const createParams: CreateNoteParams = {
				content: 'Original content',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 2 }
			};
			const note = await noteManager.createNote(createParams, doc);

			// Update note
			const updateParams: UpdateNoteParams = {
				id: note.id,
				content: 'Updated content'
			};
			const updatedNote = await noteManager.updateNote(updateParams, doc);

			assert.strictEqual(updatedNote.id, note.id);
			assert.strictEqual(updatedNote.content, 'Updated content');
			assert.strictEqual(updatedNote.history.length, 2);
			assert.strictEqual(updatedNote.history[1].action, 'edited');
			assert.strictEqual(updatedNote.history[1].content, 'Updated content');
		});

		test('should trim updated content', async () => {
			const doc = await createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Original',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			const updatedNote = await noteManager.updateNote({
				id: note.id,
				content: '  Updated  '
			}, doc);

			assert.strictEqual(updatedNote.content, 'Updated');
		});

		test('should update timestamps', async () => {
			const doc = await createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Original',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			const originalUpdatedAt = note.updatedAt;

			// Wait a bit to ensure timestamp changes
			await new Promise(resolve => setTimeout(resolve, 10));

			const updatedNote = await noteManager.updateNote({
				id: note.id,
				content: 'Updated'
			}, doc);

			assert.notStrictEqual(updatedNote.updatedAt, originalUpdatedAt);
		});

		test('should throw error for non-existent note', async () => {
			const doc = await createMockDocument('function test() {}');

			await assert.rejects(
				async () => await noteManager.updateNote({
					id: 'non-existent-id',
					content: 'Updated'
				}, doc),
				/not found/
			);
		});

		test('should throw error when updating deleted note', async () => {
			const doc = await createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Original',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			// Delete the note
			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			// Try to update
			await assert.rejects(
				async () => await noteManager.updateNote({
					id: note.id,
					content: 'Updated'
				}, doc),
				/Cannot update deleted note/
			);
		});

		test('should use custom author if provided', async () => {
			const doc = await createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Original',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			const updatedNote = await noteManager.updateNote({
				id: note.id,
				content: 'Updated',
				author: 'Custom Author'
			}, doc);

			assert.strictEqual(updatedNote.history[1].author, 'Custom Author');
		});
	});

	suite('Note Deletion', () => {
		test('should soft delete a note', async () => {
			const doc = await createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			// Note should still exist but marked as deleted
			const allNotes = await noteManager.getAllNotesForFile(doc.uri.fsPath);
			const deletedNote = allNotes.find(n => n.id === note.id);

			assert.ok(deletedNote);
			assert.strictEqual(deletedNote!.isDeleted, true);
			assert.strictEqual(deletedNote!.history[deletedNote!.history.length - 1].action, 'deleted');
		});

		test('should not return deleted notes in getNotesForFile', async () => {
			const doc = await createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			const notes = await noteManager.getNotesForFile(doc.uri.fsPath);
			assert.strictEqual(notes.length, 0);
		});

		test('should throw error for non-existent note', async () => {
			await assert.rejects(
				async () => await noteManager.deleteNote('non-existent', '/test/file.ts'),
				/not found/
			);
		});

		test('should throw error when deleting already deleted note', async () => {
			const doc = await createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			await assert.rejects(
				async () => await noteManager.deleteNote(note.id, doc.uri.fsPath),
				/already deleted/
			);
		});
	});

	suite('Note Retrieval', () => {
		test('should get all notes for a file', async () => {
			const doc = await createMockDocument('line 1\nline 2\nline 3');

			await noteManager.createNote({
				content: 'Note 1',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.createNote({
				content: 'Note 2',
				filePath: doc.uri.fsPath,
				lineRange: { start: 1, end: 1 }
			}, doc);

			const notes = await noteManager.getNotesForFile(doc.uri.fsPath);
			assert.strictEqual(notes.length, 2);
		});

		test('should not return notes from different files', async () => {
			const doc1 = await createMockDocument('file 1');
			const doc2 = await createMockDocument('file 2');

			await noteManager.createNote({
				content: 'Note 1',
				filePath: doc1.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc1);

			await noteManager.createNote({
				content: 'Note 2',
				filePath: doc2.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc2);

			const notes1 = await noteManager.getNotesForFile(doc1.uri.fsPath);
			const notes2 = await noteManager.getNotesForFile(doc2.uri.fsPath);

			assert.strictEqual(notes1.length, 1);
			assert.strictEqual(notes2.length, 1);
			assert.notStrictEqual(notes1[0].id, notes2[0].id);
		});

		test('should get note by ID', async () => {
			const doc = await createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			const retrieved = await noteManager.getNoteById(note.id, doc.uri.fsPath);
			assert.ok(retrieved);
			assert.strictEqual(retrieved!.id, note.id);
		});

		test('should return undefined for non-existent note ID', async () => {
			const retrieved = await noteManager.getNoteById('non-existent', '/test/file.ts');
			assert.strictEqual(retrieved, undefined);
		});

		test('should return empty array for file with no notes', async () => {
			const notes = await noteManager.getNotesForFile('/test/file.ts');
			assert.strictEqual(notes.length, 0);
		});
	});

	suite('Caching', () => {
		test('should cache notes after first load', async () => {
			const doc = await createMockDocument('function test() {}');
			await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			// First call loads from storage
			const notes1 = await noteManager.getNotesForFile(doc.uri.fsPath);

			// Second call should use cache
			const notes2 = await noteManager.getNotesForFile(doc.uri.fsPath);

			assert.strictEqual(notes1.length, notes2.length);
			assert.strictEqual(notes1[0].id, notes2[0].id);
		});

		test('should clear cache for specific file', async () => {
			const doc = await createMockDocument('function test() {}');
			await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.getNotesForFile(doc.uri.fsPath);
			noteManager.clearCacheForFile(doc.uri.fsPath);

			// Should reload from storage
			const notes = await noteManager.getNotesForFile(doc.uri.fsPath);
			assert.ok(notes);
		});

		test('should clear all cache', async () => {
			const doc1 = await createMockDocument('file 1');
			const doc2 = await createMockDocument('file 2');

			await noteManager.createNote({
				content: 'Note 1',
				filePath: doc1.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc1);

			await noteManager.createNote({
				content: 'Note 2',
				filePath: doc2.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc2);

			await noteManager.getNotesForFile(doc1.uri.fsPath);
			await noteManager.getNotesForFile(doc2.uri.fsPath);

			noteManager.clearAllCache();

			// Should reload from storage
			const notes1 = await noteManager.getNotesForFile(doc1.uri.fsPath);
			const notes2 = await noteManager.getNotesForFile(doc2.uri.fsPath);

			assert.ok(notes1);
			assert.ok(notes2);
		});

		test('should refresh notes for file', async () => {
			const doc = await createMockDocument('function test() {}');
			await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			const notes1 = await noteManager.getNotesForFile(doc.uri.fsPath);
			const notes2 = await noteManager.refreshNotesForFile(doc.uri.fsPath);

			assert.strictEqual(notes1.length, notes2.length);
		});
	});

	suite('Note History', () => {
		test('should get note history', async () => {
			const doc = await createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Original',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.updateNote({
				id: note.id,
				content: 'Updated'
			}, doc);

			const history = await noteManager.getNoteHistory(note.id, doc.uri.fsPath);

			assert.strictEqual(history.length, 2);
			assert.strictEqual(history[0].action, 'created');
			assert.strictEqual(history[1].action, 'edited');
		});

		test('should throw error for non-existent note', async () => {
			await assert.rejects(
				async () => await noteManager.getNoteHistory('non-existent', '/test/file.ts'),
				/not found/
			);
		});
	});

	suite('Configuration', () => {
		test('should update configuration', () => {
			noteManager.updateConfiguration('New Author');
			// Configuration updated successfully (no error thrown)
			assert.ok(true);
		});
	});
});

/**
 * Helper function to create a mock VSCode document
 */
async function createMockDocument(content: string): Promise<vscode.TextDocument> {
	const lines = content.split('\n');
	const filePath = `/test/file-${Date.now()}.ts`;

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
		uri: vscode.Uri.file(filePath),
		fileName: filePath,
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
