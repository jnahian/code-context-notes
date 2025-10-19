/**
 * Extension entry point for Code Context Notes
 */

import * as vscode from 'vscode';
import { StorageManager } from './storageManager.js';
import { ContentHashTracker } from './contentHashTracker.js';
import { GitIntegration } from './gitIntegration.js';
import { NoteManager } from './noteManager.js';
import { CommentController } from './commentController.js';
import { CodeNotesLensProvider } from './codeLensProvider.js';

let noteManager: NoteManager;
let commentController: CommentController;
let codeLensProvider: CodeNotesLensProvider;

// Debounce timers for performance optimization
const documentChangeTimers: Map<string, NodeJS.Timeout> = new Map();
const DEBOUNCE_DELAY = 500; // ms

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext) {
	console.log('Code Context Notes extension is activating...');
	console.log('Code Context Notes: Extension version 0.1.3');

	try {
		// Always register all commands first (even without workspace)
		// This ensures commands are available immediately
		console.log('Code Context Notes: Registering all commands...');
		registerAllCommands(context);
		console.log('Code Context Notes: All commands registered successfully!');
	} catch (error) {
		console.error('Code Context Notes: FAILED to register commands:', error);
		vscode.window.showErrorMessage(`Code Context Notes failed to activate: ${error}`);
		throw error;
	}

	// Get workspace folder
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		console.log('Code Context Notes: No workspace folder found. Extension partially activated. Open a folder to use full functionality.');
		vscode.window.showInformationMessage('Code Context Notes: Commands are available. Open a folder to use note features.');
		return;
	}

	const workspaceRoot = workspaceFolder.uri.fsPath;

	// Get configuration
	const config = vscode.workspace.getConfiguration('codeContextNotes');
	const storageDirectory = config.get<string>('storageDirectory', '.code-notes');
	const authorName = config.get<string>('authorName', '');
	const showCodeLens = config.get<boolean>('showCodeLens', true);

	// Initialize components
	const storage = new StorageManager(workspaceRoot, storageDirectory);
	const hashTracker = new ContentHashTracker();
	const gitIntegration = new GitIntegration(workspaceRoot, authorName);

	// Create storage directory
	await storage.createStorage();

	// Initialize note manager
	noteManager = new NoteManager(storage, hashTracker, gitIntegration);

	// Initialize comment controller
	commentController = new CommentController(noteManager, context);

	// Initialize CodeLens provider
	codeLensProvider = new CodeNotesLensProvider(noteManager);

	// Register CodeLens provider (if enabled)
	if (showCodeLens) {
		const codeLensDisposable = vscode.languages.registerCodeLensProvider(
			{ scheme: 'file' },
			codeLensProvider
		);
		context.subscriptions.push(codeLensDisposable);
	}

	// Set up event listeners
	setupEventListeners(context);

	// Load existing notes for open documents
	for (const document of vscode.window.visibleTextEditors.map(e => e.document)) {
		if (document.uri.scheme === 'file') {
			await commentController.loadCommentsForDocument(document);
		}
	}

	// Listen for selection changes to update CodeLens
	vscode.window.onDidChangeTextEditorSelection((event) => {
		codeLensProvider.refresh();
	}, null, context.subscriptions);

	console.log('Code Context Notes extension is now active!');
}

/**
 * Helper function to show markdown formatting help
 */
async function showMarkdownHelp() {
	const helpText = `# Markdown Formatting Guide

## Text Formatting
- **Bold**: \`**text**\` or \`__text__\`
- *Italic*: \`*text*\` or \`_text_\`
- \`Code\`: \`\`code\`\`
- ~~Strikethrough~~: \`~~text~~\`

## Headings
\`# Heading 1\`
\`## Heading 2\`
\`### Heading 3\`

## Lists
**Unordered:**
\`- Item 1\`
\`- Item 2\`

**Ordered:**
\`1. First\`
\`2. Second\`

## Links & Images
\`[Link text](url)\`
\`![Alt text](image-url)\`

## Code Blocks
\`\`\`
Code block
\`\`\`

\`\`\`javascript
const x = 1;
\`\`\`

## Quotes
\`> Quote text\`

## Tables
\`| Col1 | Col2 |\`
\`|------|------|\`
\`| A    | B    |\`

**Keyboard Shortcuts:**
- Bold: Ctrl/Cmd+B
- Italic: Ctrl/Cmd+I
- Code: Ctrl/Cmd+Shift+C
- Code Block: Ctrl/Cmd+Shift+K
- Link: Ctrl/Cmd+K`;

	const doc = await vscode.workspace.openTextDocument({
		content: helpText,
		language: 'markdown'
	});
	await vscode.window.showTextDocument(doc);
}

/**
 * Register all extension commands
 * Note: Commands are registered even without a workspace, but many will show
 * error messages if workspace-dependent features (noteManager, commentController) are not initialized
 */
function registerAllCommands(context: vscode.ExtensionContext) {
	// Add Note to Selection (via command palette or keyboard shortcut)
	const addNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.addNote',
		async () => {
			if (!noteManager || !commentController) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			const selection = editor.selection;
			if (selection.isEmpty) {
				vscode.window.showErrorMessage('Please select the code you want to annotate');
				return;
			}

			try {
				// Open comment editor UI (modern approach)
				const range = new vscode.Range(selection.start.line, 0, selection.end.line, 0);
				await commentController.openCommentEditor(editor.document, range);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to open comment editor: ${error}`);
			}
		}
	);

	// Add Note via CodeLens (opens comment editor)
	const addNoteViaCodeLensCommand = vscode.commands.registerCommand(
		'codeContextNotes.addNoteViaCodeLens',
		async (document: vscode.TextDocument, selection: vscode.Selection) => {
			if (!commentController) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}
			try {
				const range = new vscode.Range(selection.start.line, 0, selection.end.line, 0);
				await commentController.openCommentEditor(document, range);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to open comment editor: ${error}`);
			}
		}
	);

	// View Note
	const viewNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.viewNote',
		async (noteId: string, filePath: string) => {
			if (!commentController) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}
			try {
				// Focus and expand the comment thread instead of opening a new document
				await commentController.focusNoteThread(noteId, filePath);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to view note: ${error}`);
			}
		}
	);

	// Delete Note at Cursor
	const deleteNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.deleteNote',
		async () => {
			if (!noteManager || !commentController) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			const filePath = editor.document.uri.fsPath;
			const line = editor.selection.active.line;

			// Find note at current line
			const notes = await noteManager.getNotesForFile(filePath);
			const note = notes.find(n =>
				line >= n.lineRange.start && line <= n.lineRange.end
			);

			if (!note) {
				vscode.window.showErrorMessage('No note found at cursor position');
				return;
			}

			// Confirm deletion
			const confirm = await vscode.window.showWarningMessage(
				`Delete note: "${note.content.substring(0, 50)}..."?`,
				'Delete',
				'Cancel'
			);

			if (confirm !== 'Delete') {
				return;
			}

			try {
				await commentController.handleDeleteNote(note.id, filePath);
				codeLensProvider.refresh();
				vscode.window.showInformationMessage('Note deleted successfully!');
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to delete note: ${error}`);
			}
		}
	);

	// View Note History (via keyboard shortcut)
	const viewHistoryCommand = vscode.commands.registerCommand(
		'codeContextNotes.viewHistory',
		async () => {
			if (!noteManager || !commentController) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			const filePath = editor.document.uri.fsPath;
			const line = editor.selection.active.line;

			// Find note at current line
			const notes = await noteManager.getNotesForFile(filePath);
			const note = notes.find(n =>
				line >= n.lineRange.start && line <= n.lineRange.end
			);

			if (!note) {
				vscode.window.showErrorMessage('No note found at cursor position');
				return;
			}

			try {
				// Show history in comment thread (same as the button)
				await commentController.showHistoryInThread(note.id, filePath);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to view history: ${error}`);
			}
		}
	);

	// Refresh All Notes
	const refreshNotesCommand = vscode.commands.registerCommand(
		'codeContextNotes.refreshNotes',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			try {
				await commentController.refreshCommentsForDocument(editor.document);
				codeLensProvider.refresh();
				vscode.window.showInformationMessage('Notes refreshed!');
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to refresh notes: ${error}`);
			}
		}
	);

	// Edit Note
	const editNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.editNote',
		async (comment: vscode.Comment) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			const noteId = comment.contextValue;
			if (!noteId) {
				return;
			}

			try {
				await commentController.enableEditMode(noteId, editor.document.uri.fsPath);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to edit note: ${error}`);
			}
		}
	);

	// Save Note
	const saveNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.saveNote',
		async (comment?: vscode.Comment) => {
			// If comment is not provided (e.g., when triggered by keybinding),
			// get the currently editing comment from the controller
			if (!comment) {
				const currentComment = commentController.getCurrentlyEditingComment();
				if (!currentComment) {
					vscode.window.showErrorMessage('No note is currently being edited');
					return;
				}
				comment = currentComment;
			}

			const noteId = comment.contextValue;
			if (!noteId) {
				return;
			}

			const newContent = typeof comment.body === 'string' ? comment.body : comment.body.value;

			try {
				// Get the actual file path and document from the comment thread
				const result = await commentController.saveEditedNoteById(noteId, newContent);
				if (result) {
					codeLensProvider.refresh();
					vscode.window.showInformationMessage('Note saved!');
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to save note: ${error}`);
			}
		}
	);

	// Cancel Edit Note
	const cancelEditNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.cancelEditNote',
		async (comment?: vscode.Comment) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			// If comment is not provided (e.g., when triggered by keybinding),
			// get the currently editing comment from the controller
			if (!comment) {
				const currentComment = commentController.getCurrentlyEditingComment();
				if (!currentComment) {
					return;
				}
				comment = currentComment;
			}

			const noteId = comment.contextValue;
			if (!noteId) {
				return;
			}

			try {
				// Reload the note to cancel edits
				await commentController.refreshCommentsForDocument(editor.document);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to cancel edit: ${error}`);
			}
		}
	);

	// Save New Note (from comment thread)
	const saveNewNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.saveNewNote',
		async (reply: vscode.CommentReply) => {
			const thread = reply.thread;
			const content = reply.text;

			try {
				await commentController.handleSaveNewNote(thread, content);
				codeLensProvider.refresh();
				vscode.window.showInformationMessage('Note added successfully!');
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to save note: ${error}`);
			}
		}
	);

	// Cancel New Note (from comment thread)
	const cancelNewNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.cancelNewNote',
		async (reply: vscode.CommentReply) => {
			const thread = reply.thread;
			const tempId = (thread as any).tempId;

			// Dispose the temporary thread
			thread.dispose();
		}
	);

	// Markdown formatting commands
	const insertBoldCommand = vscode.commands.registerCommand(
		'codeContextNotes.insertBold',
		async () => {
			await vscode.commands.executeCommand('editor.action.insertSnippet', {
				snippet: '**${TM_SELECTED_TEXT:${1:bold text}}**$0'
			});
		}
	);

	const insertItalicCommand = vscode.commands.registerCommand(
		'codeContextNotes.insertItalic',
		async () => {
			await vscode.commands.executeCommand('editor.action.insertSnippet', {
				snippet: '*${TM_SELECTED_TEXT:${1:italic text}}*$0'
			});
		}
	);

	const insertCodeCommand = vscode.commands.registerCommand(
		'codeContextNotes.insertCode',
		async () => {
			await vscode.commands.executeCommand('editor.action.insertSnippet', {
				snippet: '\`${TM_SELECTED_TEXT:${1:code}}\`$0'
			});
		}
	);

	const insertCodeBlockCommand = vscode.commands.registerCommand(
		'codeContextNotes.insertCodeBlock',
		async () => {
			await vscode.commands.executeCommand('editor.action.insertSnippet', {
				snippet: '```${1:language}\n${TM_SELECTED_TEXT:${2:code}}\n```$0'
			});
		}
	);

	const insertLinkCommand = vscode.commands.registerCommand(
		'codeContextNotes.insertLink',
		async () => {
			const url = await vscode.window.showInputBox({
				prompt: 'Enter URL',
				placeHolder: 'https://example.com'
			});
			if (url) {
				await vscode.commands.executeCommand('editor.action.insertSnippet', {
					snippet: '[${TM_SELECTED_TEXT:${1:link text}}](' + url + ')$0'
				});
			}
		}
	);

	const insertListCommand = vscode.commands.registerCommand(
		'codeContextNotes.insertList',
		async () => {
			await vscode.commands.executeCommand('editor.action.insertSnippet', {
				snippet: '- ${1:item 1}\n- ${2:item 2}\n- $0'
			});
		}
	);

	const showMarkdownHelpCommand = vscode.commands.registerCommand(
		'codeContextNotes.showMarkdownHelp',
		async () => {
			await showMarkdownHelp();
		}
	);

	// Delete Note from Comment (inline button)
	const deleteNoteFromCommentCommand = vscode.commands.registerCommand(
		'codeContextNotes.deleteNoteFromComment',
		async (comment: vscode.Comment) => {
			const noteId = comment.contextValue;
			if (!noteId) {
				return;
			}

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			const filePath = editor.document.uri.fsPath;

			// Get the note to show confirmation
			const note = await noteManager.getNoteById(noteId, filePath);
			if (!note) {
				vscode.window.showErrorMessage('Note not found');
				return;
			}

			// Confirm deletion
			const confirm = await vscode.window.showWarningMessage(
				`Delete note: "${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}"?`,
				'Delete',
				'Cancel'
			);

			if (confirm !== 'Delete') {
				return;
			}

			try {
				await commentController.handleDeleteNote(noteId, filePath);
				codeLensProvider.refresh();
				vscode.window.showInformationMessage('Note deleted successfully!');
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to delete note: ${error}`);
			}
		}
	);

	// View Note History from Comment (inline button)
	const viewNoteHistoryFromCommentCommand = vscode.commands.registerCommand(
		'codeContextNotes.viewNoteHistory',
		async (comment: vscode.Comment) => {
			const noteId = comment.contextValue;
			if (!noteId) {
				return;
			}

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			const filePath = editor.document.uri.fsPath;

			try {
				await commentController.showHistoryInThread(noteId, filePath);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to view history: ${error}`);
			}
		}
	);

	// Navigate to next note in multi-note thread
	const nextNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.nextNote',
		async (args: { threadKey: string }) => {
			try {
				await commentController.navigateNextNote(args.threadKey);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to navigate to next note: ${error}`);
			}
		}
	);

	// Navigate to previous note in multi-note thread
	const previousNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.previousNote',
		async (args: { threadKey: string }) => {
			try {
				await commentController.navigatePreviousNote(args.threadKey);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to navigate to previous note: ${error}`);
			}
		}
	);

	// Add another note to an existing line
	const addNoteToLineCommand = vscode.commands.registerCommand(
		'codeContextNotes.addNoteToLine',
		async (args: { filePath: string; lineStart: number }) => {
			try {
				const document = await vscode.workspace.openTextDocument(args.filePath);
				const editor = await vscode.window.showTextDocument(document);

				// Create range for the line
				const range = new vscode.Range(args.lineStart, 0, args.lineStart, 0);

				// Open comment editor
				await commentController.openCommentEditor(document, range);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to add note: ${error}`);
			}
		}
	);

	// Register all commands
	context.subscriptions.push(
		addNoteCommand,
		addNoteViaCodeLensCommand,
		viewNoteCommand,
		deleteNoteCommand,
		viewHistoryCommand,
		refreshNotesCommand,
		editNoteCommand,
		saveNoteCommand,
		cancelEditNoteCommand,
		saveNewNoteCommand,
		cancelNewNoteCommand,
		insertBoldCommand,
		insertItalicCommand,
		insertCodeCommand,
		insertCodeBlockCommand,
		insertLinkCommand,
		insertListCommand,
		showMarkdownHelpCommand,
		deleteNoteFromCommentCommand,
		viewNoteHistoryFromCommentCommand,
		nextNoteCommand,
		previousNoteCommand,
		addNoteToLineCommand
	);
}

/**
 * Set up event listeners for document changes
 */
function setupEventListeners(context: vscode.ExtensionContext) {
	// Listen for text document changes with debouncing
	const changeDisposable = vscode.workspace.onDidChangeTextDocument(async (event) => {
		if (event.document.uri.scheme !== 'file') {
			return;
		}

		const documentKey = event.document.uri.fsPath;

		// Clear existing timer for this document
		const existingTimer = documentChangeTimers.get(documentKey);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Set new debounced timer
		const timer = setTimeout(async () => {
			try {
				// Update note positions on document change
				await commentController.handleDocumentChange(event.document);
				codeLensProvider.refresh();
			} finally {
				documentChangeTimers.delete(documentKey);
			}
		}, DEBOUNCE_DELAY);

		documentChangeTimers.set(documentKey, timer);
	});

	// Listen for document open
	const openDisposable = vscode.workspace.onDidOpenTextDocument(async (document) => {
		if (document.uri.scheme !== 'file') {
			return;
		}

		await commentController.loadCommentsForDocument(document);
		codeLensProvider.refresh();
	});

	// Listen for configuration changes
	const configDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('codeContextNotes')) {
			const config = vscode.workspace.getConfiguration('codeContextNotes');
			const authorName = config.get<string>('authorName', '');
			const showCodeLens = config.get<boolean>('showCodeLens', true);

			// Update author name
			noteManager.updateConfiguration(authorName);

			// Refresh CodeLens
			if (showCodeLens) {
				codeLensProvider.refresh();
			}

			vscode.window.showInformationMessage('Code Context Notes configuration updated!');
		}
	});

	// Listen for workspace folder changes
	const workspaceFoldersDisposable = vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
		// Reload extension when workspace folders change
		for (const removed of event.removed) {
			console.log(`Workspace folder removed: ${removed.uri.fsPath}`);
		}

		for (const added of event.added) {
			console.log(`Workspace folder added: ${added.uri.fsPath}`);
		}

		// Clear all caches and reload
		noteManager.clearAllCache();

		// Reload notes for all open documents
		for (const editor of vscode.window.visibleTextEditors) {
			if (editor.document.uri.scheme === 'file') {
				await commentController.refreshCommentsForDocument(editor.document);
			}
		}

		codeLensProvider.refresh();
		vscode.window.showInformationMessage('Workspace folders changed. Notes reloaded.');
	});

	context.subscriptions.push(changeDisposable, openDisposable, configDisposable, workspaceFoldersDisposable);
}

/**
 * Extension deactivation
 */
export function deactivate() {
	console.log('Code Context Notes extension is deactivating...');

	// Clear all debounce timers
	for (const timer of documentChangeTimers.values()) {
		clearTimeout(timer);
	}
	documentChangeTimers.clear();

	// Clean up resources
	if (commentController) {
		commentController.dispose();
	}

	if (codeLensProvider) {
		codeLensProvider.dispose();
	}

	if (noteManager) {
		noteManager.clearAllCache();
	}

	console.log('Code Context Notes extension deactivated.');
}
