# Comment Editor - Detailed Code Reference

## 1. Thread Creation: `openCommentEditor()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 207-235

**Creates:** Empty comment thread in expanded state
**Called by:** 
- `codeContextNotes.addNote` command (keyboard shortcut)
- `codeContextNotes.addNoteViaCodeLens` command

**Key Details:**
- Sets `canReply = true` - allows user input
- Sets `collapsibleState = Expanded` - shows empty text field immediately
- Adds custom properties `tempId` and `sourceDocument`
- Stores in tracking map with temporary ID

```typescript
async openCommentEditor(
  document: vscode.TextDocument,
  range: vscode.Range
): Promise<vscode.CommentThread> {
  // Create empty thread
  const thread = this.commentController.createCommentThread(
    document.uri,
    range,
    []  // Empty comments array
  );

  // Configure for input
  thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
  thread.canReply = true;
  thread.label = 'New Note';

  // Store with custom metadata
  const tempId = `temp-${Date.now()}`;
  (thread as any).tempId = tempId;
  (thread as any).sourceDocument = document;
  this.commentThreads.set(tempId, thread);

  return thread;
}
```

---

## 2. Saving New Note: `handleSaveNewNote()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 240-308

**Called by:** `codeContextNotes.saveNewNote` command
**Input:** `thread` (from VSCode) + `content` (user typed text)
**Output:** Saves note, updates thread

**Critical Code Path:**

```typescript
async handleSaveNewNote(
  thread: vscode.CommentThread,
  content: string
): Promise<void> {
  const tempId = (thread as any).tempId;

  // CASE 1: Our thread (has sourceDocument)
  let document: vscode.TextDocument | undefined = 
    (thread as any).sourceDocument as vscode.TextDocument;

  // CASE 2: VSCode + icon thread (no sourceDocument)
  if (!document) {
    const docs = vscode.workspace.textDocuments;
    document = docs.find(d => d.uri.toString() === thread.uri.toString());

    if (!document) {
      try {
        document = await vscode.workspace.openTextDocument(thread.uri);
      } catch (error) {
        vscode.window.showErrorMessage('Could not find the document for this note');
        thread.dispose();
        return;
      }
    }
  }

  // Validate
  if (!document) {
    vscode.window.showErrorMessage('Could not find the document for this note');
    thread.dispose();
    if (tempId) {
      this.commentThreads.delete(tempId);
    }
    return;
  }

  if (!content || !thread.range) {
    thread.dispose();
    if (tempId) {
      this.commentThreads.delete(tempId);
    }
    return;
  }

  // Create note in NoteManager
  const lineRange: LineRange = {
    start: thread.range.start.line,
    end: thread.range.end.line
  };

  const note = await this.noteManager.createNote(
    {
      filePath: document.uri.fsPath,
      lineRange,
      content
    },
    document
  );

  // Clean up temporary thread
  thread.dispose();
  if (tempId) {
    this.commentThreads.delete(tempId);
  }

  // Create permanent thread with saved note
  this.createCommentThread(document, note);
}
```

**Key Points:**
1. Line 244-247: Try to get document from custom property
2. Line 250-264: Fallback for VSCode + icon threads
3. Line 267-276: Validation
4. Line 290-298: Create permanent thread with UUID
5. Thread replacement: `temp-xxx` → `note-uuid`

---

## 3. Permanent Thread Creation: `createCommentThread()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 62-98

**Called by:**
- `handleSaveNewNote()` - after saving new note
- `loadCommentsForDocument()` - when file opens
- `refreshCommentsForDocument()` - when refreshing

**Creates:** Thread with note content in preview mode

```typescript
createCommentThread(
  document: vscode.TextDocument,
  note: Note
): vscode.CommentThread {
  // Check if thread already exists
  const existingThread = this.commentThreads.get(note.id);
  if (existingThread) {
    return existingThread;
  }

  // Create range from note's line range
  const range = new vscode.Range(
    note.lineRange.start,
    0,
    note.lineRange.end,
    document.lineAt(note.lineRange.end).text.length
  );

  // Create thread with note content
  const thread = this.commentController.createCommentThread(
    document.uri,
    range,
    []
  );

  thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
  thread.canReply = false;  // No inline replies, use Edit button instead

  // Create comment from note
  const comment = this.createComment(note);
  thread.comments = [comment];

  // Store with permanent ID
  this.commentThreads.set(note.id, thread);

  return thread;
}
```

**Key Differences from `openCommentEditor()`:**
- `canReply = false` - no inline replies
- `collapsibleState = Collapsed` - not expanded by default
- Uses note.id (UUID) instead of tempId
- Creates comment with note.content

---

## 4. Edit Mode: `enableEditMode()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 457-480

**Called by:** `codeContextNotes.editNote` command

**Switches:** Thread from Preview to Editing

```typescript
async enableEditMode(noteId: string, filePath: string): Promise<void> {
  const note = await this.noteManager.getNoteById(noteId, filePath);
  if (!note) {
    vscode.window.showErrorMessage('Note not found');
    return;
  }

  const thread = this.commentThreads.get(noteId);
  if (!thread) {
    return;
  }

  // Switch comment to edit mode
  if (thread.comments.length > 0) {
    const comment = thread.comments[0];
    const editableComment: vscode.Comment = {
      ...comment,
      mode: vscode.CommentMode.Editing,  // KEY CHANGE
      body: note.content // Plain text for editing
    };
    thread.comments = [editableComment];
  }
}
```

**Mode Transitions:**
```
Preview (default) 
  ↓ User clicks Edit
Editing (text field)
  ↓ User clicks Save or Cancel
Preview (or reverted)
```

---

## 5. Saving Edited Note: `saveEditedNoteById()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 485-508

**Called by:** `codeContextNotes.saveNote` command

**Updates:** Note content and thread display

```typescript
async saveEditedNoteById(noteId: string, newContent: string): Promise<boolean> {
  // Get thread to find file
  const thread = this.commentThreads.get(noteId);
  if (!thread) {
    vscode.window.showErrorMessage('Note thread not found');
    return false;
  }

  const filePath = thread.uri.fsPath;

  // Open document
  const document = await vscode.workspace.openTextDocument(filePath);

  // Update note
  const updatedNote = await this.noteManager.updateNote(
    { id: noteId, content: newContent },
    document
  );

  // Update thread back to preview mode
  this.updateCommentThread(updatedNote, document);

  return true;
}
```

**Key Points:**
1. Line 487: Looks up thread by note ID
2. Line 493: Gets file path from thread.uri
3. Line 496-501: Updates note in storage
4. Line 504: Updates thread (switches back to preview)

---

## 6. Thread Updates: `updateCommentThread()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 127-147

**Updates:** Thread range and comment content

**Called by:**
- `saveEditedNoteById()` - after saving edits
- `handleDocumentChange()` - when code moves
- Command handlers

```typescript
updateCommentThread(note: Note, document: vscode.TextDocument): void {
  const thread = this.commentThreads.get(note.id);
  if (!thread) {
    // Create new thread if it doesn't exist
    this.createCommentThread(document, note);
    return;
  }

  // Update range (if code moved)
  const range = new vscode.Range(
    note.lineRange.start,
    0,
    note.lineRange.end,
    document.lineAt(note.lineRange.end).text.length
  );
  thread.range = range;

  // Update comment (refreshes display)
  const comment = this.createComment(note);
  thread.comments = [comment];
}
```

---

## 7. Thread Deletion: `deleteCommentThread()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 152-158

**Called by:** `handleDeleteNote()` command

```typescript
deleteCommentThread(noteId: string): void {
  const thread = this.commentThreads.get(noteId);
  if (thread) {
    thread.dispose();  // Dispose VSCode thread
    this.commentThreads.delete(noteId);  // Remove from tracking map
  }
}
```

**Cleans up:**
1. VSCode thread disposal
2. Map entry removal
3. UI refresh (automatic)

---

## 8. Thread Lookup: `getNoteIdFromThread()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 373-380

**Purpose:** Reverse lookup - find note ID from thread

```typescript
getNoteIdFromThread(thread: vscode.CommentThread): string | undefined {
  for (const [noteId, commentThread] of this.commentThreads.entries()) {
    if (commentThread === thread) {
      return noteId;
    }
  }
  return undefined;
}
```

---

## 9. Thread Focus: `focusNoteThread()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 385-405

**Called by:**
- `codeContextNotes.viewNote` command
- `showHistoryInThread()` command

**Action:** Opens document, expands thread, scrolls to view

```typescript
async focusNoteThread(noteId: string, filePath: string): Promise<void> {
  const thread = this.commentThreads.get(noteId);
  if (!thread) {
    vscode.window.showErrorMessage('Note thread not found');
    return;
  }

  // Open the document
  const document = await vscode.workspace.openTextDocument(filePath);
  const editor = await vscode.window.showTextDocument(document);

  // Expand the thread
  thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

  // Move cursor and scroll
  if (thread.range) {
    const position = new vscode.Position(thread.range.start.line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(thread.range, vscode.TextEditorRevealType.InCenter);
  }
}
```

---

## 10. History Display: `showHistoryInThread()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 410-452

**Converts:** Note history to comment replies

```typescript
async showHistoryInThread(noteId: string, filePath: string): Promise<void> {
  const thread = this.commentThreads.get(noteId);
  if (!thread) {
    vscode.window.showErrorMessage('Note thread not found');
    return;
  }

  const note = await this.noteManager.getNoteById(noteId, filePath);
  if (!note) {
    vscode.window.showErrorMessage('Note not found');
    return;
  }

  // Main comment: current content
  const mainComment = this.createComment(note);

  // History comments: one per history entry
  const historyComments: vscode.Comment[] = [mainComment];

  if (note.history && note.history.length > 0) {
    for (const entry of note.history) {
      const historyComment: vscode.Comment = {
        body: new vscode.MarkdownString(
          `**${entry.action}**\n\n${entry.content || '*(no content)*'}`
        ),
        mode: vscode.CommentMode.Preview,
        author: {
          name: entry.author
        },
        label: new Date(entry.timestamp).toLocaleString()
      };
      historyComments.push(historyComment);
    }
  }

  // Update thread with all comments
  thread.comments = historyComments;
  thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

  // Focus on the thread
  await this.focusNoteThread(noteId, filePath);
}
```

**Result:** Main comment + replies for each history entry

---

## 11. Document-Level Operations

### Load Comments: `loadCommentsForDocument()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 163-173

```typescript
async loadCommentsForDocument(document: vscode.TextDocument): Promise<void> {
  const filePath = document.uri.fsPath;

  // Get all notes for this file
  const notes = await this.noteManager.getNotesForFile(filePath);

  // Create comment threads for each note
  for (const note of notes) {
    this.createCommentThread(document, note);
  }
}
```

### Refresh Comments: `refreshCommentsForDocument()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 178-186

```typescript
async refreshCommentsForDocument(document: vscode.TextDocument): Promise<void> {
  const filePath = document.uri.fsPath;

  // Clear existing threads
  this.clearThreadsForDocument(document.uri);

  // Reload comments
  await this.loadCommentsForDocument(document);
}
```

### Clear Threads: `clearThreadsForDocument()`

**File:** `/Users/nahian/Projects/code-notes/src/commentController.ts`
**Lines:** 191-202

```typescript
private clearThreadsForDocument(uri: vscode.Uri): void {
  const threadsToDelete: string[] = [];

  for (const [noteId, thread] of this.commentThreads.entries()) {
    if (thread.uri.fsPath === uri.fsPath) {
      thread.dispose();
      threadsToDelete.push(noteId);
    }
  }

  threadsToDelete.forEach(id => this.commentThreads.delete(id));
}
```

---

## 12. Extension Integration Points

### Command Registration

**File:** `/Users/nahian/Projects/code-notes/src/extension.ts`

| Command | Lines | Handler |
|---------|-------|---------|
| `codeContextNotes.addNote` | 167-196 | Keyboard shortcut |
| `codeContextNotes.addNoteViaCodeLens` | 199-213 | CodeLens click |
| `codeContextNotes.editNote` | 341-361 | Edit button |
| `codeContextNotes.saveNote` | 364-385 | Save button |
| `codeContextNotes.cancelEditNote` | 388-408 | Cancel button |
| `codeContextNotes.saveNewNote` | 411-425 | Save new |
| `codeContextNotes.cancelNewNote` | 428-439 | Cancel new |

### Keyboard Shortcuts

**File:** `package.json`
**Lines:** 140-195

```json
{
  "command": "codeContextNotes.addNote",
  "key": "ctrl+alt+n",
  "mac": "cmd+alt+n",
  "when": "editorTextFocus && editorHasSelection"
}
```

---

## 13. Quick Trace: User Presses Ctrl+Alt+N

```
1. VSCode triggers: codeContextNotes.addNote command
   Location: extension.ts:167

2. Handler executes:
   - Validates: Has editor, has selection
   - Extracts: selection range
   - Calls: commentController.openCommentEditor()
   Location: extension.ts:167-196

3. openCommentEditor() executes:
   - Creates: VSCode comment thread
   - Sets: tempId, sourceDocument
   - Stores: in commentThreads map
   Location: commentController.ts:207-235

4. VSCode renders:
   - Empty text field appears
   - Focus in input field

5. User types content and clicks Save

6. VSCode triggers: codeContextNotes.saveNewNote command
   Location: extension.ts:411

7. Handler calls: commentController.handleSaveNewNote()
   Location: extension.ts:411-425

8. handleSaveNewNote() executes:
   - Gets: document from sourceDocument property
   - Creates: note via NoteManager
   - Disposes: temporary thread
   - Creates: permanent thread
   Location: commentController.ts:240-308

9. Thread now visible with content in preview mode
```

