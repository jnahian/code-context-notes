/**
 * Unit tests for NoteManager
 * Tests CRUD operations, caching, and note position updates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { NoteManager } from '../src/noteManager.js';
import { ContentHashTracker } from '../src/contentHashTracker.js';
import { StorageManager } from '../src/storageManager.js';
import { LockManager } from '../src/lockManager.js';
import { AuditLog } from '../src/auditLog.js';
import { ProposalStore, PendingWriteError } from '../src/proposalStore.js';
import { CreateNoteParams, UpdateNoteParams, NoteDocument, AuthorProvider } from '../src/types.js';

class FakeAuthorProvider implements AuthorProvider {
	constructor(private authorName: string) {}
	async getAuthorName(): Promise<string> {
		return this.authorName;
	}
	updateConfigOverride(override?: string): void {
		if (override) this.authorName = override;
	}
}

describe('NoteManager Test Suite', () => {
	let tempDir: string;
	let noteManager: NoteManager;
	let storage: StorageManager;
	let hashTracker: ContentHashTracker;
	let gitIntegration: AuthorProvider;

	beforeEach(async () => {
		// Create temporary directory
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'note-manager-test-'));

		// Initialize components
		storage = new StorageManager(tempDir, '.test-notes');
		hashTracker = new ContentHashTracker();
		gitIntegration = new FakeAuthorProvider('Test Author');
		noteManager = new NoteManager(storage, hashTracker, gitIntegration);
	});

	afterEach(async () => {
		// Clean up
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch (error) {
			console.error('Failed to clean up temp directory:', error);
		}
	});

	describe('Note Creation', () => {
		it('applies metadata in the single create write, with no second save', async () => {
			const doc = createMockDocument('line0\nline1\n');
			const note = await noteManager.createNote({
				content: 'Watch out',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				type: 'warning',
				tags: ['security'],
				priority: 'high',
				authorType: 'agent',
			}, doc);

			expect(note.type).toBe('warning');
			expect(note.tags).toEqual(['security']);
			expect(note.priority).toBe('high');
			expect(note.authorType).toBe('agent');
			// One write means one history entry — a second save would add another.
			expect(note.history).toHaveLength(1);

			const onDisk = await noteManager.getNoteByIdGlobal(note.id);
			expect(onDisk!.type).toBe('warning');
			expect(onDisk!.authorType).toBe('agent');
		});

		it('should create a new note', async () => {
			const doc = createMockDocument('function test() {\n  return true;\n}');
			const params: CreateNoteParams = {
				content: 'This is a test note',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 2 }
			};

			const note = await noteManager.createNote(params, doc);

			expect(note.id).toBeTruthy();
			expect(note.content).toBe('This is a test note');
			expect(note.author).toBe('Test Author');
			expect(note.filePath).toBe('/test/file.ts');
			expect(note.lineRange).toEqual({ start: 0, end: 2 });
			expect(note.contentHash).toBeTruthy();
			expect(note.createdAt).toBeTruthy();
			expect(note.updatedAt).toBeTruthy();
			expect(note.isDeleted).toBe(false);
			expect(note.history.length).toBe(1);
			expect(note.history[0].action).toBe('created');
		});

		it('should trim note content', async () => {
			const doc = createMockDocument('function test() {}');
			const params: CreateNoteParams = {
				content: '  This is a test note  ',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 0 }
			};

			const note = await noteManager.createNote(params, doc);
			expect(note.content).toBe('This is a test note');
		});

		it('should use provided author if specified', async () => {
			const doc = createMockDocument('function test() {}');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 0 },
				author: 'Custom Author'
			};

			const note = await noteManager.createNote(params, doc);
			expect(note.author).toBe('Custom Author');
		});

		it('should generate content hash', async () => {
			const doc = createMockDocument('function test() {\n  return true;\n}');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 2 }
			};

			const note = await noteManager.createNote(params, doc);
			expect(note.contentHash).toBeTruthy();
			expect(typeof note.contentHash).toBe('string');
			expect(note.contentHash.length).toBe(64); // SHA-256 hex
		});

		it('should throw error for invalid line range', async () => {
			const doc = createMockDocument('line 1\nline 2');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: 0, end: 10 } // Beyond document
			};

			await expect(noteManager.createNote(params, doc)).rejects.toThrow(/exceeds document line count/);
		});

		it('should throw error for negative line numbers', async () => {
			const doc = createMockDocument('line 1\nline 2');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: -1, end: 1 }
			};

			await expect(noteManager.createNote(params, doc)).rejects.toThrow(/cannot contain negative numbers/);
		});

		it('should throw error for inverted line range', async () => {
			const doc = createMockDocument('line 1\nline 2');
			const params: CreateNoteParams = {
				content: 'Test note',
				filePath: '/test/file.ts',
				lineRange: { start: 2, end: 0 } // Start > end
			};

			await expect(noteManager.createNote(params, doc)).rejects.toThrow(/start must be less than or equal to end/);
		});
	});

	describe('Note Updates', () => {
		it('should update an existing note', async () => {
			const doc = createMockDocument('function test() {\n  return true;\n}');

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

			expect(updatedNote.id).toBe(note.id);
			expect(updatedNote.content).toBe('Updated content');
			expect(updatedNote.history.length).toBe(2);
			expect(updatedNote.history[1].action).toBe('edited');
			expect(updatedNote.history[1].content).toBe('Updated content');
		});

		it('should trim updated content', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Original',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			const updatedNote = await noteManager.updateNote({
				id: note.id,
				content: '  Updated  '
			}, doc);

			expect(updatedNote.content).toBe('Updated');
		});

		it('should update timestamps', async () => {
			const doc = createMockDocument('function test() {}');
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

			expect(updatedNote.updatedAt).not.toBe(originalUpdatedAt);
		});

		it('should throw error for non-existent note', async () => {
			const doc = createMockDocument('function test() {}');

			await expect(noteManager.updateNote({
				id: 'non-existent-id',
				content: 'Updated'
			}, doc)).rejects.toThrow(/not found/);
		});

		it('should throw error when updating deleted note', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Original',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			// Delete the note
			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			// Try to update
			await expect(noteManager.updateNote({
				id: note.id,
				content: 'Updated'
			}, doc)).rejects.toThrow(/Cannot update deleted note/);
		});

		it('should use custom author if provided', async () => {
			const doc = createMockDocument('function test() {}');
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

			expect(updatedNote.history[1].author).toBe('Custom Author');
		});
	});

	describe('Note Deletion', () => {
		it('should soft delete a note', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			// Note should still exist but marked as deleted
			const allNotes = await noteManager.getAllNotesForFile(doc.uri.fsPath);
			const deletedNote = allNotes.find(n => n.id === note.id);

			expect(deletedNote).toBeTruthy();
			expect(deletedNote!.isDeleted).toBe(true);
			expect(deletedNote!.history[deletedNote!.history.length - 1].action).toBe('deleted');
		});

		it('should not return deleted notes in getNotesForFile', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			const notes = await noteManager.getNotesForFile(doc.uri.fsPath);
			expect(notes.length).toBe(0);
		});

		it('should throw error for non-existent note', async () => {
			await expect(noteManager.deleteNote('non-existent', '/test/file.ts')).rejects.toThrow(/not found/);
		});

		it('should throw error when deleting already deleted note', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			await expect(noteManager.deleteNote(note.id, doc.uri.fsPath)).rejects.toThrow(/already deleted/);
		});

		// Reverting a delete (the audit-mode Revert button) is the path the
		// whole-branch review found broken: getNoteByIdGlobal hid the note and
		// updateNote refused it. These pin the primitives that fix supplies.
		it('getNoteByIdIncludingDeleted returns a soft-deleted note', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'to delete', filePath: doc.uri.fsPath, lineRange: { start: 0, end: 0 },
			}, doc);
			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			expect(await noteManager.getNoteByIdGlobal(note.id)).toBeUndefined();
			const found = await noteManager.getNoteByIdIncludingDeleted(note.id);
			expect(found).toBeTruthy();
			expect(found!.isDeleted).toBe(true);
			expect(found!.content).toBe('to delete');
		});

		it('undeleteNote restores a deleted note with its content and a history entry', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'important note', filePath: doc.uri.fsPath, lineRange: { start: 0, end: 0 },
			}, doc);
			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			const restored = await noteManager.undeleteNote(note.id);
			expect(restored.isDeleted).toBe(false);
			expect(restored.content).toBe('important note');
			// visible again through the normal lookup, and it survives a reload
			expect(await noteManager.getNoteByIdGlobal(note.id)).toBeTruthy();
			const onDisk = await noteManager.getNoteByIdGlobal(note.id);
			expect(onDisk!.isDeleted).toBe(false);
			// the restore is recorded, not silent
			expect(restored.history[restored.history.length - 1].action).toBe('edited');
		});

		it('undeleteNote rejects a note that is not deleted', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'live', filePath: doc.uri.fsPath, lineRange: { start: 0, end: 0 },
			}, doc);
			await expect(noteManager.undeleteNote(note.id)).rejects.toThrow(/not deleted/);
		});

		it('undeleteNote is blocked for an agent writer', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'x', filePath: doc.uri.fsPath, lineRange: { start: 0, end: 0 },
			}, doc);
			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			const agentManager = new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('claude-code'),
				{ agentWriter: true, auditLog: new AuditLog(path.join(tempDir, '.test-notes', '_audit.log')) },
			);
			await expect(agentManager.undeleteNote(note.id)).rejects.toThrow(/not available to agent writers/);
		});
	});

	describe('Note Retrieval', () => {
		it('should get all notes for a file', async () => {
			const doc = createMockDocument('line 1\nline 2\nline 3');

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
			expect(notes.length).toBe(2);
		});

		it('should not return notes from different files', async () => {
			const doc1 = createMockDocument('file 1');
			const doc2 = createMockDocument('file 2');

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

			expect(notes1.length).toBe(1);
			expect(notes2.length).toBe(1);
			expect(notes1[0].id).not.toBe(notes2[0].id);
		});

		it('should get note by ID', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			const retrieved = await noteManager.getNoteById(note.id, doc.uri.fsPath);
			expect(retrieved).toBeTruthy();
			expect(retrieved!.id).toBe(note.id);
		});

		it('should return undefined for non-existent note ID', async () => {
			const retrieved = await noteManager.getNoteById('non-existent', '/test/file.ts');
			expect(retrieved).toBe(undefined);
		});

		it('getNoteByIdGlobal should find a note by id without a filePath', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			const retrieved = await noteManager.getNoteByIdGlobal(note.id);
			expect(retrieved).toBeTruthy();
			expect(retrieved!.id).toBe(note.id);
		});

		it('getNoteByIdGlobal should return undefined for a non-existent note ID', async () => {
			const retrieved = await noteManager.getNoteByIdGlobal('non-existent');
			expect(retrieved).toBe(undefined);
		});

		it('getNoteByIdGlobal should return undefined for a soft-deleted note', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.deleteNote(note.id, doc.uri.fsPath);

			const retrieved = await noteManager.getNoteByIdGlobal(note.id);
			expect(retrieved).toBe(undefined);
		});

		it('should return empty array for file with no notes', async () => {
			const notes = await noteManager.getNotesForFile('/test/file.ts');
			expect(notes.length).toBe(0);
		});

		it('getAllNotesAndErrors should return good notes and per-file parse errors', async () => {
			const doc = createMockDocument('function test() {}');
			await noteManager.createNote({
				content: 'Note 1',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await fs.writeFile(path.join(tempDir, '.test-notes', 'bad.md'), 'this is not a valid note', 'utf-8');

			const { notes, errors } = await noteManager.getAllNotesAndErrors();
			expect(notes.length).toBe(1);
			expect(errors.length).toBe(1);
			expect(errors[0].file).toBe('bad.md');
		});
	});

	describe('Caching', () => {
		it('should cache notes after first load', async () => {
			const doc = createMockDocument('function test() {}');
			await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			// First call loads from storage
			const notes1 = await noteManager.getNotesForFile(doc.uri.fsPath);

			// Second call should use cache
			const notes2 = await noteManager.getNotesForFile(doc.uri.fsPath);

			expect(notes1.length).toBe(notes2.length);
			expect(notes1[0].id).toBe(notes2[0].id);
		});

		it('should clear cache for specific file', async () => {
			const doc = createMockDocument('function test() {}');
			await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			await noteManager.getNotesForFile(doc.uri.fsPath);
			noteManager.clearCacheForFile(doc.uri.fsPath);

			// Should reload from storage
			const notes = await noteManager.getNotesForFile(doc.uri.fsPath);
			expect(notes).toBeTruthy();
		});

		it('should clear all cache', async () => {
			const doc1 = createMockDocument('file 1');
			const doc2 = createMockDocument('file 2');

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

			expect(notes1).toBeTruthy();
			expect(notes2).toBeTruthy();
		});

		it('should clear the workspace-wide caches too, so notes written by another process become visible', async () => {
			const doc = createMockDocument('function test() {}');
			await noteManager.createNote({
				content: 'Note 1',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			// Warm the workspace cache.
			expect(await noteManager.getAllNotes()).toHaveLength(1);

			// A second process (the MCP server) creates a note in the same storage.
			const other = new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('Agent'),
			);
			const otherDoc = createMockDocument('other file');
			await other.createNote({
				content: 'Note from agent',
				filePath: otherDoc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, otherDoc);

			// Without clearing, our warm workspace cache still says 1.
			expect(await noteManager.getAllNotes()).toHaveLength(1);

			noteManager.clearAllCache();

			const after = await noteManager.getAllNotes();
			expect(after).toHaveLength(2);
			expect(after.map(n => n.content)).toContain('Note from agent');
		});

		it('should refresh notes for file', async () => {
			const doc = createMockDocument('function test() {}');
			await noteManager.createNote({
				content: 'Test note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, doc);

			const notes1 = await noteManager.getNotesForFile(doc.uri.fsPath);
			const notes2 = await noteManager.refreshNotesForFile(doc.uri.fsPath);

			expect(notes1.length).toBe(notes2.length);
		});
	});

	describe('Position updates', () => {
		it('does not clobber a concurrent content edit made by another process', async () => {
			// Note attached to line 0; later the same text moves to line 2.
			const before = createMockDocument('target line\nfiller\nfiller\n');
			const note = await noteManager.createNote({
				content: 'original',
				filePath: before.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, before);

			// Another process edits the note's *content* while our cache is warm.
			const other = new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('agent'),
			);
			await other.updateNote({ id: note.id, content: 'edited elsewhere' }, before);

			// The code moves down two lines, so repositioning kicks in.
			const after = createMockDocument('new\nnew\ntarget line\n', before.uri.fsPath);
			await noteManager.updateNotePositions(after);

			const fresh = new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('x'),
			);
			const final = await fresh.getNoteByIdGlobal(note.id);
			// Repositioning must move the note WITHOUT resurrecting stale content.
			expect(final!.content).toBe('edited elsewhere');
			expect(final!.lineRange.start).toBe(2);
		});
	});

	describe('Trust router', () => {
		let auditLog: AuditLog;

		const buildManager = (mode: 'direct' | 'audit') => new NoteManager(
			new StorageManager(tempDir, '.test-notes'),
			new ContentHashTracker(),
			new FakeAuthorProvider('claude-code'),
			{ auditLog, agentWriteMode: async () => mode, agentName: 'claude-code' },
		);

		beforeEach(() => {
			auditLog = new AuditLog(path.join(tempDir, '.test-notes', '_audit.log'));
		});

		it('logs an agent create in audit mode', async () => {
			const agentManager = buildManager('audit');
			const doc = createMockDocument('line0\n');
			const note = await agentManager.createNote({
				content: 'agent note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				authorType: 'agent',
			}, doc);

			// The write still lands — audit logs, it doesn't block.
			expect(await agentManager.getNoteByIdGlobal(note.id)).toBeTruthy();

			const entries = await auditLog.read();
			expect(entries).toHaveLength(1);
			expect(entries[0]).toMatchObject({ op: 'create', noteId: note.id, agent: 'claude-code' });
		});

		it('logs an agent edit with before/after content hashes', async () => {
			const agentManager = buildManager('audit');
			const doc = createMockDocument('line0\n');
			const note = await agentManager.createNote({
				content: 'first',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				authorType: 'agent',
			}, doc);
			await agentManager.updateNote({ id: note.id, content: 'second' }, doc);

			const entries = await auditLog.read();
			expect(entries[0].op).toBe('edit');
			expect(entries[0].prevContentHash).toBeTruthy();
			expect(entries[0].newContentHash).not.toBe(entries[0].prevContentHash);
		});

		it('logs an agent delete', async () => {
			const agentManager = buildManager('audit');
			const doc = createMockDocument('line0\n');
			const note = await agentManager.createNote({
				content: 'doomed',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				authorType: 'agent',
			}, doc);
			await agentManager.deleteNote(note.id, doc.uri.fsPath);

			const entries = await auditLog.read();
			expect(entries[0]).toMatchObject({ op: 'delete', noteId: note.id });
		});

		// One instance, one identity: the extension's manager is a human's, so
		// even sharing the audit log it must never record its own writes.
		it('does not log a write from a non-agent manager, even in audit mode', async () => {
			const humanManager = new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('a-human'),
				{ auditLog, agentWriteMode: async () => 'audit', agentWriter: false },
			);
			const doc = createMockDocument('line0\n');
			const note = await humanManager.createNote({
				content: 'human note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
			}, doc);
			await humanManager.updateNote({ id: note.id, content: 'human edit' }, doc);
			await humanManager.deleteNote(note.id, doc.uri.fsPath);

			expect(await auditLog.read()).toEqual([]);
		});

		// These two write notes but are deliberately NOT routed through the
		// trust model — they're human-only paths. Guard them so a future
		// agent-facing caller fails loudly instead of silently bypassing.
		it('refuses updateNoteMetadata and updateNotePositions from an agent manager', async () => {
			const agentManager = buildManager('audit');
			const doc = createMockDocument('line0\n');
			const note = await agentManager.createNote({
				content: 'agent note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				authorType: 'agent',
			}, doc);

			await expect(agentManager.updateNoteMetadata(note.id, { priority: 'high' }))
				.rejects.toThrow(/not available to agent writers/);
			await expect(agentManager.updateNotePositions(doc))
				.rejects.toThrow(/not available to agent writers/);

			// The human's manager still uses both freely.
			await expect(noteManager.updateNoteMetadata(note.id, { priority: 'high' })).resolves.toBeTruthy();
			await expect(noteManager.updateNotePositions(doc)).resolves.toBeInstanceOf(Array);
		});

		it('does not log in direct mode', async () => {
			const agentManager = buildManager('direct');
			const doc = createMockDocument('line0\n');
			await agentManager.createNote({
				content: 'agent note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				authorType: 'agent',
			}, doc);

			expect(await auditLog.read()).toEqual([]);
		});

		describe('queue mode', () => {
			let store: ProposalStore;

			const buildQueued = () => new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('claude-code'),
				{ proposalStore: store, agentWriteMode: async () => 'queue', agentName: 'claude-code' },
			);

			beforeEach(() => {
				store = new ProposalStore(path.join(tempDir, '.test-notes', '_pending'));
			});

			it('diverts an agent create to a proposal, writing no note', async () => {
				const queued = buildQueued();
				const doc = createMockDocument('line0\n');

				await expect(queued.createNote({
					content: 'proposed',
					filePath: doc.uri.fsPath,
					lineRange: { start: 0, end: 0 },
					authorType: 'agent',
				}, doc)).rejects.toBeInstanceOf(PendingWriteError);

				// No note landed...
				expect(await queued.getAllNotes()).toHaveLength(0);
				// ...but a proposal did.
				const proposals = await store.list();
				expect(proposals).toHaveLength(1);
				expect(proposals[0]).toMatchObject({ op: 'create', agent: 'claude-code', content: 'proposed' });
			});

			it('diverts an agent edit, leaving the live note untouched', async () => {
				const doc = createMockDocument('line0\n');
				// Seed a note that already belongs to the agent.
				const seeded = await buildManager('direct').createNote({
					content: 'original',
					filePath: doc.uri.fsPath,
					lineRange: { start: 0, end: 0 },
					authorType: 'agent',
				}, doc);

				const queued = buildQueued();
				await expect(queued.updateNote({ id: seeded.id, content: 'proposed edit' }, doc))
					.rejects.toBeInstanceOf(PendingWriteError);

				expect((await queued.getNoteByIdGlobal(seeded.id))!.content).toBe('original');
				const proposals = await store.list();
				expect(proposals[0]).toMatchObject({
					op: 'edit',
					targetNoteId: seeded.id,
					content: 'proposed edit',
				});
				// The stale-target check at approve time depends on this.
				expect(proposals[0].targetContentHash).toBeTruthy();
			});

			it('diverts an agent delete, leaving the live note undeleted', async () => {
				const doc = createMockDocument('line0\n');
				const seeded = await buildManager('direct').createNote({
					content: 'keep me for now',
					filePath: doc.uri.fsPath,
					lineRange: { start: 0, end: 0 },
					authorType: 'agent',
				}, doc);

				const queued = buildQueued();
				await expect(queued.deleteNote(seeded.id, doc.uri.fsPath))
					.rejects.toBeInstanceOf(PendingWriteError);

				expect((await queued.getNoteByIdGlobal(seeded.id))!.isDeleted).toBe(false);
				expect((await store.list())[0]).toMatchObject({ op: 'delete', targetNoteId: seeded.id });
			});

			it('lets a non-agent manager write through untouched', async () => {
				const humanManager = new NoteManager(
					new StorageManager(tempDir, '.test-notes'),
					new ContentHashTracker(),
					new FakeAuthorProvider('a-human'),
					{ proposalStore: store, agentWriteMode: async () => 'queue', agentWriter: false },
				);
				const doc = createMockDocument('line0\n');

				const note = await humanManager.createNote({
					content: 'human note',
					filePath: doc.uri.fsPath,
					lineRange: { start: 0, end: 0 },
				}, doc);

				expect(note.content).toBe('human note');
				expect(await store.list()).toEqual([]);
			});

			// Identity comes from the writer, not the note. Keying off the note's
			// authorType let an agent edit any human-authored note with no
			// approval at all — the rails only covered notes agents had made
			// themselves, which is exactly backwards for a shared codebase.
			it('diverts an agent edit of a HUMAN-authored note', async () => {
				const doc = createMockDocument('line0\n');
				const humanNote = await noteManager.createNote({
					content: 'human wrote this',
					filePath: doc.uri.fsPath,
					lineRange: { start: 0, end: 0 },
				}, doc);

				const agent = buildQueued();
				await expect(agent.updateNote({ id: humanNote.id, content: 'agent rewrite' }, doc))
					.rejects.toBeInstanceOf(PendingWriteError);

				expect((await agent.getNoteByIdGlobal(humanNote.id))!.content).toBe('human wrote this');
				expect((await store.list())[0]).toMatchObject({ op: 'edit', targetNoteId: humanNote.id });
			});

			it('diverts an agent delete of a HUMAN-authored note', async () => {
				const doc = createMockDocument('line0\n');
				const humanNote = await noteManager.createNote({
					content: 'human wrote this',
					filePath: doc.uri.fsPath,
					lineRange: { start: 0, end: 0 },
				}, doc);

				const agent = buildQueued();
				await expect(agent.deleteNote(humanNote.id, doc.uri.fsPath))
					.rejects.toBeInstanceOf(PendingWriteError);

				expect((await agent.getNoteByIdGlobal(humanNote.id))!.isDeleted).toBe(false);
			});

			// The mirror case: the extension has no agent wiring, so a human
			// editing an agent's note (e.g. clicking Revert) must never be
			// diverted into a proposal awaiting their own approval.
			it('does not divert a human editing an AGENT-authored note', async () => {
				const doc = createMockDocument('line0\n');
				const agentNote = await buildManager('direct').createNote({
					content: 'agent wrote this',
					filePath: doc.uri.fsPath,
					lineRange: { start: 0, end: 0 },
					authorType: 'agent',
				}, doc);

				// noteManager is the extension's: no proposalStore, no agent wiring.
				const reverted = await noteManager.updateNote(
					{ id: agentNote.id, content: 'human reverted it' },
					doc,
				);

				expect(reverted.content).toBe('human reverted it');
				expect(await store.list()).toEqual([]);
			});
		});
	});

	describe('Note History', () => {
		it('should get note history', async () => {
			const doc = createMockDocument('function test() {}');
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

			expect(history.length).toBe(2);
			expect(history[0].action).toBe('created');
			expect(history[1].action).toBe('edited');
		});

		it('should throw error for non-existent note', async () => {
			await expect(noteManager.getNoteHistory('non-existent', '/test/file.ts')).rejects.toThrow(/not found/);
		});
	});

	describe('Configuration', () => {
		it('should update configuration', () => {
			noteManager.updateConfiguration('New Author');
			// Configuration updated successfully (no error thrown)
			expect(true).toBe(true);
		});
	});

	describe('Schema Defaults', () => {
		it('getNotesForFile applies defaults to legacy notes (no structured fields)', async () => {
			// Write a legacy-shaped note directly to storage, bypassing NoteManager.
			// The writer omits fields that equal defaults, so a note without type/scope/tags
			// written this way will be read back with those fields as undefined.
			await (storage as any).saveNote({
				id: 'legacy-1',
				content: 'old',
				author: 'alice',
				filePath: '/abs/x.ts',
				lineRange: { start: 0, end: 0 },
				contentHash: 'sha256:legacy',
				createdAt: '2026-01-01T00:00:00Z',
				updatedAt: '2026-01-01T00:00:00Z',
				history: [],
			});

			// Confirm the storage parser does NOT auto-fill defaults (raw read returns undefined)
			const rawNotes = await (storage as any).loadNotes('/abs/x.ts');
			const rawLegacy = rawNotes.find((n: any) => n.id === 'legacy-1');
			expect(rawLegacy).toBeTruthy();
			expect(rawLegacy.type).toBe(undefined);

			// Now read via NoteManager — defaults must be applied
			const notes = await noteManager.getNotesForFile('/abs/x.ts');
			const legacy = notes.find((n: any) => n.id === 'legacy-1');
			expect(legacy).toBeTruthy();
			expect(legacy!.type).toBe('context');
			expect(legacy!.scope).toBe('line');
			expect(legacy!.tags).toEqual([]);
		});
	});

	describe('Metadata Updates', () => {
		it('updateNoteMetadata rejects soft-deleted notes', async () => {
			await (storage as any).saveNote({
				id: 'deleted-1',
				content: 'gone',
				author: 'alice',
				filePath: '/abs/x.ts',
				lineRange: { start: 0, end: 0 },
				contentHash: 'sha256:x',
				createdAt: '2026-01-01T00:00:00Z',
				updatedAt: '2026-01-01T00:00:00Z',
				history: [],
				isDeleted: true,
			});

			await expect(noteManager.updateNoteMetadata('deleted-1', { type: 'instruction' })).rejects.toThrow(/deleted/i);
		});

		it('updateNoteMetadata persists fields and returns a defaults-applied note', async () => {
			await (storage as any).saveNote({
				id: 'meta-1',
				content: 'hi',
				author: 'alice',
				filePath: '/abs/x.ts',
				lineRange: { start: 0, end: 0 },
				contentHash: 'sha256:x',
				createdAt: '2026-01-01T00:00:00Z',
				updatedAt: '2026-01-01T00:00:00Z',
				history: [],
			});

			const updated = await noteManager.updateNoteMetadata('meta-1', {
				type: 'instruction',
				priority: 'high',
			});
			expect(updated.type).toBe('instruction');
			expect(updated.priority).toBe('high');
			// Untouched fields come back defaulted, not undefined
			expect(updated.scope).toBe('line');
			expect(updated.tags).toEqual([]);

			// Cache must serve the defaults-applied note too
			const notes = await noteManager.getNotesForFile('/abs/x.ts');
			const cached = notes.find(n => n.id === 'meta-1');
			expect(cached!.type).toBe('instruction');
			expect(cached!.scope).toBe('line');
		});

		it('updateNoteMetadata accepts references and authorType', async () => {
			await (storage as any).saveNote({
				id: 'meta-2',
				content: 'hi',
				author: 'alice',
				filePath: '/abs/x.ts',
				lineRange: { start: 0, end: 0 },
				contentHash: 'sha256:x',
				createdAt: '2026-01-01T00:00:00Z',
				updatedAt: '2026-01-01T00:00:00Z',
				history: [],
			});

			const references = [{ kind: 'pr' as const, value: '#42' }];
			const updated = await noteManager.updateNoteMetadata('meta-2', {
				references,
				authorType: 'agent',
			});
			expect(updated.references).toEqual(references);
			expect(updated.authorType).toBe('agent');
		});
	});

	describe('Locking', () => {
		it('creates and releases the note lock file around a write', async () => {
			const locksDir = path.join(tempDir, '.test-notes', '.locks');
			const lockManager = new LockManager(locksDir, 'test');
			const lockedNoteManager = new NoteManager(storage, hashTracker, gitIntegration, { lockManager });

			const doc = createMockDocument('function test() {}');
			const note = await lockedNoteManager.createNote(
				{ content: 'locked note', filePath: '/test/file.ts', lineRange: { start: 0, end: 0 } },
				doc,
			);

			const lockPath = path.join(locksDir, `${note.id}.lock`);
			const exists = await fs.stat(lockPath).catch(() => null);
			expect(exists).toBeNull();
		});

		it('rejects with lock_timeout when the note lock is already held', async () => {
			const doc = createMockDocument('function test() {}');
			const note = await noteManager.createNote(
				{ content: 'pre-existing note', filePath: '/test/file.ts', lineRange: { start: 0, end: 0 } },
				doc,
			);

			const locksDir = path.join(tempDir, '.test-notes', '.locks');
			await fs.mkdir(locksDir, { recursive: true });
			await fs.writeFile(
				path.join(locksDir, `${note.id}.lock`),
				JSON.stringify({ pid: 99999, ts: new Date().toISOString(), holder: 'other' }),
			);

			const lockManager = new LockManager(locksDir, 'test', { retryMs: 200 });
			const lockedNoteManager = new NoteManager(storage, hashTracker, gitIntegration, { lockManager });

			await expect(
				lockedNoteManager.updateNoteMetadata(note.id, { priority: 'high' }),
			).rejects.toThrow(/lock_timeout/);
		});
	});
});

/**
 * Helper function to create a mock document satisfying NoteDocument
 */
let mockDocumentSeq = 0;

// atPath lets a test model the same file changing over time — notes are keyed
// to uri.fsPath, so "the code moved" needs two documents sharing one path.
function createMockDocument(content: string, atPath?: string): NoteDocument {
	const lines = content.split('\n');
	const filePath = atPath ?? `/test/file-${Date.now()}-${++mockDocumentSeq}.ts`;

	return {
		lineCount: lines.length,
		lineAt: (line: number) => ({ text: lines[line] || '' }),
		uri: { fsPath: filePath },
	};
}
