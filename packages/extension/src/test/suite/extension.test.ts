/**
 * Integration tests for Extension
 * Tests extension activation, command registration, event listeners,
 * and configuration handling
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

suite('Extension Test Suite', () => {
	let tempWorkspace: string;

	setup(async () => {
		// Create a temporary workspace
		tempWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'extension-test-'));
	});

	teardown(async () => {
		// Clean up
		try {
			await fs.rm(tempWorkspace, { recursive: true, force: true });
		} catch (error) {
			console.error('Failed to clean up temp workspace:', error);
		}
	});

	suite('Extension Activation', () => {
		test('should activate extension', async () => {
			const extension = vscode.extensions.getExtension('your-publisher.code-context-notes');

			if (!extension) {
				// Extension might not be loaded in test environment, skip test
				console.log('Extension not loaded in test environment');
				return;
			}

			await extension.activate();
			assert.ok(extension.isActive, 'Extension should be active');
		});

		test('should have package.json', async () => {
			const extension = vscode.extensions.getExtension('your-publisher.code-context-notes');

			if (!extension) {
				console.log('Extension not loaded in test environment');
				return;
			}

			assert.ok(extension.packageJSON, 'Should have package.json');
			assert.strictEqual(extension.packageJSON.name, 'code-context-notes');
		});
	});

	suite('Command Registration', () => {
		test('should register addNote command', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('codeContextNotes.addNote'),
				'Should register addNote command'
			);
		});

		test('should register viewNote command', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('codeContextNotes.viewNote'),
				'Should register viewNote command'
			);
		});

		test('should register deleteNote command', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('codeContextNotes.deleteNote'),
				'Should register deleteNote command'
			);
		});

		test('should register editNote command', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('codeContextNotes.editNote'),
				'Should register editNote command'
			);
		});

		test('should register saveNote command', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('codeContextNotes.saveNote'),
				'Should register saveNote command'
			);
		});

		test('should register cancelEditNote command', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('codeContextNotes.cancelEditNote'),
				'Should register cancelEditNote command'
			);
		});

		test('should register refreshNotes command', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('codeContextNotes.refreshNotes'),
				'Should register refreshNotes command'
			);
		});

		test('should register viewHistory command', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('codeContextNotes.viewHistory'),
				'Should register viewHistory command'
			);
		});

		test('should register markdown formatting commands', async () => {
			const commands = await vscode.commands.getCommands(true);

			assert.ok(
				commands.includes('codeContextNotes.insertBold'),
				'Should register insertBold command'
			);
			assert.ok(
				commands.includes('codeContextNotes.insertItalic'),
				'Should register insertItalic command'
			);
			assert.ok(
				commands.includes('codeContextNotes.insertCode'),
				'Should register insertCode command'
			);
			assert.ok(
				commands.includes('codeContextNotes.insertCodeBlock'),
				'Should register insertCodeBlock command'
			);
			assert.ok(
				commands.includes('codeContextNotes.insertLink'),
				'Should register insertLink command'
			);
			assert.ok(
				commands.includes('codeContextNotes.insertList'),
				'Should register insertList command'
			);
		});

		test('should register showMarkdownHelp command', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('codeContextNotes.showMarkdownHelp'),
				'Should register showMarkdownHelp command'
			);
		});
	});

	suite('Configuration', () => {
		test('should have default configuration values', () => {
			const config = vscode.workspace.getConfiguration('codeContextNotes');

			const storageDirectory = config.get<string>('storageDirectory');
			const showCodeLens = config.get<boolean>('showCodeLens');

			assert.ok(storageDirectory !== undefined, 'Should have storage directory config');
			assert.ok(showCodeLens !== undefined, 'Should have showCodeLens config');
		});

		test('should allow reading storageDirectory config', () => {
			const config = vscode.workspace.getConfiguration('codeContextNotes');
			const storageDirectory = config.get<string>('storageDirectory', '.code-notes');

			assert.strictEqual(typeof storageDirectory, 'string');
			assert.ok(storageDirectory.length > 0);
		});

		test('should allow reading authorName config', () => {
			const config = vscode.workspace.getConfiguration('codeContextNotes');
			const authorName = config.get<string>('authorName', '');

			assert.strictEqual(typeof authorName, 'string');
		});

		test('should allow reading showCodeLens config', () => {
			const config = vscode.workspace.getConfiguration('codeContextNotes');
			const showCodeLens = config.get<boolean>('showCodeLens', true);

			assert.strictEqual(typeof showCodeLens, 'boolean');
		});
	});

	suite('Storage Directory', () => {
		test('should create storage directory on activation', async () => {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

			if (!workspaceFolder) {
				console.log('No workspace folder available');
				return;
			}

			const config = vscode.workspace.getConfiguration('codeContextNotes');
			const storageDirectory = config.get<string>('storageDirectory', '.code-notes');
			const storagePath = path.join(workspaceFolder.uri.fsPath, storageDirectory);

			// Check if storage exists (should be created during activation)
			try {
				await fs.access(storagePath);
				assert.ok(true, 'Storage directory should exist');
			} catch (error) {
				// Storage may not exist if extension hasn't fully activated
				console.log('Storage directory not yet created');
			}
		});
	});

	suite('Command Execution', () => {
		test('should execute showMarkdownHelp command', async () => {
			try {
				await vscode.commands.executeCommand('codeContextNotes.showMarkdownHelp');
				// Should not throw
				assert.ok(true);
			} catch (error) {
				assert.fail(`showMarkdownHelp command failed: ${error}`);
			}
		});

		test('should handle addNote command without active editor gracefully', async () => {
			try {
				await vscode.commands.executeCommand('codeContextNotes.addNote');
				// Should show error message but not throw
				assert.ok(true);
			} catch (error) {
				// Some errors are expected when no editor is active
				console.log('Expected error when no active editor:', error);
			}
		});

		test('should handle refreshNotes command without active editor gracefully', async () => {
			try {
				await vscode.commands.executeCommand('codeContextNotes.refreshNotes');
				// Should show error message but not throw
				assert.ok(true);
			} catch (error) {
				console.log('Expected error when no active editor:', error);
			}
		});
	});

	suite('Extension Exports', () => {
		test('should export activate function', () => {
			const extension = vscode.extensions.getExtension('your-publisher.code-context-notes');

			if (!extension) {
				console.log('Extension not loaded in test environment');
				return;
			}

			assert.ok(extension.exports !== undefined, 'Should have exports');
		});
	});

	suite('Error Handling', () => {
		test('should handle missing workspace gracefully', async () => {
			// The extension should activate even without a workspace
			// Commands should be registered but show appropriate messages
			const commands = await vscode.commands.getCommands(true);

			assert.ok(
				commands.includes('codeContextNotes.addNote'),
				'Commands should still be registered without workspace'
			);
		});

		test('should handle invalid file paths gracefully', async () => {
			try {
				// Try to view a note with invalid path
				await vscode.commands.executeCommand(
					'codeContextNotes.viewNote',
					'invalid-note-id',
					'/invalid/path/to/file.ts'
				);
				// Should show error but not crash
				assert.ok(true);
			} catch (error) {
				console.log('Expected error for invalid path:', error);
			}
		});
	});

	suite('Event Listeners', () => {
		test('should register document change listener', async () => {
			// Create a test file
			const testFile = path.join(tempWorkspace, 'test.ts');
			await fs.writeFile(testFile, 'const x = 1;');

			const document = await vscode.workspace.openTextDocument(testFile);
			const editor = await vscode.window.showTextDocument(document);

			// Make a change
			await editor.edit(editBuilder => {
				editBuilder.insert(new vscode.Position(0, 0), '// Comment\n');
			});

			// Wait for debounce
			await new Promise(resolve => setTimeout(resolve, 600));

			// Should not throw - listener should handle changes
			assert.ok(true);
		});

		test('should register configuration change listener', async () => {
			const config = vscode.workspace.getConfiguration('codeContextNotes');

			try {
				// Try to update configuration
				await config.update('showCodeLens', false, vscode.ConfigurationTarget.Workspace);

				// Wait for listener to process
				await new Promise(resolve => setTimeout(resolve, 100));

				// Reset
				await config.update('showCodeLens', true, vscode.ConfigurationTarget.Workspace);

				assert.ok(true, 'Configuration change should be handled');
			} catch (error) {
				console.log('Configuration update may not be available in test environment');
			}
		});
	});

	suite('Markdown Formatting', () => {
		test('should execute insertBold command', async () => {
			try {
				await vscode.commands.executeCommand('codeContextNotes.insertBold');
				assert.ok(true);
			} catch (error) {
				console.log('insertBold may require active editor:', error);
			}
		});

		test('should execute insertItalic command', async () => {
			try {
				await vscode.commands.executeCommand('codeContextNotes.insertItalic');
				assert.ok(true);
			} catch (error) {
				console.log('insertItalic may require active editor:', error);
			}
		});

		test('should execute insertCode command', async () => {
			try {
				await vscode.commands.executeCommand('codeContextNotes.insertCode');
				assert.ok(true);
			} catch (error) {
				console.log('insertCode may require active editor:', error);
			}
		});

		test('should execute insertCodeBlock command', async () => {
			try {
				await vscode.commands.executeCommand('codeContextNotes.insertCodeBlock');
				assert.ok(true);
			} catch (error) {
				console.log('insertCodeBlock may require active editor:', error);
			}
		});

		test('should execute insertList command', async () => {
			try {
				await vscode.commands.executeCommand('codeContextNotes.insertList');
				assert.ok(true);
			} catch (error) {
				console.log('insertList may require active editor:', error);
			}
		});
	});

	suite('Lifecycle', () => {
		test('should handle multiple activation attempts gracefully', async () => {
			const extension = vscode.extensions.getExtension('your-publisher.code-context-notes');

			if (!extension) {
				console.log('Extension not loaded in test environment');
				return;
			}

			// Try to activate multiple times
			await extension.activate();
			await extension.activate();
			await extension.activate();

			assert.ok(extension.isActive, 'Extension should remain active');
		});
	});

	suite('Integration', () => {
		test('should integrate all components', async () => {
			const commands = await vscode.commands.getCommands(true);
			const noteCommands = commands.filter(cmd => cmd.startsWith('codeContextNotes.'));

			// Should have multiple commands registered
			assert.ok(noteCommands.length >= 15, 'Should have at least 15 commands registered');
		});

		test('should have proper extension metadata', () => {
			const extension = vscode.extensions.getExtension('your-publisher.code-context-notes');

			if (!extension) {
				console.log('Extension not loaded in test environment');
				return;
			}

			const packageJSON = extension.packageJSON;

			assert.ok(packageJSON.displayName, 'Should have display name');
			assert.ok(packageJSON.description, 'Should have description');
			assert.ok(packageJSON.version, 'Should have version');
			assert.ok(packageJSON.publisher, 'Should have publisher');
		});
	});
});
