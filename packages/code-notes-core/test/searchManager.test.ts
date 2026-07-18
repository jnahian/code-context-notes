/**
 * Smoke test for SearchManager
 * Verifies index build, a search hit, and history persistence via a fake HistoryStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SearchManager } from '../src/searchManager.js';
import { HistoryStore, Note } from '../src/types.js';

class FakeHistoryStore implements HistoryStore {
	private data = new Map<string, unknown>();
	get<T>(key: string): T | undefined {
		return this.data.get(key) as T | undefined;
	}
	async update(key: string, value: unknown): Promise<void> {
		this.data.set(key, value);
	}
}

function makeNote(overrides: Partial<Note>): Note {
	return {
		id: 'note-1',
		content: 'hello world',
		author: 'Alice',
		filePath: '/src/foo.ts',
		lineRange: { start: 0, end: 1 },
		contentHash: 'hash',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		history: [],
		...overrides
	};
}

describe('SearchManager Test Suite', () => {
	let store: FakeHistoryStore;
	let searchManager: SearchManager;

	beforeEach(() => {
		store = new FakeHistoryStore();
		searchManager = new SearchManager(store);
	});

	it('builds an index and finds a search hit', async () => {
		const notes = [
			makeNote({ id: 'note-1', content: 'fixing the login bug', author: 'Alice' }),
			makeNote({ id: 'note-2', content: 'unrelated content here', author: 'Bob' }),
			makeNote({ id: 'note-3', content: 'another login fix note', author: 'Alice' })
		];

		await searchManager.buildIndex(notes);

		const results = await searchManager.search({ text: 'login' }, notes);

		expect(results.length).toBe(2);
		expect(results.map(r => r.note.id).sort()).toEqual(['note-1', 'note-3']);
	});

	it('round-trips search history through the injected HistoryStore', async () => {
		await searchManager.saveSearch({ text: 'login' }, 2);

		const history = await searchManager.getSearchHistory();
		expect(history.length).toBe(1);
		expect(history[0].resultCount).toBe(2);

		// A fresh SearchManager backed by the same store should load the persisted history.
		const reloaded = new SearchManager(store);
		const reloadedHistory = await reloaded.getSearchHistory();
		expect(reloadedHistory.length).toBe(1);
		expect(reloadedHistory[0].label).toBe(history[0].label);
	});
});
