# Architecture Overview

This document describes the technical architecture of the Code Context Notes extension.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VSCode UI Layer                       │
│  ┌──────────────────┐              ┌────────────────────┐  │
│  │ Comment Threads  │              │   CodeLens Items   │  │
│  └────────┬─────────┘              └─────────┬──────────┘  │
└───────────┼────────────────────────────────────┼────────────┘
            │                                    │
┌───────────┼────────────────────────────────────┼────────────┐
│           │      Extension Core Layer          │            │
│  ┌────────▼─────────┐              ┌──────────▼─────────┐  │
│  │ CommentController│              │  CodeLensProvider  │  │
│  └────────┬─────────┘              └──────────┬─────────┘  │
│           │                                    │            │
│           └────────────┬───────────────────────┘            │
│                        │                                    │
│                 ┌──────▼──────────┐                        │
│                 │   NoteManager   │                        │
│                 └──────┬──────────┘                        │
│                        │                                    │
│        ┌───────────────┼───────────────┐                   │
│        │               │               │                   │
│  ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────────┐        │
│  │  Storage   │ │  Content   │ │      Git       │        │
│  │  Manager   │ │   Hash     │ │  Integration   │        │
│  │            │ │  Tracker   │ │                │        │
│  └─────┬──────┘ └────────────┘ └────────────────┘        │
└────────┼───────────────────────────────────────────────────┘
         │
┌────────▼────────────────────────────────────────────────────┐
│                    File System Layer                         │
│                    .code-notes/*.md                          │
└──────────────────────────────────────────────────────────────┘
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

### Debouncing

**Document Changes**:
- 300ms debounce on text changes
- Prevents excessive position updates
- Batches rapid edits

**CodeLens Refresh**:
- Debounced to prevent flicker
- Only refreshes affected ranges

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

**Approach**:
- Use VSCode test environment
- Test multi-file scenarios
- Test document change handling

### Coverage

- Target: >80% code coverage
- Current: 88% overall
- 100 total tests

## Configuration

### Settings

```typescript
interface Configuration {
  storageDirectory: string;  // Default: ".code-notes"
  authorName: string;        // Default: "" (auto-detect)
  showCodeLens: boolean;     // Default: true
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
```

## Extension Manifest

### Activation Events

- `onStartupFinished` - Activate after VSCode fully loaded

### Contributions

- **Commands**: 19 commands for note operations
- **Keybindings**: Keyboard shortcuts for common actions
- **Menus**: Context menus for comment threads
- **Configuration**: 3 settings

### Dependencies

**Runtime**:
- `uuid` - Generate unique note IDs

**Development**:
- `typescript` - Type checking
- `mocha` - Test framework
- `chai` - Assertions
- `nyc` - Coverage reporting

## Future Enhancements

### Planned Features

1. **Sidebar View**: Browse all notes in workspace
2. **Search**: Find notes by content or metadata
3. **Export**: Export notes to various formats
4. **Templates**: Create notes from templates
5. **Tags**: Categorize notes with tags

### Architecture Changes

1. **Database**: Consider SQLite for better query performance
2. **Indexing**: Full-text search index for notes
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
