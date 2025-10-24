# User Story: Search and Filter Notes

## Epic 13: Advanced Note Discovery & Management

### User Story 13.1: Search and Filter Notes

**As a** developer working with many notes across a large codebase
**I want to** search and filter notes by content, author, and date
**So that** I can quickly find relevant notes without browsing through all files

---

## Progress Summary

### Status: ⏳ IN PROGRESS (51% done)

**Phases:**
- [x] Phase 1: Search Infrastructure (8/8 tasks) ✅ COMPLETE
- [x] Phase 2: UI Components (9/9 tasks) ✅ COMPLETE
- [x] Phase 3: Filter Implementation (7/10 tasks) ✅ MOSTLY COMPLETE
- [x] Phase 4: Integration & Commands (7/7 tasks) ✅ COMPLETE
- [ ] Phase 5: Performance & Polish (0/8 tasks)
- [ ] Phase 6: Testing (0/14 tasks)
- [ ] Phase 7: Documentation (0/8 tasks)

**Total Tasks:** 64 tasks across 7 phases (31 completed, 3 deferred)

---

## Tasks

### Phase 1: Search Infrastructure ✅ COMPLETE
- [x] Create `src/searchManager.ts` with search indexing
- [x] Implement full-text search algorithm (fuzzy matching support)
- [x] Add regex pattern matching support
- [x] Create note metadata indexing (author, dates, file path)
- [x] Implement search result ranking algorithm
- [x] Add caching for search results
- [x] Create search history persistence
- [x] Implement incremental index updates on note changes

### Phase 2: UI Components ✅ COMPLETE
- [x] Create search input panel with VSCode QuickPick
- [x] Add search input with placeholder and keyboard shortcuts
- [x] Implement live search results update as user types
- [x] Create filter dropdowns (author, date range, file)
- [x] Add search result preview with context highlighting
- [x] Implement "Show in Sidebar" action for results
- [x] Create "Clear Filters" button
- [x] Add search result count indicator
- [x] Implement keyboard navigation for results (↑↓ arrows, Enter)

### Phase 3: Filter Implementation ⏳ IN PROGRESS
- [x] Implement author filter with autocomplete
- [x] Add date range filter (created date)
- [x] Add date range filter (modified date)
- [x] Implement file path filter (glob pattern support)
- [x] Add "Multiple Authors" filter (OR logic)
- [x] Implement filter combinations (AND logic)
- [ ] Create saved filter presets
- [x] Add "Recent Searches" quick access
- [ ] Implement filter state persistence
- [ ] Add "Advanced Filters" toggle for power users

### Phase 4: Integration & Commands ✅ COMPLETE
- [x] Add `codeContextNotes.searchNotes` command
- [x] Add keyboard shortcut (Ctrl/Cmd+Shift+F for notes)
- [x] Integrate search with sidebar view (search icon in toolbar)
- [x] Initialize SearchManager in extension.ts
- [x] Link SearchManager to NoteManager for incremental updates
- [x] Build search index on workspace activation (background, 1s delay)
- [x] Add search configuration settings to package.json

### Phase 5: Performance & Polish 📋 PLANNED
- [ ] Optimize search for 1000+ notes (< 500ms response)
- [ ] Add search debouncing (200ms delay)
- [ ] Implement lazy loading for large result sets
- [ ] Add progress indicator for long searches
- [ ] Create background indexing on workspace open
- [ ] Optimize memory usage for search index
- [ ] Add search analytics (track common queries)
- [ ] Implement "No results" empty state with suggestions

### Phase 6: Testing 📋 PLANNED
- [ ] Write unit tests for SearchManager (20+ tests)
- [ ] Test full-text search with various queries
- [ ] Test regex pattern matching
- [ ] Test author filter with edge cases
- [ ] Test date range filters
- [ ] Test filter combinations
- [ ] Test search performance with 100, 500, 1000 notes
- [ ] Test search index updates on note CRUD operations
- [ ] Test keyboard navigation in results
- [ ] Manual testing: search across workspace
- [ ] Manual testing: filter combinations
- [ ] Manual testing: saved searches
- [ ] Manual testing: performance with large datasets
- [ ] Test search with multi-note features

### Phase 7: Documentation 📋 PLANNED
- [ ] Update README.md with search feature
- [ ] Document search syntax (regex, fuzzy matching)
- [ ] Document filter options and combinations
- [ ] Document keyboard shortcuts for search
- [ ] Update architecture documentation
- [ ] Add search examples to Quick Start guide
- [ ] Create screenshots of search UI
- [ ] Update Commands section

---

## Acceptance Criteria

### Must Have (MVP)
- [ ] Full-text search across all note content
- [ ] Search results show file, line, note preview, and author
- [ ] Filter by author (single or multiple)
- [ ] Filter by date range (created or modified)
- [ ] Filter by file path (glob pattern)
- [ ] Combine multiple filters (AND logic)
- [ ] Click result to navigate to note
- [ ] Search input accessible via keyboard shortcut
- [ ] Search integrated into sidebar toolbar
- [ ] Live results update as user types (debounced)
- [ ] Clear filters button
- [ ] Search result count indicator
- [ ] Keyboard navigation in results

### Nice to Have (Future Enhancements)
- [ ] Regex pattern support for advanced users
- [ ] Fuzzy matching for typo tolerance
- [ ] Saved search presets
- [ ] Recent searches history
- [ ] "Find References" to other notes
- [ ] Replace in notes (bulk editing)
- [ ] Export search results
- [ ] Search by tags (if tags feature added)
- [ ] Search by code content hash (related notes)
- [ ] Natural language search ("notes created last week")

### Performance
- [ ] Search completes in < 500ms with 100 notes
- [ ] Search completes in < 1 second with 500 notes
- [ ] Search completes in < 2 seconds with 1000 notes
- [ ] Index updates in < 100ms on note change
- [ ] Memory usage < 10MB for search index with 1000 notes
- [ ] No UI blocking during search

### Compatibility
- [ ] Works with existing notes
- [ ] Works with multi-note feature (multiple notes per line)
- [ ] Works with sidebar view
- [ ] No breaking changes to storage format
- [ ] No data migration required

---

## UI/UX Design

### Search Panel (VSCode QuickPick)
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search notes... (regex: /pattern/)              [×]  │
├─────────────────────────────────────────────────────────┤
│ 🎯 Filters: Author: john_doe | Date: Last 7 days   [×]  │
├─────────────────────────────────────────────────────────┤
│ 📊 15 results                                            │
├─────────────────────────────────────────────────────────┤
│ 📝 src/extension.ts:45 (john_doe)                       │
│    Initialize note manager and comment controller...    │
├─────────────────────────────────────────────────────────┤
│ 📝 src/noteManager.ts:120 (jane_smith)                  │
│    Core business logic for CRUD operations...           │
├─────────────────────────────────────────────────────────┤
│ 📝 src/extension.ts:250 (john_doe)                      │
│    Error handling for edge cases when creating...       │
└─────────────────────────────────────────────────────────┘
  ↑↓: Navigate | Enter: Open | Esc: Close
```

### Sidebar Integration
```
Code Notes Sidebar
┌─────────────────────────────────┐
│ [+] [🔍] [⬇] [↻]               │ ← Search icon in toolbar
├─────────────────────────────────┤
│ 📁 Code Notes (15)              │
│   📄 src/extension.ts (3)       │
│   📄 src/noteManager.ts (2)     │
└─────────────────────────────────┘
```

### Search Results in Sidebar (Alternative View)
```
Code Notes Sidebar
┌─────────────────────────────────┐
│ [🔍] Search Results (15)    [×]│
├─────────────────────────────────┤
│ 📝 Line 45: Initialize note...  │
│    src/extension.ts (john_doe)  │
├─────────────────────────────────┤
│ 📝 Line 120: Core business...   │
│    src/noteManager.ts (jane_s.) │
└─────────────────────────────────┘
```

---

## Technical Implementation

### File Structure
```
src/
├── searchManager.ts           (New - Search & indexing)
├── searchTypes.ts             (New - Search interfaces)
├── searchUI.ts                (New - QuickPick UI)
├── noteManager.ts             (Update - Add search hooks)
├── notesSidebarProvider.ts    (Update - Search integration)
├── extension.ts               (Update - Search commands)
└── types.ts                   (Update - Search types)
```

### Search Manager Interface
```typescript
export class SearchManager {
  // Core search
  async search(query: SearchQuery): Promise<SearchResult[]>;
  async searchFullText(text: string): Promise<Note[]>;

  // Filters
  async filterByAuthor(authors: string[]): Promise<Note[]>;
  async filterByDateRange(start: Date, end: Date, field: 'created' | 'updated'): Promise<Note[]>;
  async filterByFilePath(pattern: string): Promise<Note[]>;

  // Index management
  async buildIndex(): Promise<void>;
  async updateIndex(noteId: string): Promise<void>;
  async rebuildIndex(): Promise<void>;

  // Utilities
  async getAuthors(): Promise<string[]>;
  async getSearchHistory(): Promise<string[]>;
  async saveSearch(query: SearchQuery): Promise<void>;
}

export interface SearchQuery {
  text?: string;               // Full-text search
  regex?: RegExp;              // Regex pattern
  authors?: string[];          // Filter by authors
  dateRange?: {                // Date range filter
    start?: Date;
    end?: Date;
    field: 'created' | 'updated';
  };
  filePattern?: string;        // Glob pattern for files
  caseSensitive?: boolean;
  fuzzy?: boolean;             // Fuzzy matching
}

export interface SearchResult {
  note: Note;
  score: number;               // Relevance score
  matches: SearchMatch[];      // Highlighted matches
  context: string;             // Surrounding text
}

export interface SearchMatch {
  text: string;
  startIndex: number;
  endIndex: number;
}
```

### Indexing Strategy
```typescript
// In-memory index for fast search
class NoteIndex {
  private contentIndex: Map<string, Set<string>>;  // word -> noteIds
  private authorIndex: Map<string, Set<string>>;   // author -> noteIds
  private dateIndex: Map<string, Note>;            // noteId -> note
  private fileIndex: Map<string, Set<string>>;     // filePath -> noteIds

  async buildIndex(notes: Note[]): Promise<void> {
    // Tokenize content and build inverted index
    // Index author metadata
    // Index date metadata
    // Index file paths
  }

  async search(query: SearchQuery): Promise<Note[]> {
    // Query inverted index
    // Apply filters
    // Rank results by relevance
    // Return sorted results
  }
}
```

### Integration Points
```typescript
// In extension.ts
const searchNotesCommand = vscode.commands.registerCommand(
  'codeContextNotes.searchNotes',
  async () => {
    const searchUI = new SearchUI(searchManager, noteManager);
    await searchUI.show();
  }
);

// In noteManager.ts
export class NoteManager extends EventEmitter {
  private searchManager: SearchManager;

  async createNote(note: Note): Promise<void> {
    // ... existing code ...
    await this.searchManager.updateIndex(note.id);
  }
}

// In notesSidebarProvider.ts
export class NotesSidebarProvider {
  private searchMode: boolean = false;
  private searchResults: Note[] = [];

  async showSearchResults(results: Note[]): Promise<void> {
    this.searchMode = true;
    this.searchResults = results;
    this.refresh();
  }

  async clearSearch(): Promise<void> {
    this.searchMode = false;
    this.searchResults = [];
    this.refresh();
  }
}
```

---

## Configuration Options

```json
{
  "codeContextNotes.search.fuzzyMatching": {
    "type": "boolean",
    "default": false,
    "description": "Enable fuzzy matching for search queries"
  },
  "codeContextNotes.search.caseSensitive": {
    "type": "boolean",
    "default": false,
    "description": "Make search case-sensitive by default"
  },
  "codeContextNotes.search.maxResults": {
    "type": "number",
    "default": 100,
    "description": "Maximum number of search results to display"
  },
  "codeContextNotes.search.debounceDelay": {
    "type": "number",
    "default": 200,
    "description": "Delay in milliseconds before triggering search"
  },
  "codeContextNotes.search.saveHistory": {
    "type": "boolean",
    "default": true,
    "description": "Save search history for quick access"
  },
  "codeContextNotes.search.historySize": {
    "type": "number",
    "default": 20,
    "description": "Number of recent searches to keep"
  }
}
```

---

## Success Metrics

**User Experience:**
- Users can find any note in ≤ 3 clicks/keystrokes
- Search results appear instantly (< 500ms)
- Filter combinations work intuitively
- Search UI feels native and integrated
- Keyboard shortcuts enable fast workflows

**Technical:**
- Search completes in < 1 second with 1000 notes
- Index updates in < 100ms on note changes
- Memory usage stays < 10MB for search index
- No UI blocking during search operations
- Search accuracy > 95% for relevant queries

---

## Timeline Estimate

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Search infrastructure & indexing | 6-8 hours |
| 2 | UI components (QuickPick, filters) | 5-6 hours |
| 3 | Filter implementation | 4-5 hours |
| 4 | Integration & commands | 3-4 hours |
| 5 | Performance optimization & polish | 4-5 hours |
| 6 | Testing (unit + integration + manual) | 5-7 hours |
| 7 | Documentation | 2-3 hours |

**Total Estimate:** 29-38 hours (4-5 days of focused work)

---

## Dependencies & Risks

### Dependencies
- NoteManager for accessing notes
- Sidebar provider for result display
- VSCode QuickPick API for search UI
- Existing note storage format

### Risks & Mitigation

**Risk: Poor search performance with many notes**
- Mitigation: Inverted index, caching, lazy loading, background indexing

**Risk: Complex filter UI overwhelming users**
- Mitigation: Start with simple search, add filters progressively, good defaults

**Risk: Index synchronization issues**
- Mitigation: Event-driven index updates, rebuild command, validation

**Risk: Memory usage with large indexes**
- Mitigation: Compact index structure, configurable limits, lazy loading

**Risk: Search result relevance**
- Mitigation: Ranking algorithm, user feedback, iterative improvement

---

## Related

**GitHub Issue:** #10 - [FEATURE] Search and filter notes by content, author, date
**Target Version:** v0.3.0
**Type:** Minor version (new feature, backward compatible)
**Priority:** Medium-High (highly requested, builds on sidebar feature)

---

## Notes

- This feature builds on the sidebar view (v0.2.0)
- Works seamlessly with multi-note feature
- No breaking changes to storage format
- Search index stored in memory (not persisted)
- Provides foundation for future features (tags, categories, export)
- Addresses user need for note discovery at scale
- Complements existing sidebar browsing

---

## Alternative Approaches Considered

### 1. VSCode Search Panel Integration
**Pros:** Uses familiar UI, powerful regex support
**Cons:** Not note-specific, harder to add metadata filters
**Decision:** Use QuickPick for note-specific search, consider as future enhancement

### 2. External Search Tool (ripgrep/fzf)
**Pros:** Very fast, battle-tested
**Cons:** External dependency, harder to integrate metadata
**Decision:** Use JavaScript-based search for better integration

### 3. Sidebar Search (Inline)
**Pros:** Single UI location, contextual
**Cons:** Limited space, harder to show results
**Decision:** Use QuickPick as primary, integrate with sidebar as secondary

### 4. Database Backend (SQLite)
**Pros:** Very fast queries, powerful filters
**Cons:** Adds complexity, external dependency
**Decision:** Use in-memory index for MVP, consider for v1.0 if needed
