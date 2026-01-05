/**
 * Unit tests for SearchManager
 * Tests search indexing, full-text search, regex search, filtering, caching, and history
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { SearchManager } from '../../searchManager.js';
import { Note } from '../../types.js';
import { SearchQuery } from '../../searchTypes.js';

suite('SearchManager Test Suite', () => {
	let searchManager: SearchManager;
	let mockContext: vscode.ExtensionContext;

	/**
	 * Mock ExtensionContext
	 */
	function createMockContext(): vscode.ExtensionContext {
		const storage = new Map<string, any>();
		return {
			subscriptions: [],
			workspaceState: {
				get: (key: string) => storage.get(key),
				update: async (key: string, value: any) => {
					storage.set(key, value);
				},
				keys: () => Array.from(storage.keys())
			},
			globalState: {
				get: (key: string) => storage.get(key),
				update: async (key: string, value: any) => {
					storage.set(key, value);
				},
				keys: () => Array.from(storage.keys()),
				setKeysForSync: () => undefined
			},
			extensionPath: '/extension',
			extensionUri: vscode.Uri.file('/extension'),
			storagePath: '/storage',
			globalStoragePath: '/global-storage',
			logPath: '/logs',
			extensionMode: vscode.ExtensionMode.Test,
			asAbsolutePath: (p: string) => p,
			storageUri: vscode.Uri.file('/storage'),
			globalStorageUri: vscode.Uri.file('/global-storage'),
			logUri: vscode.Uri.file('/logs'),
			secrets: {} as any,
			extension: {} as any,
			environmentVariableCollection: {} as any,
			languageModelAccessInformation: {} as any
		} as vscode.ExtensionContext;
	}

	/**
	 * Helper to create a mock note
	 */
	function createMockNote(
		id: string,
		content: string,
		author: string,
		filePath: string,
		lineStart: number = 0,
		lineEnd: number = 0,
		createdAt: string = '2023-01-01T00:00:00.000Z',
		updatedAt: string = '2023-01-01T00:00:00.000Z'
	): Note {
		return {
			id,
			content,
			author,
			filePath,
			lineRange: { start: lineStart, end: lineEnd },
			contentHash: `hash-${id}`,
			createdAt,
			updatedAt,
			history: [],
			isDeleted: false
		};
	}

	setup(() => {
		mockContext = createMockContext();
		searchManager = new SearchManager(mockContext);
	});

	suite('Index Building & Management', () => {
		test('should build index with 0 notes', async () => {
			await searchManager.buildIndex([]);
			const stats = searchManager.getStats();
			assert.strictEqual(stats.totalNotes, 0);
			assert.strictEqual(stats.totalTerms, 0);
		});

		test('should build index with 1 note', async () => {
			const notes = [
				createMockNote('note1', 'This is a test note', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);
			const stats = searchManager.getStats();
			assert.strictEqual(stats.totalNotes, 1);
			assert.ok(stats.totalTerms > 0);
		});

		test('should build index with many notes', async () => {
			const notes = [
				createMockNote('note1', 'First note content', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'Second note content', 'Bob', '/workspace/file2.ts'),
				createMockNote('note3', 'Third note content', 'Charlie', '/workspace/file3.ts'),
				createMockNote('note4', 'Fourth note content', 'Alice', '/workspace/file4.ts'),
				createMockNote('note5', 'Fifth note content', 'Bob', '/workspace/file5.ts')
			];
			await searchManager.buildIndex(notes);
			const stats = searchManager.getStats();
			assert.strictEqual(stats.totalNotes, 5);
			assert.ok(stats.totalTerms > 0);
		});

		test('should update index with new note', async () => {
			const notes = [
				createMockNote('note1', 'First note', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			const newNote = createMockNote('note2', 'Second note', 'Bob', '/workspace/file2.ts');
			await searchManager.updateIndex(newNote);

			const results = await searchManager.searchFullText('second', false);
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].id, 'note2');
		});

		test('should update index with modified note', async () => {
			const notes = [
				createMockNote('note1', 'Original content', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			const updatedNote = createMockNote('note1', 'Updated content', 'Alice', '/workspace/file1.ts');
			await searchManager.updateIndex(updatedNote);

			const results = await searchManager.searchFullText('updated', false);
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].content, 'Updated content');
		});

		test('should remove note from index', async () => {
			const notes = [
				createMockNote('note1', 'First note', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'Second note', 'Bob', '/workspace/file2.ts')
			];
			await searchManager.buildIndex(notes);

			await searchManager.removeFromIndex('note1');

			const results = await searchManager.searchFullText('first', false);
			assert.strictEqual(results.length, 0);
		});

		test('should track index statistics correctly', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript programming language', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'TypeScript programming', 'Bob', '/workspace/file2.ts')
			];
			await searchManager.buildIndex(notes);

			const stats = searchManager.getStats();
			assert.strictEqual(stats.totalNotes, 2);
			assert.ok(stats.totalTerms > 0);
			assert.ok(stats.indexSize > 0);
			assert.ok(stats.lastUpdate instanceof Date);
		});

		test('should filter stop words during tokenization', async () => {
			const notes = [
				createMockNote('note1', 'This is a test with the and or but', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'Important keyword here', 'Bob', '/workspace/file2.ts')
			];
			await searchManager.buildIndex(notes);

			// Search for stop word should return no results
			const stopWordResults = await searchManager.searchFullText('the', false);
			assert.strictEqual(stopWordResults.length, 0);

			// Search for non-stop word should return results
			const keywordResults = await searchManager.searchFullText('keyword', false);
			assert.strictEqual(keywordResults.length, 1);
		});
	});

	suite('Full-Text Search', () => {
		test('should search with single term', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript is great', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'Python is great', 'Bob', '/workspace/file2.ts')
			];
			await searchManager.buildIndex(notes);

			const results = await searchManager.searchFullText('javascript', false);
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].id, 'note1');
		});

		test('should search with multiple terms using AND logic', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript programming language', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'JavaScript is great', 'Bob', '/workspace/file2.ts'),
				createMockNote('note3', 'Programming in Python', 'Charlie', '/workspace/file3.ts')
			];
			await searchManager.buildIndex(notes);

			const results = await searchManager.searchFullText('javascript programming', false);
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].id, 'note1');
		});

		test('should handle case-sensitive search', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript is great', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'javascript is also great', 'Bob', '/workspace/file2.ts')
			];
			await searchManager.buildIndex(notes);

			const caseSensitiveResults = await searchManager.searchFullText('JavaScript', true);
			assert.strictEqual(caseSensitiveResults.length, 1);
			assert.strictEqual(caseSensitiveResults[0].id, 'note1');
		});

		test('should handle case-insensitive search', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript is great', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'javascript is also great', 'Bob', '/workspace/file2.ts')
			];
			await searchManager.buildIndex(notes);

			const caseInsensitiveResults = await searchManager.searchFullText('JAVASCRIPT', false);
			assert.strictEqual(caseInsensitiveResults.length, 2);
		});

		test('should return empty array for no results', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript is great', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			const results = await searchManager.searchFullText('python', false);
			assert.strictEqual(results.length, 0);
		});

		test('should ignore stop words in search query', async () => {
			const notes = [
				createMockNote('note1', 'Important keyword content', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			// Search with stop words mixed in
			const results = await searchManager.searchFullText('the important keyword', false);
			assert.strictEqual(results.length, 1);
		});

		test('should combine text search with filters', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript content', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'JavaScript content', 'Bob', '/workspace/file2.ts'),
				createMockNote('note3', 'Python content', 'Alice', '/workspace/file3.ts')
			];
			await searchManager.buildIndex(notes);

			const query: SearchQuery = {
				text: 'javascript',
				authors: ['Alice']
			};
			const results = await searchManager.search(query, notes);
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].note.id, 'note1');
		});

		test('should rank results by relevance score', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'JavaScript JavaScript JavaScript', 'Bob', '/workspace/file2.ts'),
				createMockNote('note3', 'JavaScript programming', 'Charlie', '/workspace/file3.ts')
			];
			await searchManager.buildIndex(notes);

			const query: SearchQuery = { text: 'javascript' };
			const results = await searchManager.search(query, notes);

			// Results should be sorted by score (descending)
			assert.ok(results[0].score >= results[1].score);
			assert.ok(results[1].score >= results[2].score);
		});

		test('should limit results to maxResults', async () => {
			const notes = [];
			for (let i = 0; i < 20; i++) {
				notes.push(createMockNote(`note${i}`, 'JavaScript content', 'Alice', `/workspace/file${i}.ts`));
			}
			await searchManager.buildIndex(notes);

			const query: SearchQuery = {
				text: 'javascript',
				maxResults: 5
			};
			const results = await searchManager.search(query, notes);
			assert.strictEqual(results.length, 5);
		});
	});

	suite('Regex Search', () => {
		test('should search with valid regex pattern', async () => {
			const notes = [
				createMockNote('note1', 'Email: user@example.com', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'No email here', 'Bob', '/workspace/file2.ts')
			];
			await searchManager.buildIndex(notes);

			const pattern = /\w+@\w+\.\w+/;
			const results = await searchManager.searchRegex(pattern, notes);
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].id, 'note1');
		});

		test('should search with case-insensitive flag', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript is great', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'javascript is also great', 'Bob', '/workspace/file2.ts')
			];
			await searchManager.buildIndex(notes);

			const pattern = /javascript/i;
			const results = await searchManager.searchRegex(pattern, notes);
			assert.strictEqual(results.length, 2);
		});

		test('should search with complex patterns', async () => {
			const notes = [
				createMockNote('note1', 'function test() { return true; }', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'const value = 42', 'Bob', '/workspace/file2.ts'),
				createMockNote('note3', 'function another() { return false; }', 'Charlie', '/workspace/file3.ts')
			];
			await searchManager.buildIndex(notes);

			const pattern = /function\s+\w+\(\)/;
			const results = await searchManager.searchRegex(pattern, notes);
			assert.strictEqual(results.length, 2);
		});
	});

	suite('Filter Functions', () => {
		test('should filter by single author', async () => {
			const notes = [
				createMockNote('note1', 'Content 1', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'Content 2', 'Bob', '/workspace/file2.ts'),
				createMockNote('note3', 'Content 3', 'Alice', '/workspace/file3.ts')
			];
			await searchManager.buildIndex(notes);

			const results = await searchManager.filterByAuthor(['Alice']);
			assert.strictEqual(results.length, 2);
			assert.ok(results.every(note => note.author === 'Alice'));
		});

		test('should filter by multiple authors using OR logic', async () => {
			const notes = [
				createMockNote('note1', 'Content 1', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'Content 2', 'Bob', '/workspace/file2.ts'),
				createMockNote('note3', 'Content 3', 'Charlie', '/workspace/file3.ts')
			];
			await searchManager.buildIndex(notes);

			const results = await searchManager.filterByAuthor(['Alice', 'Bob']);
			assert.strictEqual(results.length, 2);
			assert.ok(results.some(note => note.author === 'Alice'));
			assert.ok(results.some(note => note.author === 'Bob'));
		});

		test('should return empty array for author with no matches', async () => {
			const notes = [
				createMockNote('note1', 'Content 1', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			const results = await searchManager.filterByAuthor(['NonExistent']);
			assert.strictEqual(results.length, 0);
		});

		test('should filter by date range with start date only', async () => {
			const notes = [
				createMockNote('note1', 'Content 1', 'Alice', '/workspace/file1.ts', 0, 0, '2023-01-01T00:00:00.000Z'),
				createMockNote('note2', 'Content 2', 'Bob', '/workspace/file2.ts', 0, 0, '2023-06-01T00:00:00.000Z'),
				createMockNote('note3', 'Content 3', 'Charlie', '/workspace/file3.ts', 0, 0, '2023-12-01T00:00:00.000Z')
			];
			await searchManager.buildIndex(notes);

			const startDate = new Date('2023-05-01T00:00:00.000Z');
			const results = await searchManager.filterByDateRange(startDate, undefined, 'created');
			assert.strictEqual(results.length, 2);
			assert.ok(results.every(note => new Date(note.createdAt) >= startDate));
		});

		test('should filter by date range with end date only', async () => {
			const notes = [
				createMockNote('note1', 'Content 1', 'Alice', '/workspace/file1.ts', 0, 0, '2023-01-01T00:00:00.000Z'),
				createMockNote('note2', 'Content 2', 'Bob', '/workspace/file2.ts', 0, 0, '2023-06-01T00:00:00.000Z'),
				createMockNote('note3', 'Content 3', 'Charlie', '/workspace/file3.ts', 0, 0, '2023-12-01T00:00:00.000Z')
			];
			await searchManager.buildIndex(notes);

			const endDate = new Date('2023-07-01T00:00:00.000Z');
			const results = await searchManager.filterByDateRange(undefined, endDate, 'created');
			assert.strictEqual(results.length, 2);
			assert.ok(results.every(note => new Date(note.createdAt) <= endDate));
		});

		test('should filter by date range with both start and end dates', async () => {
			const notes = [
				createMockNote('note1', 'Content 1', 'Alice', '/workspace/file1.ts', 0, 0, '2023-01-01T00:00:00.000Z'),
				createMockNote('note2', 'Content 2', 'Bob', '/workspace/file2.ts', 0, 0, '2023-06-01T00:00:00.000Z'),
				createMockNote('note3', 'Content 3', 'Charlie', '/workspace/file3.ts', 0, 0, '2023-12-01T00:00:00.000Z')
			];
			await searchManager.buildIndex(notes);

			const startDate = new Date('2023-05-01T00:00:00.000Z');
			const endDate = new Date('2023-07-01T00:00:00.000Z');
			const results = await searchManager.filterByDateRange(startDate, endDate, 'created');
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].id, 'note2');
		});

		test('should filter by date range using created field', async () => {
			const notes = [
				createMockNote('note1', 'Content 1', 'Alice', '/workspace/file1.ts', 0, 0, '2023-01-01T00:00:00.000Z', '2023-12-01T00:00:00.000Z')
			];
			await searchManager.buildIndex(notes);

			const startDate = new Date('2022-01-01T00:00:00.000Z');
			const endDate = new Date('2023-06-01T00:00:00.000Z');
			const results = await searchManager.filterByDateRange(startDate, endDate, 'created');
			assert.strictEqual(results.length, 1);
		});

		test('should filter by date range using updated field', async () => {
			const notes = [
				createMockNote('note1', 'Content 1', 'Alice', '/workspace/file1.ts', 0, 0, '2023-01-01T00:00:00.000Z', '2023-12-01T00:00:00.000Z')
			];
			await searchManager.buildIndex(notes);

			const startDate = new Date('2023-11-01T00:00:00.000Z');
			const endDate = new Date('2023-12-31T00:00:00.000Z');
			const results = await searchManager.filterByDateRange(startDate, endDate, 'updated');
			assert.strictEqual(results.length, 1);
		});

		test('should filter by file path with glob pattern', async () => {
			const notes = [
				createMockNote('note1', 'Content 1', 'Alice', '/workspace/src/file1.ts'),
				createMockNote('note2', 'Content 2', 'Bob', '/workspace/src/file2.ts'),
				createMockNote('note3', 'Content 3', 'Charlie', '/workspace/test/file3.ts')
			];
			await searchManager.buildIndex(notes);

			const results = await searchManager.filterByFilePath('/workspace/src/*');
			assert.strictEqual(results.length, 2);
			assert.ok(results.every(note => note.filePath.includes('/workspace/src/')));
		});
	});

	suite('Search Caching', () => {
		test('should cache search results on first query', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript content', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			const query: SearchQuery = { text: 'javascript' };
			const results1 = await searchManager.search(query, notes);
			const results2 = await searchManager.search(query, notes);

			assert.strictEqual(results1.length, results2.length);
			assert.strictEqual(results1[0].note.id, results2[0].note.id);
		});

		test('should return cached results for duplicate queries', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript content', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			const query: SearchQuery = { text: 'javascript' };
			const startTime1 = Date.now();
			await searchManager.search(query, notes);
			const duration1 = Date.now() - startTime1;

			const startTime2 = Date.now();
			const results2 = await searchManager.search(query, notes);
			const duration2 = Date.now() - startTime2;

			// Cached query should be faster
			assert.ok(duration2 <= duration1);
			assert.strictEqual(results2.length, 1);
		});

		test('should not use cache for different queries', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript content', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'Python content', 'Bob', '/workspace/file2.ts')
			];
			await searchManager.buildIndex(notes);

			const query1: SearchQuery = { text: 'javascript' };
			const query2: SearchQuery = { text: 'python' };

			const results1 = await searchManager.search(query1, notes);
			const results2 = await searchManager.search(query2, notes);

			assert.strictEqual(results1[0].note.id, 'note1');
			assert.strictEqual(results2[0].note.id, 'note2');
		});

		test('should invalidate cache on index update', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript content', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			const query: SearchQuery = { text: 'javascript' };
			await searchManager.search(query, notes);

			// Update index
			const newNote = createMockNote('note2', 'JavaScript content', 'Bob', '/workspace/file2.ts');
			await searchManager.updateIndex(newNote);

			// Search again - should get new results
			const allNotes = [...notes, newNote];
			const results = await searchManager.search(query, allNotes);
			assert.strictEqual(results.length, 2);
		});
	});

	suite('Search History', () => {
		test('should save search to history', async () => {
			const query: SearchQuery = { text: 'javascript' };
			await searchManager.saveSearch(query, 5);

			const history = await searchManager.getSearchHistory();
			assert.strictEqual(history.length, 1);
			assert.strictEqual(history[0].query.text, 'javascript');
			assert.strictEqual(history[0].resultCount, 5);
		});

		test('should return search history entries', async () => {
			const query1: SearchQuery = { text: 'javascript' };
			const query2: SearchQuery = { text: 'python' };

			await searchManager.saveSearch(query1, 3);
			await searchManager.saveSearch(query2, 2);

			const history = await searchManager.getSearchHistory();
			assert.strictEqual(history.length, 2);
			assert.strictEqual(history[0].query.text, 'python'); // Most recent first
			assert.strictEqual(history[1].query.text, 'javascript');
		});

		test('should limit history to MAX_HISTORY_SIZE', async () => {
			// Save more than MAX_HISTORY_SIZE (20) entries
			for (let i = 0; i < 25; i++) {
				const query: SearchQuery = { text: `search${i}` };
				await searchManager.saveSearch(query, i);
			}

			const history = await searchManager.getSearchHistory();
			assert.strictEqual(history.length, 20);
			assert.strictEqual(history[0].query.text, 'search24'); // Most recent
		});

		test('should clear search history', async () => {
			const query: SearchQuery = { text: 'javascript' };
			await searchManager.saveSearch(query, 5);

			await searchManager.clearSearchHistory();

			const history = await searchManager.getSearchHistory();
			assert.strictEqual(history.length, 0);
		});
	});

	suite('Performance & Edge Cases', () => {
		test('should handle empty query', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript content', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			const results = await searchManager.searchFullText('', false);
			assert.strictEqual(results.length, 0);
		});

		test('should handle whitespace-only query', async () => {
			const notes = [
				createMockNote('note1', 'JavaScript content', 'Alice', '/workspace/file1.ts')
			];
			await searchManager.buildIndex(notes);

			const results = await searchManager.searchFullText('   ', false);
			assert.strictEqual(results.length, 0);
		});

		test('should handle large result sets', async () => {
			const notes = [];
			for (let i = 0; i < 100; i++) {
				notes.push(createMockNote(`note${i}`, 'JavaScript programming language', 'Alice', `/workspace/file${i}.ts`));
			}
			await searchManager.buildIndex(notes);

			const query: SearchQuery = { text: 'javascript' };
			const results = await searchManager.search(query, notes);
			assert.ok(results.length > 0);
			assert.ok(results.length <= 100);
		});

		test('should handle notes with special characters', async () => {
			const notes = [
				createMockNote('note1', 'Special chars: @#$%^&*()[]{}', 'Alice', '/workspace/file1.ts'),
				createMockNote('note2', 'Unicode: 你好世界 😀', 'Bob', '/workspace/file2.ts'),
				createMockNote('note3', 'Symbols: <html> & "quotes"', 'Charlie', '/workspace/file3.ts')
			];
			await searchManager.buildIndex(notes);

			const results1 = await searchManager.searchFullText('special', false);
			assert.strictEqual(results1.length, 1);

			const results2 = await searchManager.searchFullText('unicode', false);
			assert.strictEqual(results2.length, 1);

			const results3 = await searchManager.searchFullText('symbols', false);
			assert.strictEqual(results3.length, 1);
		});
	});
});
