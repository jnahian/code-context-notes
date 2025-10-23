# Comment Editor Management - Quick Summary

## Four Ways Comment Editors Are Opened

| Trigger | Code | Where | State |
|---------|------|-------|-------|
| **Ctrl+Alt+N (Keyboard)** | `addNote` | `extension.ts:167` | Creates empty thread |
| **CodeLens "Add Note"** | `addNoteViaCodeLens` | `extension.ts:199` | Creates empty thread |
| **VSCode + icon** | (VSCode native) | N/A | Creates thread without our metadata |
| **Click Edit button** | `editNote` | `extension.ts:341` | Switches existing thread to edit mode |

## How Comment Editors Are Tracked

**Map:** `CommentController.commentThreads`

**Contents:**
```
Key: note.id (UUID) or temp-{timestamp}
Value: VSCode CommentThread object
```

**Example state:**
```typescript
commentThreads: {
  "550e8400-e29b-41d4-a716-446655440000": CommentThread,  // Saved note
  "temp-1698835200123": CommentThread,                      // New note being edited
}
```

## Lifecycle Phases

### Phase 1: Creation
- Keyboard or CodeLens → Call `openCommentEditor()`
- Sets: `tempId`, `sourceDocument` (custom properties)
- Stores in map as `temp-{timestamp}`

### Phase 2: User Input
- User types content in expanded thread
- VSCode manages the UI

### Phase 3: Save
- User clicks Save button
- `handleSaveNewNote()` called
- Note created with UUID
- Thread replaced in map: `temp-xxx` → `note-id`
- Old thread disposed

### Phase 4: Display
- Thread shown in preview mode
- Buttons: Edit, Delete, View History

## Handling VSCode + Icon Threads

When user clicks **+ icon**, VSCode creates a thread without our custom properties.

**Solution:** `handleSaveNewNote()` detects and handles both cases:

1. Our threads have `sourceDocument` property → use it
2. VSCode threads don't → search `vscode.workspace.textDocuments` to find it
3. Last resort → `vscode.workspace.openTextDocument(thread.uri)`

## Key Methods

| Method | Purpose | File | Lines |
|--------|---------|------|-------|
| `openCommentEditor()` | Create new thread for input | commentController.ts | 207-235 |
| `createCommentThread()` | Create thread for saved note | commentController.ts | 62-98 |
| `handleSaveNewNote()` | Save new note from input | commentController.ts | 240-298 |
| `enableEditMode()` | Switch thread to edit mode | commentController.ts | 457-480 |
| `saveEditedNoteById()` | Save edited note | commentController.ts | 485-508 |
| `deleteCommentThread()` | Dispose and remove from map | commentController.ts | 152-158 |
| `focusNoteThread()` | Expand and scroll to thread | commentController.ts | 385-405 |
| `showHistoryInThread()` | Display history as replies | commentController.ts | 410-452 |

## No Centralized Tracking For

- **Open editors by document** - No `Map<uri, threads[]>`
- **Edit state** - Implicit in `thread.comments[0].mode`
- **Creation source** - Can't query "keyboard vs CodeLens vs + icon"
- **Disposal events** - No listeners for when threads close

## Current Cleanup

1. **On note save:** Old thread → disposed, removed from map
2. **On note delete:** Thread → disposed, removed from map  
3. **On file reload:** All threads → disposed, recreated
4. **On extension deactivate:** All threads → disposed, map cleared

## Design Philosophy

✓ **Lazy creation** - Threads created only when needed
✓ **On-demand loading** - Threads recreated from disk as needed
✓ **Explicit cleanup** - Threads disposed when no longer needed
✓ **Handle all cases** - Works via keyboard, CodeLens, + icon
✓ **Stateless fallback** - Can recover by reloading from storage

## What Might Cause Keybinding Issues

Looking at the branch name `fix/keybindings-not-opening-the-comment-editor`, potential issues could be:

1. **Comment editor not responding to keyboard shortcuts**
   - Check: `addNote` command registration (line 168)
   - Check: Keybinding `when` clause (package.json line 145)

2. **Comment editor not opening from + icon**
   - Check: `handleSaveNewNote()` can't find document (line 250+)
   - Check: Threading issues with VSCode native threads

3. **Comment editor not opening from CodeLens**
   - Check: `addNoteViaCodeLensCommand` (line 199)
   - Check: CodeLens provider (codeLensProvider.ts)

4. **Comment editor opening but not saving**
   - Check: `saveNewNote` command (line 411)
   - Check: `handleSaveNewNote()` document lookup (line 244-265)

