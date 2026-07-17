import * as vscode from 'vscode';
import type { Proposal, ProposalStore } from '@jnahian/code-notes-core';

export class ProposalItem extends vscode.TreeItem {
	constructor(public readonly proposal: Proposal, orphaned: boolean) {
		super(
			`${proposal.op} · ${vscode.workspace.asRelativePath(proposal.file)}`,
			vscode.TreeItemCollapsibleState.None,
		);
		this.description = orphaned
			? `${proposal.agent} · target missing`
			: `${proposal.agent} · ${new Date(proposal.proposedAt).toLocaleString()}`;
		this.tooltip = proposal.content || `(${proposal.op})`;
		// Drives which actions the menu offers: an orphan can only be rejected.
		this.contextValue = orphaned ? 'orphanedProposalItem' : 'proposalItem';
		this.iconPath = new vscode.ThemeIcon(orphaned ? 'warning' : 'git-pull-request');
	}
}

export class PendingProposalsProvider implements vscode.TreeDataProvider<ProposalItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<ProposalItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(
		private store: ProposalStore,
		private isOrphaned: (p: Proposal) => Promise<boolean>,
	) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ProposalItem): vscode.TreeItem {
		return element;
	}

	async getChildren(): Promise<ProposalItem[]> {
		const proposals = await this.store.list();
		return Promise.all(proposals.map(async p => new ProposalItem(p, await this.isOrphaned(p))));
	}
}
