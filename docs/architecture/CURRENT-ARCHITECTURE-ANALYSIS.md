# Code Context Notes - Current Architecture Analysis

## Executive Summary

This document provides a comprehensive analysis of how notes are currently stored and managed in the Code Context Notes extension. The analysis covers:

1. **Storage System**: Notes are stored as individual markdown files in a `.code-notes` directory
2. **Data Model**: Each note is a standalone entity with unique ID, file path, line range, and complete history
3. **Current Limitation**: Only ONE note per line range is supported
4. **Architecture**: Built on a layered architecture with separation of concerns

---

## Table of Contents

1. [Current Storage System](#current-storage-system)
2. [Data Model](#data-model)
3. [Note-to-Code Association](#note-to-code-association)
4. [Gutter Decorations & UI](#gutter-decorations--ui)
5. [Command Architecture](#command-architecture)
6. [Key Components](#key-components)
7. [Current Limitation Analysis](#current-limitation-analysis)
8. [Data Flow](#data-flow)

---

## Current Storage System

### Location and Structure

```
workspace-root/
└── .code-notes/
    ├── {uuid-1}.md          # Individual note file 1
    ├── {uuid-2}.md          # Individual note file 2
    ├── {uuid-3}.md          # Individual note file 3
    └── ...
```

### Storage Implementation

**File**: `/Users/nahian/Projects/code-notes/src/storageManager.ts`

The `StorageManager` class implements the `NoteStorage` interface and manages:

```typescript
class StorageManager implements NoteStorage {
  private workspaceRoot: string;
  private storageDirectory: string;  // Default: '.code-notes'

  // Key methods:
  async saveNote(note: Note): Promise<void>
  async loadNotes(filePath: string): Promise<Note[]>  // Excludes deleted
  async loadAllNotes(filePath: string): Promise<Note[]>  // Includes deleted
  async loadNoteById(noteId: string): Promise<Note | null>
  async deleteNote(noteId: string, filePath: string): Promise<void>
}
```

### File Organization Strategy

Each note gets its own markdown file:
- **File naming**: `{note.id}.md` (e.g., `abc123def456.md`)
- **All notes stored in one directory**: The `.code-notes` directory contains all notes
- **No file organization by source**: Notes for different files are mixed in same directory
- **Linear search on load**: Must iterate through ALL notes to find ones for specific file

### Markdown Format

Each note file contains:

```markdown
# Code Context Note

**File:** /path/to/source/file.ts
**Lines:** 10-15
**Content Hash:** [SHA-256 hash]

## Note: {uuid}
**Author:** John Doe
**Created:** 2024-10-19T10:30:00Z
**Updated:** 2024-10-19T14:20:00Z

## Current Content

The note text goes here with markdown formatting support.

## Edit History

Complete chronological history of all changes to this note...

### 2024-10-19T10:30:00Z - John Doe - created

```
code content
```

### 2024-10-19T14:20:00Z - John Doe - edited

```
new code content
```
```

---

## Data Model

### Note Interface

**File**: `/Users/nahian/Projects/code-notes/src/types.ts`

```typescript
export interface Note {
  // Identity
  id: string;                    // UUID unique per note
  
  // Content
  content: string;               // Markdown note text
  author: string;                // Who created the note
  
  // Location in code
  filePath: string;              // Absolute path to source file
  lineRange: LineRange;          // { start: number, end: number }
  contentHash: string;           // SHA-256 hash for tracking
  
  // Timestamps
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  
  // History
  history: NoteHistoryEntry[];   // All changes to this note
  
  // Status
  isDeleted?: boolean;           // Soft delete flag
}

export interface LineRange {
  start: number;                 // 0-based line number
  end: number;                   // 0-based line number (inclusive)
}

export interface NoteHistoryEntry {
  content: string;
  author: string;
  timestamp: string;
  action: NoteAction;            // 'created' | 'edited' | 'deleted'
}
```

### Key Characteristics

1. **One Note Per ID**: Each note has a unique UUID
2. **Single File Path**: Each note is attached to exactly ONE source file
3. **Single Line Range**: Each note covers a specific contiguous line range
4. **Complete History**: All versions stored in the `history` array
5. **Soft Delete**: Notes marked as deleted, not physically removed
6. **Content Hash**: SHA-256 of normalized code for tracking position changes

---

## Note-to-Code Association

### How Notes are Linked to Code

The association is determined by:

1. **File Path** (`note.filePath`)
   - Absolute path to the source file
   - Used to find which file a note belongs to

2. **Line Range** (`note.lineRange`)
   - `start`: 0-based starting line
   - `end`: 0-based ending line (inclusive)
   - Defines which lines the note annotates

3. **Content Hash** (`note.contentHash`)
   - SHA-256 hash of normalized code content
   - Used to track notes when lines move (via `ContentHashTracker`)
   - Allows notes to "follow" code even after edits

### Tracking Code Movement

**File**: `/Users/nahian/Projects/code-notes/src/contentHashTracker.ts`

The `ContentHashTracker` class:

```typescript
class ContentHashTracker {
  // Generate hash of code in a line range
  generateHash(document: TextDocument, lineRange: LineRange): string
  
  // Validate if code at expected location matches the hash
  validateContentHash(document: TextDocument, lineRange: LineRange, hash: string): boolean
  
  // Find where code moved to (sliding window search)
  async findContentByHash(
    document: TextDocument,
    targetHash: string,
    originalRange: LineRange
  ): Promise<ContentHashResult>
}
```

### Current Limitation: Single Note Per Line Range

**CRITICAL FINDING**: The system is designed to support only ONE note per line range.

Evidence:

1. **Storage Query Method**:
   ```typescript
   // In noteManager.ts
   async getNotesForFile(filePath: string): Promise<Note[]> {
     // Returns ALL notes for the file (sorted by line range implicitly)
     // No de-duplication per line
   }
   ```

2. **Finding Notes at Cursor**:
   ```typescript
   // In extension.ts - deleteNote command
   const notes = await noteManager.getNotesForFile(filePath);
   const note = notes.find(n =>
     line >= n.lineRange.start && line <= n.lineRange.end
   );
   // Returns FIRST note found - doesn't handle multiple notes
   ```

3. **CodeLens Display**:
   ```typescript
   // In codeLensProvider.ts
   for (const note of notes) {
     // Creates ONE CodeLens per note
     // If multiple notes on same line, all create separate CodeLens
     // But UI only shows one at a time
   }
   ```

4. **Comment Thread Management**:
   ```typescript
   // In commentController.ts
   private commentThreads: Map<string, vscode.CommentThread>;
   // Maps noteId -> CommentThread
   // Can only show ONE thread per line
   ```

---

## Gutter Decorations & UI

### How Notes Appear in the Editor

### 1. CodeLens Display

**File**: `/Users/nahian/Projects/code-notes/src/codeLensProvider.ts`

```typescript
export class CodeNotesLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(
    document: TextDocument,
    token: CancellationToken
  ): Promise<CodeLens[]>
}
```

**Visual Display**:
```
┌─────────────────────────────────┐
│ 📝 Note: "This is a comment..." │  <- CodeLens (above line)
│ (John Doe)                      │
├─────────────────────────────────┤
│  10 | function doSomething() {  │
│  11 |   // code here...          │  <- Line with note
│  12 | }                          │
└─────────────────────────────────┘
```

**Current Implementation**:
- Creates ONE CodeLens per note
- Positioned at `note.lineRange.start`
- Shows title: `📝 Note: {preview} ({author})`
- Preview is first 50 chars of note content
- Clicking triggers `codeContextNotes.viewNote` command

### 2. Comment Thread UI

**File**: `/Users/nahian/Projects/code-notes/src/commentController.ts`

When a note is viewed:

```
┌──────────────────────────────────────┐
│  10 | function doSomething() {      │
│     | [Comment Thread with note]     │  <- VSCode comment UI
│  11 |   // code here...              │
│  12 | }                              │
└──────────────────────────────────────┘
```

Comment thread shows:
- Note content (markdown rendered)
- Author name
- Last update date
- Edit/Delete buttons
- History button

### 3. Current Limitation in UI

When multiple notes exist on same line:
- CodeLenses show up as separate indicators
- But clicking them shows them one at a time
- User must click different CodeLenses to see different notes
- No clear indication that multiple notes exist

---

## Command Architecture

### Available Commands

**File**: `/Users/nahian/Projects/code-notes/src/extension.ts`

| Command ID | Trigger | Function |
|-----------|---------|----------|
| `codeContextNotes.addNote` | Keyboard/Palette | Opens comment editor for selection |
| `codeContextNotes.addNoteViaCodeLens` | CodeLens click | Opens comment editor |
| `codeContextNotes.viewNote` | CodeLens click | Shows note in comment thread |
| `codeContextNotes.deleteNote` | Command/Palette | Deletes note at cursor |
| `codeContextNotes.viewHistory` | Keyboard/Palette | Shows note edit history |
| `codeContextNotes.editNote` | Comment button | Enters edit mode |
| `codeContextNotes.saveNote` | Comment/Keyboard | Saves edited note |
| `codeContextNotes.cancelEditNote` | Comment/Keyboard | Cancels edit |
| `codeContextNotes.saveNewNote` | Comment submit | Creates new note |
| `codeContextNotes.refreshNotes` | Command/Palette | Reloads all notes |

### Creating a Note

Sequence:

1. User selects code and runs `addNote` command
2. `commentController.openCommentEditor()` creates temp comment thread
3. User types note in VSCode comment UI
4. User submits (or presses keyboard shortcut)
5. `handleSaveNewNote()` calls:
   ```typescript
   const note = await noteManager.createNote({
     filePath: document.uri.fsPath,
     lineRange: { start, end },
     content: userInput
   }, document);
   ```
6. `NoteManager.createNote()`:
   - Generates unique UUID
   - Hashes code at line range
   - Gets author name
   - Creates Note object
   - Saves via `StorageManager.saveNote()`
   - Updates cache
7. `createCommentThread()` displays the note

---

## Key Components

### 1. NoteManager (`noteManager.ts`)

**Central coordinator** for all note operations:

```typescript
class NoteManager {
  private storage: StorageManager;
  private hashTracker: ContentHashTracker;
  private gitIntegration: GitIntegration;
  private noteCache: Map<string, Note[]>;

  async createNote(params: CreateNoteParams, doc: TextDocument): Promise<Note>
  async updateNote(params: UpdateNoteParams, doc: TextDocument): Promise<Note>
  async deleteNote(noteId: string, filePath: string): Promise<void>
  async getNotesForFile(filePath: string): Promise<Note[]>
  async updateNotePositions(doc: TextDocument): Promise<Note[]>
}
```

**Responsibilities**:
- Orchestrate storage, hashing, and git integration
- Maintain note cache
- Validate line ranges
- Manage note lifecycle

### 2. StorageManager (`storageManager.ts`)

**Persistence layer** for notes:

- Reads/writes markdown files
- Converts between Note objects and markdown format
- Handles soft deletes
- All notes in one directory

### 3. CommentController (`commentController.ts`)

**UI coordination** for VSCode comments:

```typescript
class CommentController {
  private commentController: vscode.CommentController;
  private commentThreads: Map<string, vscode.CommentThread>;

  async loadCommentsForDocument(doc: TextDocument): Promise<void>
  async openCommentEditor(doc: TextDocument, range: Range): Promise<CommentThread>
  async handleSaveNewNote(thread: CommentThread, content: string): Promise<void>
  async handleUpdateNote(noteId: string, content: string, doc: TextDocument): Promise<Note>
  async handleDeleteNote(noteId: string, filePath: string): Promise<void>
  async focusNoteThread(noteId: string, filePath: string): Promise<void>
}
```

**Responsibilities**:
- Manage comment threads for each note
- Handle edit/save/delete UI interactions
- Show note history
- Enable edit mode

### 4. CodeNotesLensProvider (`codeLensProvider.ts`)

**Visual indicators** in the editor:

```typescript
class CodeNotesLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(doc: TextDocument, token: CancellationToken): Promise<CodeLens[]>
  refresh(): void
}
```

**Responsibilities**:
- Create CodeLens indicators for each note
- Format preview text
- Provide "Add Note" option for selections without notes

### 5. ContentHashTracker (`contentHashTracker.ts`)

**Code tracking** when lines move:

- SHA-256 hashing of normalized code
- Sliding window search to find moved code
- Validates if code is still at expected location

### 6. GitIntegration (`gitIntegration.ts`)

**Author name detection**:

- Gets git username or falls back to system username
- Caches result for performance

---

## Current Limitation Analysis

### Why Only One Note Per Line Works Currently

1. **Query Returns All Notes**:
   ```typescript
   async getNotesForFile(filePath: string): Promise<Note[]>
   ```
   Returns ALL notes for the file, but callers expect to find THE note, not A note.

2. **Finding by Cursor**:
   ```typescript
   const note = notes.find(n =>
     line >= n.lineRange.start && line <= n.lineRange.end
   );
   ```
   Uses `.find()` which returns first match. If 2+ notes on same line, only first is retrieved.

3. **Comment Thread Mapping**:
   ```typescript
   Map<string, vscode.CommentThread>
   ```
   Maps note ID -> thread. With multiple notes per line, would need different approach.

4. **UI Closure Logic**:
   ```typescript
   private closeAllCommentEditors(exceptNoteId?: string): void {
     // Closes all threads EXCEPT one specified note
     // Assumes only one note should be open at a time
   }
   ```

### Overlapping Line Ranges Problem

If two notes exist with these line ranges:
```
Note A: lines 10-12
Note B: lines 11-13  (overlaps!)
```

Current code would only return one when querying for line 11.

### Hidden Notes Problem

Currently if you try to create multiple notes on the same line, the system allows it (at the database level), but:
- Only first note shows in CodeLens
- Only first note opens when clicking on line
- Second note is "hidden" but still in storage
- Must manually access by note ID if you somehow knew it

---

## Data Flow

### Creating a Note

```
User selects code
    ↓
Runs 'addNote' command
    ↓
CommentController.openCommentEditor()
    ↓
VSCode comment thread created (temp)
    ↓
User submits note content
    ↓
CommentController.handleSaveNewNote()
    ↓
NoteManager.createNote()
    ├─ Generate UUID
    ├─ Hash code at line range
    ├─ Get author name from GitIntegration
    └─ Create Note object
    ↓
StorageManager.saveNote()
    ├─ Convert Note to markdown
    └─ Write to .code-notes/{uuid}.md
    ↓
Update NoteManager cache
    ↓
Create real CommentThread for note
    ↓
Display note to user
```

### Loading Notes for a File

```
User opens a file
    ↓
onDidOpenTextDocument event fires
    ↓
CommentController.loadCommentsForDocument()
    ↓
NoteManager.getNotesForFile()
    ├─ Check cache
    └─ If not cached, load from storage
    ↓
StorageManager.loadNotes()
    ├─ List all files in .code-notes/
    ├─ Read each .md file
    ├─ Parse markdown to Note objects
    └─ Filter for matching filePath (LINEAR SEARCH!)
    ↓
Cache updated
    ↓
For each note:
    ├─ Create CommentThread
    ├─ Create CodeLens
    └─ Display in editor
```

### Updating Note Position (Code Changed)

```
Text changes in document
    ↓
onDidChangeTextDocument event (debounced 500ms)
    ↓
CommentController.handleDocumentChange()
    ↓
NoteManager.updateNotePositions()
    ↓
For each note:
    ├─ ContentHashTracker.validateContentHash()
    │  (is code still at same lines?)
    │
    ├─ If not, ContentHashTracker.findContentByHash()
    │  (sliding window search to find new location)
    │
    └─ If found, update lineRange and save
    ↓
Update CommentThreads for moved notes
    ↓
Refresh CodeLenses
```

---

## Storage Performance Implications

### Current Linear Search Problem

When loading notes for a file:

```typescript
async loadAllNotes(filePath: string): Promise<Note[]> {
  const allNoteFiles = await this.getAllNoteFiles();  // Lists ALL .md files
  const notes: Note[] = [];

  for (const noteFile of allNoteFiles) {
    try {
      const content = await fs.readFile(noteFile, 'utf-8');
      const note = this.markdownToNote(content);

      if (note && note.filePath === filePath) {  // String comparison for EVERY note
        notes.push(note);
      }
    } catch (error) {
      console.error(`Failed to load note from ${noteFile}:`, error);
    }
  }

  return notes;
}
```

**Issue**: With N notes total, loading notes for one file requires:
- Reading N files from disk
- Parsing N markdown files
- Comparing filePath string N times

**Performance**: O(N) - linear with total note count

### Caching Helps

NoteManager maintains a cache:
```typescript
private noteCache: Map<string, Note[]>;  // filePath -> notes
```

But cache becomes invalid when:
- Document is changed
- Configuration is changed
- Workspace folders change

---

## Summary: Current Architecture

| Aspect | Current Implementation |
|--------|----------------------|
| **Storage** | Individual .md files in `.code-notes/` directory |
| **File Organization** | All notes mixed in one directory (flat) |
| **Note Identity** | UUID (unique globally) |
| **Note-to-File** | Via `filePath` property |
| **Note-to-Lines** | Via `lineRange` (start, end) |
| **Multiple Notes Per Line** | NOT SUPPORTED - system designed for one note |
| **Query Performance** | O(N) linear search through all notes |
| **Cache Strategy** | In-memory map by filePath |
| **History** | Complete change history stored in note |
| **Deletion** | Soft delete (marked with `isDeleted` flag) |
| **Code Movement** | SHA-256 hash with sliding window search |
| **UI** | VSCode native comment threads + CodeLens |

---

## Prepared For: Migration Planning

This analysis provides the foundation for planning a migration to support multiple notes per line. Key areas that will need changes:

1. **Storage Structure**: May need to change from flat directory to nested by file
2. **Querying**: Will need to return multiple notes per line range
3. **UI**: Will need to show/manage multiple notes for same line
4. **Comment Threads**: Need new strategy to show multiple threads per line
5. **Commands**: Need to handle ambiguity when multiple notes at cursor

See MIGRATION_PLAN.md for next steps.

