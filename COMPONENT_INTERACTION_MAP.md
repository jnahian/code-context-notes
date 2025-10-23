# Code Context Notes - Component Interaction Map

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    VSCode Extension Runtime                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      Extension.ts                        │   │
│  │ - Entry point (activate/deactivate)                     │   │
│  │ - Command registration (20+ commands)                   │   │
│  │ - Event listener setup                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│           ↓           ↓              ↓              ↓            │
│      ┌────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐   │
│      │NoteManager│ │CommentCtrl │  │CodeLens │  │ContentHash│  │
│      └────────┘  └─────────────┘  └──────────┘  │Tracker   │   │
│         ↓           ↓                             └──────────┘   │
│      ┌────────────────────────────────────────┐       ↓          │
│      │      StorageManager                    │  ┌──────────┐   │
│      │  .code-notes/                          │  │GitIntegr │   │
│      │  ├── {uuid-1}.md                       │  └──────────┘   │
│      │  ├── {uuid-2}.md                       │                  │
│      │  └── {uuid-N}.md                       │                  │
│      └────────────────────────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    ┌────────────┐    ┌──────────────┐    ┌────────────────┐
    │VSCode UI   │    │VSCode Events │    │File System     │
    │- Comments  │    │- onOpen      │    │- .code-notes/  │
    │- CodeLens  │    │- onChange    │    │- markdown      │
    │- Buttons   │    │- onClose     │    │                │
    └────────────┘    └──────────────┘    └────────────────┘
```

## Component Responsibilities

### 1. Extension.ts (Main Entry Point)
**File**: `/Users/nahian/Projects/code-notes/src/extension.ts` (739 lines)

**Responsibilities**:
- Initialize components on activation
- Register all 20+ commands
- Set up event listeners
- Handle configuration changes
- Clean up on deactivation

**Key Exports**:
```typescript
export async function activate(context: vscode.ExtensionContext)
export function deactivate()
```

**Events Handled**:
- `onStartupFinished` - activation trigger
- `onDidOpenTextDocument` - load notes for new files
- `onDidChangeTextDocument` - update note positions
- `onDidChangeConfiguration` - config changes
- `onDidChangeWorkspaceFolders` - workspace changes

### 2. NoteManager.ts (Central Coordinator)
**File**: `/Users/nahian/Projects/code-notes/src/noteManager.ts` (355 lines)

**Responsibilities**:
- Create, update, delete notes
- Query notes by file/ID
- Track note position changes
- Manage note cache
- Validate operations

**Public Methods**:
```typescript
async createNote(params, document): Promise<Note>
async updateNote(params, document): Promise<Note>
async deleteNote(noteId, filePath): Promise<void>
async getNotesForFile(filePath): Promise<Note[]>
async updateNotePositions(document): Promise<Note[]>
```

**Dependencies**:
- StorageManager (persistence)
- ContentHashTracker (tracking)
- GitIntegration (author)

### 3. StorageManager.ts (Persistence Layer)
**File**: `/Users/nahian/Projects/code-notes/src/storageManager.ts` (378 lines)

**Responsibilities**:
- Read/write markdown files
- Convert Note ↔ Markdown
- Manage .code-notes/ directory
- Handle soft deletes

**Public Methods**:
```typescript
async saveNote(note): Promise<void>
async loadNotes(filePath): Promise<Note[]>
async loadAllNotes(filePath): Promise<Note[]>  // includes deleted
async loadNoteById(noteId): Promise<Note | null>
async deleteNote(noteId, filePath): Promise<void>
async storageExists(): Promise<boolean>
async createStorage(): Promise<void>
```

**Storage Format**:
```
.code-notes/
├── {uuid-1}.md
├── {uuid-2}.md
└── {uuid-N}.md

Each file contains:
- Header with file/line info
- Note metadata (author, timestamps)
- Current content
- Complete edit history
```

### 4. CommentController.ts (UI Coordination)
**File**: `/Users/nahian/Projects/code-notes/src/commentController.ts` (676 lines)
**Complexity**: Highest - manages complex VSCode comment UI

**Responsibilities**:
- Create/manage comment threads
- Handle edit mode
- Display history
- Lifecycle management
- Event handlers for save/delete

**Public Methods**:
```typescript
async loadCommentsForDocument(doc): Promise<void>
async createCommentThread(doc, note): vscode.CommentThread
async openCommentEditor(doc, range): Promise<CommentThread>
async handleSaveNewNote(thread, content): Promise<void>
async handleUpdateNote(noteId, content, doc): Promise<Note>
async handleDeleteNote(noteId, filePath): Promise<void>
async showHistoryInThread(noteId, filePath): Promise<void>
async enableEditMode(noteId, filePath): Promise<void>
```

**Manages**:
- Comment threads: `Map<string, vscode.CommentThread>`
- Editing state: `currentlyEditingNoteId`
- Creation state: `currentlyCreatingThreadId`

### 5. CodeNotesLensProvider.ts (Visual Indicators)
**File**: `/Users/nahian/Projects/code-notes/src/codeLensProvider.ts` (152 lines)

**Responsibilities**:
- Create CodeLens indicators
- Format preview text
- Provide view/add commands
- Handle refresh events

**Key Methods**:
```typescript
async provideCodeLenses(doc, token): Promise<CodeLens[]>
refresh(): void
```

**CodeLens Features**:
- Shows preview: `📝 Note: {first 50 chars} ({author})`
- Position: Above line with note
- Actions: view, add note

### 6. ContentHashTracker.ts (Code Tracking)
**File**: `/Users/nahian/Projects/code-notes/src/contentHashTracker.ts` (130+ lines)

**Responsibilities**:
- Hash code content (SHA-256)
- Detect content movement
- Find moved content
- Validate positions

**Key Methods**:
```typescript
generateHash(document, lineRange): string
validateContentHash(document, lineRange, hash): boolean
async findContentByHash(document, hash, range): ContentHashResult
```

**Algorithm**:
- Normalize whitespace
- SHA-256 hash
- Sliding window search for moved content

### 7. GitIntegration.ts (Author Detection)
**File**: `/Users/nahian/Projects/code-notes/src/gitIntegration.ts` (50+ lines)

**Responsibilities**:
- Get git username
- Fallback to system username
- Cache results
- Handle config override

**Key Methods**:
```typescript
async getAuthorName(): Promise<string>
updateConfigOverride(name?: string): void
```

## Data Flow Sequences

### Creating a Note

```
User Selection
    ↓
Command: codeContextNotes.addNote
    ↓
CommentController.openCommentEditor()
    ├─ Create temporary comment thread
    ├─ Set canReply = true
    └─ Set collapsibleState = Expanded
    ↓
User types content and submits
    ↓
Command: codeContextNotes.saveNewNote
    ↓
CommentController.handleSaveNewNote()
    ├─ Get document from thread.uri
    ├─ Extract lineRange from thread.range
    └─ Call noteManager.createNote()
    ↓
NoteManager.createNote()
    ├─ Generate UUID
    ├─ Hash code: ContentHashTracker.generateHash()
    ├─ Get author: GitIntegration.getAuthorName()
    ├─ Create Note object
    └─ Call storage.saveNote()
    ↓
StorageManager.saveNote()
    ├─ Create .code-notes/ if needed
    ├─ Convert Note to markdown
    └─ Write to .code-notes/{uuid}.md
    ↓
Update cache and UI
    ↓
CommentController.createCommentThread()
    ├─ Create real (non-temp) thread
    ├─ Set content from note
    └─ Add to tracking map
    ↓
Dispose temporary thread
    ↓
Show success notification
```

### Loading Notes for a File

```
Event: onDidOpenTextDocument
    ↓
Extension event handler
    ↓
CommentController.loadCommentsForDocument()
    ├─ Get filePath from document
    └─ Call noteManager.getNotesForFile()
    ↓
NoteManager.getNotesForFile()
    ├─ Check cache (filePath → [notes])
    ├─ Cache hit? Return cached
    └─ Cache miss? Call storage.loadNotes()
    ↓
StorageManager.loadNotes()
    ├─ getAllNoteFiles() - list all .md
    ├─ For each file:
    │  ├─ Read file
    │  ├─ Parse markdown to Note
    │  └─ Filter: note.filePath === filePath (LINEAR SEARCH)
    └─ Return matching notes
    ↓
Update cache with notes
    ↓
For each note:
    ├─ CommentController.createCommentThread()
    ├─ CodeNotesLensProvider creates CodeLens
    └─ Display in editor
    ↓
CodeLensProvider.refresh() fires
    ↓
VSCode re-renders CodeLens indicators
```

### Handling Code Changes

```
Event: onDidChangeTextDocument (debounced 500ms)
    ↓
Extension event handler
    ↓
CommentController.handleDocumentChange()
    ├─ Get notes for document
    └─ Call noteManager.updateNotePositions()
    ↓
NoteManager.updateNotePositions()
    ├─ For each note:
    │  ├─ ContentHashTracker.validateContentHash()
    │  │  └─ Hash == original? Code still there
    │  └─ If NOT: findContentByHash()
    │
    ├─ ContentHashTracker.findContentByHash()
    │  ├─ Sliding window through document
    │  ├─ Hash each window
    │  └─ Match found? Return new LineRange
    │
    ├─ If found: Update note.lineRange
    ├─ Save via storage.saveNote()
    └─ Add to updatedNotes list
    ↓
Return updatedNotes
    ↓
For each updated note:
    ├─ CommentController.updateCommentThread()
    └─ Update range in thread
    ↓
CodeLensProvider.refresh()
    ↓
VSCode re-renders CodeLens at new positions
```

## Command Routing

```
User Action (keyboard/menu/button)
    ↓
Command ID dispatched
    ↓
Extension.registerAllCommands()
    └─ Routes to handler
    ↓
Handler (in extension.ts)
    ├─ Validate preconditions
    ├─ Get context (editor, document, etc.)
    └─ Call appropriate controller method
    ↓
Controller Method
    ├─ Call noteManager/storage as needed
    └─ Update UI (threads, CodeLens)
    ↓
User sees result
```

## Key Interactions

### NoteManager ↔ StorageManager
- **Direction**: Bidirectional
- **On Create**: NoteManager → StorageManager.saveNote()
- **On Update**: NoteManager → StorageManager.saveNote()
- **On Delete**: NoteManager → StorageManager.deleteNote()
- **On Read**: NoteManager ← StorageManager.loadNotes()

### CommentController ↔ NoteManager
- **Direction**: Bidirectional
- **UI Events**: CommentController → NoteManager.create/update/delete
- **Queries**: CommentController ← NoteManager.getNotesForFile()

### ContentHashTracker ↔ NoteManager
- **Direction**: Unidirectional (used by NoteManager)
- **Tracking**: NoteManager → ContentHashTracker.generateHash()
- **Position Updates**: NoteManager → ContentHashTracker.findContentByHash()

### GitIntegration ↔ NoteManager
- **Direction**: Unidirectional (used by NoteManager)
- **Author**: NoteManager → GitIntegration.getAuthorName()

## Performance Hotspots

1. **StorageManager.loadNotes()** - O(N) linear search
   - Must read ALL note files
   - Filter by filePath string match
   - Bottleneck for large note collections

2. **ContentHashTracker.findContentByHash()** - O(M*K) where M=lines, K=range size
   - Sliding window through entire document
   - Hash calculation per window
   - Can be slow on very large files

3. **NoteManager cache invalidation**
   - Cache cleared on document change
   - Rebuilds on next access
   - Trade-off: correctness vs. performance

## Error Handling Patterns

### Try-Catch
- File I/O operations in StorageManager
- Async operations in NoteManager
- UI operations in CommentController

### Validation
- LineRange bounds checking
- Note existence checks
- Document availability checks

### User Feedback
- Information messages: success notifications
- Warning messages: confirmations before delete
- Error messages: failures with context

## Testing Coverage

- **Unit Tests**: 41 (pure logic)
  - StorageManager: 22 tests
  - GitIntegration: 19 tests
  
- **Integration Tests**: 59+ (with VSCode)
  - ContentHashTracker: 19 tests
  - NoteManager: 40+ tests
  
- **Coverage**: 88% overall
