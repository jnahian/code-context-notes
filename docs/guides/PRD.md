# Product Requirements Document: VSCode Code Context Notes Extension

## 1. Overview

### 1.1 Product Name
Code Context Notes

### 1.2 Purpose
A VSCode extension that enables developers to attach contextual notes to specific lines or ranges of code within their projects. Notes are stored as markdown files, tracked with full version history, and integrated seamlessly into the VSCode editing experience.

### 1.3 Target Users
- Software developers working on complex codebases
- Teams needing to document code context and decisions
- Developers who want persistent code annotations beyond comments

---

## 2. Core Features

### 2.1 Note Management
**Description**: Full CRUD operations for code notes attached to specific line ranges.

**Requirements**:
- Create new notes for selected code lines/ranges
- Edit existing notes with full history tracking
- Delete notes when no longer needed
- Each note contains:
  - Unique identifier
  - Note content (markdown formatted)
  - Author information (git username)
  - Target file path
  - Line range (start and end)
  - Content hash of the associated code
  - Creation timestamp
  - Last modified timestamp
  - Full edit history with timestamps

### 2.2 Storage System
**Description**: Notes are stored in a dedicated directory structure within the project.

**Requirements**:
- Default storage location: `.code-notes/` directory
- Storage format: Individual markdown files per source file
- Directory structure mirrors source code structure
  - Example: `src/app.ts` → `.code-notes/src/app.ts.md`
- Users can add `.code-notes/` to `.gitignore` if desired
- Automatic directory creation on first note

### 2.3 Version History
**Description**: Complete audit trail of all note modifications.

**Requirements**:
- Track every edit to a note with timestamp
- Store author information for each edit
- Maintain chronological history within the markdown file
- Display history in readable format
- Never delete historical entries (append-only)

### 2.4 Git Integration
**Description**: Automatically retrieve and use git username for note authorship.

**Requirements**:
- Read git username from repository configuration
- Fallback to system username if not in a git repository
- Store author information with each note and edit

### 2.5 Content Hash Tracking
**Description**: Track notes by code content rather than static line numbers.

**Requirements**:
- Generate hash of selected line content when note is created
- Update note position when code moves but content matches
- Detect when tracked content has changed significantly
- Handle edge cases:
  - Content deleted
  - Content modified
  - Content moved to different file

### 2.6 CodeLens Integration
**Description**: Visual indicators and actions directly in the editor.

**Requirements**:
- Display CodeLens above lines that have associated notes
- Show preview of note content in CodeLens
- Provide "Add Note" action for selected line ranges
- Click CodeLens to open note in comment UI
- Update CodeLens in real-time as notes are added/modified

### 2.7 Comment Editor Interface
**Description**: Use VSCode's native commenting API for note creation and editing.

**Requirements**:
- Integrate with VSCode CommentController API
- Display comment threads at note locations
- Support markdown formatting in comment editor
- Provide actions:
  - Add new note
  - Edit existing note
  - Delete note
  - View note history
- Comment threads appear inline in the editor

---

## 3. Technical Architecture

### 3.1 Extension Components

#### 3.1.1 Extension Entry Point (`extension.ts`)
- Activation and deactivation lifecycle
- Register all providers and controllers
- Initialize configuration

#### 3.1.2 Note Manager (`noteManager.ts`)
- Core business logic for note operations
- Coordinate between storage, UI, and tracking systems
- Manage note lifecycle and history

#### 3.1.3 Storage Manager (`storageManager.ts`)
- File I/O operations for `.code-notes/` directory
- Create/read/update/delete markdown files
- Directory structure management
- Path mapping between source files and note files

#### 3.1.4 Comment Controller (`commentController.ts`)
- VSCode CommentController implementation
- Handle comment thread creation and management
- Process user input from comment UI
- Sync with note data model

#### 3.1.5 CodeLens Provider (`codeLensProvider.ts`)
- Implement CodeLens provider interface
- Generate CodeLens items for notes
- Handle CodeLens commands
- Update on document changes

#### 3.1.6 Content Hash Tracker (`contentHashTracker.ts`)
- Generate hashes for code content
- Track content changes across document edits
- Update note positions based on content matching
- Handle content movement detection

#### 3.1.7 Git Integration (`gitIntegration.ts`)
- Retrieve git username from repository
- Fallback to system username
- Cache username for performance

### 3.2 Data Model

#### 3.2.1 Note Structure
```typescript
interface Note {
  id: string;
  content: string;
  author: string;
  filePath: string;
  lineRange: {
    start: number;
    end: number;
  };
  contentHash: string;
  createdAt: string;
  updatedAt: string;
  history: NoteHistoryEntry[];
}

interface NoteHistoryEntry {
  content: string;
  author: string;
  timestamp: string;
  action: 'created' | 'edited' | 'deleted';
}
```

#### 3.2.2 Markdown File Format
```markdown
# Notes for [filename]

## Note: [note-id]
**Lines:** [start]-[end]
**Author:** [username]
**Created:** [timestamp]
**Updated:** [timestamp]
**Content Hash:** [hash]

### Current Content
[note content in markdown]

### History
- **[timestamp]** - [author] - [action]
  > [previous content]
```

### 3.3 Extension Manifest (`package.json`)

**Activation Events**:
- `onStartupFinished`
- `onCommand:codeContextNotes.*`

**Contributions**:
- Commands for add/edit/delete notes
- Configuration for notes directory path
- Language support (all languages)

---

## 4. User Experience

### 4.1 Adding a Note
1. User selects line(s) of code
2. CodeLens shows "Add Note" action, or user triggers command
3. Comment UI appears inline
4. User types note content with markdown support
5. Note is saved with timestamp and author
6. CodeLens appears above the code

### 4.2 Viewing a Note
1. User sees CodeLens above annotated code
2. Click CodeLens to expand comment thread
3. Note content displayed in comment UI
4. History available via expand action

### 4.3 Editing a Note
1. User clicks edit in comment thread
2. Comment editor becomes editable
3. User modifies content
4. Save creates new history entry
5. Updated timestamp reflected

### 4.4 Deleting a Note
1. User clicks delete in comment thread
2. Confirmation dialog appears
3. Note marked as deleted in history
4. CodeLens removed
5. Comment thread closed

---

## 5. Configuration Options

### 5.1 Settings
- `codeContextNotes.storageDirectory`: Custom path for notes storage (default: `.code-notes`)
- `codeContextNotes.authorName`: Override automatic username detection
- `codeContextNotes.showCodeLens`: Enable/disable CodeLens display (default: true)

---

## 6. Future Enhancements (Out of Scope for v1)

- Sidebar view for browsing all notes
- Search and filter notes
- Export notes to external formats
- Team collaboration features
- Note templates
- Tags and categories
- Rich text editing beyond markdown

---

## 7. Success Metrics

- Notes persist correctly across VSCode sessions
- Content hash tracking maintains note alignment through code changes
- Comment UI feels native to VSCode experience
- Note files are human-readable markdown
- Performance: No noticeable lag with 100+ notes in a project

---

## 8. Technical Constraints

- Must work with VSCode 1.80.0+
- TypeScript for type safety
- Follow VSCode extension best practices
- Minimal dependencies
- Cross-platform compatibility (Windows, macOS, Linux)

---

## 9. Dependencies

- `vscode`: VSCode extension API
- `crypto`: For content hashing (Node.js built-in)
- `fs/promises`: For file operations (Node.js built-in)
- `path`: For path manipulation (Node.js built-in)
- Optional: `simple-git` for git username retrieval

---

## 10. Timeline Estimate

**Phase 1: Core Infrastructure** (Week 1)
- Project setup
- Storage manager
- Data models
- Basic CRUD operations

**Phase 2: VSCode Integration** (Week 2)
- Comment controller
- CodeLens provider
- Extension activation

**Phase 3: Advanced Features** (Week 3)
- Content hash tracking
- Git integration
- History management

**Phase 4: Polish & Testing** (Week 4)
- Edge case handling
- Performance optimization
- Documentation
- Testing across scenarios
