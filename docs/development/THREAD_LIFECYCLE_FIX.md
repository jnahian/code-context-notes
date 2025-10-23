# Thread Lifecycle Fix - "Note thread not found" Error

## Problem
When viewing note history or performing other operations on notes, users were encountering the error:
```
Note thread not found
```

## Root Cause
The issue was caused by improper thread lifecycle management:

1. **Aggressive Thread Disposal**: The `closeAllCommentEditors()` method was disposing **all** comment threads, including the one the user was trying to interact with.

2. **Thread Not Recreated**: After disposing threads, methods like `showHistoryInThread()`, `focusNoteThread()`, and `enableEditMode()` tried to access threads that no longer existed in the `commentThreads` Map.

3. **Circular Disposal**: The `showHistoryInThread()` method would:
   - Get the thread and update it with history
   - Call `focusNoteThread()`
   - Which would call `closeAllCommentEditors()`
   - Which would dispose the thread that was just updated
   - Then try to access the disposed thread → Error!

## Solution

### 1. Modified `closeAllCommentEditors()` to Accept Exception Parameter

Added an optional `exceptNoteId` parameter to exclude specific threads from being closed:

```typescript
private closeAllCommentEditors(exceptNoteId?: string): void {
  const threadsToDelete: string[] = [];

  for (const [noteId, thread] of this.commentThreads.entries()) {
    // Skip the thread we want to keep open
    if (exceptNoteId && noteId === exceptNoteId) {
      continue;
    }

    // Dispose the thread completely to hide it from the editor
    thread.dispose();
    threadsToDelete.push(noteId);
  }

  // Clear all threads from the map
  threadsToDelete.forEach(id => this.commentThreads.delete(id));

  // Clear editing state only if we're not keeping a specific thread
  if (!exceptNoteId) {
    this.currentlyEditingNoteId = null;
    this.currentlyCreatingThreadId = null;
  } else if (this.currentlyEditingNoteId && this.currentlyEditingNoteId !== exceptNoteId) {
    // Clear editing state if the editing note is being closed
    this.currentlyEditingNoteId = null;
  }
}
```

### 2. Updated Methods to Pass Exception Parameter

Modified methods to preserve the thread they're working with:

```typescript
async focusNoteThread(noteId: string, filePath: string): Promise<void> {
  // Close all other comment editors EXCEPT this one
  this.closeAllCommentEditors(noteId);
  // ...
}

async enableEditMode(noteId: string, filePath: string): Promise<void> {
  // Close all other comment editors EXCEPT this one
  this.closeAllCommentEditors(noteId);
  // ...
}
```

### 3. Added Thread Recreation Logic

All methods that access threads now recreate them if they don't exist:

```typescript
async showHistoryInThread(noteId: string, filePath: string): Promise<void> {
  const note = await this.noteManager.getNoteById(noteId, filePath);
  if (!note) {
    vscode.window.showErrorMessage('Note not found');
    return;
  }

  // Get or create the thread
  let thread = this.commentThreads.get(noteId);
  if (!thread) {
    // Thread doesn't exist, create it
    const document = await vscode.workspace.openTextDocument(filePath);
    thread = this.createCommentThread(document, note);
  }
  // ... rest of the method
}
```

Similar logic was added to:
- `focusNoteThread()`
- `enableEditMode()`

## Benefits

1. **Robust Thread Management**: Threads are now properly preserved when needed and recreated when missing

2. **No More "Thread Not Found" Errors**: Operations can always access or recreate the threads they need

3. **Clean UI**: Still maintains the single-thread focus behavior (only one thread visible at a time)

4. **State Preservation**: Editing state is properly managed and only cleared when appropriate

## Files Modified

- `src/commentController.ts`:
  - Line 212: Modified `closeAllCommentEditors()` signature and implementation
  - Line 431: Updated `focusNoteThread()` to pass exceptNoteId and recreate threads
  - Line 457: Updated `showHistoryInThread()` to recreate threads if needed
  - Line 510: Updated `enableEditMode()` to pass exceptNoteId and recreate threads

## Testing

The fix has been:
- ✅ Compiled successfully with TypeScript
- ✅ Built for production with esbuild
- ✅ Ready for manual testing

## Test Scenarios

To verify the fix works:

1. **View History**: Click the history button on a note → Should show history without errors
2. **Edit After View**: View history, then edit the note → Should work smoothly
3. **Multiple Operations**: Perform multiple view/edit operations in sequence → Should not error
4. **Focus Note**: Use keyboard shortcuts or commands to focus on notes → Should work reliably

## Related Issues

- Original keybinding fix: docs/KEYBINDING_FIX.md
- Thread lifecycle was affected by state tracking added for keybinding support
