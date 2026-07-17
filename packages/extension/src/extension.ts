/**
 * Extension entry point for Code Context Notes
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { StorageManager, ExportWriter, ContentHashTracker, NoteManager, SearchManager, LockManager, writeWorkspaceConfig, AuditLog, ProposalStore, hashNoteContent } from '@jnahian/code-notes-core';
import type { AuditEntry, Proposal } from '@jnahian/code-notes-core';
import { AgentActivityProvider, AgentActivityItem } from './agentActivityProvider.js';
import { PendingProposalsProvider, ProposalItem } from './pendingProposalsProvider.js';
import { GitIntegration } from './gitIntegration.js';
import { CommentController } from './commentController.js';
import { CodeNotesLensProvider } from './codeLensProvider.js';
import { NotesSidebarProvider } from './notesSidebarProvider.js';

let noteManager: NoteManager;
// Module-scoped like noteManager: registerAllCommands runs on both the
// workspace and no-workspace paths, so its handlers guard on this being set
// rather than capturing it.
let auditLog: AuditLog | undefined;
let agentActivityProvider: AgentActivityProvider | undefined;
let proposalStore: ProposalStore | undefined;
let pendingProposalsProvider: PendingProposalsProvider | undefined;
let exportWriter: ExportWriter;
let searchManager: SearchManager;
let commentController: CommentController;
let codeLensProvider: CodeNotesLensProvider;
let sidebarProvider: NotesSidebarProvider;

// Debounce timers for performance optimization
const documentChangeTimers: Map<string, NodeJS.Timeout> = new Map();
const DEBOUNCE_DELAY = 500; // ms

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext) {
	console.log('Code Context Notes extension is activating...');
	console.log(`Code Context Notes: Extension version ${context.extension.packageJSON.version}`);

	// Get workspace folder
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		console.log('Code Context Notes: No workspace folder found. Extension partially activated. Open a folder to use full functionality.');

		// Still register sidebar view (will show empty state)
		// Create a minimal tree provider that returns empty
		const emptyProvider: vscode.TreeDataProvider<any> = {
			getTreeItem: (element: any) => element,
			getChildren: () => []
		};
		const treeView = vscode.window.createTreeView('codeContextNotes.sidebarView', {
			treeDataProvider: emptyProvider
		});
		context.subscriptions.push(treeView);

		// Register commands (they will show error messages if called without workspace)
		try {
			console.log('Code Context Notes: Registering commands...');
			registerAllCommands(context);
			console.log('Code Context Notes: Commands registered!');
		} catch (error) {
			console.error('Code Context Notes: FAILED to register commands:', error);
		}

		vscode.window.showInformationMessage('Code Context Notes: Open a folder to use note features.');
		return;
	}

	const workspaceRoot = workspaceFolder.uri.fsPath;

	// Get configuration
	const config = vscode.workspace.getConfiguration('codeContextNotes');
	const storageDirectory = config.get<string>('storageDirectory', '.code-notes');
	const authorName = config.get<string>('authorName', '');
	const showCodeLens = config.get<boolean>('showCodeLens', true);

	// The MCP server can't read VS Code settings — it reads config.json. Treat
	// the VS Code settings as the UI and config.json as the shared source of
	// truth, and keep them in sync.
	const storagePath = path.join(workspaceRoot, storageDirectory);
	const syncWorkspaceConfig = async () => {
		const cfg = vscode.workspace.getConfiguration('codeContextNotes');
		await writeWorkspaceConfig(storagePath, {
			agentWriteMode: cfg.get<'direct' | 'audit' | 'queue'>('agentWriteMode', 'audit'),
			agentAllowList: cfg.get<string[]>('agentAllowList', []),
			auditLogRetention: cfg.get<number>('auditLogRetention', 1000),
		});
	};

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(async (e) => {
			if (
				e.affectsConfiguration('codeContextNotes.agentWriteMode') ||
				e.affectsConfiguration('codeContextNotes.agentAllowList') ||
				e.affectsConfiguration('codeContextNotes.auditLogRetention')
			) {
				// The user changed a setting, so creating the storage dir here is
				// what they asked for.
				await syncWorkspaceConfig();
			}

			// Leaving queue mode strands anything still pending — those writes
			// were never applied, and silently abandoning them would lose an
			// agent's work without anyone deciding to.
			if (e.affectsConfiguration('codeContextNotes.agentWriteMode') && proposalStore) {
				const mode = vscode.workspace.getConfiguration('codeContextNotes').get<string>('agentWriteMode');
				const stranded = await proposalStore.list();
				if (mode !== 'queue' && stranded.length > 0) {
					const pick = await vscode.window.showWarningMessage(
						`${stranded.length} agent proposal(s) are still pending, but queue mode is off.`,
						'Review them',
						'Reject all',
					);
					if (pick === 'Review them') {
						await vscode.commands.executeCommand('codeContextNotes.pendingProposalsView.focus');
					} else if (pick === 'Reject all') {
						for (const p of stranded) {
							await proposalStore.reject(p.proposalId);
						}
						pendingProposalsProvider?.refresh();
					}
				}
			}
		}),
	);

	// Initialize components
	const storage = new StorageManager(workspaceRoot, storageDirectory);
	const hashTracker = new ContentHashTracker();
	const gitIntegration = new GitIntegration(workspaceRoot, authorName);
	const lockManager = new LockManager(path.join(workspaceRoot, storageDirectory, '.locks'), 'extension');

	// Create storage directory
	await storage.createStorage();

	// Initialize note manager
	noteManager = new NoteManager(storage, hashTracker, gitIntegration, { lockManager });

	// Mirror the settings for the MCP server, but only once this workspace
	// actually uses notes. writeWorkspaceConfig creates a git-visible file, and
	// opening an unrelated project with the extension installed must not add
	// one. (storageExists() is no use as the signal — createStorage() above
	// makes it true everywhere.) A workspace with no config.json reads as the
	// default mode anyway, so nothing is lost by waiting.
	if ((await storage.getAllNoteFiles()).length > 0) {
		await syncWorkspaceConfig();
	}

	// Agent activity: a read-only view over the audit log the MCP server writes.
	auditLog = new AuditLog(path.join(storagePath, '_audit.log'), {
		lockManager,
		retention: config.get<number>('auditLogRetention', 1000),
	});
	agentActivityProvider = new AgentActivityProvider(auditLog);
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('codeContextNotes.agentActivityView', agentActivityProvider),
	);
	// The watcher emits this when the MCP server appends from another process.
	noteManager.on('auditLogChanged', () => agentActivityProvider?.refresh());

	// Pending proposals (queue mode): the review queue for agent writes.
	proposalStore = new ProposalStore(path.join(storagePath, '_pending'));
	// A proposal is orphaned when the note it targets is gone — approving it
	// would have nothing to apply to.
	const isOrphaned = async (p: Proposal): Promise<boolean> =>
		p.op !== 'create' && !(await noteManager.getNoteByIdGlobal(p.targetNoteId!));
	pendingProposalsProvider = new PendingProposalsProvider(proposalStore, isOrphaned);
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('codeContextNotes.pendingProposalsView', pendingProposalsProvider),
	);
	noteManager.on('proposalsChanged', () => pendingProposalsProvider?.refresh());

	// Initialize search manager
	searchManager = new SearchManager(context.globalState);

	// Connect search manager to note manager
	noteManager.setSearchManager(searchManager);

	// Build initial search index with all existing notes
	console.log('Code Context Notes: Building initial search index...');
	const allNotes = await noteManager.getAllNotes();
	await searchManager.buildIndex(allNotes);
	console.log(`Code Context Notes: Search index built with ${allNotes.length} notes`);

	// Initialize export writer and hook into note changes
	exportWriter = new ExportWriter(workspaceRoot, storageDirectory, {
		debounceMs: 200,
		getConfig: () => {
			const cfg = vscode.workspace.getConfiguration('codeContextNotes.exports');
			return {
				enabled: cfg.get<boolean>('enabled', true),
				indexJson: cfg.get<boolean>('indexJson', true),
				agentsMarkdown: cfg.get<boolean>('agentsMarkdown', true),
			};
		},
	});
	context.subscriptions.push({ dispose: () => exportWriter.dispose() });

	// Hooks are always attached; ExportWriter.regenerate reads the
	// exports.enabled setting on every run, so toggling it takes effect
	// in both directions without a reload.
	// Initial export on activation (covers fresh installs, manual deletes)
	exportWriter.scheduleRegenerate(() => noteManager.getAllNotesAndErrors());
	// Notes changed through the extension
	noteManager.on('noteChanged', () => {
		exportWriter.scheduleRegenerate(() => noteManager.getAllNotesAndErrors());
	});
	// Note files changed externally (git pull, manual edits)
	noteManager.on('noteFileChanged', () => {
		exportWriter.scheduleRegenerate(() => noteManager.getAllNotesAndErrors());
	});

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

	// Initialize and register Sidebar provider
	sidebarProvider = new NotesSidebarProvider(noteManager, workspaceRoot, context);
	const treeView = vscode.window.createTreeView('codeContextNotes.sidebarView', {
		treeDataProvider: sidebarProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(treeView);

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

	// Register all commands AFTER providers are initialized
	try {
		console.log('Code Context Notes: Registering all commands...');
		registerAllCommands(context);
		console.log('Code Context Notes: All commands registered successfully!');
	} catch (error) {
		console.error('Code Context Notes: FAILED to register commands:', error);
		vscode.window.showErrorMessage(`Code Context Notes failed to activate: ${error}`);
		throw error;
	}

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
/**
 * Apply an approved proposal as if the approver wrote it. The approver's name
 * goes on the note and in approvedBy; authorType stays 'agent' because an
 * agent did compose it — approval is accountability, not authorship laundering.
 *
 * noteManager here is the extension's (agentWriter false), so applying is a
 * human write: it is not re-diverted into another proposal.
 */
async function applyProposal(p: Proposal, content: string): Promise<void> {
	if (!noteManager || !proposalStore) {
		throw new Error('Code Context Notes requires a workspace folder to be opened.');
	}
	const approver = await noteManager.getDefaultAuthor();
	const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(p.file));

	if (p.op === 'create') {
		await noteManager.createNote({
			filePath: p.file,
			lineRange: p.lineRange!,
			content,
			author: approver,
			authorType: 'agent',
			approvedBy: approver,
		}, doc);
	} else if (p.op === 'edit') {
		await noteManager.updateNote({ id: p.targetNoteId!, content, author: approver }, doc);
	} else {
		await noteManager.deleteNote(p.targetNoteId!, p.file);
	}

	await proposalStore.remove(p.proposalId);
	pendingProposalsProvider?.refresh();
}

/**
 * Simple-pick, not a 3-way merge (spec §7.6): if the note changed after the
 * agent proposed its edit, the human picks a side. Returns the content to
 * apply, or undefined to abandon. Add a real merge only if conflicts turn out
 * to be common.
 */
async function resolveStaleTarget(p: Proposal): Promise<string | undefined> {
	if (p.op === 'create' || !p.targetContentHash || !noteManager) {
		return p.content;
	}
	const current = await noteManager.getNoteByIdGlobal(p.targetNoteId!);
	if (!current) {
		vscode.window.showWarningMessage('The note this proposal targets no longer exists. Reject it instead.');
		return undefined;
	}
	if (hashNoteContent(current.content) === p.targetContentHash) {
		return p.content;
	}

	const pick = await vscode.window.showWarningMessage(
		'This note changed after the agent proposed its edit.',
		{ modal: true, detail: `Yours:\n${current.content}\n\nAgent's:\n${p.content}` },
		"Use agent's version",
		'Keep mine',
	);
	return pick === "Use agent's version" ? p.content : undefined;
}

function registerAllCommands(context: vscode.ExtensionContext) {
	// --- Agent activity (audit mode) ---

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.openAuditedNote', async (entry: AuditEntry) => {
			if (!noteManager) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}
			// Include deleted: a delete audit entry points at a soft-deleted
			// note, and you still want to jump to where it was.
			const note = await noteManager.getNoteByIdIncludingDeleted(entry.noteId);
			if (!note) {
				vscode.window.showWarningMessage(`Note ${entry.noteId} no longer exists.`);
				return;
			}
			const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(note.filePath));
			const editor = await vscode.window.showTextDocument(doc);
			const line = note.lineRange.start;
			editor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.InCenter);
			editor.selection = new vscode.Selection(line, 0, line, 0);
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.truncateAuditLog', async () => {
			if (!auditLog) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}
			const pick = await vscode.window.showWarningMessage(
				'Clear the agent audit log? Recorded activity will be lost; your notes are unaffected.',
				{ modal: true },
				'Clear log',
			);
			if (pick !== 'Clear log') {
				return;
			}
			await auditLog.truncate();
			agentActivityProvider?.refresh();
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.revertAgentOp', async (item: AgentActivityItem) => {
			if (!noteManager) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}
			const { entry } = item;
			// Include deleted: a delete entry is precisely the case where the
			// note is soft-deleted, and it's what Revert must restore.
			const note = await noteManager.getNoteByIdIncludingDeleted(entry.noteId);
			if (!note) {
				vscode.window.showWarningMessage(`Note ${entry.noteId} no longer exists — nothing to revert.`);
				return;
			}

			const confirm = await vscode.window.showWarningMessage(
				`Revert the ${entry.op} by ${entry.agent}?`,
				{ modal: true },
				'Revert',
			);
			if (confirm !== 'Revert') {
				return;
			}

			try {
				if (entry.op === 'create') {
					// The reverse of a create is a delete.
					await noteManager.deleteNote(note.id, note.filePath);
				} else if (entry.op === 'delete') {
					// The reverse of a delete is a restore. The content survived the
					// soft-delete, so undeleteNote brings it back as it was.
					await noteManager.undeleteNote(note.id);
				} else {
					// The reverse of an edit is the previous content. history is
					// append-only, so the entry before the last is the state this
					// edit replaced.
					const prior = note.history[note.history.length - 2];
					if (!prior) {
						vscode.window.showWarningMessage('No prior version recorded for this note.');
						return;
					}
					const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(note.filePath));
					await noteManager.updateNote({ id: note.id, content: prior.content }, doc);
				}
				agentActivityProvider?.refresh();
				vscode.window.showInformationMessage(`Reverted ${entry.op} on ${path.basename(note.filePath)}.`);
			} catch (e) {
				vscode.window.showErrorMessage(`Revert failed: ${(e as Error).message}`);
			}
		}),
	);

	// --- Pending agent proposals (queue mode) ---

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.rejectProposal', async (item: ProposalItem) => {
			if (!proposalStore) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}
			await proposalStore.reject(item.proposal.proposalId);
			pendingProposalsProvider?.refresh();
			vscode.window.showInformationMessage('Proposal rejected. Kept in _pending/.rejected/ for audit.');
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.approveProposal', async (item: ProposalItem) => {
			try {
				const content = await resolveStaleTarget(item.proposal);
				if (content === undefined) {
					return;
				}
				await applyProposal(item.proposal, content);
				vscode.window.showInformationMessage('Proposal approved.');
			} catch (e) {
				vscode.window.showErrorMessage(`Approve failed: ${(e as Error).message}`);
			}
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.editAndApproveProposal', async (item: ProposalItem) => {
			const edited = await vscode.window.showInputBox({
				prompt: 'Edit the proposed note before approving',
				value: item.proposal.content,
			});
			if (edited === undefined) {
				return;
			}
			try {
				await applyProposal(item.proposal, edited);
				vscode.window.showInformationMessage('Proposal approved with your edits.');
			} catch (e) {
				vscode.window.showErrorMessage(`Approve failed: ${(e as Error).message}`);
			}
		}),
	);

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
			let range: vscode.Range;

			if (selection.isEmpty) {
				// No selection: use current cursor line
				const cursorLine = selection.active.line;
				range = new vscode.Range(cursorLine, 0, cursorLine, 0);
			} else {
				// Has selection: use selected lines
				range = new vscode.Range(selection.start.line, 0, selection.end.line, 0);
			}

			try {
				// Open comment editor UI (modern approach)
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

			const contextValue = comment.contextValue;
			if (!contextValue) {
				return;
			}

			// Extract note ID (remove :multi suffix if present)
			const noteId = contextValue.replace(/:multi$/, '');

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

			const contextValue = comment.contextValue;
			if (!contextValue) {
				return;
			}

			// Extract note ID (remove :multi suffix if present)
			const noteId = contextValue.replace(/:multi$/, '');

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
			const contextValue = comment.contextValue;
			if (!contextValue) {
				return;
			}

			// Extract note ID (remove :multi suffix if present)
			const noteId = contextValue.replace(/:multi$/, '');

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
			const contextValue = comment.contextValue;
			if (!contextValue) {
				return;
			}

			// Extract note ID (remove :multi suffix if present)
			const noteId = contextValue.replace(/:multi$/, '');

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
		async (comment: vscode.Comment) => {
			const contextValue = comment.contextValue;
			if (!contextValue) {
				return;
			}

			// Extract note ID (remove :multi suffix if present)
			const noteId = contextValue.replace(/:multi$/, '');

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			const filePath = editor.document.uri.fsPath;

			try {
				// Get note to find thread key
				const note = await noteManager.getNoteById(noteId, filePath);
				if (!note) {
					return;
				}
				const threadKey = `${filePath}:${note.lineRange.start}`;
				await commentController.navigateNextNote(threadKey);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to navigate to next note: ${error}`);
			}
		}
	);

	// Navigate to previous note in multi-note thread
	const previousNoteCommand = vscode.commands.registerCommand(
		'codeContextNotes.previousNote',
		async (comment: vscode.Comment) => {
			const contextValue = comment.contextValue;
			if (!contextValue) {
				return;
			}

			// Extract note ID (remove :multi suffix if present)
			const noteId = contextValue.replace(/:multi$/, '');

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			const filePath = editor.document.uri.fsPath;

			try {
				// Get note to find thread key
				const note = await noteManager.getNoteById(noteId, filePath);
				if (!note) {
					return;
				}
				const threadKey = `${filePath}:${note.lineRange.start}`;
				await commentController.navigatePreviousNote(threadKey);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to navigate to previous note: ${error}`);
			}
		}
	);

	// Add another note to an existing line
	const addNoteToLineCommand = vscode.commands.registerCommand(
		'codeContextNotes.addNoteToLine',
		async (arg: vscode.Comment | { filePath: string; lineStart: number }) => {
			let filePath: string | undefined;
			let lineStart: number | undefined;

			// Detect argument shape: vscode.Comment has contextValue, CodeLens payload has filePath
			if ('contextValue' in arg && arg.contextValue) {
				// Called from comment button - arg is vscode.Comment
				const contextValue = arg.contextValue;

				// Extract note ID (remove :multi suffix if present)
				const noteId = contextValue.replace(/:multi$/, '');

				const editor = vscode.window.activeTextEditor;
				if (!editor) {
					vscode.window.showErrorMessage('No active editor');
					return;
				}

				filePath = editor.document.uri.fsPath;

				try {
					// Get note to find line range
					const note = await noteManager.getNoteById(noteId, filePath);
					if (!note) {
						return;
					}

					lineStart = note.lineRange.start;
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to find note: ${error}`);
					return;
				}
			} else if ('filePath' in arg && 'lineStart' in arg) {
				// Called from CodeLens - arg is { filePath, lineStart }
				filePath = arg.filePath;
				lineStart = arg.lineStart;
			} else {
				// Fallback: use active editor
				const editor = vscode.window.activeTextEditor;
				if (!editor) {
					vscode.window.showErrorMessage('No active editor');
					return;
				}
				filePath = editor.document.uri.fsPath;
				lineStart = editor.selection.active.line;
			}

			// Ensure we have both filePath and lineStart
			if (!filePath || lineStart === undefined) {
				vscode.window.showErrorMessage('Unable to determine file path or line number');
				return;
			}

			try {
				const document = await vscode.workspace.openTextDocument(filePath);
				await vscode.window.showTextDocument(document);

				// Create range for the line
				const range = new vscode.Range(lineStart, 0, lineStart, 0);

				// Open comment editor
				await commentController.openCommentEditor(document, range);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to add note: ${error}`);
			}
		}
	);

	// Open Note from Sidebar
	const openNoteFromSidebarCommand = vscode.commands.registerCommand(
		'codeContextNotes.openNoteFromSidebar',
		async (noteOrTreeItem) => {
			if (!noteManager || !commentController) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}

			try {
				// Handle both Note object (from click) and TreeItem (from context menu)
				const note = noteOrTreeItem.note || noteOrTreeItem;

				// Open the document
				const document = await vscode.workspace.openTextDocument(note.filePath);
				await vscode.window.showTextDocument(document);

				// Focus the comment thread for this note (shows inline comment editor)
				await commentController.focusNoteThread(note.id, note.filePath);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to open note: ${error}`);
			}
		}
	);

	// Refresh Sidebar
	const refreshSidebarCommand = vscode.commands.registerCommand(
		'codeContextNotes.refreshSidebar',
		() => {
			if (!sidebarProvider) {
				return;
			}
			sidebarProvider.refresh();
			vscode.window.showInformationMessage('Sidebar refreshed!');
		}
	);

	// Collapse All in Sidebar
	const collapseAllCommand = vscode.commands.registerCommand(
		'codeContextNotes.collapseAll',
		() => {
			if (!sidebarProvider) {
				return;
			}
			// Refresh will reset the tree to default collapsed state
			sidebarProvider.refresh();
		}
	);

	// Edit Note from Sidebar
	const editNoteFromSidebarCommand = vscode.commands.registerCommand(
		'codeContextNotes.editNoteFromSidebar',
		async (treeItem) => {
			if (!noteManager || !commentController) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}

			try {
				const note = treeItem.note;
				// Open the document
				const document = await vscode.workspace.openTextDocument(note.filePath);
				await vscode.window.showTextDocument(document);

				// Start editing the note through comment controller
				await commentController.enableEditMode(note.id, note.filePath);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to edit note: ${error}`);
			}
		}
	);

	// Delete Note from Sidebar
	const deleteNoteFromSidebarCommand = vscode.commands.registerCommand(
		'codeContextNotes.deleteNoteFromSidebar',
		async (treeItem) => {
			if (!noteManager || !commentController) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}

			try {
				const note = treeItem.note;
				const confirm = await vscode.window.showWarningMessage(
					`Delete note at line ${note.lineRange.start + 1}?`,
					{ modal: true },
					'Delete'
				);

				if (confirm === 'Delete') {
					await noteManager.deleteNote(note.id, note.filePath);
					vscode.window.showInformationMessage('Note deleted successfully');
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to delete note: ${error}`);
			}
		}
	);

	// View Note History from Sidebar
	const viewNoteHistoryFromSidebarCommand = vscode.commands.registerCommand(
		'codeContextNotes.viewNoteHistoryFromSidebar',
		async (treeItem) => {
			if (!noteManager || !commentController) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}

			try {
				const note = treeItem.note;

				// Open the document
				const document = await vscode.workspace.openTextDocument(note.filePath);
				await vscode.window.showTextDocument(document);

				// Show history in the comment thread (inline)
				await commentController.showHistoryInThread(note.id, note.filePath);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to view history: ${error}`);
			}
		}
	);

	// Open File from Sidebar
	const openFileFromSidebarCommand = vscode.commands.registerCommand(
		'codeContextNotes.openFileFromSidebar',
		async (treeItem) => {
			try {
				const filePath = treeItem.filePath;
				const document = await vscode.workspace.openTextDocument(filePath);
				await vscode.window.showTextDocument(document);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to open file: ${error}`);
			}
		}
	);

	// Regenerate Exports
	const regenerateExportsCommand = vscode.commands.registerCommand(
		'codeContextNotes.regenerateExports',
		async () => {
			if (!noteManager || !exportWriter) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}

			const exportsCfg = vscode.workspace.getConfiguration('codeContextNotes.exports');
			if (!exportsCfg.get<boolean>('enabled', true)) {
				vscode.window.showWarningMessage('Code Notes: exports are disabled (codeContextNotes.exports.enabled is false). Nothing was written.');
				return;
			}

			// regenerate() never throws — failures go through onError — so wrap
			// it here to give this manual command an accurate success/failure message.
			const previousOnError = exportWriter.onError;
			let failure: Error | undefined;
			exportWriter.onError = (e) => { failure = e; previousOnError(e); };

			try {
				const { notes, errors } = await noteManager.getAllNotesAndErrors();
				const outcome = await exportWriter.regenerate({ notes, errors });
				if (outcome === 'written') {
					vscode.window.showInformationMessage(`Code Notes: regenerated exports for ${notes.length} notes.`);
				} else if (outcome === 'disabled') {
					vscode.window.showWarningMessage('Code Notes: exports are disabled (codeContextNotes.exports.enabled). Nothing was written.');
				} else {
					vscode.window.showErrorMessage(`Failed to regenerate exports: ${failure ? failure.message : 'see the developer console for details'}`);
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to regenerate exports: ${error}`);
			} finally {
				exportWriter.onError = previousOnError;
			}
		}
	);

	// Filter Notes by Type
	const filterByTypeCommand = vscode.commands.registerCommand(
		'codeContextNotes.filterByType',
		async () => {
			if (!sidebarProvider) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}
			const choices = ['context', 'instruction', 'warning', 'decision', 'todo', 'handoff', 'rationale'];
			const picked = await vscode.window.showQuickPick(choices, {
				canPickMany: true,
				title: 'Show only notes of these types (cancel to clear filter)',
			});
			sidebarProvider.setTypeFilter(picked && picked.length > 0 ? new Set(picked) : null);
		}
	);

	// Toggle Expired Notes
	const toggleExpiredCommand = vscode.commands.registerCommand(
		'codeContextNotes.toggleExpired',
		() => {
			if (!sidebarProvider) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}
			sidebarProvider.toggleHideExpired();
		}
	);

	// Set Note Metadata (type, priority, tags, expiry)
	const setNoteMetadataCommand = vscode.commands.registerCommand(
		'codeContextNotes.setNoteMetadata',
		async (noteIdArg?: string) => {
			if (!noteManager) {
				vscode.window.showErrorMessage('Code Context Notes requires a workspace folder to be opened.');
				return;
			}

			let noteId = noteIdArg;
			if (!noteId) {
				const all = await noteManager.getAllNotes();
				const pick = await vscode.window.showQuickPick(
					all.map(n => ({ label: n.id, description: n.content.slice(0, 60) })),
					{ title: 'Pick a note to update' },
				);
				if (!pick) return;
				noteId = pick.label;
			}

			const type = await vscode.window.showQuickPick(
				['context', 'instruction', 'warning', 'decision', 'todo', 'handoff', 'rationale'],
				{ title: 'Type' },
			);
			if (!type) return;

			const priority = await vscode.window.showQuickPick(
				['low', 'normal', 'high', 'critical'],
				{ title: 'Priority' },
			);
			if (!priority) return;

			const tagsRaw = await vscode.window.showInputBox({ title: 'Tags (comma-separated, optional)' });
			const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

			const expiresRaw = await vscode.window.showInputBox({ title: 'Expires at (ISO 8601, optional)' });
			const expiresAt = expiresRaw && expiresRaw.trim().length > 0 ? expiresRaw.trim() : undefined;

			try {
				await noteManager.updateNoteMetadata(noteId, { type: type as any, priority: priority as any, tags, expiresAt });
				vscode.window.showInformationMessage(`Code Notes: updated metadata for ${noteId}.`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to update note metadata: ${error}`);
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
		addNoteToLineCommand,
		openNoteFromSidebarCommand,
		refreshSidebarCommand,
		collapseAllCommand,
		editNoteFromSidebarCommand,
		deleteNoteFromSidebarCommand,
		viewNoteHistoryFromSidebarCommand,
		openFileFromSidebarCommand,
		regenerateExportsCommand,
		filterByTypeCommand,
		toggleExpiredCommand,
		setNoteMetadataCommand
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

	// File watcher for .code-notes/ directory
	// This will trigger sidebar refresh when notes are created/updated/deleted externally
	const config = vscode.workspace.getConfiguration('codeContextNotes');
	const storageDirectory = config.get<string>('storageDirectory', '.code-notes');
	const fileWatcherPattern = new vscode.RelativePattern(
		vscode.workspace.workspaceFolders![0],
		`${storageDirectory}/**/*.{md,log}`
	);
	const fileWatcher = vscode.workspace.createFileSystemWatcher(fileWatcherPattern);

	// Proposals and the audit log live under the storage dir but are not notes.
	// Route them to their own views instead of the note cache/sidebar.
	const storagePath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, storageDirectory);
	const routeNonNoteFile = (uri: vscode.Uri): boolean => {
		const rel = path.relative(storagePath, uri.fsPath);
		if (rel.startsWith('_pending')) {
			noteManager.emit('proposalsChanged');
			return true;
		}
		if (path.basename(uri.fsPath).startsWith('_audit.log')) {
			noteManager.emit('auditLogChanged');
			return true;
		}
		return false;
	};

	// AGENTS.md is a generated export living in the same directory; treating
	// it as a note would make export regeneration re-trigger itself forever.
	const isGeneratedExport = (uri: vscode.Uri) => path.basename(uri.fsPath) === 'AGENTS.md';

	// When a note file is created
	fileWatcher.onDidCreate((uri) => {
		if (routeNonNoteFile(uri)) {
			return;
		}
		if (isGeneratedExport(uri)) {
			return;
		}
		console.log(`Note file created: ${uri.fsPath}`);
		// Clear workspace cache and emit event for sidebar refresh
		noteManager.clearAllCache();
		noteManager.emit('noteFileChanged', { type: 'created', uri });
	});

	// When a note file is changed
	fileWatcher.onDidChange((uri) => {
		if (routeNonNoteFile(uri)) {
			return;
		}
		if (isGeneratedExport(uri)) {
			return;
		}
		console.log(`Note file changed: ${uri.fsPath}`);
		// Clear workspace cache and emit event for sidebar refresh
		noteManager.clearAllCache();
		noteManager.emit('noteFileChanged', { type: 'changed', uri });
	});

	// When a note file is deleted
	fileWatcher.onDidDelete((uri) => {
		if (routeNonNoteFile(uri)) {
			return;
		}
		if (isGeneratedExport(uri)) {
			return;
		}
		console.log(`Note file deleted: ${uri.fsPath}`);
		// Clear workspace cache and emit event for sidebar refresh
		noteManager.clearAllCache();
		noteManager.emit('noteFileChanged', { type: 'deleted', uri });
	});

	context.subscriptions.push(
		changeDisposable,
		openDisposable,
		configDisposable,
		workspaceFoldersDisposable,
		fileWatcher
	);
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
