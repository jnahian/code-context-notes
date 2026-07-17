/**
 * Unit tests for StorageManager
 * Tests all CRUD operations, markdown serialization/deserialization,
 * and edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { StorageManager } from '../src/storageManager.js';
import { Note } from '../src/types.js';

describe('StorageManager Test Suite', () => {
	let tempDir: string;
	let storageManager: StorageManager;
	let testNote: Note;

	beforeEach(async () => {
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

	afterEach(async () => {
		// Clean up temp directory after each test
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch (error) {
			console.error('Failed to clean up temp directory:', error);
		}
	});

	it('getNoteFilePath should return correct file path', () => {
		const filePath = storageManager.getNoteFilePath('abc123');
		const expected = path.join(tempDir, '.test-notes', 'abc123.md');
		expect(filePath).toBe(expected);
	});

	it('storageExists should return false when storage does not exist', async () => {
		const exists = await storageManager.storageExists();
		expect(exists).toBe(false);
	});

	it('createStorage should create storage directory', async () => {
		await storageManager.createStorage();
		const exists = await storageManager.storageExists();
		expect(exists).toBe(true);
	});

	it('saveNote should create storage and save note file', async () => {
		await storageManager.saveNote(testNote);

		// Verify file exists (now named by note ID)
		const filePath = storageManager.getNoteFilePath(testNote.id);
		const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
		expect(fileExists).toBe(true);

		// Verify file content is markdown
		const content = await fs.readFile(filePath, 'utf-8');
		expect(content.includes('# Code Context Note')).toBe(true);
		expect(content.includes(testNote.filePath)).toBe(true);
		expect(content.includes(testNote.id)).toBe(true);
		expect(content.includes(testNote.content)).toBe(true);
	});

	it('loadNoteById should load saved note', async () => {
		await storageManager.saveNote(testNote);
		const loadedNote = await storageManager.loadNoteById(testNote.id);

		expect(loadedNote).toBeTruthy();
		expect(loadedNote!.id).toBe(testNote.id);
		expect(loadedNote!.content).toBe(testNote.content);
		expect(loadedNote!.author).toBe(testNote.author);
		expect(loadedNote!.filePath).toBe(testNote.filePath);
		expect(loadedNote!.contentHash).toBe(testNote.contentHash);
		expect(loadedNote!.lineRange.start).toBe(testNote.lineRange.start);
		expect(loadedNote!.lineRange.end).toBe(testNote.lineRange.end);
		expect(loadedNote!.isDeleted).toBe(false);
	});

	it('loadNoteById should return null for non-existent note', async () => {
		const loadedNote = await storageManager.loadNoteById('nonexistent');
		expect(loadedNote).toBe(null);
	});

	it('loadNotes should return all notes for a file', async () => {
		// Create multiple notes for the same file
		const note1 = { ...testNote, contentHash: 'hash1', id: 'note1' };
		const note2 = { ...testNote, contentHash: 'hash2', id: 'note2' };
		const note3 = { ...testNote, contentHash: 'hash3', id: 'note3', filePath: '/different/file.ts' };

		await storageManager.saveNote(note1);
		await storageManager.saveNote(note2);
		await storageManager.saveNote(note3);

		// Load notes for the test file
		const notes = await storageManager.loadNotes(testNote.filePath);

		expect(notes.length).toBe(2);
		expect(notes.some(n => n.id === 'note1')).toBe(true);
		expect(notes.some(n => n.id === 'note2')).toBe(true);
		expect(!notes.some(n => n.id === 'note3')).toBe(true);
	});

	it('loadNotes should not return deleted notes', async () => {
		const deletedNote = { ...testNote, isDeleted: true };
		await storageManager.saveNote(deletedNote);

		const notes = await storageManager.loadNotes(testNote.filePath);
		expect(notes.length).toBe(0);
	});

	it('loadNotes should return empty array when no notes exist', async () => {
		const notes = await storageManager.loadNotes('/some/file.ts');
		expect(notes.length).toBe(0);
	});

	it('deleteNote should mark note as deleted', async () => {
		await storageManager.saveNote(testNote);
		await storageManager.deleteNote(testNote.id, testNote.filePath);

		// Load the note directly by ID to see if it's marked deleted
		const note = await storageManager.loadNoteById(testNote.id);
		expect(note).toBeTruthy();
		expect(note!.isDeleted).toBe(true);

		// Verify history entry was added
		const lastHistoryEntry = note!.history[note!.history.length - 1];
		expect(lastHistoryEntry.action).toBe('deleted');
	});

	it('deleteNote should throw error for non-existent note', async () => {
		await expect(
			storageManager.deleteNote('nonexistent', '/some/file.ts')
		).rejects.toThrow(/Note with id nonexistent not found/);
	});

	it('markdown serialization should preserve all note data', async () => {
		await storageManager.saveNote(testNote);
		const loadedNote = await storageManager.loadNoteById(testNote.id);

		expect(loadedNote).toBeTruthy();
		expect(loadedNote!.id).toEqual(testNote.id);
		expect(loadedNote!.content).toEqual(testNote.content);
		expect(loadedNote!.author).toEqual(testNote.author);
		expect(loadedNote!.filePath).toEqual(testNote.filePath);
		expect(loadedNote!.lineRange).toEqual(testNote.lineRange);
		expect(loadedNote!.contentHash).toEqual(testNote.contentHash);
		expect(loadedNote!.createdAt).toEqual(testNote.createdAt);
		expect(loadedNote!.updatedAt).toEqual(testNote.updatedAt);
		expect(loadedNote!.isDeleted).toEqual(testNote.isDeleted);
		expect(loadedNote!.history.length).toBe(testNote.history.length);
	});

	it('markdown serialization should preserve history entries', async () => {
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

		expect(loadedNote).toBeTruthy();
		expect(loadedNote!.history.length).toBe(3);
		expect(loadedNote!.history[0].content).toBe('First version');
		expect(loadedNote!.history[0].author).toBe('Author 1');
		expect(loadedNote!.history[0].action).toBe('created');
		expect(loadedNote!.history[1].content).toBe('Second version');
		expect(loadedNote!.history[2].content).toBe('Third version');
	});

	it('markdown serialization should handle special characters', async () => {
		const noteWithSpecialChars: Note = {
			...testNote,
			content: 'Content with **bold**, *italic*, `code`, and [links](http://example.com)',
			author: 'Author & Co.'
		};

		await storageManager.saveNote(noteWithSpecialChars);
		const loadedNote = await storageManager.loadNoteById(noteWithSpecialChars.id);

		expect(loadedNote).toBeTruthy();
		expect(loadedNote!.content).toBe(noteWithSpecialChars.content);
		expect(loadedNote!.author).toBe(noteWithSpecialChars.author);
	});

	it('markdown serialization should handle multiline content', async () => {
		const noteWithMultiline: Note = {
			...testNote,
			content: 'Line 1\nLine 2\nLine 3\n\nLine 5 after blank line'
		};

		await storageManager.saveNote(noteWithMultiline);
		const loadedNote = await storageManager.loadNoteById(noteWithMultiline.id);

		expect(loadedNote).toBeTruthy();
		expect(loadedNote!.content).toBe(noteWithMultiline.content);
	});

	it('markdown serialization should handle code blocks', async () => {
		const noteWithCodeBlock: Note = {
			...testNote,
			content: '```typescript\nfunction test() {\n  return true;\n}\n```'
		};

		await storageManager.saveNote(noteWithCodeBlock);
		const loadedNote = await storageManager.loadNoteById(noteWithCodeBlock.id);

		expect(loadedNote).toBeTruthy();
		expect(loadedNote!.content).toBe(noteWithCodeBlock.content);
	});

	it('markdown serialization should handle lists', async () => {
		const noteWithLists: Note = {
			...testNote,
			content: '- Item 1\n- Item 2\n- Item 3\n\n1. Numbered 1\n2. Numbered 2'
		};

		await storageManager.saveNote(noteWithLists);
		const loadedNote = await storageManager.loadNoteById(noteWithLists.id);

		expect(loadedNote).toBeTruthy();
		expect(loadedNote!.content).toBe(noteWithLists.content);
	});

	it('markdown serialization should handle empty history', async () => {
		const noteWithEmptyHistory: Note = {
			...testNote,
			history: []
		};

		await storageManager.saveNote(noteWithEmptyHistory);
		const loadedNote = await storageManager.loadNoteById(noteWithEmptyHistory.id);

		expect(loadedNote).toBeTruthy();
		expect(loadedNote!.history.length).toBe(0);
	});

	it('getAllNoteFiles should return all note files', async () => {
		await storageManager.saveNote({ ...testNote, id: 'note1' });
		await storageManager.saveNote({ ...testNote, id: 'note2' });
		await storageManager.saveNote({ ...testNote, id: 'note3' });

		const files = await storageManager.getAllNoteFiles();
		expect(files.length).toBe(3);
	});

	it('getAllNoteFiles should return empty array when storage does not exist', async () => {
		const files = await storageManager.getAllNoteFiles();
		expect(files.length).toBe(0);
	});

	it('saveNote should overwrite existing file', async () => {
		await storageManager.saveNote(testNote);

		// Update and save again (same note ID, so overwrites)
		const updatedNote = {
			...testNote,
			content: 'Updated content',
			updatedAt: '2025-01-02T00:00:00.000Z'
		};
		await storageManager.saveNote(updatedNote);

		const loadedNote = await storageManager.loadNoteById(testNote.id);
		expect(loadedNote).toBeTruthy();
		expect(loadedNote!.content).toBe('Updated content');
		expect(loadedNote!.updatedAt).toBe('2025-01-02T00:00:00.000Z');
	});

	it('markdown should include deleted status', async () => {
		const deletedNote = { ...testNote, isDeleted: true };
		await storageManager.saveNote(deletedNote);

		const filePath = storageManager.getNoteFilePath(deletedNote.id);
		const content = await fs.readFile(filePath, 'utf-8');

		expect(content.includes('**Status:** DELETED')).toBe(true);
	});

	it('markdownToNote drops invalid structured field values', async () => {
		const markdown = `# Code Context Note

**File:** /abs/foo.ts
**Lines:** 1-1
**Content Hash:** sha256:abc

## Note: n1
**Author:** alice
**Created:** 2026-05-01T00:00:00Z
**Updated:** 2026-05-01T00:00:00Z
**Type:** banana
**Scope:** galaxy
**Priority:** urgent
**AuthorType:** robot
**References:** [{"kind":"pr","value":"#42"},{"kind":"nope","value":"x"},"junk",{"kind":"url"}]

## Current Content

Hi.
`;
		const sm: any = new StorageManager('/tmp');
		const note = sm.markdownToNote(markdown);
		expect(note).toBeTruthy();
		expect(note!.type).toBe(undefined);
		expect(note!.scope).toBe(undefined);
		expect(note!.priority).toBe(undefined);
		expect(note!.authorType).toBe(undefined);
		expect(note!.references).toEqual([{ kind: 'pr', value: '#42' }]);
	});

	it('markdownToNote parses new structured fields when present', async () => {
		const markdown = `# Code Context Note

**File:** /abs/foo.ts
**Lines:** 1-1
**Content Hash:** sha256:abc

## Note: n1
**Author:** alice
**Created:** 2026-05-01T00:00:00Z
**Updated:** 2026-05-01T00:00:00Z
**Type:** instruction
**Scope:** function
**Priority:** high
**Tags:** security, legacy
**AuthorType:** human
**ExpiresAt:** 2026-12-01T00:00:00Z
**References:** [{"kind":"pr","value":"#42"}]

## Current Content

Do not bypass.
`;
		const sm: any = new StorageManager('/tmp');
		const note = sm.markdownToNote(markdown);
		expect(note).toBeTruthy();
		expect(note!.type).toBe('instruction');
		expect(note!.scope).toBe('function');
		expect(note!.priority).toBe('high');
		expect(note!.tags).toEqual(['security', 'legacy']);
		expect(note!.authorType).toBe('human');
		expect(note!.expiresAt).toBe('2026-12-01T00:00:00Z');
		expect(note!.references).toEqual([{ kind: 'pr', value: '#42' }]);
	});

	it('markdownToNote leaves new fields undefined for legacy notes', async () => {
		const markdown = `# Code Context Note

**File:** /abs/foo.ts
**Lines:** 1-1
**Content Hash:** sha256:abc

## Note: n1
**Author:** alice
**Created:** 2026-05-01T00:00:00Z
**Updated:** 2026-05-01T00:00:00Z

## Current Content

Hi.
`;
		const sm: any = new StorageManager('/tmp');
		const note = sm.markdownToNote(markdown);
		expect(note).toBeTruthy();
		expect(note!.type).toBe(undefined);
		expect(note!.scope).toBe(undefined);
		expect(note!.tags).toBe(undefined);
	});

	it('noteToMarkdown emits structured fields when set', async () => {
		const sm: any = new StorageManager('/tmp');
		const md = sm.noteToMarkdown({
			id: 'n1',
			content: 'do not refactor',
			author: 'alice',
			filePath: '/abs/foo.ts',
			lineRange: { start: 0, end: 0 },
			contentHash: 'sha256:abc',
			createdAt: '2026-05-01T00:00:00Z',
			updatedAt: '2026-05-01T00:00:00Z',
			history: [],
			type: 'instruction',
			scope: 'function',
			priority: 'high',
			tags: ['security'],
			authorType: 'agent',
			expiresAt: '2026-12-01T00:00:00Z',
			references: [{ kind: 'pr', value: '#42' }],
		});
		expect(md.includes('**Type:** instruction')).toBe(true);
		expect(md.includes('**Scope:** function')).toBe(true);
		expect(md.includes('**Priority:** high')).toBe(true);
		expect(md.includes('**Tags:** security')).toBe(true);
		expect(md.includes('**AuthorType:** agent')).toBe(true);
		expect(md.includes('**ExpiresAt:** 2026-12-01T00:00:00Z')).toBe(true);
		expect(md.includes('**References:** [{"kind":"pr","value":"#42"}]')).toBe(true);
	});

	it('noteToMarkdown omits fields equal to defaults', async () => {
		const sm: any = new StorageManager('/tmp');
		const md = sm.noteToMarkdown({
			id: 'n1',
			content: 'hi',
			author: 'alice',
			filePath: '/abs/foo.ts',
			lineRange: { start: 0, end: 0 },
			contentHash: 'sha256:abc',
			createdAt: '2026-05-01T00:00:00Z',
			updatedAt: '2026-05-01T00:00:00Z',
			history: [],
			type: 'context',     // default
			scope: 'line',       // default
			priority: 'normal',  // default
			tags: [],            // default
			authorType: 'human', // default
		});
		expect(!md.includes('**Type:**')).toBe(true);
		expect(!md.includes('**Scope:**')).toBe(true);
		expect(!md.includes('**Priority:**')).toBe(true);
		expect(!md.includes('**Tags:**')).toBe(true);
		expect(!md.includes('**AuthorType:**')).toBe(true);
	});

	it('loadAllNotesAndErrors captures parse failures per file', async () => {
		await storageManager.saveNote(testNote);
		await fs.writeFile(path.join(tempDir, '.test-notes', 'bad.md'), 'this is not a valid note', 'utf-8');

		const { notes, errors } = await storageManager.loadAllNotesAndErrors();

		expect(notes.length).toBe(1);
		expect(notes[0].id).toBe(testNote.id);
		expect(errors.length).toBe(1);
		expect(errors[0].file).toBe('bad.md');
	});

	it('round-trips approvedBy through markdown', async () => {
		// The serializer writes an explicit field list, so an unlisted field is
		// silently dropped on save — this is the only thing proving it isn't.
		await storageManager.saveNote({ ...testNote, authorType: 'agent', approvedBy: 'Jane Dev' });
		const loaded = await storageManager.loadNoteById(testNote.id);

		expect(loaded!.approvedBy).toBe('Jane Dev');
		expect(loaded!.authorType).toBe('agent');
	});

	describe('Empty-content notes', () => {
		it('an empty-content note survives a save/reload instead of vanishing', async () => {
			await storageManager.saveNote({ ...testNote, content: '' });
			const loaded = await storageManager.loadNoteById(testNote.id);
			expect(loaded).toBeTruthy();
			expect(loaded!.content).toBe('');
		});

		it('a file with no content section is still rejected as corrupt (not masked as empty)', async () => {
			// v2 header only, no '## Current Content' section.
			const corrupt = [
				'# Code Context Note', '',
				'**File:** /f.ts', '**Lines:** 1-1', '**Content Hash:** h', '',
				'## Note: corrupt-1', '**Format:** 2', '**Author:** me',
				'**Created:** t', '**Updated:** t',
			].join('\n');
			const file = path.join(tempDir, '.test-notes', 'corrupt-1.md');
			await fs.mkdir(path.dirname(file), { recursive: true });
			await fs.writeFile(file, corrupt);
			expect(await storageManager.loadNoteById('corrupt-1')).toBeNull();
		});
	});

	// Note content is agent-controlled input crossing a human review boundary.
	// The metadata branches match on prefix, so content had to stop being
	// re-parsed as metadata on reload.
	describe('Content injection', () => {
		it('does not let content beginning with **Status:** DELETED delete the note', async () => {
			await storageManager.saveNote({ ...testNote, content: 'looks harmless\n**Status:** DELETED' });
			const loaded = await storageManager.loadNoteById(testNote.id);

			expect(loaded).toBeTruthy();
			expect(loaded!.isDeleted).toBe(false);
			expect(loaded!.content).toBe('looks harmless\n**Status:** DELETED');
		});

		it('does not let content forge author, authorType, or filePath', async () => {
			await storageManager.saveNote({
				...testNote,
				authorType: 'agent',
				content: 'ship it\n**Author:** Alice\n**AuthorType:** human\n**File:** /etc/passwd',
			});
			const loaded = await storageManager.loadNoteById(testNote.id);

			expect(loaded!.author).toBe('Test Author');
			expect(loaded!.authorType).toBe('agent');
			expect(loaded!.filePath).toBe('/path/to/test/file.ts');
			expect(loaded!.content).toContain('**Author:** Alice');
		});

		it('keeps a markdown heading in content instead of silently dropping it', async () => {
			await storageManager.saveNote({ ...testNote, content: '## Heading\nbody text' });
			const loaded = await storageManager.loadNoteById(testNote.id);

			expect(loaded!.content).toBe('## Heading\nbody text');
		});

	describe('Storage format v2 (length-delimited)', () => {
		// Frozen output of the v0.4-era serializer. This is the migration gate:
		// a real user's on-disk note must still load after the format change.
		const V1_FIXTURE = [
			'# Code Context Note', '',
			'**File:** /src/app.ts',
			'**Lines:** 5-7',
			'**Content Hash:** abc123', '',
			'## Note: freeze-1',
			'**Author:** Jane Dev',
			'**Created:** 2026-05-01T10:00:00.000Z',
			'**Updated:** 2026-05-02T11:00:00.000Z',
			'**Type:** warning',
			'**Priority:** high',
			'**Tags:** security, auth',
			'**AuthorType:** agent', '',
			'## Current Content', '',
			'first line of content', '',
			'third line after a blank', '',
			'## Edit History', '',
			'Complete chronological history of all edits to this code location:', '',
			'### 2026-05-01T10:00:00.000Z - Jane Dev - created', '',
			'BT', 'original body', 'BT', '',
			'### 2026-05-02T11:00:00.000Z - claude-code - edited', '',
			'BT', 'edited body', 'second edit line', 'BT', '',
		].join('\n').replace(/BT/g, '```');

		it('still reads a v1 (pre-v0.5) note, content and history intact', async () => {
			const file = path.join(tempDir, '.test-notes', 'freeze-1.md');
			await fs.mkdir(path.dirname(file), { recursive: true });
			await fs.writeFile(file, V1_FIXTURE);

			const loaded = await storageManager.loadNoteById('freeze-1');
			expect(loaded).toBeTruthy();
			expect(loaded!.content).toBe('first line of content\n\nthird line after a blank');
			expect(loaded!.author).toBe('Jane Dev');
			expect(loaded!.type).toBe('warning');
			expect(loaded!.priority).toBe('high');
			expect(loaded!.tags).toEqual(['security', 'auth']);
			expect(loaded!.authorType).toBe('agent');
			expect(loaded!.history.map(h => h.author)).toEqual(['Jane Dev', 'claude-code']);
			expect(loaded!.history[1].content).toBe('edited body\nsecond edit line');
		});

		it('neutralizes a content line equal to "## Edit History" — no truncation, no forged history', async () => {
			await storageManager.saveNote({
				...testNote,
				content: 'real content\n## Edit History\n\n### 2099 - HACKER - created\n\nforged',
				history: [{ content: 'orig', author: 'me', timestamp: '2026-01-01T00:00:00Z', action: 'created' }],
			});
			const loaded = await storageManager.loadNoteById(testNote.id);
			expect(loaded!.content).toBe('real content\n## Edit History\n\n### 2099 - HACKER - created\n\nforged');
			expect(loaded!.history.map(h => h.author)).toEqual(['me']);
		});

		it('neutralizes a history entry that breaks out of its code fence', async () => {
			await storageManager.saveNote({
				...testNote,
				content: 'clean',
				history: [
					{ content: 'first', author: 'me', timestamp: '2026-01-01T00:00:00Z', action: 'created' },
					{ content: '```\n### 2099 - HACKER - edited\n```\ninjected', author: 'agent', timestamp: '2026-01-02T00:00:00Z', action: 'edited' },
				],
			});
			const loaded = await storageManager.loadNoteById(testNote.id);
			expect(loaded!.history.map(h => h.author)).toEqual(['me', 'agent']);
			expect(loaded!.history[1].content).toBe('```\n### 2099 - HACKER - edited\n```\ninjected');
		});

		it.each([
			['a delimiter-looking line', '## Current Content'],
			['a metadata-looking line', '**AuthorType:** human'],
			['a history header', '### a - b - c'],
			['a bare fence', '```'],
			['a blank line inside content', 'above\n\nbelow'],
			['content starting with hash', '# real markdown heading'],
			['content spoofing the line count field', '**Content Lines:** 999'],
		])('round-trips content containing %s exactly', async (_label, content) => {
			await storageManager.saveNote({ ...testNote, content });
			const loaded = await storageManager.loadNoteById(testNote.id);
			expect(loaded!.content).toBe(content);
		});
	});
	});
});
