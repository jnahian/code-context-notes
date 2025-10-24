/**
 * Sidebar Provider for Code Context Notes
 * Implements VSCode TreeDataProvider for displaying notes in sidebar
 */

import * as vscode from 'vscode';
import { NoteManager } from './noteManager.js';
import { Note } from './types.js';
import { RootTreeItem, FileTreeItem, NoteTreeItem, BaseTreeItem } from './noteTreeItem.js';

/**
 * Notes Sidebar Provider
 * Displays all workspace notes in a tree structure organized by file
 */
export class NotesSidebarProvider implements vscode.TreeDataProvider<BaseTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<BaseTreeItem | undefined | null | void> =
		new vscode.EventEmitter<BaseTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<BaseTreeItem | undefined | null | void> =
		this._onDidChangeTreeData.event;

	private debounceTimer: NodeJS.Timeout | null = null;
	private readonly DEBOUNCE_DELAY = 300; // ms

	// Tag filtering
	private activeTagFilters: string[] = [];
	private filterMode: 'any' | 'all' = 'any'; // 'any' = OR logic, 'all' = AND logic

	constructor(
		private readonly noteManager: NoteManager,
		private readonly workspaceRoot: string,
		private readonly context: vscode.ExtensionContext
	) {
		// Listen for note changes from NoteManager
		this.setupEventListeners();
	}

	/**
	 * Set up event listeners for real-time updates
	 */
	private setupEventListeners(): void {
		// Listen for note changes (create/update/delete)
		this.noteManager.on('noteChanged', () => {
			this.refresh();
		});

		// Listen for file changes (external modifications)
		this.noteManager.on('noteFileChanged', () => {
			this.refresh();
		});
	}

	/**
	 * Refresh the tree view (debounced for performance)
	 */
	refresh(): void {
		// Clear existing timer
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		// Set new debounced timer
		this.debounceTimer = setTimeout(() => {
			this._onDidChangeTreeData.fire();
			this.debounceTimer = null;
		}, this.DEBOUNCE_DELAY);
	}

	/**
	 * Get tree item for a node (required by TreeDataProvider)
	 */
	getTreeItem(element: BaseTreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get children for a tree node (required by TreeDataProvider)
	 * Implements lazy loading for performance
	 */
	async getChildren(element?: BaseTreeItem): Promise<BaseTreeItem[]> {
		// Root level: return RootTreeItem or empty state
		if (!element) {
			const noteCount = await this.noteManager.getNoteCount();

			// Empty state - no notes
			if (noteCount === 0) {
				return [];
			}

			// Return root node with count
			return [new RootTreeItem(noteCount)];
		}

		// Root node: return file nodes
		if (element.itemType === 'root') {
			return this.getFileNodes();
		}

		// File node: return note nodes
		if (element.itemType === 'file') {
			return this.getNoteNodes(element as FileTreeItem);
		}

		// Note nodes have no children (leaf nodes)
		return [];
	}

	/**
	 * Get all file nodes (one per file with notes)
	 */
	private async getFileNodes(): Promise<FileTreeItem[]> {
		const notesByFile = await this.noteManager.getNotesByFile();
		const fileNodes: FileTreeItem[] = [];
		const sortBy = this.getSortBy();

		// Create file nodes, applying tag filters
		for (const [filePath, notes] of notesByFile.entries()) {
			// Filter notes by tags if filters are active
			const filteredNotes = this.activeTagFilters.length > 0
				? notes.filter(note => this.matchesTagFilter(note))
				: notes;

			// Only create file node if it has notes after filtering
			if (filteredNotes.length > 0) {
				fileNodes.push(new FileTreeItem(filePath, filteredNotes, this.workspaceRoot));
			}
		}

		// Sort file nodes based on configuration
		switch (sortBy) {
			case 'date':
				// Sort by most recent note update time (descending)
				fileNodes.sort((a, b) => {
					const aLatest = Math.max(...a.notes.map(n => new Date(n.updatedAt).getTime()));
					const bLatest = Math.max(...b.notes.map(n => new Date(n.updatedAt).getTime()));
					return bLatest - aLatest;
				});
				break;

			case 'author':
				// Sort by author name (alphabetically), then by file path
				fileNodes.sort((a, b) => {
					const aAuthor = a.notes[0]?.author || '';
					const bAuthor = b.notes[0]?.author || '';
					if (aAuthor === bAuthor) {
						return a.filePath.localeCompare(b.filePath);
					}
					return aAuthor.localeCompare(bAuthor);
				});
				break;

			case 'file':
			default:
				// Sort alphabetically by file path
				fileNodes.sort((a, b) => a.filePath.localeCompare(b.filePath));
				break;
		}

		return fileNodes;
	}

	/**
	 * Get note nodes for a file
	 */
	private getNoteNodes(fileNode: FileTreeItem): NoteTreeItem[] {
		const previewLength = this.getPreviewLength();
		const noteNodes: NoteTreeItem[] = [];

		// Notes are already sorted by line range in getNotesByFile()
		for (const note of fileNode.notes) {
			noteNodes.push(new NoteTreeItem(note, previewLength));
		}

		return noteNodes;
	}

	/**
	 * Get preview length from configuration
	 */
	private getPreviewLength(): number {
		const config = vscode.workspace.getConfiguration('codeContextNotes');
		return config.get<number>('sidebar.previewLength', 50);
	}

	/**
	 * Get auto-expand setting from configuration
	 */
	private getAutoExpand(): boolean {
		const config = vscode.workspace.getConfiguration('codeContextNotes');
		return config.get<boolean>('sidebar.autoExpand', false);
	}

	/**
	 * Get sort order from configuration
	 */
	private getSortBy(): 'file' | 'date' | 'author' {
		const config = vscode.workspace.getConfiguration('codeContextNotes');
		return config.get<'file' | 'date' | 'author'>('sidebar.sortBy', 'file');
	}

	/**
	 * Set tag filters for the sidebar
	 */
	setTagFilters(tags: string[], mode: 'any' | 'all' = 'any'): void {
		this.activeTagFilters = tags;
		this.filterMode = mode;
		this.refresh();
	}

	/**
	 * Clear all tag filters
	 */
	clearTagFilters(): void {
		this.activeTagFilters = [];
		this.refresh();
	}

	/**
	 * Get currently active tag filters
	 */
	getActiveFilters(): { tags: string[]; mode: 'any' | 'all' } {
		return {
			tags: [...this.activeTagFilters],
			mode: this.filterMode,
		};
	}

	/**
	 * Check if a note matches the active tag filters
	 */
	private matchesTagFilter(note: Note): boolean {
		// If no filters, show all notes
		if (this.activeTagFilters.length === 0) {
			return true;
		}

		// If note has no tags, it doesn't match any tag filter
		if (!note.tags || note.tags.length === 0) {
			return false;
		}

		// Apply filter based on mode
		if (this.filterMode === 'all') {
			// Note must have ALL filter tags (AND logic)
			return this.activeTagFilters.every(filterTag =>
				note.tags!.includes(filterTag)
			);
		} else {
			// Note must have at least ONE filter tag (OR logic)
			return this.activeTagFilters.some(filterTag =>
				note.tags!.includes(filterTag)
			);
		}
	}

	/**
	 * Check if any filters are active
	 */
	hasActiveFilters(): boolean {
		return this.activeTagFilters.length > 0;
	}
}
