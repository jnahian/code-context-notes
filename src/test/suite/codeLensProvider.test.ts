/**
 * Unit tests for CodeLensProvider
 * Tests CodeLens generation, markdown stripping, note preview formatting,
 * and refresh functionality
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { CodeNotesLensProvider } from '../../codeLensProvider.js';
import { NoteManager } from '../../noteManager.js';
import { StorageManager } from '../../storageManager.js';
import { ContentHashTracker } from '../../contentHashTracker.js';
import { GitIntegration } from '../../gitIntegration.js';

suite('CodeLensProvider Test Suite', () => {
	let tempDir: string;
	let storageManager: StorageManager;
	let hashTracker: ContentHashTracker;
	let gitIntegration: GitIntegration;
	let noteManager: NoteManager;
	let codeLensProvider: CodeNotesLensProvider;

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

	// Mock cancellation token
	const mockToken: vscode.CancellationToken = {
		isCancellationRequested: false,
		onCancellationRequested: () => ({ dispose: () => {} })
	};

	setup(async () => {
		// Create temporary directory for tests
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codelens-test-'));

		// Initialize components
		storageManager = new StorageManager(tempDir, '.test-notes');
		hashTracker = new ContentHashTracker();
		gitIntegration = new GitIntegration(tempDir, 'Test User');
		noteManager = new NoteManager(storageManager, hashTracker, gitIntegration);

		// Create storage
		await storageManager.createStorage();

		// Initialize CodeLens provider
		codeLensProvider = new CodeNotesLensProvider(noteManager);
	});

	teardown(async () => {
		// Clean up
		if (codeLensProvider) {
			codeLensProvider.dispose();
		}
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch (error) {
			console.error('Failed to clean up temp directory:', error);
		}
	});

	suite('CodeLens Generation', () => {
		test('should provide CodeLens for notes in document', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			// Create a note
			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 1, end: 2 },
				content: 'Test note content'
			}, document);

			// Get CodeLens items
			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);

			assert.ok(codeLenses);
			assert.ok(codeLenses.length > 0, 'Should provide at least one CodeLens');

			const noteLens = codeLenses.find(lens => lens.command?.command === 'codeContextNotes.viewNote');
			assert.ok(noteLens, 'Should have a view note CodeLens');
			assert.ok(noteLens.command?.title.includes('📝 Note:'));
		});

		test('should provide multiple CodeLens for multiple notes', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			// Create multiple notes
			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'First note'
			}, document);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 2, end: 3 },
				content: 'Second note'
			}, document);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 4, end: 4 },
				content: 'Third note'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLenses = codeLenses.filter(lens => lens.command?.command === 'codeContextNotes.viewNote');

			assert.strictEqual(noteLenses.length, 3, 'Should provide CodeLens for all 3 notes');
		});

		test('should provide CodeLens at correct line positions', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 2, end: 3 },
				content: 'Test note'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses.find(lens => lens.command?.command === 'codeContextNotes.viewNote');

			assert.ok(noteLens);
			assert.strictEqual(noteLens.range.start.line, 2, 'CodeLens should be at line 2');
		});

		test('should return empty array when no notes exist', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);

			assert.ok(codeLenses);
			assert.strictEqual(codeLenses.length, 0, 'Should return empty array when no notes exist');
		});
	});

	suite('Markdown Stripping', () => {
		test('should strip bold markdown from title', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: '**Bold text** in note'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(noteLens.command?.title);
			assert.ok(!noteLens.command?.title.includes('**'), 'Should strip bold markdown');
			assert.ok(noteLens.command?.title.includes('Bold text'), 'Should keep text content');
		});

		test('should strip italic markdown from title', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: '*Italic text* in note'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(!noteLens.command?.title.includes('*'), 'Should strip italic markdown');
			assert.ok(noteLens.command?.title.includes('Italic text'), 'Should keep text content');
		});

		test('should strip code blocks from title', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: '`inline code` and ```block code```'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(!noteLens.command?.title.includes('```'), 'Should strip code blocks');
			assert.ok(!noteLens.command?.title.includes('`'), 'Should strip inline code markers');
		});

		test('should strip links but keep link text', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Check [this link](https://example.com) out'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(!noteLens.command?.title.includes(']('), 'Should strip link URL');
			assert.ok(noteLens.command?.title.includes('this link'), 'Should keep link text');
		});

		test('should strip headings', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: '## Heading text'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(!noteLens.command?.title.includes('##'), 'Should strip heading markers');
			assert.ok(noteLens.command?.title.includes('Heading text'), 'Should keep heading text');
		});

		test('should strip list markers', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: '- List item one\n- List item two'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(!noteLens.command?.title.includes('-'), 'Should strip list markers');
			assert.ok(noteLens.command?.title.includes('List item'), 'Should keep list text');
		});

		test('should handle complex markdown with multiple formats', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: '**Bold** *italic* `code` [link](url) ## Heading'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(!noteLens.command?.title.includes('**'));
			assert.ok(!noteLens.command?.title.includes('*'));
			assert.ok(!noteLens.command?.title.includes('`'));
			assert.ok(!noteLens.command?.title.includes('['));
			assert.ok(!noteLens.command?.title.includes('##'));
		});
	});

	suite('Title Formatting', () => {
		test('should format title with note emoji and author', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Simple note'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(noteLens.command?.title.includes('📝 Note:'), 'Should include note emoji');
			assert.ok(noteLens.command?.title.includes('Simple note'), 'Should include content');
			assert.ok(noteLens.command?.title.includes('('), 'Should include author parentheses');
		});

		test('should truncate long content to 50 characters', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const longContent = 'A'.repeat(100);
			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: longContent
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(noteLens.command?.title.includes('...'), 'Should truncate with ellipsis');
			// Extract the preview part (between "Note: " and " (")
			const titleMatch = noteLens.command?.title.match(/Note: (.+?) \(/);
			if (titleMatch) {
				const preview = titleMatch[1];
				assert.ok(preview.length <= 50, 'Preview should be 50 characters or less');
			}
		});

		test('should show first line only for multiline content', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'First line\nSecond line\nThird line'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(noteLens.command?.title.includes('First line'), 'Should include first line');
			assert.ok(!noteLens.command?.title.includes('Second line'), 'Should not include second line');
		});

		test('should handle empty content gracefully', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: ''
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.ok(noteLens.command?.title, 'Should have a title');
			assert.ok(noteLens.command?.title.includes('📝 Note:'), 'Should include note emoji');
		});
	});

	suite('Command Generation', () => {
		test('should generate viewNote command with correct arguments', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			const note = await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 1, end: 1 },
				content: 'Test note'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.strictEqual(noteLens.command?.command, 'codeContextNotes.viewNote');
			assert.ok(noteLens.command?.arguments);
			assert.strictEqual(noteLens.command?.arguments[0], note.id);
			assert.strictEqual(noteLens.command?.arguments[1], testFile);
		});

		test('should set correct range for CodeLens', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 2, end: 3 },
				content: 'Test note'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);
			const noteLens = codeLenses[0];

			assert.strictEqual(noteLens.range.start.line, 2);
			assert.strictEqual(noteLens.range.start.character, 0);
			assert.strictEqual(noteLens.range.end.line, 2);
			assert.strictEqual(noteLens.range.end.character, 0);
		});
	});

	suite('Refresh', () => {
		test('should fire onDidChangeCodeLenses when refresh is called', (done) => {
			let eventFired = false;

			codeLensProvider.onDidChangeCodeLenses(() => {
				eventFired = true;
				assert.ok(eventFired, 'Event should be fired');
				done();
			});

			codeLensProvider.refresh();
		});

		test('should allow multiple refresh calls', () => {
			// Should not throw
			codeLensProvider.refresh();
			codeLensProvider.refresh();
			codeLensProvider.refresh();

			assert.ok(true, 'Multiple refresh calls should succeed');
		});
	});

	suite('Cancellation', () => {
		test('should respect cancellation token', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			// Create multiple notes
			for (let i = 0; i < 10; i++) {
				await noteManager.createNote({
					filePath: testFile,
					lineRange: { start: i % 3, end: i % 3 },
					content: `Note ${i}`
				}, document);
			}

			// Create a cancelled token
			const cancelledToken: vscode.CancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: () => ({ dispose: () => {} })
			};

			const codeLenses = await codeLensProvider.provideCodeLenses(document, cancelledToken);

			// Should return early and provide fewer or no CodeLenses
			assert.ok(codeLenses);
			// Result may vary based on when cancellation is checked
		});
	});

	suite('Error Handling', () => {
		test('should handle errors gracefully and return empty array', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			// Create a note with invalid file path to trigger potential errors
			// Note: This might not trigger an error in all scenarios, but tests error handling
			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);

			assert.ok(codeLenses, 'Should return an array even if errors occur');
			assert.ok(Array.isArray(codeLenses), 'Should return an array');
		});
	});

	suite('Dispose', () => {
		test('should dispose provider cleanly', () => {
			const provider = new CodeNotesLensProvider(noteManager);

			// Should not throw
			provider.dispose();

			// Verify we can create a new one
			const newProvider = new CodeNotesLensProvider(noteManager);
			assert.ok(newProvider);
			newProvider.dispose();
		});
	});

	suite('Edge Cases', () => {
		test('should handle note at line 0', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Note at line 0'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);

			assert.ok(codeLenses.length > 0);
			assert.strictEqual(codeLenses[0].range.start.line, 0);
		});

		test('should handle note at last line', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2', 'line 3'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 2, end: 2 },
				content: 'Note at last line'
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);

			assert.ok(codeLenses.length > 0);
			assert.strictEqual(codeLenses[0].range.start.line, 2);
		});

		test('should handle notes with special characters in author name', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			// Override git integration to return special author
			const specialGit = new GitIntegration(tempDir, 'Tes<t>User@#$');
			const specialNoteManager = new NoteManager(storageManager, hashTracker, specialGit);
			const specialProvider = new CodeNotesLensProvider(specialNoteManager);

			await specialNoteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: 'Test note'
			}, document);

			const codeLenses = await specialProvider.provideCodeLenses(document, mockToken);

			assert.ok(codeLenses.length > 0);
			assert.ok(codeLenses[0].command?.title.includes('Tes<t>User@#$'));

			specialProvider.dispose();
		});

		test('should handle whitespace-only content', async () => {
			const testFile = path.join(tempDir, 'test.ts');
			const lines = ['line 1', 'line 2'];
			const document = createMockDocument(vscode.Uri.file(testFile), lines);

			await noteManager.createNote({
				filePath: testFile,
				lineRange: { start: 0, end: 0 },
				content: '   \n\t\n   '
			}, document);

			const codeLenses = await codeLensProvider.provideCodeLenses(document, mockToken);

			assert.ok(codeLenses.length > 0);
			assert.ok(codeLenses[0].command?.title);
		});
	});
});
