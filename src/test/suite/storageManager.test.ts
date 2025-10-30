/**
 * Unit tests for StorageManager
 * Tests all CRUD operations, markdown serialization/deserialization,
 * and edge cases
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { StorageManager } from '../../storageManager.js';
import { Note } from '../../types.js';

suite('StorageManager Test Suite', () => {
	let tempDir: string;
	let storageManager: StorageManager;
	let testNote: Note;

	setup(async () => {
		// Create a temporary directory for tests
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-notes-test-'));
		storageManager = new StorageManager(tempDir, '.test-notes');

		// Create a test note
		testNote = {
			id: 'test-note-id-123',
			content: 'This is a test note',
			author: 'Test Author',
			filePath: '/path/to/test/file.ts',
			lineRange: { start: 10, end: 15 },
			contentHash: 'abc123hash',
			createdAt: '2025-01-01T00:00:00.000Z',
			updatedAt: '2025-01-01T00:00:00.000Z',
			isDeleted: false,
			history: [
				{
					content: 'Initial note content',
					author: 'Test Author',
					timestamp: '2025-01-01T00:00:00.000Z',
					action: 'created'
				}
			]
		};
	});

	teardown(async () => {
		// Clean up temp directory after each test
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch (error) {
			console.error('Failed to clean up temp directory:', error);
		}
	});

	test('getNoteFilePath should return correct file path', () => {
		const filePath = storageManager.getNoteFilePath('abc123');
		const expected = path.join(tempDir, '.test-notes', 'abc123.md');
		assert.strictEqual(filePath, expected);
	});

	test('storageExists should return false when storage does not exist', async () => {
		const exists = await storageManager.storageExists();
		assert.strictEqual(exists, false);
	});

	test('createStorage should create storage directory', async () => {
		await storageManager.createStorage();
		const exists = await storageManager.storageExists();
		assert.strictEqual(exists, true);
	});

	test('saveNote should create storage and save note file', async () => {
		await storageManager.saveNote(testNote);

		// Verify file exists (now named by note ID)
		const filePath = storageManager.getNoteFilePath(testNote.id);
		const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
		assert.strictEqual(fileExists, true);

		// Verify file content is markdown
		const content = await fs.readFile(filePath, 'utf-8');
		assert.ok(content.includes('# Code Context Note'));
		assert.ok(content.includes(testNote.filePath));
		assert.ok(content.includes(testNote.id));
		assert.ok(content.includes(testNote.content));
	});

	test('loadNoteById should load saved note', async () => {
		await storageManager.saveNote(testNote);
		const loadedNote = await storageManager.loadNoteById(testNote.id);

		assert.ok(loadedNote);
		assert.strictEqual(loadedNote!.id, testNote.id);
		assert.strictEqual(loadedNote!.content, testNote.content);
		assert.strictEqual(loadedNote!.author, testNote.author);
		assert.strictEqual(loadedNote!.filePath, testNote.filePath);
		assert.strictEqual(loadedNote!.contentHash, testNote.contentHash);
		assert.strictEqual(loadedNote!.lineRange.start, testNote.lineRange.start);
		assert.strictEqual(loadedNote!.lineRange.end, testNote.lineRange.end);
		assert.strictEqual(loadedNote!.isDeleted, false);
	});

	test('loadNoteById should return null for non-existent note', async () => {
		const loadedNote = await storageManager.loadNoteById('nonexistent');
		assert.strictEqual(loadedNote, null);
	});

	test('loadNotes should return all notes for a file', async () => {
		// Create multiple notes for the same file
		const note1 = { ...testNote, contentHash: 'hash1', id: 'note1' };
		const note2 = { ...testNote, contentHash: 'hash2', id: 'note2' };
		const note3 = { ...testNote, contentHash: 'hash3', id: 'note3', filePath: '/different/file.ts' };

		await storageManager.saveNote(note1);
		await storageManager.saveNote(note2);
		await storageManager.saveNote(note3);

		// Load notes for the test file
		const notes = await storageManager.loadNotes(testNote.filePath);

		assert.strictEqual(notes.length, 2);
		assert.ok(notes.some(n => n.id === 'note1'));
		assert.ok(notes.some(n => n.id === 'note2'));
		assert.ok(!notes.some(n => n.id === 'note3'));
	});

	test('loadNotes should not return deleted notes', async () => {
		const deletedNote = { ...testNote, isDeleted: true };
		await storageManager.saveNote(deletedNote);

		const notes = await storageManager.loadNotes(testNote.filePath);
		assert.strictEqual(notes.length, 0);
	});

	test('loadNotes should return empty array when no notes exist', async () => {
		const notes = await storageManager.loadNotes('/some/file.ts');
		assert.strictEqual(notes.length, 0);
	});

	test('deleteNote should mark note as deleted', async () => {
		await storageManager.saveNote(testNote);
		await storageManager.deleteNote(testNote.id, testNote.filePath);

		// Load the note directly by ID to see if it's marked deleted
		const note = await storageManager.loadNoteById(testNote.id);
		assert.ok(note);
		assert.strictEqual(note!.isDeleted, true);

		// Verify history entry was added
		const lastHistoryEntry = note!.history[note!.history.length - 1];
		assert.strictEqual(lastHistoryEntry.action, 'deleted');
	});

	test('deleteNote should throw error for non-existent note', async () => {
		await assert.rejects(
			async () => await storageManager.deleteNote('nonexistent', '/some/file.ts'),
			/Note with id nonexistent not found/
		);
	});

	test('markdown serialization should preserve all note data', async () => {
		await storageManager.saveNote(testNote);
		const loadedNote = await storageManager.loadNoteById(testNote.id);

		assert.ok(loadedNote);
		assert.deepStrictEqual(loadedNote!.id, testNote.id);
		assert.deepStrictEqual(loadedNote!.content, testNote.content);
		assert.deepStrictEqual(loadedNote!.author, testNote.author);
		assert.deepStrictEqual(loadedNote!.filePath, testNote.filePath);
		assert.deepStrictEqual(loadedNote!.lineRange, testNote.lineRange);
		assert.deepStrictEqual(loadedNote!.contentHash, testNote.contentHash);
		assert.deepStrictEqual(loadedNote!.createdAt, testNote.createdAt);
		assert.deepStrictEqual(loadedNote!.updatedAt, testNote.updatedAt);
		assert.deepStrictEqual(loadedNote!.isDeleted, testNote.isDeleted);
		assert.strictEqual(loadedNote!.history.length, testNote.history.length);
	});

	test('markdown serialization should preserve history entries', async () => {
		const noteWithHistory: Note = {
			...testNote,
			history: [
				{
					content: 'First version',
					author: 'Author 1',
					timestamp: '2025-01-01T00:00:00.000Z',
					action: 'created'
				},
				{
					content: 'Second version',
					author: 'Author 2',
					timestamp: '2025-01-02T00:00:00.000Z',
					action: 'edited'
				},
				{
					content: 'Third version',
					author: 'Author 3',
					timestamp: '2025-01-03T00:00:00.000Z',
					action: 'edited'
				}
			]
		};

		await storageManager.saveNote(noteWithHistory);
		const loadedNote = await storageManager.loadNoteById(noteWithHistory.id);

		assert.ok(loadedNote);
		assert.strictEqual(loadedNote!.history.length, 3);
		assert.strictEqual(loadedNote!.history[0].content, 'First version');
		assert.strictEqual(loadedNote!.history[0].author, 'Author 1');
		assert.strictEqual(loadedNote!.history[0].action, 'created');
		assert.strictEqual(loadedNote!.history[1].content, 'Second version');
		assert.strictEqual(loadedNote!.history[2].content, 'Third version');
	});

	test('markdown serialization should handle special characters', async () => {
		const noteWithSpecialChars: Note = {
			...testNote,
			content: 'Content with **bold**, *italic*, `code`, and [links](http://example.com)',
			author: 'Author & Co.'
		};

		await storageManager.saveNote(noteWithSpecialChars);
		const loadedNote = await storageManager.loadNoteById(noteWithSpecialChars.id);

		assert.ok(loadedNote);
		assert.strictEqual(loadedNote!.content, noteWithSpecialChars.content);
		assert.strictEqual(loadedNote!.author, noteWithSpecialChars.author);
	});

	test('markdown serialization should handle multiline content', async () => {
		const noteWithMultiline: Note = {
			...testNote,
			content: 'Line 1\nLine 2\nLine 3\n\nLine 5 after blank line'
		};

		await storageManager.saveNote(noteWithMultiline);
		const loadedNote = await storageManager.loadNoteById(noteWithMultiline.id);

		assert.ok(loadedNote);
		assert.strictEqual(loadedNote!.content, noteWithMultiline.content);
	});

	test('markdown serialization should handle code blocks', async () => {
		const noteWithCodeBlock: Note = {
			...testNote,
			content: '```typescript\nfunction test() {\n  return true;\n}\n```'
		};

		await storageManager.saveNote(noteWithCodeBlock);
		const loadedNote = await storageManager.loadNoteById(noteWithCodeBlock.id);

		assert.ok(loadedNote);
		assert.strictEqual(loadedNote!.content, noteWithCodeBlock.content);
	});

	test('markdown serialization should handle lists', async () => {
		const noteWithLists: Note = {
			...testNote,
			content: '- Item 1\n- Item 2\n- Item 3\n\n1. Numbered 1\n2. Numbered 2'
		};

		await storageManager.saveNote(noteWithLists);
		const loadedNote = await storageManager.loadNoteById(noteWithLists.id);

		assert.ok(loadedNote);
		assert.strictEqual(loadedNote!.content, noteWithLists.content);
	});

	test('markdown serialization should handle empty history', async () => {
		const noteWithEmptyHistory: Note = {
			...testNote,
			history: []
		};

		await storageManager.saveNote(noteWithEmptyHistory);
		const loadedNote = await storageManager.loadNoteById(noteWithEmptyHistory.id);

		assert.ok(loadedNote);
		assert.strictEqual(loadedNote!.history.length, 0);
	});

	test('getAllNoteFiles should return all note files', async () => {
		await storageManager.saveNote({ ...testNote, id: 'note1' });
		await storageManager.saveNote({ ...testNote, id: 'note2' });
		await storageManager.saveNote({ ...testNote, id: 'note3' });

		const files = await storageManager.getAllNoteFiles();
		assert.strictEqual(files.length, 3);
	});

	test('getAllNoteFiles should return empty array when storage does not exist', async () => {
		const files = await storageManager.getAllNoteFiles();
		assert.strictEqual(files.length, 0);
	});

	test('saveNote should overwrite existing file', async () => {
		await storageManager.saveNote(testNote);

		// Update and save again (same note ID, so overwrites)
		const updatedNote = {
			...testNote,
			content: 'Updated content',
			updatedAt: '2025-01-02T00:00:00.000Z'
		};
		await storageManager.saveNote(updatedNote);

		const loadedNote = await storageManager.loadNoteById(testNote.id);
		assert.ok(loadedNote);
		assert.strictEqual(loadedNote!.content, 'Updated content');
		assert.strictEqual(loadedNote!.updatedAt, '2025-01-02T00:00:00.000Z');
	});

	test('markdown should include deleted status', async () => {
		const deletedNote = { ...testNote, isDeleted: true };
		await storageManager.saveNote(deletedNote);

		const filePath = storageManager.getNoteFilePath(deletedNote.id);
		const content = await fs.readFile(filePath, 'utf-8');

		assert.ok(content.includes('**Status:** DELETED'));
	});

	suite('Tag Serialization and Deserialization', () => {
		test('should save and load note with tags', async () => {
			const noteWithTags: Note = {
				...testNote,
				tags: ['TODO', 'BUG', 'authentication']
			};

			await storageManager.saveNote(noteWithTags);
			const loadedNote = await storageManager.loadNoteById(noteWithTags.id);

			assert.ok(loadedNote);
			assert.ok(loadedNote!.tags);
			assert.strictEqual(loadedNote!.tags!.length, 3);
			assert.ok(loadedNote!.tags!.includes('TODO'));
			assert.ok(loadedNote!.tags!.includes('BUG'));
			assert.ok(loadedNote!.tags!.includes('authentication'));
		});

		test('should preserve tag order', async () => {
			const noteWithTags: Note = {
				...testNote,
				tags: ['zebra', 'apple', 'middle']
			};

			await storageManager.saveNote(noteWithTags);
			const loadedNote = await storageManager.loadNoteById(noteWithTags.id);

			assert.ok(loadedNote);
			assert.deepStrictEqual(loadedNote!.tags, ['zebra', 'apple', 'middle']);
		});

		test('should handle note with single tag', async () => {
			const noteWithTag: Note = {
				...testNote,
				tags: ['TODO']
			};

			await storageManager.saveNote(noteWithTag);
			const loadedNote = await storageManager.loadNoteById(noteWithTag.id);

			assert.ok(loadedNote);
			assert.strictEqual(loadedNote!.tags!.length, 1);
			assert.strictEqual(loadedNote!.tags![0], 'TODO');
		});

		test('should handle note with empty tags array', async () => {
			const noteWithNoTags: Note = {
				...testNote,
				tags: []
			};

			await storageManager.saveNote(noteWithNoTags);
			const loadedNote = await storageManager.loadNoteById(noteWithNoTags.id);

			assert.ok(loadedNote);
			assert.ok(Array.isArray(loadedNote!.tags));
			assert.strictEqual(loadedNote!.tags!.length, 0);
		});

		test('should handle note with undefined tags', async () => {
			const noteWithUndefinedTags: Note = {
				...testNote,
				tags: undefined
			};

			await storageManager.saveNote(noteWithUndefinedTags);
			const loadedNote = await storageManager.loadNoteById(noteWithUndefinedTags.id);

			assert.ok(loadedNote);
			// Should be undefined or empty array after loading
			assert.ok(!loadedNote!.tags || loadedNote!.tags.length === 0);
		});

		test('should handle tags with special characters', async () => {
			const noteWithSpecialTags: Note = {
				...testNote,
				tags: ['tag-with-dash', 'tag_with_underscore', 'tag.with.dot', 'tag#123']
			};

			await storageManager.saveNote(noteWithSpecialTags);
			const loadedNote = await storageManager.loadNoteById(noteWithSpecialTags.id);

			assert.ok(loadedNote);
			assert.strictEqual(loadedNote!.tags!.length, 4);
			assert.ok(loadedNote!.tags!.includes('tag-with-dash'));
			assert.ok(loadedNote!.tags!.includes('tag_with_underscore'));
			assert.ok(loadedNote!.tags!.includes('tag.with.dot'));
			assert.ok(loadedNote!.tags!.includes('tag#123'));
		});

		test('should handle tags with spaces (trimmed)', async () => {
			const noteWithSpacedTags: Note = {
				...testNote,
				tags: ['tag with spaces', 'another tag']
			};

			await storageManager.saveNote(noteWithSpacedTags);
			const loadedNote = await storageManager.loadNoteById(noteWithSpacedTags.id);

			assert.ok(loadedNote);
			assert.strictEqual(loadedNote!.tags!.length, 2);
			assert.ok(loadedNote!.tags!.includes('tag with spaces'));
			assert.ok(loadedNote!.tags!.includes('another tag'));
		});

		test('should format tags in markdown correctly', async () => {
			const noteWithTags: Note = {
				...testNote,
				tags: ['TODO', 'BUG', 'custom']
			};

			await storageManager.saveNote(noteWithTags);
			const filePath = storageManager.getNoteFilePath(noteWithTags.id);
			const content = await fs.readFile(filePath, 'utf-8');

			assert.ok(content.includes('**Tags:** TODO, BUG, custom'));
		});

		test('should not include Tags line when no tags', async () => {
			const noteWithoutTags: Note = {
				...testNote,
				tags: []
			};

			await storageManager.saveNote(noteWithoutTags);
			const filePath = storageManager.getNoteFilePath(noteWithoutTags.id);
			const content = await fs.readFile(filePath, 'utf-8');

			// Should not have a Tags line
			const lines = content.split('\n');
			const tagsLine = lines.find(line => line.startsWith('**Tags:**'));
			assert.strictEqual(tagsLine, undefined);
		});

		test('should handle many tags', async () => {
			const manyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
			const noteWithManyTags: Note = {
				...testNote,
				tags: manyTags
			};

			await storageManager.saveNote(noteWithManyTags);
			const loadedNote = await storageManager.loadNoteById(noteWithManyTags.id);

			assert.ok(loadedNote);
			assert.strictEqual(loadedNote!.tags!.length, 20);
			for (let i = 0; i < 20; i++) {
				assert.ok(loadedNote!.tags!.includes(`tag${i}`));
			}
		});

		test('should handle tags with maximum length', async () => {
			const longTag = 'a'.repeat(50);
			const noteWithLongTag: Note = {
				...testNote,
				tags: [longTag, 'short']
			};

			await storageManager.saveNote(noteWithLongTag);
			const loadedNote = await storageManager.loadNoteById(noteWithLongTag.id);

			assert.ok(loadedNote);
			assert.strictEqual(loadedNote!.tags!.length, 2);
			assert.ok(loadedNote!.tags!.includes(longTag));
			assert.ok(loadedNote!.tags!.includes('short'));
		});
	});
});
