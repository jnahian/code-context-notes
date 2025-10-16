/**
 * Extension entry point for Code Context Notes
 */

import * as vscode from 'vscode';
import { StorageManager } from './storageManager';
import { ContentHashTracker } from './contentHashTracker';
import { GitIntegration } from './gitIntegration';
import { NoteManager } from './noteManager';
import { CommentController } from './commentController';
import { CodeNotesLensProvider } from './codeLensProvider';

let noteManager: NoteManager;
let commentController: CommentController;
let codeLensProvider: CodeNotesLensProvider;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext) {
	console.log('Code Context Notes extension is activating...');

	// Get workspace folder
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showWarningMessage('Code Context Notes requires a workspace to be opened.');
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

	// Register commands
	registerCommands(context);

	// Set up event listeners
	setupEventListeners(context);

	// Load existing notes for open documents
	for (const document of vscode.window.visibleTextEditors.map(e => e.document)) {
		if (document.uri.scheme === 'file') {
			await commentController.loadCommentsForDocument(document);
		}
	}

	console.log('Code Context Notes extension is now active!');
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
	// Add Note to Selection
	const addNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.addNote',
		async () => {
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

			// Prompt for note content
			const content = await vscode.window.showInputBox({
				prompt: 'Enter your note',
				placeHolder: 'Add context about this code...',
				ignoreFocusOut: true
			});

			if (!content) {
				return;
			}

			try {
				const range = new vscode.Range(selection.start.line, 0, selection.end.line, 0);
				await commentController.handleCreateNote(editor.document, range, content);
				codeLensProvider.refresh();
				vscode.window.showInformationMessage('Note added successfully!');
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to add note: ${error}`);
			}
		}
	);

	// View Note
	const viewNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.viewNote',
		async (noteId: string, filePath: string) => {
			try {
				const note = await noteManager.getNoteById(noteId, filePath);
				if (!note) {
					vscode.window.showErrorMessage('Note not found');
					return;
				}

				// Show note in a new document
				const doc = await vscode.workspace.openTextDocument({
					content: `# Note by ${note.author}\n\nCreated: ${new Date(note.createdAt).toLocaleString()}\nUpdated: ${new Date(note.updatedAt).toLocaleString()}\n\n---\n\n${note.content}\n\n---\n\n## History\n\n${note.history.map(h => `- ${new Date(h.timestamp).toLocaleString()} - ${h.author} - ${h.action}`).join('\n')}`,
					language: 'markdown'
				});

				await vscode.window.showTextDocument(doc);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to view note: ${error}`);
			}
		}
	);

	// Delete Note at Cursor
	const deleteNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.deleteNote',
		async () => {
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

	// View Note History
	const viewHistoryCommand = vscode.commands.registerCommand(
		'codeContextNotes.viewHistory',
		async () => {
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
				const history = await noteManager.getNoteHistory(note.id, filePath);
				const historyText = history.map(h =>
					`${new Date(h.timestamp).toLocaleString()} - ${h.author} - ${h.action}\n${h.content}\n`
				).join('\n---\n\n');

				const doc = await vscode.workspace.openTextDocument({
					content: `# Note History\n\n${historyText}`,
					language: 'markdown'
				});

				await vscode.window.showTextDocument(doc);
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

	// Register all commands
	context.subscriptions.push(
		addNoteCommand,
		viewNoteCommand,
		deleteNoteCommand,
		viewHistoryCommand,
		refreshNotesCommand
	);
}

/**
 * Set up event listeners for document changes
 */
function setupEventListeners(context: vscode.ExtensionContext) {
	// Listen for text document changes
	const changeDisposable = vscode.workspace.onDidChangeTextDocument(async (event) => {
		if (event.document.uri.scheme !== 'file') {
			return;
		}

		// Update note positions on document change
		await commentController.handleDocumentChange(event.document);
		codeLensProvider.refresh();
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

	context.subscriptions.push(changeDisposable, openDisposable, configDisposable);
}

/**
 * Extension deactivation
 */
export function deactivate() {
	console.log('Code Context Notes extension is deactivating...');

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
