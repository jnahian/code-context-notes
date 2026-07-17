import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Pending proposals view', () => {
	test('registers the approve/reject commands', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('codeContextNotes.approveProposal'), 'approve registered');
		assert.ok(commands.includes('codeContextNotes.rejectProposal'), 'reject registered');
		assert.ok(commands.includes('codeContextNotes.editAndApproveProposal'), 'edit-and-approve registered');
	});
});
