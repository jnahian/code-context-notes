# Architecture Overview

This document describes the technical architecture of the Code Context Notes extension.

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         VSCode UI Layer                            │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────────┐    │
│  │   Comment    │  │  CodeLens   │  │   Sidebar TreeView   │    │
│  │   Threads    │  │    Items    │  │  (Activity Bar)      │    │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬───────────┘    │
└─────────┼──────────────────┼────────────────────┼────────────────┘
          │                  │                    │
┌─────────┼──────────────────┼────────────────────┼────────────────┐
│         │    Extension Core Layer              │                 │
│  ┌──────▼──────┐  ┌────────▼─────────┐  ┌──────▼──────────────┐ │
│  │  Comment    │  │   CodeLens       │  │   Sidebar           │ │
│  │  Controller │  │   Provider       │  │   Provider          │ │
│  └──────┬──────┘  └────────┬─────────┘  └──────┬──────────────┘ │
│         │                  │                    │                 │
│         └──────────────────┼────────────────────┘                 │
│                            │                                      │
│                     ┌──────▼──────────┐                          │
│                     │   NoteManager   │ ◄─── EventEmitter        │
│                     └──────┬──────────┘      (noteChanged events)│
│                            │                                      │
│        ┌───────────────────┼───────────────────┐                 │
│        │                   │                   │                 │
│  ┌─────▼────────┐  ┌───────▼──────┐  ┌────────▼──────────┐     │
│  │   Storage    │  │   Content    │  │       Git         │     │
│  │   Manager    │  │    Hash      │  │   Integration     │     │
│  │              │  │   Tracker    │  │                   │     │
│  └─────┬────────┘  └──────────────┘  └───────────────────┘     │
└────────┼────────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────┐
│                      File System Layer                             │
│                      .code-notes/*.md                              │
└────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Extension Entry Point (`extension.ts`)

**Responsibility**: Extension lifecycle management

**Key Functions**:
- `activate()` - Initialize all components on extension activation
- `deactivate()` - Clean up resources on extension deactivation
- Register all commands and providers
- Set up event listeners for document changes
- Handle configuration changes

**Dependencies**:
- NoteManager
- CommentController
- CodeLensProvider

**Lifecycle**:
```typescript
activate() {
  1. Create NoteManager instance
  2. Create CommentController instance
  3. Register CodeLensProvider
  4. Register all commands
  5. Set up document change listeners
  6. Load existing notes
}

deactivate() {
  1. Dispose all subscriptions
  2. Clean up comment threads
  3. Save any pending changes
}
```

### 2. Note Manager (`noteManager.ts`)

**Responsibility**: Core business logic for note operations

**Key Methods**:
- `createNote()` - Create new note with validation
- `updateNote()` - Update existing note with history tracking
- `deleteNote()` - Mark note as deleted (soft delete)
- `getNotesForFile()` - Retrieve all notes for a file
- `getNoteById()` - Get specific note by ID
- `updateNotePositions()` - Update note positions after document changes

**Data Flow**:
```
User Action → NoteManager → StorageManager → File System
                    ↓
            ContentHashTracker (for position updates)
                    ↓
            GitIntegration (for author info)
```

**Caching Strategy**:
- In-memory cache of notes by file path
- Cache invalidation on note modifications
- Lazy loading - notes loaded on first access

**History Tracking**:
```typescript
Every operation creates a history entry:
{
  action: 'created' | 'edited' | 'deleted',
  content: string,  // Previous content
  author: string,
  timestamp: string
}
```

### 3. Storage Manager (`storageManager.ts`)

**Responsibility**: File I/O and markdown serialization

**Key Methods**:
- `saveNote()` - Write note to markdown file
- `loadNotes()` - Load all notes for a file
- `loadNoteById()` - Load specific note by ID
- `deleteNote()` - Mark note as deleted in file
- `noteToMarkdown()` - Serialize note to markdown
- `markdownToNote()` - Deserialize markdown to note

**File Naming Strategy**:
- Files named by note ID: `{noteId}.md`
- One file per note (stable across edits)
- Content hash stored as metadata inside file

**Markdown Format**:
```markdown
# Note

**File:** src/app.ts
**Lines:** 10-15
**Author:** username
**Created:** 2025-10-17T10:30:00.000Z
**Updated:** 2025-10-17T14:45:00.000Z
**Content Hash:** abc123

## Content

Note content here

## History

### Created - 2025-10-17T10:30:00.000Z - username

```
Original content
```

### Edited - 2025-10-17T14:45:00.000Z - username

```
Previous content
```
```

**Error Handling**:
- Graceful handling of missing files
- Validation of markdown format
- Recovery from corrupted files

### 4. Comment Controller (`commentController.ts`)

**Responsibility**: VSCode comment UI integration

**Key Methods**:
- `createCommentThread()` - Create new comment thread
- `updateCommentThread()` - Update existing thread
- `deleteCommentThread()` - Remove thread
- `handleEditNote()` - Enter edit mode
- `handleSaveNote()` - Save edited note
- `handleCancelEdit()` - Cancel edit mode
- `showHistoryInThread()` - Display history as replies

**Comment Thread Lifecycle**:
```
1. User selects code
2. User triggers "Add Note" command
3. CommentController creates empty thread
4. User enters content
5. User clicks Save
6. CommentController calls NoteManager.createNote()
7. Thread updated with note content
```

**Edit Mode**:
```
1. User clicks Edit button
2. Thread enters edit mode (editable)
3. User modifies content
4. User clicks Save or Cancel
5. If Save: NoteManager.updateNote() called
6. Thread exits edit mode
```

**Thread Management**:
- Map of note ID → comment thread
- Automatic cleanup on note deletion
- Sync with note data on changes

### 5. CodeLens Provider (`codeLensProvider.ts`)

**Responsibility**: Display indicators above code with notes

**Key Methods**:
- `provideCodeLenses()` - Generate CodeLens items for document
- `resolveCodeLens()` - Resolve CodeLens command
- `refresh()` - Trigger CodeLens refresh

**CodeLens Generation**:
```typescript
For each note in document:
  1. Get note line range
  2. Create CodeLens at start line
  3. Set command to "View Note"
  4. Set preview text (stripped of markdown)
```

**Refresh Triggers**:
- Document content changes
- Note created/updated/deleted
- Configuration changes
- Selection changes (for "Add Note" CodeLens)

**Performance Optimization**:
- Debounced refresh on rapid changes
- Cached note lookups
- Minimal re-rendering

### 6. Content Hash Tracker (`contentHashTracker.ts`)

**Responsibility**: Track code content and detect movement

**Key Methods**:
- `generateHash()` - Create hash of code content
- `getContentForRange()` - Extract code from line range
- `findContentByHash()` - Locate content by hash in document
- `normalizeContent()` - Normalize whitespace for hashing

**Hashing Algorithm**:
```typescript
1. Extract lines from range
2. Normalize whitespace (trim, collapse)
3. Generate SHA-256 hash
4. Return hex string
```

**Content Tracking**:
```
Document Change Event
        ↓
Extract all note content hashes
        ↓
For each hash:
  - Search document for matching content
  - If found at different line: update note position
  - If not found: mark note as potentially stale
```

**Normalization Rules**:
- Trim leading/trailing whitespace
- Collapse multiple spaces to single space
- Preserve line structure
- Case-sensitive comparison

### 7. Git Integration (`gitIntegration.ts`)

**Responsibility**: Retrieve git username for note authorship

**Key Methods**:
- `getGitUsername()` - Get username from git config
- `getSystemUsername()` - Fallback to system username

**Username Resolution**:
```
1. Check configuration override
2. Try git config user.name
3. Try git config user.email
4. Fallback to system username (os.userInfo())
5. Cache result for performance
```

**Error Handling**:
- Graceful handling if git not installed
- Graceful handling if not in git repo
- Always returns a username (never fails)

### 8. Sidebar Provider (`notesSidebarProvider.ts`)

**Responsibility**: Workspace-wide tree view of all notes

**Key Methods**:
- `getChildren(element?)` - Get tree children (lazy loading)
- `getTreeItem(element)` - Convert to VSCode TreeItem
- `refresh()` - Trigger tree refresh (debounced 300ms)

**Tree Structure**:
```
RootTreeItem: "Code Notes (N)"
  ├─ FileTreeItem: "src/app.ts (3)"
  │   ├─ NoteTreeItem: "Line 10: Preview text..."
  │   ├─ NoteTreeItem: "Line 25: Another note..."
  │   └─ NoteTreeItem: "Line 50: Third note..."
  └─ FileTreeItem: "src/utils.ts (1)"
      └─ NoteTreeItem: "Line 5: Utility note..."
```

**Event Handling**:
- Listens to `noteChanged` event from NoteManager
- Listens to `noteFileChanged` event for external file changes
- Automatically refreshes on note create/update/delete

**Sorting**:
- Sort by file path (alphabetically) - default
- Sort by date (most recent first)
- Sort by author (alphabetically)
- Configurable via `codeContextNotes.sidebar.sortBy`

**Configuration**:
- `sidebar.previewLength` - Preview text length (20-200, default 50)
- `sidebar.autoExpand` - Auto-expand file nodes (default false)
- `sidebar.sortBy` - Sorting mode (file/date/author)

### 9. Note Tree Items (`noteTreeItem.ts`)

**Responsibility**: Tree item classes for sidebar structure

**Classes**:

**RootTreeItem**:
- Label: "Code Notes (N)"
- Collapsed state: Expanded
- Icon: Folder
- Context value: "rootNode"

**FileTreeItem**:
- Label: "{relative_path} ({note_count})"
- Collapsed state: Collapsed (default)
- Icon: Language-specific file icon
- Context value: "fileNode"
- Stores notes array

**NoteTreeItem**:
- Label: "Line {line}: {preview}"
- Description: Author name (right-aligned)
- Collapsed state: None (leaf node)
- Icon: Note
- Context value: "noteNode"
- Command: Opens note on click
- Tooltip: Full note content with metadata

**Utility Methods**:
- `stripMarkdown(text)` - Remove markdown formatting from preview
- `truncateText(text, length)` - Truncate with ellipsis

### 10. Search Manager (`searchManager.ts`)

**Responsibility**: Manages search indexing and queries for notes

**Key Features**:

**Inverted Index**:
- Term → Note IDs mapping for fast full-text search
- Stop word filtering (48 common words)
- Single-character token filtering
- Memory-efficient index structure (~0.2MB per 100 notes)

**Metadata Indexes**:
- Author index: Author → Note IDs
- Date index: Note ID → Note (for temporal queries)
- File index: File path → Note IDs

**Search Capabilities**:
- Full-text search with tokenization
- Regex pattern matching with flags support
- Case-sensitive/insensitive modes
- Multiple filter combinations (AND logic)
- Relevance scoring with recency boost
- Max results limiting (configurable, default 100)

**Caching**:
- LRU-style cache (max 50 entries)
- 5-minute TTL per cache entry
- Cache key: stringified query
- Automatic invalidation on index updates

**Search History**:
- Last 20 searches persisted in global state
- Timestamp and query tracking
- History size configurable (5-100, default 20)

**Performance Optimizations**:
- Stop word filtering reduces index by ~30%
- Sub-100ms search times for typical workspaces
- Incremental index updates on note CRUD
- Detailed performance logging with metrics

**Public Methods**:
- `buildIndex(notes)` - Build complete search index
- `search(query, allNotes)` - Execute search with filters
- `searchFullText(text, caseSensitive)` - Text-only search
- `searchRegex(pattern, flags)` - Regex-based search
- `filterByAuthor(authors)` - Filter by one or more authors
- `filterByDateRange(start, end, field)` - Date range filtering
- `filterByFilePath(pattern)` - Glob pattern file filtering
- `updateIndex(note)` - Add/update note in index
- `removeFromIndex(noteId)` - Remove note from index
- `getIndexStats()` - Get indexing statistics
- `getAuthors()` - Get all unique authors
- `getSearchHistory()` - Retrieve search history
- `saveSearch(query)` - Save search to history
- `clearSearchHistory()` - Clear all search history

**Integration**:
- Initialized in `extension.ts` on activation
- Linked to NoteManager via `setSearchManager()`
- Background index building (1s delay) with progress notification
- Incremental updates on note create/update/delete

### 11. Search UI (`searchUI.ts`)

**Responsibility**: VSCode QuickPick interface for search interaction

**UI Components**:

**QuickPick Panel**:
- Title: "🔍 Search Notes"
- Placeholder: "Type to search notes... (supports regex with /pattern/)"
- Live search with 200ms debouncing
- Keyboard navigation (↑↓ arrows, Enter to open)
- Multi-select support for batch operations

**Search Input**:
- Text search support
- Regex pattern detection (`/pattern/flags`)
- Case-sensitive toggle via filter
- Debounced input handling (prevents excessive queries)

**Filter UI**:
- Author filter: Multi-select QuickPick with all authors
- Date filter: Predefined ranges or custom dates
  - Last 7 days, Last 30 days, Last 3 months, Last year
  - Custom start/end date pickers
  - Created vs. Modified date selection
- File filter: Glob pattern input
  - Examples: `src/**/*.ts`, `*.js`, `**/*.{ts,tsx}`

**Search Results**:
- Format: `📝 Line {line}: {preview}`
- Subtitle: `{file_path} ({author}) • Score: {relevance}`
- Click to navigate to note location
- Relevance score displayed (0-100)
- Result count indicator in title

**Search History**:
- Recent searches button (clock icon)
- Shows last 20 searches with timestamps
- Click to re-execute previous search
- Timestamp format: "X minutes/hours/days ago"

**Active Filters Display**:
- Shows applied filters in subtitle area
- Format: "Author: john_doe | Date: Last 7 days | File: src/**"
- Clear filters button (✕ icon)

**No Results State**:
- Empty state with helpful suggestions
- "No notes found. Try: Remove filters, Check spelling, Use different keywords"

**Public Methods**:
- `show()` - Display search panel
- `hide()` - Close search panel
- `dispose()` - Cleanup resources

**Event Handlers**:
- `onDidChangeValue` - Handle search input (debounced)
- `onDidAccept` - Navigate to selected note
- `onDidTriggerButton` - Handle filter buttons
- `onDidHide` - Cleanup on panel close

**Integration**:
- Command: `codeContextNotes.searchNotes`
- Keyboard shortcut: Ctrl/Cmd+Shift+F (when not in search view)
- Sidebar toolbar integration (search icon at navigation@2)
- Uses SearchManager for query execution
- Uses NoteManager for note retrieval

## Data Flow

### Creating a Note

```
1. User selects code and triggers "Add Note"
   ↓
2. CommentController creates empty thread
   ↓
3. User enters content and clicks Save
   ↓
4. CommentController calls NoteManager.createNote()
   ↓
5. NoteManager:
   - Generates note ID
   - Gets author from GitIntegration
   - Generates content hash from ContentHashTracker
   - Creates Note object with metadata
   - Calls StorageManager.saveNote()
   ↓
6. StorageManager:
   - Serializes note to markdown
   - Writes to .code-notes/{noteId}.md
   ↓
7. NoteManager updates cache
   ↓
8. CommentController updates thread with note content
   ↓
9. CodeLensProvider refreshes to show new indicator
```

### Editing a Note

```
1. User clicks Edit button in comment thread
   ↓
2. CommentController enters edit mode
   ↓
3. User modifies content and clicks Save
   ↓
4. CommentController calls NoteManager.updateNote()
   ↓
5. NoteManager:
   - Creates history entry with old content
   - Updates note content
   - Updates timestamp
   - Calls StorageManager.saveNote()
   ↓
6. StorageManager:
   - Serializes note with updated history
   - Writes to same file (.code-notes/{noteId}.md)
   ↓
7. NoteManager updates cache
   ↓
8. CommentController exits edit mode and updates thread
   ↓
9. CodeLensProvider refreshes to show updated preview
```

### Document Change Handling

```
1. User edits document
   ↓
2. VSCode fires onDidChangeTextDocument event
   ↓
3. Extension debounces event (300ms)
   ↓
4. NoteManager.updateNotePositions() called
   ↓
5. For each note in document:
   - ContentHashTracker searches for content
   - If found at different line: update note position
   - If not found: mark as potentially stale
   ↓
6. StorageManager saves updated notes
   ↓
7. CommentController updates thread positions
   ↓
8. CodeLensProvider refreshes indicators
```

### Searching Notes

```
1. User opens search (Ctrl/Cmd+Shift+F or sidebar search icon)
   ↓
2. SearchUI displays QuickPick panel
   ↓
3. User types query (debounced 200ms)
   ↓
4. SearchUI detects regex pattern (/pattern/flags) if present
   ↓
5. SearchUI calls SearchManager.search(query)
   ↓
6. SearchManager:
   - Checks cache for query (cache key: stringified query)
   - If cache hit and TTL valid: return cached results
   - If cache miss:
     a. Parse query (text/regex, filters)
     b. Search inverted index for matching terms
     c. Apply metadata filters (author, date, file)
     d. Intersect result sets (AND logic)
     e. Calculate relevance scores (TF + recency boost)
     f. Sort by relevance descending
     g. Limit results (default 100, configurable)
     h. Cache results with 5-minute TTL
   ↓
7. SearchUI formats results with preview and metadata
   ↓
8. User selects result and presses Enter
   ↓
9. SearchUI navigates to note location (file + line)
   ↓
10. SearchManager saves query to search history (last 20)
```

### Index Building and Updates

```
1. Extension activates (onStartupFinished)
   ↓
2. SearchManager initialized with VSCode context
   ↓
3. After 1 second delay (non-blocking):
   - Show progress notification "Building search index..."
   - NoteManager.getAllNotes() retrieves all notes
   - SearchManager.buildIndex(notes) creates inverted index
   - Progress notification updates: "Search index ready (N notes)"
   ↓
4. On note create/update/delete:
   - NoteManager calls SearchManager.updateIndex(note)
   - SearchManager incrementally updates indexes:
     a. Remove old entries for note ID
     b. Tokenize new content
     c. Update inverted index (term → note IDs)
     d. Update metadata indexes (author, date, file)
     e. Invalidate search cache (all entries)
   ↓
5. Index stays in memory (not persisted)
   - Rebuilds on workspace reload
   - Auto-updates on note changes
   - Memory usage: ~0.2MB per 100 notes
```

## Performance Considerations

### Caching

**Note Cache**:
- In-memory map of file path → notes
- Invalidated on note modifications
- Reduces file I/O

**Username Cache**:
- Git username cached after first retrieval
- Reduces subprocess calls

**CodeLens Cache**:
- VSCode handles CodeLens caching
- We trigger refresh only when needed

**Search Cache** (v0.3.0):
- LRU-style cache with max 50 entries
- 5-minute TTL per cache entry
- Cache key: stringified query (JSON)
- Invalidated on index updates
- Reduces search time from ~50ms to <1ms for repeated queries

### Debouncing

**Document Changes**:
- 300ms debounce on text changes
- Prevents excessive position updates
- Batches rapid edits

**CodeLens Refresh**:
- Debounced to prevent flicker
- Only refreshes affected ranges

**Search Input** (v0.3.0):
- 200ms debounce on search input
- Prevents excessive search queries
- Configurable (50-1000ms)
- Batches rapid keystrokes

### Lazy Loading

**Notes**:
- Loaded on first access per file
- Not all notes loaded on activation
- Reduces startup time

### Async Operations

**File I/O**:
- All file operations async
- Non-blocking UI
- Error handling for failures

## Error Handling

### Strategy

1. **Graceful Degradation**: Extension continues working even if some features fail
2. **User Feedback**: Show error messages for user-facing failures
3. **Logging**: Log errors for debugging
4. **Recovery**: Attempt to recover from errors when possible

### Error Categories

**File I/O Errors**:
- Missing files: Create on demand
- Permission errors: Show error message
- Corrupted files: Skip and log

**Git Errors**:
- Git not installed: Fallback to system username
- Not in repo: Fallback to system username
- Config missing: Fallback to system username

**VSCode API Errors**:
- Document not found: Show error message
- Invalid range: Validate and adjust
- Thread creation failed: Log and retry

## Testing Strategy

### Unit Tests

**Scope**: Pure logic without VSCode API
- StorageManager (22 tests)
- GitIntegration (19 tests)

**Approach**:
- Mock file system
- Test all public methods
- Test edge cases and errors

### Integration Tests

**Scope**: VSCode API integration
- ContentHashTracker (19 tests)
- NoteManager (40+ tests)
- SearchManager (35 tests)
  - Index building & management (7 tests)
  - Full-text search (8 tests)
  - Regex search (3 tests)
  - Filter functions (8 tests)
  - Search caching (4 tests)
  - Search history (4 tests)
  - Edge cases (3 tests)

**Approach**:
- Use VSCode test environment
- Test multi-file scenarios
- Test document change handling
- Mock VSCode context for search tests

### Coverage

- Target: >80% code coverage
- Current: 88% overall
- 76 total tests (41 existing + 35 search tests)

## Configuration

### Settings

```typescript
interface Configuration {
  storageDirectory: string;      // Default: ".code-notes"
  authorName: string;            // Default: "" (auto-detect)
  showCodeLens: boolean;         // Default: true

  // Search settings (v0.3.0+)
  search: {
    fuzzyMatching: boolean;      // Default: false
    caseSensitive: boolean;      // Default: false
    maxResults: number;          // Default: 100 (10-500)
    debounceDelay: number;       // Default: 200ms (50-1000)
    saveHistory: boolean;        // Default: true
    historySize: number;         // Default: 20 (5-100)
  };

  // Sidebar settings (v0.2.0+)
  sidebar: {
    previewLength: number;       // Default: 50 (20-200)
    autoExpand: boolean;         // Default: false
    sortBy: string;              // Default: "file" (file/date/author)
  };
}
```

### Configuration Changes

```
1. User changes setting
   ↓
2. VSCode fires onDidChangeConfiguration event
   ↓
3. Extension reads new value
   ↓
4. Update behavior:
   - storageDirectory: Reload notes from new location
   - authorName: Use for new notes
   - showCodeLens: Refresh CodeLens provider
   - search.*: Apply to next search operation
   - sidebar.*: Refresh sidebar view
```

## Extension Manifest

### Activation Events

- `onStartupFinished` - Activate after VSCode fully loaded

### Contributions

- **Commands**: 20 commands for note operations
  - 19 core note commands (create, edit, delete, etc.)
  - 1 search command (searchNotes)
- **Keybindings**: Keyboard shortcuts for common actions
  - Ctrl/Cmd+Shift+F for search (when not in search view)
- **Menus**: Context menus for comment threads and sidebar toolbar
- **Views**: Sidebar tree view for browsing notes
- **Configuration**: 12 settings
  - 3 core settings (storage, author, CodeLens)
  - 6 search settings (fuzzy, case-sensitive, max results, etc.)
  - 3 sidebar settings (preview length, auto-expand, sort)

### Dependencies

**Runtime**:
- `uuid` (v13.0.0) - Generate unique note IDs (ESM-only package)

**Development**:
- `typescript` - Type checking
- `mocha` - Test framework
- `chai` - Assertions
- `nyc` - Coverage reporting

### Module System (ES Modules)

**Since v0.1.4**, this extension uses **ES Modules (ESM)** instead of CommonJS.

**Configuration**:
```json
// package.json
{
  "type": "module"
}

// tsconfig.json
{
  "compilerOptions": {
    "module": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

**Import Syntax Requirements**:
- All local imports MUST include `.js` extension (even in TypeScript files)
- Example: `import { NoteManager } from './noteManager.js'`
- This is required by Node.js ES module resolution

**Rationale**:
- uuid v13.0.0 is ESM-only (dropped CommonJS support)
- ES modules are the modern JavaScript standard
- Better tree-shaking and optimization
- Native browser compatibility

**Migration Notes**:
- All TypeScript source files updated with `.js` extensions in imports
- `.vscodeignore` updated to include `node_modules/uuid` in packaged extension
- No breaking changes to public API or extension functionality

## Future Enhancements

### Implemented Features

1. ✅ **Sidebar View** (v0.2.0): Browse all notes in workspace
2. ✅ **Search** (v0.3.0): Find notes by content or metadata with filters

### Planned Features

1. **Export**: Export notes to various formats
2. **Templates**: Create notes from templates
3. **Tags**: Categorize notes with tags
4. **Replace in Notes**: Bulk editing across multiple notes
5. **Natural Language Search**: "notes created last week by author X"
6. **Note References**: Link notes to each other

### Architecture Changes

1. ✅ **Indexing** (v0.3.0): Inverted index for full-text search implemented
2. **Database**: Consider SQLite for enhanced query performance and persistence
3. **Sync**: Cloud sync for team collaboration
4. **Conflict Resolution**: Handle concurrent edits

## Security Considerations

### File System Access

- Only read/write to `.code-notes/` directory
- Validate all file paths
- Sanitize user input in markdown

### Markdown Rendering

- Use VSCode's trusted markdown renderer
- No arbitrary HTML execution
- Sanitize links and images

### Git Integration

- Read-only access to git config
- No modification of git state
- Handle missing git gracefully

## Troubleshooting

### Common Issues

**Notes not appearing**:
- Check `.code-notes/` directory exists
- Check file permissions
- Check CodeLens enabled in settings

**Notes at wrong position**:
- Content hash may not match
- Significant code changes
- Refresh notes manually

**Performance issues**:
- Too many notes in single file
- Large file size
- Disable CodeLens if needed

### Debug Mode

Enable debug logging:
```typescript
// In extension.ts
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[CodeContextNotes]', ...args);
  }
}
```

View logs in Developer Console:
- Help → Toggle Developer Tools
- Console tab
