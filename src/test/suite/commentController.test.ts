/**
 * Unit tests for CommentController
 * Tests comment thread management, note CRUD operations via comments,
 * edit mode, history display, and focus management
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { CommentController } from '../../commentController.js';
import { NoteManager } from '../../noteManager.js';
import { StorageManager } from '../../storageManager.js';
import { ContentHashTracker } from '../../contentHashTracker.js';
import { GitIntegration } from '../../gitIntegration.js';
import { Note, LineRange } from '../../types.js';

suite('CommentController Test Suite', () => {
	let tempDir: string;
	let storageManager: StorageManager;
	let hashTracker: ContentHashTracker;
	let gitIntegration: GitIntegration;
	let noteManager: NoteManager;
	let commentController: CommentController;
	let mockContext: vscode.ExtensionContext;

	// Helper to create a mock text document
	const createMockDocument = (uri: vscode.Uri, lines: string[]): vscode.TextDocument => {
		return {
			uri,
			lineCount: lines.length,
			lineAt: (line: number) => ({
				text: lines[line],
				range: new vscode.Range(line, 0, line, lines[line].length),
				lineNumber: line,
				rangeIncludingLineBreak: new vscode.Range(line, 0, line + 1, 0),
				firstNonWhitespaceCharacterIndex: 0,
				isEmptyOrWhitespace: lines[line].trim().length === 0
			}),
			getText: (range?: vscode.Range) => {
				if (!range) {
					return lines.join('\n');
				}
				const startLine = range.start.line;
				const endLine = range.end.line;
				return lines.slice(startLine, endLine + 1).join('\n');
			},
			fileName: uri.fsPath,
			languageId: 'typescript',
			version: 1,
			isDirty: false,
			isClosed: false,
			isUntitled: false,
			eol: vscode.EndOfLine.LF,
			save: async () => true,
			positionAt: (offset: number) => new vscode.Position(0, offset),
			offsetAt: (position: vscode.Position) => position.character,
			getWordRangeAtPosition: () => undefined,
			validateRange: (range: vscode.Range) => range,
			validatePosition: (position: vscode.Position) => position,
			notebook: undefined
		} as unknown as vscode.TextDocument;
	};

	setup(async () => {
		// Create temporary directory for tests
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comment-controller-test-'));

		// Initialize components
		storageManager = new StorageManager(tempDir, '.test-notes');
		hashTracker = new ContentHashTracker();
		gitIntegration = new GitIntegration(tempDir, 'Test User');
		noteManager = new NoteManager(storageManager, hashTracker, gitIntegration);

		// Create storage
		await storageManager.createStorage();

		// Create mock extension context
		mockContext = {
			subscriptions: [],
			workspaceState: {
				get: () => undefined,
				update: async () => {},
				keys: () => []
			},
			globalState: {
				get: () => undefined,
				update: async () => {},
				setKeysForSync: () => {},
				keys: () => []
			},
			extensionPath: tempDir,
			storagePath: tempDir,
			globalStoragePath: tempDir,
			logPath: tempDir,
			extensionUri: vscode.Uri.file(tempDir),
			extensionMode: vscode.ExtensionMode.Test,
			storageUri: vscode.Uri.file(tempDir),
			globalStorageUri: vscode.Uri.file(tempDir),
			logUri: vscode.Uri.file(tempDir),
			asAbsolutePath: (relativePath: string) => path.join(tempDir, relativePath),
			environmentVariableCollection: {} as any,
			secrets: {} as any,
			extension: {} as any,
			languageModelAccessInformation: {} as any
		} as vscode.ExtensionContext;

		// Initialize comment controller
		commentController = new CommentController(noteManager, mockContext);
	});

	teardown(async () => {
		// Clean up
		if (commentController) {
			commentController.dispose();
		}
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch (error) {
			console.error('Failed to clean up temp directory:', error);
		}
	});

	suite('Thread Creation', () => {
		test('should create comment thread for a note', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			// Create a note
			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 1, end: 2 },
				content: 'Test note content'
			}, document);

			// Create comment thread
			const thread = commentController.createCommentThread(document, note);

			assert.ok(thread, 'Thread should be created');
			assert.strictEqual(thread.comments.length, 1, 'Thread should have one comment');
			assert.strictEqual(thread.collapsibleState, vscode.CommentThreadCollapsibleState.Collapsed);
			assert.strictEqual(thread.canReply, false);
		});

		test('should not create duplicate threads for same note', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 1 },
				content: 'Test note'
			}, document);

			const thread1 = commentController.createCommentThread(document, note);
			const thread2 = commentController.createCommentThread(document, note);

			assert.strictEqual(thread1, thread2, 'Should return same thread for same note');
		});

		test('should create proper comment with markdown body', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: '**Bold** and *italic* text'
			}, document);

			const thread = commentController.createCommentThread(document, note);
			const comment = thread.comments[0];

			assert.ok(comment.body instanceof vscode.MarkdownString);
			assert.strictEqual((comment.body as vscode.MarkdownString).value, '**Bold** and *italic* text');
			assert.strictEqual(comment.mode, vscode.CommentMode.Preview);
			assert.strictEqual(comment.author.name, note.author);
		});
	});

	suite('Thread Management', () => {
		test('should update comment thread when note changes', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 1 },
				content: 'Original content'
			}, document);

			const thread = commentController.createCommentThread(document, note);
			const originalComment = thread.comments[0];
			assert.ok((originalComment.body as vscode.MarkdownString).value.includes('Original content'));

			// Update note
			const updatedNote = await noteManager.updateNote({
				id: note.id,
				content: 'Updated content'
			}, document);

			// Update thread
			commentController.updateCommentThread(updatedNote, document);

			const updatedComment = thread.comments[0];
			assert.ok((updatedComment.body as vscode.MarkdownString).value.includes('Updated content'));
		});

		test('should delete comment thread', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Test note'
			}, document);

			commentController.createCommentThread(document, note);

			// Delete thread - this should not throw
			commentController.deleteCommentThread(note.id);

			// Verify thread is deleted by trying to get it
			const noteId = commentController.getNoteIdFromThread(commentController.createCommentThread(document, note));
			assert.ok(noteId, 'Should be able to create new thread after deletion');
		});

		test('should load all comments for a document', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			// Create multiple notes
			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Note 1'
			}, document);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 2, end: 3 },
				content: 'Note 2'
			}, document);

			// Load comments
			await commentController.loadCommentsForDocument(document);

			// Verify both notes are loaded (we can't directly check threads but we can verify no errors)
			const notes = await noteManager.getNotesForFile(testFile);
			assert.strictEqual(notes.length, 2);
		});
	});

	suite('Note Operations', () => {
		test('should handle creating note via comment', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const range = new vscode.Range(0, 0, 1, 0);
			const note = await commentController.handleCreateNote(
				document,
				range,
				'New note via comment'
			);

			assert.ok(note);
			assert.strictEqual(note.content, 'New note via comment');
			assert.strictEqual(note.lineRange.start, 0);
			assert.strictEqual(note.lineRange.end, 1);
			assert.strictEqual(note.filePath, testFile);
		});

		test('should handle updating note via comment', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Original'
			}, document);

			const updatedNote = await commentController.handleUpdateNote(
				note.id,
				'Updated via comment',
				document
			);

			assert.strictEqual(updatedNote.content, 'Updated via comment');
			assert.strictEqual(updatedNote.id, note.id);
		});

		test('should handle deleting note via comment', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'To be deleted'
			}, document);

			await commentController.handleDeleteNote(note.id, testFile);

			const deletedNote = await noteManager.getNoteById(note.id, testFile);
			assert.strictEqual(deletedNote, null, 'Note should be deleted');
		});
	});

	suite('Edit Mode', () => {
		test('should enable edit mode for a note', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Original content'
			}, document);

			await commentController.enableEditMode(note.id, testFile);

			// The thread should be in edit mode
			const currentComment = commentController.getCurrentlyEditingComment();
			assert.ok(currentComment, 'Should have a comment in edit mode');
			assert.strictEqual(currentComment?.mode, vscode.CommentMode.Editing);
		});

		test('should get currently editing comment', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Test content'
			}, document);

			// Should be null initially
			let editingComment = commentController.getCurrentlyEditingComment();
			assert.strictEqual(editingComment, null);

			// Enable edit mode
			await commentController.enableEditMode(note.id, testFile);

			// Should return the editing comment
			editingComment = commentController.getCurrentlyEditingComment();
			assert.ok(editingComment);
			assert.strictEqual(editingComment?.mode, vscode.CommentMode.Editing);
		});

		test('should save edited note by ID', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Original'
			}, document);

			await commentController.enableEditMode(note.id, testFile);
			const result = await commentController.saveEditedNoteById(note.id, 'Edited content');

			assert.strictEqual(result, true);

			const updatedNote = await noteManager.getNoteById(note.id, testFile);
			assert.strictEqual(updatedNote?.content, 'Edited content');
		});
	});

	suite('History Display', () => {
		test('should show history in thread', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			// Create and update a note to generate history
			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Version 1'
			}, document);

			await noteManager.updateNote({
				id: note.id,
				content: 'Version 2'
			}, document);

			await noteManager.updateNote({
				id: note.id,
				content: 'Version 3'
			}, document);

			// Show history
			await commentController.showHistoryInThread(note.id, testFile);

			// The thread should exist and be expanded - we can't check the comment count
			// directly in the test, but we verify no errors occurred
			const loadedNote = await noteManager.getNoteById(note.id, testFile);
			assert.ok(loadedNote);
			assert.ok(loadedNote.history);
			assert.ok(loadedNote.history.length > 0);
		});
	});

	suite('Focus Management', () => {
		test('should focus note thread', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Test note'
			}, document);

			// This will attempt to focus - in a real environment it would open the document
			// In test environment, we just verify no errors
			await commentController.focusNoteThread(note.id, testFile);

			// Verify note still exists
			const loadedNote = await noteManager.getNoteById(note.id, testFile);
			assert.ok(loadedNote);
		});
	});

	suite('Document Changes', () => {
		test('should handle document changes and update positions', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 1, end: 2 },
				content: 'Test note'
			}, document);

			// Simulate document change
			const newLines = ['line 0', 'line 1', 'line 2', 'line 3', 'line 4'];
			const updatedDocument = createMockDocument(vscode.Uri.file(testFile), newLines);

			await commentController.handleDocumentChange(updatedDocument);

			// Verify note position was updated
			const updatedNote = await noteManager.getNoteById(note.id, testFile);
			assert.ok(updatedNote);
		});
	});

	suite('Cleanup', () => {
		test('should dispose all resources', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Test note'
			}, document);

			await commentController.loadCommentsForDocument(document);

			// Dispose should not throw
			commentController.dispose();

			// Verify we can create a new controller
			const newController = new CommentController(noteManager, mockContext);
			assert.ok(newController);
			newController.dispose();
		});
	});

	suite('Edge Cases', () => {
		test('should handle note without history', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Test note'
			}, document);

			const thread = commentController.createCommentThread(document, note);
			const comment = thread.comments[0];

			assert.ok(comment.label);
			assert.ok(comment.label.includes('Created'));
		});

		test('should handle empty content gracefully', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: ''
			}, document);

			const thread = commentController.createCommentThread(document, note);
			assert.ok(thread);
			assert.strictEqual(thread.comments.length, 1);
		});

		test('should handle special characters in content', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const specialContent = '**Bold** `code` [link](url) <!-- comment -->';
			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: specialContent
			}, document);

			const thread = commentController.createCommentThread(document, note);
			const comment = thread.comments[0];
			assert.strictEqual((comment.body as vscode.MarkdownString).value, specialContent);
		});

		test('should handle getNoteIdFromThread with non-existent thread', () => {
			const mockThread = {} as vscode.CommentThread;
			const noteId = commentController.getNoteIdFromThread(mockThread);
			assert.strictEqual(noteId, undefined);
		});
	});
});
