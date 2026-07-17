import * as vscode from 'vscode';
import type { AuditEntry, AuditLog } from '@jnahian/code-notes-core';

const DISPLAY_LIMIT = 50;

export class AgentActivityItem extends vscode.TreeItem {
	constructor(public readonly entry: AuditEntry) {
		super(`${entry.op} · ${vscode.workspace.asRelativePath(entry.file)}`, vscode.TreeItemCollapsibleState.None);
		this.description = `${entry.agent} · ${new Date(entry.ts).toLocaleString()}`;
		this.tooltip = `${entry.op} ${entry.noteId}\nby ${entry.agent}\n${entry.ts}`;
		this.contextValue = 'agentActivityItem';
		this.iconPath = new vscode.ThemeIcon(
			entry.op === 'create' ? 'add' : entry.op === 'edit' ? 'edit' : 'trash',
		);
		this.command = {
			command: 'codeContextNotes.openAuditedNote',
			title: 'Open note',
			arguments: [entry],
		};
	}
}

/** Read-only view over the audit log; the log on disk is the source of truth. */
export class AgentActivityProvider implements vscode.TreeDataProvider<AgentActivityItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<AgentActivityItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(private auditLog: AuditLog) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: AgentActivityItem): vscode.TreeItem {
		return element;
	}

	async getChildren(): Promise<AgentActivityItem[]> {
		const entries = await this.auditLog.read(DISPLAY_LIMIT);
		return entries.map(e => new AgentActivityItem(e));
	}
}
