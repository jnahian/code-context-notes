/**
 * Unit tests for NoteTreeItem classes
 * Tests tree item creation and utility methods
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { RootTreeItem, FileTreeItem, NoteTreeItem } from '../../noteTreeItem.js';
import { Note } from '../../types.js';

suite('NoteTreeItem Test Suite', () => {
	suite('NoteTreeItem.stripMarkdown()', () => {
		test('should remove bold text with **', () => {
			const input = 'This is **bold** text';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'This is bold text');
		});

		test('should remove bold text with __', () => {
			const input = 'This is __bold__ text';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'This is bold text');
		});

		test('should remove italic text with *', () => {
			const input = 'This is *italic* text';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'This is italic text');
		});

		test('should remove italic text with _', () => {
			const input = 'This is _italic_ text';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'This is italic text');
		});

		test('should remove inline code with `', () => {
			const input = 'This is `code` text';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'This is code text');
		});

		test('should remove code blocks with ```', () => {
			const input = 'Text before\n```javascript\nconst x = 1;\n```\nText after';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'Text before Text after');
		});

		test('should remove links but keep text', () => {
			const input = 'Check [this link](https://example.com) out';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'Check this link out');
		});

		test('should remove images', () => {
			const input = 'See ![alt text](image.png) here';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'See alt text here');
		});

		test('should remove heading markers', () => {
			const input = '# Heading 1\n## Heading 2\nText';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'Heading 1 Heading 2 Text');
		});

		test('should remove unordered list markers with -', () => {
			const input = '- Item 1\n- Item 2';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'Item 1 Item 2');
		});

		test('should remove unordered list markers with *', () => {
			const input = '* Item 1\n* Item 2';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'Item 1 Item 2');
		});

		test('should remove ordered list markers', () => {
			const input = '1. Item 1\n2. Item 2';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'Item 1 Item 2');
		});

		test('should remove strikethrough text', () => {
			const input = 'This is ~~strikethrough~~ text';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'This is strikethrough text');
		});

		test('should remove blockquote markers', () => {
			const input = '> This is a quote\n> Another line';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'This is a quote Another line');
		});

		test('should handle mixed formatting', () => {
			const input = '**Bold** and *italic* with `code` and [link](url)';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'Bold and italic with code and link');
		});

		test('should normalize whitespace', () => {
			const input = 'Text  with   multiple    spaces';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'Text with multiple spaces');
		});

		test('should trim whitespace', () => {
			const input = '  Text with leading and trailing spaces  ';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'Text with leading and trailing spaces');
		});

		test('should return plain text unchanged', () => {
			const input = 'This is plain text';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, 'This is plain text');
		});

		test('should handle empty string', () => {
			const input = '';
			const output = NoteTreeItem.stripMarkdown(input);
			assert.strictEqual(output, '');
		});
	});

	suite('NoteTreeItem.truncateText()', () => {
		test('should not truncate text shorter than maxLength', () => {
			const input = 'Short text';
			const output = NoteTreeItem.truncateText(input, 20);
			assert.strictEqual(output, 'Short text');
		});

		test('should not truncate text equal to maxLength', () => {
			const input = 'Exactly twenty chars';
			const output = NoteTreeItem.truncateText(input, 20);
			assert.strictEqual(output, 'Exactly twenty chars');
		});

		test('should truncate text longer than maxLength with ellipsis', () => {
			const input = 'This is a very long text that needs to be truncated';
			const output = NoteTreeItem.truncateText(input, 20);
			assert.strictEqual(output, 'This is a very lo...');
			assert.strictEqual(output.length, 20);
		});

		test('should handle maxLength of 0', () => {
			const input = 'Text';
			const output = NoteTreeItem.truncateText(input, 0);
			assert.strictEqual(output, '');
		});

		test('should handle maxLength of 3 (minimum for ellipsis)', () => {
			const input = 'Text';
			const output = NoteTreeItem.truncateText(input, 3);
			assert.strictEqual(output, '...');
		});

		test('should handle empty string', () => {
			const input = '';
			const output = NoteTreeItem.truncateText(input, 10);
			assert.strictEqual(output, '');
		});

		test('should handle single character', () => {
			const input = 'A';
			const output = NoteTreeItem.truncateText(input, 10);
			assert.strictEqual(output, 'A');
		});
	});

	suite('NoteTreeItem constructor', () => {
		let mockNote: Note;

		setup(() => {
			mockNote = {
				id: 'test-note-id',
				content: '**This is a test note** with some markdown',
				author: 'Test Author',
				filePath: '/test/file.ts',
				lineRange: { start: 5, end: 7 },
				contentHash: 'abc123',
				createdAt: '2023-01-01T00:00:00.000Z',
				updatedAt: '2023-01-02T00:00:00.000Z',
				history: [],
				isDeleted: false
			};
		});

		test('should create tree item with correct label format', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			assert.ok(treeItem.label);
			assert.ok((treeItem.label as string).startsWith('Line 6:')); // Line 6 because start is 5 (0-based) + 1
			assert.ok((treeItem.label as string).includes('This is a test note')); // markdown stripped
		});

		test('should show 1-based line number in label', () => {
			mockNote.lineRange = { start: 0, end: 0 };
			const treeItem = new NoteTreeItem(mockNote, 50);
			assert.ok((treeItem.label as string).startsWith('Line 1:'));
		});

		test('should strip markdown from preview in label', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			const label = treeItem.label as string;
			assert.ok(!label.includes('**')); // bold markers removed
			assert.ok(label.includes('This is a test note')); // text preserved
		});

		test('should truncate preview text in label', () => {
			mockNote.content = 'A'.repeat(100); // Very long content
			const treeItem = new NoteTreeItem(mockNote, 30);
			const label = treeItem.label as string;
			// Label should be "Line X: " + truncated text
			// The preview part should be truncated to 30 chars
			assert.ok(label.includes('...'));
		});

		test('should set description to author name', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			assert.strictEqual(treeItem.description, 'Test Author');
		});

		test('should set contextValue to noteNode', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			assert.strictEqual(treeItem.contextValue, 'noteNode');
		});

		test('should set icon to note', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			assert.ok(treeItem.iconPath);
			assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
			assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'note');
		});

		test('should set collapsible state to None', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
		});

		test('should configure command to open note', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			assert.ok(treeItem.command);
			assert.strictEqual(treeItem.command!.command, 'codeContextNotes.openNoteFromSidebar');
			assert.strictEqual(treeItem.command!.title, 'Go to Note');
			assert.deepStrictEqual(treeItem.command!.arguments, [mockNote]);
		});

		test('should create tooltip with full note content', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			assert.ok(treeItem.tooltip);
			assert.ok(treeItem.tooltip instanceof vscode.MarkdownString);
			const tooltipMd = treeItem.tooltip as vscode.MarkdownString;
			assert.ok(tooltipMd.value.includes('Lines 6-8')); // 1-based line range
			assert.ok(tooltipMd.value.includes('Test Author'));
			assert.ok(tooltipMd.value.includes(mockNote.content)); // Full content preserved
		});

		test('should set tooltip as trusted', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			const tooltipMd = treeItem.tooltip as vscode.MarkdownString;
			assert.strictEqual(tooltipMd.isTrusted, true);
		});

		test('should enable HTML support in tooltip', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			const tooltipMd = treeItem.tooltip as vscode.MarkdownString;
			assert.strictEqual(tooltipMd.supportHtml, true);
		});

		test('should use default preview length when not specified', () => {
			const treeItem = new NoteTreeItem(mockNote); // No preview length specified
			// Should use default of 50 as per constructor default parameter
			assert.ok(treeItem.label);
		});

		test('should set itemType to note', () => {
			const treeItem = new NoteTreeItem(mockNote, 50);
			assert.strictEqual(treeItem.itemType, 'note');
		});
	});

	suite('FileTreeItem constructor', () => {
		let mockNotes: Note[];
		const workspaceRoot = '/workspace';

		setup(() => {
			mockNotes = [
				{
					id: 'note1',
					content: 'Note 1',
					author: 'Author 1',
					filePath: '/workspace/src/file.ts',
					lineRange: { start: 0, end: 0 },
					contentHash: 'hash1',
					createdAt: '2023-01-01T00:00:00.000Z',
					updatedAt: '2023-01-01T00:00:00.000Z',
					history: [],
					isDeleted: false
				},
				{
					id: 'note2',
					content: 'Note 2',
					author: 'Author 2',
					filePath: '/workspace/src/file.ts',
					lineRange: { start: 5, end: 5 },
					contentHash: 'hash2',
					createdAt: '2023-01-02T00:00:00.000Z',
					updatedAt: '2023-01-02T00:00:00.000Z',
					history: [],
					isDeleted: false
				}
			];
		});

		test('should create tree item with label showing relative path and note count', () => {
			const treeItem = new FileTreeItem('/workspace/src/file.ts', mockNotes, workspaceRoot);
			assert.strictEqual(treeItem.label, 'src/file.ts (2)');
		});

		test('should show single note count correctly', () => {
			const treeItem = new FileTreeItem('/workspace/src/file.ts', [mockNotes[0]], workspaceRoot);
			assert.strictEqual(treeItem.label, 'src/file.ts (1)');
		});

		test('should handle file in workspace root', () => {
			const treeItem = new FileTreeItem('/workspace/README.md', mockNotes, workspaceRoot);
			assert.strictEqual(treeItem.label, 'README.md (2)');
		});

		test('should set collapsible state to Collapsed', () => {
			const treeItem = new FileTreeItem('/workspace/src/file.ts', mockNotes, workspaceRoot);
			assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
		});

		test('should set contextValue to fileNode', () => {
			const treeItem = new FileTreeItem('/workspace/src/file.ts', mockNotes, workspaceRoot);
			assert.strictEqual(treeItem.contextValue, 'fileNode');
		});

		test('should set tooltip to absolute file path', () => {
			const treeItem = new FileTreeItem('/workspace/src/file.ts', mockNotes, workspaceRoot);
			assert.strictEqual(treeItem.tooltip, '/workspace/src/file.ts');
		});

		test('should set resourceUri for language-specific icon', () => {
			const treeItem = new FileTreeItem('/workspace/src/file.ts', mockNotes, workspaceRoot);
			assert.ok(treeItem.resourceUri);
			assert.strictEqual(treeItem.resourceUri!.fsPath, '/workspace/src/file.ts');
		});

		test('should store notes array', () => {
			const treeItem = new FileTreeItem('/workspace/src/file.ts', mockNotes, workspaceRoot);
			assert.strictEqual(treeItem.notes.length, 2);
			assert.strictEqual(treeItem.notes[0].id, 'note1');
			assert.strictEqual(treeItem.notes[1].id, 'note2');
		});

		test('should store file path', () => {
			const treeItem = new FileTreeItem('/workspace/src/file.ts', mockNotes, workspaceRoot);
			assert.strictEqual(treeItem.filePath, '/workspace/src/file.ts');
		});

		test('should set itemType to file', () => {
			const treeItem = new FileTreeItem('/workspace/src/file.ts', mockNotes, workspaceRoot);
			assert.strictEqual(treeItem.itemType, 'file');
		});
	});

	suite('RootTreeItem constructor', () => {
		test('should create tree item with label showing note count', () => {
			const treeItem = new RootTreeItem(10);
			assert.strictEqual(treeItem.label, 'Code Notes (10)');
		});

		test('should handle zero notes', () => {
			const treeItem = new RootTreeItem(0);
			assert.strictEqual(treeItem.label, 'Code Notes (0)');
		});

		test('should handle single note', () => {
			const treeItem = new RootTreeItem(1);
			assert.strictEqual(treeItem.label, 'Code Notes (1)');
		});

		test('should set collapsible state to Expanded', () => {
			const treeItem = new RootTreeItem(10);
			assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
		});

		test('should set contextValue to rootNode', () => {
			const treeItem = new RootTreeItem(10);
			assert.strictEqual(treeItem.contextValue, 'rootNode');
		});

		test('should set icon to folder', () => {
			const treeItem = new RootTreeItem(10);
			assert.ok(treeItem.iconPath);
			assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
			assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'folder');
		});

		test('should set tooltip with total note count', () => {
			const treeItem = new RootTreeItem(10);
			assert.strictEqual(treeItem.tooltip, 'Total notes in workspace: 10');
		});

		test('should set itemType to root', () => {
			const treeItem = new RootTreeItem(10);
			assert.strictEqual(treeItem.itemType, 'root');
		});

		test('should store note count', () => {
			const treeItem = new RootTreeItem(10);
			assert.strictEqual(treeItem.noteCount, 10);
		});
	});
});
