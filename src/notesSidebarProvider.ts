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

		// Sort files alphabetically by path
		const sortedFiles = Array.from(notesByFile.keys()).sort();

		for (const filePath of sortedFiles) {
			const notes = notesByFile.get(filePath) || [];
			if (notes.length > 0) {
				fileNodes.push(new FileTreeItem(filePath, notes, this.workspaceRoot));
			}
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
}
