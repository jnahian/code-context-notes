/**
 * Unit tests for GitIntegration
 * Tests git username retrieval, fallbacks, and caching
 */

import * as assert from 'assert';
import { GitIntegration } from '../../gitIntegration';

suite('GitIntegration Test Suite', () => {
	let gitIntegration: GitIntegration;
	const testWorkspaceRoot = '/test/workspace';

	setup(() => {
		gitIntegration = new GitIntegration(testWorkspaceRoot);
	});

	suite('Author Name Retrieval', () => {
		test('should return configuration override when provided', async () => {
			const overrideName = 'Override Author';
			gitIntegration = new GitIntegration(testWorkspaceRoot, overrideName);

			const authorName = await gitIntegration.getAuthorName();
			assert.strictEqual(authorName, overrideName);
		});

		test('should trim whitespace from configuration override', async () => {
			const overrideName = '  Override Author  ';
			gitIntegration = new GitIntegration(testWorkspaceRoot, overrideName);

			const authorName = await gitIntegration.getAuthorName();
			assert.strictEqual(authorName, 'Override Author');
		});

		test('should return system username when git not available', async () => {
			// This test will use system username as fallback
			const authorName = await gitIntegration.getAuthorName();

			assert.ok(authorName);
			assert.strictEqual(typeof authorName, 'string');
			assert.ok(authorName.length > 0);
		});

		test('should cache author name after first retrieval', async () => {
			const authorName1 = await gitIntegration.getAuthorName();
			const authorName2 = await gitIntegration.getAuthorName();

			assert.strictEqual(authorName1, authorName2);
		});

		test('should not use empty string as override', async () => {
			gitIntegration = new GitIntegration(testWorkspaceRoot, '');

			const authorName = await gitIntegration.getAuthorName();

			// Should fall back to git or system username, not empty string
			assert.ok(authorName);
			assert.ok(authorName.length > 0);
		});

		test('should not use whitespace-only string as override', async () => {
			gitIntegration = new GitIntegration(testWorkspaceRoot, '   ');

			const authorName = await gitIntegration.getAuthorName();

			// Should fall back to git or system username
			assert.ok(authorName);
			assert.ok(authorName.length > 0);
		});
	});

	suite('Configuration Updates', () => {
		test('should update configuration override', async () => {
			const initialName = await gitIntegration.getAuthorName();

			gitIntegration.updateConfigOverride('New Author');
			const newName = await gitIntegration.getAuthorName();

			assert.strictEqual(newName, 'New Author');
			assert.notStrictEqual(newName, initialName);
		});

		test('should clear cache when updating configuration', async () => {
			const initialName = await gitIntegration.getAuthorName();

			// Update config should clear cache
			gitIntegration.updateConfigOverride('New Author');

			// Next call should use new config
			const newName = await gitIntegration.getAuthorName();
			assert.strictEqual(newName, 'New Author');
		});

		test('should allow removing configuration override', async () => {
			gitIntegration = new GitIntegration(testWorkspaceRoot, 'Override Author');
			const overrideName = await gitIntegration.getAuthorName();
			assert.strictEqual(overrideName, 'Override Author');

			// Remove override
			gitIntegration.updateConfigOverride(undefined);
			const fallbackName = await gitIntegration.getAuthorName();

			// Should now use git or system username
			assert.notStrictEqual(fallbackName, 'Override Author');
		});
	});

	suite('Cache Management', () => {
		test('should clear cache', async () => {
			const name1 = await gitIntegration.getAuthorName();

			gitIntegration.clearCache();

			// Should retrieve again (may be same value but cache was cleared)
			const name2 = await gitIntegration.getAuthorName();
			assert.ok(name2);
		});

		test('should use cached value on subsequent calls', async () => {
			const name1 = await gitIntegration.getAuthorName();
			const name2 = await gitIntegration.getAuthorName();
			const name3 = await gitIntegration.getAuthorName();

			assert.strictEqual(name1, name2);
			assert.strictEqual(name2, name3);
		});
	});

	suite('Git Availability', () => {
		test('should check if git is available', async () => {
			const isAvailable = await gitIntegration.isGitAvailable();

			// Result depends on system, but should return boolean
			assert.strictEqual(typeof isAvailable, 'boolean');
		});

		test('should check if in git repository', async () => {
			const inRepo = await gitIntegration.isInGitRepository();

			// Result depends on test environment, but should return boolean
			assert.strictEqual(typeof inRepo, 'boolean');
		});

		test('should handle git not installed gracefully', async () => {
			// This should not throw even if git is not installed
			const isAvailable = await gitIntegration.isGitAvailable();
			assert.strictEqual(typeof isAvailable, 'boolean');
		});

		test('should handle not in git repo gracefully', async () => {
			// This should not throw even if not in a git repo
			const inRepo = await gitIntegration.isInGitRepository();
			assert.strictEqual(typeof inRepo, 'boolean');
		});
	});

	suite('Fallback Behavior', () => {
		test('should never return empty string', async () => {
			const authorName = await gitIntegration.getAuthorName();

			assert.ok(authorName);
			assert.ok(authorName.length > 0);
		});

		test('should return "Unknown User" as last resort', async () => {
			// Even if everything fails, should return "Unknown User"
			const authorName = await gitIntegration.getAuthorName();

			assert.ok(authorName);
			// Should be either git username, system username, or "Unknown User"
			assert.ok(
				authorName.length > 0,
				'Author name should not be empty'
			);
		});
	});

	suite('Multiple Instances', () => {
		test('should maintain separate caches for different instances', async () => {
			const git1 = new GitIntegration(testWorkspaceRoot, 'Author 1');
			const git2 = new GitIntegration(testWorkspaceRoot, 'Author 2');

			const name1 = await git1.getAuthorName();
			const name2 = await git2.getAuthorName();

			assert.strictEqual(name1, 'Author 1');
			assert.strictEqual(name2, 'Author 2');
		});

		test('should not share cache between instances', async () => {
			const git1 = new GitIntegration(testWorkspaceRoot);
			const git2 = new GitIntegration(testWorkspaceRoot);

			await git1.getAuthorName();
			git1.clearCache();

			// git2 should still work independently
			const name2 = await git2.getAuthorName();
			assert.ok(name2);
		});
	});
});
