/**
 * Unit tests for NotesSidebarProvider
 * Tests tree view provider functionality, sorting, and event handling
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { NotesSidebarProvider } from '../../notesSidebarProvider.js';
import { NoteManager } from '../../noteManager.js';
import { RootTreeItem, FileTreeItem, NoteTreeItem } from '../../noteTreeItem.js';
import { Note } from '../../types.js';

suite('NotesSidebarProvider Test Suite', () => {
	let provider: NotesSidebarProvider;
	let mockNoteManager: MockNoteManager;
	let mockContext: vscode.ExtensionContext;
	const workspaceRoot = '/workspace';

	/**
	 * Mock NoteManager for testing
	 */
	class MockNoteManager extends EventEmitter {
		private notes: Map<string, Note[]> = new Map();

		constructor() {
			super();
		}

		setNotes(notes: Note[]): void {
			this.notes.clear();
			for (const note of notes) {
				const existing = this.notes.get(note.filePath) || [];
				existing.push(note);
				this.notes.set(note.filePath, existing);
			}
		}

		async getNoteCount(): Promise<number> {
			let count = 0;
			for (const notes of this.notes.values()) {
				count += notes.length;
			}
			return count;
		}

		async getNotesByFile(): Promise<Map<string, Note[]>> {
			// Sort notes by line number for each file
			const sortedMap = new Map<string, Note[]>();
			for (const [filePath, notes] of this.notes.entries()) {
				const sorted = [...notes].sort((a, b) => a.lineRange.start - b.lineRange.start);
				sortedMap.set(filePath, sorted);
			}
			return sortedMap;
		}

		on(event: string, listener: (...args: any[]) => void): this {
			return super.on(event, listener);
		}
	}

	/**
	 * Mock ExtensionContext
	 */
	function createMockContext(): vscode.ExtensionContext {
		return {
			subscriptions: [],
			workspaceState: {
				get: () => undefined,
				update: async () => undefined,
				keys: () => []
			},
			globalState: {
				get: () => undefined,
				update: async () => undefined,
				keys: () => [],
				setKeysForSync: () => undefined
			},
			extensionPath: '/extension',
			extensionUri: vscode.Uri.file('/extension'),
			storagePath: '/storage',
			globalStoragePath: '/global-storage',
			logPath: '/logs',
			extensionMode: vscode.ExtensionMode.Test,
			asAbsolutePath: (p: string) => p,
			storageUri: vscode.Uri.file('/storage'),
			globalStorageUri: vscode.Uri.file('/global-storage'),
			logUri: vscode.Uri.file('/logs'),
			secrets: {} as any,
			extension: {} as any,
			environmentVariableCollection: {} as any,
			languageModelAccessInformation: {} as any
		} as vscode.ExtensionContext;
	}

	setup(() => {
		mockNoteManager = new MockNoteManager();
		mockContext = createMockContext();
		provider = new NotesSidebarProvider(
			mockNoteManager as any,
			workspaceRoot,
			mockContext
		);
	});

	suite('getTreeItem()', () => {
		test('should return RootTreeItem as-is', () => {
			const rootItem = new RootTreeItem(5);
			const result = provider.getTreeItem(rootItem);
			assert.strictEqual(result, rootItem);
		});

		test('should return FileTreeItem as-is', () => {
			const fileItem = new FileTreeItem('/workspace/file.ts', [], workspaceRoot);
			const result = provider.getTreeItem(fileItem);
			assert.strictEqual(result, fileItem);
		});

		test('should return NoteTreeItem as-is', () => {
			const mockNote: Note = {
				id: 'test',
				content: 'Test',
				author: 'Author',
				filePath: '/workspace/file.ts',
				lineRange: { start: 0, end: 0 },
				contentHash: 'hash',
				createdAt: '2023-01-01T00:00:00.000Z',
				updatedAt: '2023-01-01T00:00:00.000Z',
				history: [],
				isDeleted: false
			};
			const noteItem = new NoteTreeItem(mockNote);
			const result = provider.getTreeItem(noteItem);
			assert.strictEqual(result, noteItem);
		});
	});

	suite('getChildren() - root level', () => {
		test('should return empty array when no notes exist', async () => {
			mockNoteManager.setNotes([]);
			const children = await provider.getChildren();
			assert.strictEqual(children.length, 0);
		});

		test('should return RootTreeItem when notes exist', async () => {
			const notes: Note[] = [
				createMockNote('note1', '/workspace/file1.ts', 0),
				createMockNote('note2', '/workspace/file2.ts', 0)
			];
			mockNoteManager.setNotes(notes);

			const children = await provider.getChildren();
			assert.strictEqual(children.length, 1);
			assert.ok(children[0] instanceof RootTreeItem);
		});

		test('should show correct note count in RootTreeItem', async () => {
			const notes: Note[] = [
				createMockNote('note1', '/workspace/file1.ts', 0),
				createMockNote('note2', '/workspace/file2.ts', 0),
				createMockNote('note3', '/workspace/file2.ts', 5)
			];
			mockNoteManager.setNotes(notes);

			const children = await provider.getChildren();
			const rootItem = children[0] as RootTreeItem;
			assert.strictEqual(rootItem.noteCount, 3);
		});
	});

	suite('getChildren() - root node', () => {
		test('should return file nodes for root node', async () => {
			const notes: Note[] = [
				createMockNote('note1', '/workspace/file1.ts', 0),
				createMockNote('note2', '/workspace/file2.ts', 0)
			];
			mockNoteManager.setNotes(notes);

			const rootItem = new RootTreeItem(2);
			const children = await provider.getChildren(rootItem);

			assert.strictEqual(children.length, 2);
			assert.ok(children.every(item => item instanceof FileTreeItem));
		});

		test('should sort files alphabetically by default', async () => {
			const notes: Note[] = [
				createMockNote('note1', '/workspace/zebra.ts', 0),
				createMockNote('note2', '/workspace/alpha.ts', 0),
				createMockNote('note3', '/workspace/beta.ts', 0)
			];
			mockNoteManager.setNotes(notes);

			const rootItem = new RootTreeItem(3);
			const children = await provider.getChildren(rootItem);
			const fileItems = children as FileTreeItem[];

			assert.strictEqual(fileItems[0].filePath, '/workspace/alpha.ts');
			assert.strictEqual(fileItems[1].filePath, '/workspace/beta.ts');
			assert.strictEqual(fileItems[2].filePath, '/workspace/zebra.ts');
		});

		test('should not return files with no notes', async () => {
			const notes: Note[] = [
				createMockNote('note1', '/workspace/file1.ts', 0)
			];
			mockNoteManager.setNotes(notes);

			const rootItem = new RootTreeItem(1);
			const children = await provider.getChildren(rootItem);

			assert.strictEqual(children.length, 1);
			assert.strictEqual((children[0] as FileTreeItem).filePath, '/workspace/file1.ts');
		});

		test('should include note count in file labels', async () => {
			const notes: Note[] = [
				createMockNote('note1', '/workspace/file1.ts', 0),
				createMockNote('note2', '/workspace/file1.ts', 5),
				createMockNote('note3', '/workspace/file1.ts', 10)
			];
			mockNoteManager.setNotes(notes);

			const rootItem = new RootTreeItem(3);
			const children = await provider.getChildren(rootItem);
			const fileItem = children[0] as FileTreeItem;

			assert.ok(typeof fileItem.label === 'string' && fileItem.label.includes('(3)'));
		});
	});

	suite('getChildren() - file node', () => {
		test('should return note nodes for file node', async () => {
			const notes: Note[] = [
				createMockNote('note1', '/workspace/file1.ts', 0),
				createMockNote('note2', '/workspace/file1.ts', 5)
			];
			mockNoteManager.setNotes(notes);

			const fileItem = new FileTreeItem('/workspace/file1.ts', notes, workspaceRoot);
			const children = await provider.getChildren(fileItem);

			assert.strictEqual(children.length, 2);
			assert.ok(children.every(item => item instanceof NoteTreeItem));
		});

		test('should sort notes by line number', async () => {
			const notes: Note[] = [
				createMockNote('note1', '/workspace/file1.ts', 10, 10),
				createMockNote('note2', '/workspace/file1.ts', 5, 5),
				createMockNote('note3', '/workspace/file1.ts', 0, 0)
			];
			mockNoteManager.setNotes(notes);

			const fileItem = new FileTreeItem('/workspace/file1.ts', notes, workspaceRoot);
			const children = await provider.getChildren(fileItem);
			const noteItems = children as NoteTreeItem[];

			// Notes should be sorted by line number (start)
			assert.strictEqual(noteItems[0].note.id, 'note3'); // line 0
			assert.strictEqual(noteItems[1].note.id, 'note2'); // line 5
			assert.strictEqual(noteItems[2].note.id, 'note1'); // line 10
		});

		test('should return empty array for file with no notes', async () => {
			const fileItem = new FileTreeItem('/workspace/file1.ts', [], workspaceRoot);
			const children = await provider.getChildren(fileItem);
			assert.strictEqual(children.length, 0);
		});
	});

	suite('getChildren() - note node', () => {
		test('should return empty array for note node (leaf node)', async () => {
			const note = createMockNote('note1', '/workspace/file1.ts', 0);
			const noteItem = new NoteTreeItem(note);
			const children = await provider.getChildren(noteItem);
			assert.strictEqual(children.length, 0);
		});
	});

	suite('refresh()', () => {
		test('should fire tree data change event after debounce delay', async () => {
			let eventFired = false;
			provider.onDidChangeTreeData(() => {
				eventFired = true;
			});

			provider.refresh();

			// Event should not fire immediately
			assert.strictEqual(eventFired, false);

			// Wait for debounce delay (300ms + buffer)
			await new Promise(resolve => setTimeout(resolve, 350));

			// Event should have fired
			assert.strictEqual(eventFired, true);
		});

		test('should debounce multiple rapid refresh calls', async () => {
			let eventCount = 0;
			provider.onDidChangeTreeData(() => {
				eventCount++;
			});

			// Call refresh multiple times rapidly
			provider.refresh();
			provider.refresh();
			provider.refresh();
			provider.refresh();

			// Wait for debounce delay
			await new Promise(resolve => setTimeout(resolve, 350));

			// Event should have fired only once due to debouncing
			assert.strictEqual(eventCount, 1);
		});

		test('should reset debounce timer on subsequent calls', async () => {
			let eventCount = 0;
			provider.onDidChangeTreeData(() => {
				eventCount++;
			});

			// First call
			provider.refresh();

			// Wait 200ms (less than debounce delay)
			await new Promise(resolve => setTimeout(resolve, 200));

			// Second call resets timer
			provider.refresh();

			// Wait another 200ms
			await new Promise(resolve => setTimeout(resolve, 200));

			// Event should not have fired yet (timer was reset)
			assert.strictEqual(eventCount, 0);

			// Wait remaining time
			await new Promise(resolve => setTimeout(resolve, 200));

			// Event should have fired once
			assert.strictEqual(eventCount, 1);
		});
	});

	suite('Event listeners', () => {
		test('should refresh on noteChanged event', async () => {
			let refreshCalled = false;
			provider.onDidChangeTreeData(() => {
				refreshCalled = true;
			});

			// Emit noteChanged event
			mockNoteManager.emit('noteChanged');

			// Wait for debounce
			await new Promise(resolve => setTimeout(resolve, 350));

			assert.strictEqual(refreshCalled, true);
		});

		test('should refresh on noteFileChanged event', async () => {
			let refreshCalled = false;
			provider.onDidChangeTreeData(() => {
				refreshCalled = true;
			});

			// Emit noteFileChanged event
			mockNoteManager.emit('noteFileChanged');

			// Wait for debounce
			await new Promise(resolve => setTimeout(resolve, 350));

			assert.strictEqual(refreshCalled, true);
		});
	});
});

/**
 * Helper to create a mock note
 */
function createMockNote(
	id: string,
	filePath: string,
	lineStart: number,
	lineEnd?: number
): Note {
	return {
		id,
		content: `Note content for ${id}`,
		author: 'Test Author',
		filePath,
		lineRange: { start: lineStart, end: lineEnd ?? lineStart },
		contentHash: `hash-${id}`,
		createdAt: '2023-01-01T00:00:00.000Z',
		updatedAt: '2023-01-01T00:00:00.000Z',
		history: [],
		isDeleted: false
	};
}
