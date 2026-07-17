import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Agent activity view', () => {
	test('registers the view and its commands', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('codeContextNotes.revertAgentOp'), 'revert command registered');
		assert.ok(commands.includes('codeContextNotes.truncateAuditLog'), 'truncate command registered');
		assert.ok(commands.includes('codeContextNotes.openAuditedNote'), 'open command registered');
	});
});
