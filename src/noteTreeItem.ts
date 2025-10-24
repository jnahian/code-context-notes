/**
 * Tree Item Classes for Notes Sidebar
 * Defines the structure of the tree view hierarchy
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Note } from './types.js';

/**
 * Base class for all tree items
 */
export abstract class BaseTreeItem extends vscode.TreeItem {
	abstract readonly itemType: 'root' | 'file' | 'note';
}

/**
 * Root node showing total note count
 * Label: "Code Notes ({total_count})"
 */
export class RootTreeItem extends BaseTreeItem {
	readonly itemType = 'root' as const;

	constructor(public readonly noteCount: number) {
		super(`Code Notes (${noteCount})`, vscode.TreeItemCollapsibleState.Expanded);

		this.contextValue = 'rootNode';
		this.iconPath = new vscode.ThemeIcon('folder');
		this.tooltip = `Total notes in workspace: ${noteCount}`;
	}
}

/**
 * File node showing file path and note count
 * Label: "{relative_path} ({note_count})"
 */
export class FileTreeItem extends BaseTreeItem {
	readonly itemType = 'file' as const;
	public readonly notes: Note[];

	constructor(
		public readonly filePath: string,
		notes: Note[],
		private readonly workspaceRoot: string
	) {
		const relativePath = path.relative(workspaceRoot, filePath);
		const label = `${relativePath} (${notes.length})`;

		// Collapsed by default as per user story
		super(label, vscode.TreeItemCollapsibleState.Collapsed);

		this.notes = notes;
		this.contextValue = 'fileNode';
		this.tooltip = filePath;

		// Use language-specific file icon
		this.resourceUri = vscode.Uri.file(filePath);
	}
}

/**
 * Note node showing line number, preview, and author
 * Label: "Line {line}: {preview}"
 * Description: Author name (right-aligned)
 */
export class NoteTreeItem extends BaseTreeItem {
	readonly itemType = 'note' as const;

	constructor(
		public readonly note: Note,
		private readonly previewLength: number = 50
	) {
		const lineNumber = note.lineRange.start + 1; // Convert to 1-based
		const preview = NoteTreeItem.stripMarkdown(note.content);
		const truncatedPreview = NoteTreeItem.truncateText(preview, previewLength);
		const label = `Line ${lineNumber}: ${truncatedPreview}`;

		// Note items are not collapsible (leaf nodes)
		super(label, vscode.TreeItemCollapsibleState.None);

		this.description = note.author; // Shows right-aligned
		this.contextValue = 'noteNode';
		this.tooltip = this.createTooltip();
		this.iconPath = new vscode.ThemeIcon('note');

		// Command to navigate to note when clicked
		this.command = {
			command: 'codeContextNotes.openNoteFromSidebar',
			title: 'Go to Note',
			arguments: [note]
		};
	}

	/**
	 * Create rich tooltip with full note content
	 */
	private createTooltip(): vscode.MarkdownString {
		const tooltip = new vscode.MarkdownString();
		tooltip.isTrusted = true;
		tooltip.supportHtml = true;

		const lineRange = `Lines ${this.note.lineRange.start + 1}-${this.note.lineRange.end + 1}`;
		const created = new Date(this.note.createdAt).toLocaleString();
		const updated = new Date(this.note.updatedAt).toLocaleString();

		tooltip.appendMarkdown(`**${lineRange}**\n\n`);
		tooltip.appendMarkdown(`**Author:** ${this.note.author}\n\n`);
		tooltip.appendMarkdown(`**Created:** ${created}\n\n`);
		tooltip.appendMarkdown(`**Updated:** ${updated}\n\n`);
		tooltip.appendMarkdown(`---\n\n`);
		tooltip.appendMarkdown(this.note.content);

		return tooltip;
	}

	/**
	 * Strip markdown formatting from text
	 * Removes: **, __, *, _, ~~, `, [], (), etc.
	 */
	static stripMarkdown(text: string): string {
		return text
			// Remove code blocks
			.replace(/```[\s\S]*?```/g, '')
			.replace(/`([^`]+)`/g, '$1')
			// Remove bold
			.replace(/\*\*([^*]+)\*\*/g, '$1')
			.replace(/__([^_]+)__/g, '$1')
			// Remove italic
			.replace(/\*([^*]+)\*/g, '$1')
			.replace(/_([^_]+)_/g, '$1')
			// Remove strikethrough
			.replace(/~~([^~]+)~~/g, '$1')
			// Remove links but keep text
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
			// Remove images
			.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
			// Remove headings
			.replace(/^#+\s+/gm, '')
			// Remove list markers
			.replace(/^[\s]*[-*+]\s+/gm, '')
			.replace(/^[\s]*\d+\.\s+/gm, '')
			// Remove blockquotes
			.replace(/^>\s+/gm, '')
			// Normalize whitespace
			.replace(/\s+/g, ' ')
			.trim();
	}

	/**
	 * Truncate text to specified length with ellipsis
	 */
	static truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) {
			return text;
		}
		return text.substring(0, maxLength - 3) + '...';
	}
}
