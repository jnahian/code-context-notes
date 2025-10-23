/**
 * Comment Controller for Code Context Notes
 * Manages VSCode comment threads for note UI
 */

import * as vscode from "vscode";
import { NoteManager } from './noteManager.js';
import { LineRange, Note, MultiNoteThreadState } from "./types.js";

/**
 * CommentController manages the comment UI for notes
 * Integrates with VSCode's native commenting system
 * Supports multiple notes per line with navigation
 */
export class CommentController {
  private commentController: vscode.CommentController;
  private noteManager: NoteManager;
  private commentThreads: Map<string, vscode.CommentThread>; // threadKey (lineKey) -> CommentThread
  private threadStates: Map<string, MultiNoteThreadState>; // threadKey -> state
  private currentlyEditingNoteId: string | null = null; // Track which note is being edited
  private currentlyCreatingThreadId: string | null = null; // Track temporary ID of thread being created

  constructor(noteManager: NoteManager, context: vscode.ExtensionContext) {
    this.noteManager = noteManager;
    this.commentThreads = new Map();
    this.threadStates = new Map();

    // Create the comment controller
    this.commentController = vscode.comments.createCommentController(
      "codeContextNotes",
      "Code Context Notes"
    );

    this.commentController.commentingRangeProvider = {
      provideCommentingRanges: (document: vscode.TextDocument) => {
        // Allow commenting on any line
        return [new vscode.Range(0, 0, document.lineCount - 1, 0)];
      },
    };

    // Register for disposal
    context.subscriptions.push(this.commentController);

    // Set up comment options to support markdown with formatting hints
    this.commentController.options = {
      prompt: "Add a note (supports markdown)",
      placeHolder: "Write your note here...",
    };

    // Disable reactions by not setting a reactionHandler
    // this.commentController.reactionHandler is intentionally not set to disable reactions
  }

  /**
   * Generate a unique key for a thread based on file path and line
   */
  private getThreadKey(filePath: string, lineStart: number): string {
    return `${filePath}:${lineStart}`;
  }

  /**
   * Create or update a comment thread for notes at a position (supports multiple notes per line)
   */
  async createCommentThread(
    document: vscode.TextDocument,
    note: Note
  ): Promise<vscode.CommentThread> {
    const threadKey = this.getThreadKey(document.uri.fsPath, note.lineRange.start);

    // Get all notes at this position
    const notesAtPosition = await this.noteManager.getNotesAtPosition(
      document.uri.fsPath,
      note.lineRange.start
    );

    // Check if thread already exists for this line
    let thread = this.commentThreads.get(threadKey);

    if (!thread) {
      // Create new thread
      const range = new vscode.Range(
        note.lineRange.start,
        0,
        note.lineRange.end,
        document.lineAt(note.lineRange.end).text.length
      );

      thread = this.commentController.createCommentThread(
        document.uri,
        range,
        []
      );

      thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
      thread.canReply = false; // We'll handle creation through commands

      this.commentThreads.set(threadKey, thread);

      // Initialize thread state
      this.threadStates.set(threadKey, {
        noteIds: notesAtPosition.map(n => n.id),
        currentIndex: notesAtPosition.findIndex(n => n.id === note.id),
        lineRange: note.lineRange,
        filePath: document.uri.fsPath
      });
    } else {
      // Update existing thread state if note not in list
      const state = this.threadStates.get(threadKey);
      if (state && !state.noteIds.includes(note.id)) {
        state.noteIds.push(note.id);
        state.currentIndex = state.noteIds.indexOf(note.id);
      }
    }

    // Update thread display with current note
    await this.updateThreadDisplay(threadKey, document);

    return thread;
  }

  /**
   * Update the thread display to show the current note with navigation
   */
  private async updateThreadDisplay(threadKey: string, document: vscode.TextDocument): Promise<void> {
    const thread = this.commentThreads.get(threadKey);
    const state = this.threadStates.get(threadKey);

    if (!thread || !state) {
      return;
    }

    // Validate noteIds array is not empty
    if (!state.noteIds || state.noteIds.length === 0) {
      return;
    }

    // Bounds checking for currentIndex
    if (!Number.isFinite(state.currentIndex) ||
        !Number.isInteger(state.currentIndex) ||
        state.currentIndex < 0 ||
        state.currentIndex >= state.noteIds.length) {
      // Clamp to valid range and persist corrected value
      if (state.currentIndex < 0 || !Number.isFinite(state.currentIndex)) {
        state.currentIndex = 0;
      } else if (state.currentIndex >= state.noteIds.length) {
        state.currentIndex = state.noteIds.length - 1;
      } else {
        // Non-integer, round to nearest valid index
        state.currentIndex = Math.max(0, Math.min(Math.round(state.currentIndex), state.noteIds.length - 1));
      }
    }

    // Get current note using validated index
    const currentNoteId = state.noteIds[state.currentIndex];
    const currentNote = await this.noteManager.getNoteById(currentNoteId, state.filePath);

    if (!currentNote) {
      return;
    }

    // Create comment for display, passing multi-note state
    const isMultiNote = state.noteIds.length > 1;
    const comment = this.createComment(currentNote, isMultiNote);
    thread.comments = [comment];

    // Update thread label using validated index
    if (isMultiNote) {
      thread.label = `Note ${state.currentIndex + 1} of ${state.noteIds.length}`;
    } else {
      thread.label = undefined;
    }
  }

  /**
   * Create a VSCode comment from a note (navigation is now handled by buttons)
   */
  private createComment(note: Note, isMultiNote: boolean = false): vscode.Comment {
    const markdownBody = new vscode.MarkdownString(note.content);
    markdownBody.isTrusted = true;
    markdownBody.supportHtml = true;
    markdownBody.supportThemeIcons = true;

    // Create a relevant label showing last update info
    const createdDate = new Date(note.createdAt);
    const lastUpdated =
      note.history && note.history.length > 0
        ? new Date(note.history[note.history.length - 1].timestamp)
        : createdDate;

    const isUpdated = note.history && note.history.length > 0;
    const label = isUpdated
      ? `Last updated ${lastUpdated.toLocaleDateString()}`
      : `Created ${createdDate.toLocaleDateString()}`;

    // Set contextValue to indicate multi-note threads for conditional buttons
    const contextValue = isMultiNote ? `${note.id}:multi` : note.id;

    const comment: vscode.Comment = {
      body: markdownBody,
      mode: vscode.CommentMode.Preview,
      author: {
        name: note.author,
      },
      label: label,
      // @ts-ignore - VSCode API supports this but types might be incomplete
      contextValue: contextValue,
      // Don't set reactions property - leaving it undefined disables reactions UI
    };

    return comment;
  }


  /**
   * Navigate to the next note in a multi-note thread
   */
  async navigateNextNote(threadKey: string): Promise<void> {
    const state = this.threadStates.get(threadKey);
    if (!state || state.noteIds.length <= 1) {
      return;
    }

    // Move to next note (wrap around to start if at end)
    state.currentIndex = (state.currentIndex + 1) % state.noteIds.length;

    // Update display
    const document = await vscode.workspace.openTextDocument(state.filePath);
    await this.updateThreadDisplay(threadKey, document);
  }

  /**
   * Navigate to the previous note in a multi-note thread
   */
  async navigatePreviousNote(threadKey: string): Promise<void> {
    const state = this.threadStates.get(threadKey);
    if (!state || state.noteIds.length <= 1) {
      return;
    }

    // Move to previous note (wrap around to end if at start)
    state.currentIndex = state.currentIndex === 0
      ? state.noteIds.length - 1
      : state.currentIndex - 1;

    // Update display
    const document = await vscode.workspace.openTextDocument(state.filePath);
    await this.updateThreadDisplay(threadKey, document);
  }

  /**
   * Get the currently displayed note ID for a thread
   */
  getCurrentNoteId(threadKey: string): string | undefined {
    const state = this.threadStates.get(threadKey);
    if (!state) {
      return undefined;
    }
    return state.noteIds[state.currentIndex];
  }

  /**
   * Update a comment thread with new note data
   */
  async updateCommentThread(note: Note, document: vscode.TextDocument): Promise<void> {
    const threadKey = this.getThreadKey(document.uri.fsPath, note.lineRange.start);
    const thread = this.commentThreads.get(threadKey);

    if (!thread) {
      // Create new thread if it doesn't exist
      await this.createCommentThread(document, note);
      return;
    }

    // Update range
    const range = new vscode.Range(
      note.lineRange.start,
      0,
      note.lineRange.end,
      document.lineAt(note.lineRange.end).text.length
    );
    thread.range = range;

    // Update display
    await this.updateThreadDisplay(threadKey, document);
  }

  /**
   * Delete a comment thread (or remove a note from a multi-note thread)
   */
  async deleteCommentThread(noteId: string, filePath: string): Promise<void> {
    // Find the thread containing this note
    let threadKeyToUpdate: string | undefined;

    for (const [threadKey, state] of this.threadStates.entries()) {
      if (state.noteIds.includes(noteId)) {
        threadKeyToUpdate = threadKey;
        break;
      }
    }

    if (!threadKeyToUpdate) {
      return;
    }

    const state = this.threadStates.get(threadKeyToUpdate);
    const thread = this.commentThreads.get(threadKeyToUpdate);

    if (!state || !thread) {
      return;
    }

    // Remove note from state
    const noteIndex = state.noteIds.indexOf(noteId);
    state.noteIds = state.noteIds.filter(id => id !== noteId);

    if (state.noteIds.length === 0) {
      // No more notes - dispose thread completely
      thread.dispose();
      this.commentThreads.delete(threadKeyToUpdate);
      this.threadStates.delete(threadKeyToUpdate);
    } else {
      // Adjust current index if needed
      if (state.currentIndex >= state.noteIds.length) {
        state.currentIndex = state.noteIds.length - 1;
      }

      // Update display
      const document = await vscode.workspace.openTextDocument(filePath);
      await this.updateThreadDisplay(threadKeyToUpdate, document);
    }
  }

  /**
   * Load and display all comment threads for a document (groups notes by line)
   */
  async loadCommentsForDocument(document: vscode.TextDocument): Promise<void> {
    const filePath = document.uri.fsPath;

    // Get all notes for this file
    const notes = await this.noteManager.getNotesForFile(filePath);

    // Group notes by line to create one thread per line
    const notesByLine = new Map<number, Note[]>();
    for (const note of notes) {
      const lineStart = note.lineRange.start;
      if (!notesByLine.has(lineStart)) {
        notesByLine.set(lineStart, []);
      }
      notesByLine.get(lineStart)!.push(note);
    }

    // Create comment threads for each line (will handle multiple notes per line)
    for (const [lineStart, lineNotes] of notesByLine) {
      // Create thread for first note, which will automatically load all notes at that position
      await this.createCommentThread(document, lineNotes[0]);
    }
  }

  /**
   * Refresh comment threads for a document
   */
  async refreshCommentsForDocument(
    document: vscode.TextDocument
  ): Promise<void> {
    const filePath = document.uri.fsPath;

    // Clear existing threads for this document
    this.clearThreadsForDocument(document.uri);

    // Reload comments
    await this.loadCommentsForDocument(document);
  }

  /**
   * Clear all comment threads for a document
   */
  private clearThreadsForDocument(uri: vscode.Uri): void {
    const threadsToDelete: string[] = [];
    const statesToDelete: string[] = [];

    for (const [threadKey, thread] of this.commentThreads.entries()) {
      if (thread.uri.fsPath === uri.fsPath) {
        thread.dispose();
        threadsToDelete.push(threadKey);
      }
    }

    for (const [threadKey, state] of this.threadStates.entries()) {
      if (state.filePath === uri.fsPath) {
        statesToDelete.push(threadKey);
      }
    }

    threadsToDelete.forEach((id) => this.commentThreads.delete(id));
    statesToDelete.forEach((id) => this.threadStates.delete(id));
  }

  /**
   * Close/hide all comment threads except the one being worked on
   * This ensures only one note is visible at a time for better focus
   * Completely disposes all threads to fully hide them from the editor
   * @param exceptThreadKey Optional thread key to exclude from closing (keeps this thread open)
   */
  private closeAllCommentEditors(exceptThreadKey?: string): void {
    const threadsToDelete: string[] = [];

    for (const [threadKey, thread] of this.commentThreads.entries()) {
      // Skip the thread we want to keep open
      if (exceptThreadKey && threadKey === exceptThreadKey) {
        continue;
      }

      // Dispose the thread completely to hide it from the editor
      thread.dispose();
      threadsToDelete.push(threadKey);
    }

    // Clear all threads from the map
    threadsToDelete.forEach((id) => {
      this.commentThreads.delete(id);
      this.threadStates.delete(id);
    });

    // Clear editing state only if we're not keeping a specific thread
    if (!exceptThreadKey) {
      this.currentlyEditingNoteId = null;
      this.currentlyCreatingThreadId = null;
    }
  }

  /**
   * Open comment editor for creating a new note
   */
  async openCommentEditor(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<vscode.CommentThread> {
    // Close all other comment editors first
    this.closeAllCommentEditors();

    const lineRange: LineRange = {
      start: range.start.line,
      end: range.end.line,
    };

    // Create a temporary comment thread to collect input
    const thread = this.commentController.createCommentThread(
      document.uri,
      range,
      []
    );

    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    thread.canReply = true;
    thread.label = "Add your note";

    // Store thread temporarily with range info for the input handler
    const tempId = `temp-${Date.now()}`;
    // Store both the thread and the document in a temporary structure
    (thread as any).tempId = tempId;
    (thread as any).sourceDocument = document;
    this.commentThreads.set(tempId, thread);

    // Track that we're creating a new note
    this.currentlyCreatingThreadId = tempId;

    return thread;
  }

  /**
   * Handle saving a new note from comment input
   */
  async handleSaveNewNote(
    thread: vscode.CommentThread,
    content: string
  ): Promise<void> {
    const tempId = (thread as any).tempId;

    // Get document - either from our custom property or find it by URI
    let document: vscode.TextDocument | undefined = (thread as any)
      .sourceDocument as vscode.TextDocument;

    if (!document) {
      // Thread was created by VSCode's + icon, not our openCommentEditor method
      // Find the document by URI
      const docs = vscode.workspace.textDocuments;
      document = docs.find((d) => d.uri.toString() === thread.uri.toString());

      if (!document) {
        // Try to open the document
        try {
          document = await vscode.workspace.openTextDocument(thread.uri);
        } catch (error) {
          vscode.window.showErrorMessage(
            "Could not find the document for this note"
          );
          thread.dispose();
          return;
        }
      }
    }

    // Final check - document must be defined at this point
    if (!document) {
      vscode.window.showErrorMessage(
        "Could not find the document for this note"
      );
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

    const lineRange: LineRange = {
      start: thread.range.start.line,
      end: thread.range.end.line,
    };

    // Create the actual note
    const note = await this.noteManager.createNote(
      {
        filePath: document.uri.fsPath,
        lineRange,
        content,
      },
      document
    );

    // Remove temporary thread
    thread.dispose();
    if (tempId) {
      this.commentThreads.delete(tempId);
    }

    // Clear creating state
    this.currentlyCreatingThreadId = null;

    // Create the real comment thread for the saved note
    this.createCommentThread(document, note);
  }

  /**
   * Handle note creation via comment
   */
  async handleCreateNote(
    document: vscode.TextDocument,
    range: vscode.Range,
    content: string
  ): Promise<Note> {
    const lineRange: LineRange = {
      start: range.start.line,
      end: range.end.line,
    };

    const note = await this.noteManager.createNote(
      {
        filePath: document.uri.fsPath,
        lineRange,
        content,
      },
      document
    );

    // Create comment thread for the new note
    this.createCommentThread(document, note);

    return note;
  }

  /**
   * Handle note update via comment
   */
  async handleUpdateNote(
    noteId: string,
    content: string,
    document: vscode.TextDocument
  ): Promise<Note> {
    const note = await this.noteManager.updateNote(
      {
        id: noteId,
        content,
      },
      document
    );

    // Update the comment thread
    this.updateCommentThread(note, document);

    return note;
  }

  /**
   * Handle note deletion via comment (supports multi-note threads)
   */
  async handleDeleteNote(noteId: string, filePath: string): Promise<void> {
    await this.noteManager.deleteNote(noteId, filePath);

    // Remove the comment thread or note from multi-note thread
    await this.deleteCommentThread(noteId, filePath);
  }

  /**
   * Get note ID from comment thread
   */
  getNoteIdFromThread(thread: vscode.CommentThread): string | undefined {
    for (const [noteId, commentThread] of this.commentThreads.entries()) {
      if (commentThread === thread) {
        return noteId;
      }
    }
    return undefined;
  }

  /**
   * Focus and expand a comment thread for a note
   */
  async focusNoteThread(noteId: string, filePath: string): Promise<void> {
    // Get the note to find its line range
    const note = await this.noteManager.getNoteById(noteId, filePath);
    if (!note) {
      vscode.window.showErrorMessage("Note not found");
      return;
    }

    // Get thread key for this note's position
    const threadKey = this.getThreadKey(filePath, note.lineRange.start);

    // Close all other comment editors except this one
    this.closeAllCommentEditors(threadKey);

    // Open the document if not already open
    const document = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(document);

    // Get or create the thread
    let thread = this.commentThreads.get(threadKey);
    if (!thread) {
      // Thread doesn't exist, create it
      thread = await this.createCommentThread(document, note);
    } else {
      // Thread exists, make sure we're showing the correct note
      const state = this.threadStates.get(threadKey);
      if (state) {
        const noteIndex = state.noteIds.indexOf(noteId);
        if (noteIndex !== -1 && noteIndex !== state.currentIndex) {
          state.currentIndex = noteIndex;
          await this.updateThreadDisplay(threadKey, document);
        }
      }
    }

    // Expand the comment thread
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
  }

  /**
   * Show note history as replies in the comment thread
   */
  async showHistoryInThread(noteId: string, filePath: string): Promise<void> {
    const note = await this.noteManager.getNoteById(noteId, filePath);
    if (!note) {
      vscode.window.showErrorMessage("Note not found");
      return;
    }

    // Get thread key for this note's position
    const threadKey = this.getThreadKey(filePath, note.lineRange.start);

    // Get or create the thread
    let thread = this.commentThreads.get(threadKey);
    if (!thread) {
      // Thread doesn't exist, create it
      const document = await vscode.workspace.openTextDocument(filePath);
      thread = await this.createCommentThread(document, note);
    }

    // Get thread state to check if multi-note
    const state = this.threadStates.get(threadKey);
    const isMultiNote = state ? state.noteIds.length > 1 : false;

    // Create the main comment with multi-note state for navigation buttons
    const mainComment = this.createComment(note, isMultiNote);

    // Create history reply comments
    const historyComments: vscode.Comment[] = [mainComment];

    if (note.history && note.history.length > 0) {
      for (let i = 0; i < note.history.length; i++) {
        const entry = note.history[i];
        const timestamp = new Date(entry.timestamp);
        const label = `${
          entry.action
        } on ${timestamp.toLocaleDateString()} at ${timestamp.toLocaleTimeString()}`;

        const historyComment: vscode.Comment = {
          body: new vscode.MarkdownString(
            `${entry.content || "*(no content)*"}`
          ),
          mode: vscode.CommentMode.Preview,
          author: {
            name: entry.author,
          },
          label: label,
          // Don't set reactions property - leaving it undefined disables reactions UI
        };
        historyComments.push(historyComment);
      }
    }

    // Update thread with main comment + history replies
    thread.comments = historyComments;
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

    // Focus on the thread
    await this.focusNoteThread(noteId, filePath);
  }

  /**
   * Enable edit mode for a note
   */
  async enableEditMode(noteId: string, filePath: string): Promise<void> {
    const note = await this.noteManager.getNoteById(noteId, filePath);
    if (!note) {
      vscode.window.showErrorMessage("Note not found");
      return;
    }

    // Get thread key for this note's position
    const threadKey = this.getThreadKey(filePath, note.lineRange.start);

    // Close all other comment editors except this one
    this.closeAllCommentEditors(threadKey);

    // Get or create the thread
    let thread = this.commentThreads.get(threadKey);
    if (!thread) {
      // Thread doesn't exist, create it
      const document = await vscode.workspace.openTextDocument(filePath);
      thread = await this.createCommentThread(document, note);
    } else {
      // Thread exists, make sure we're showing the correct note
      const state = this.threadStates.get(threadKey);
      if (state) {
        const noteIndex = state.noteIds.indexOf(noteId);
        if (noteIndex !== -1) {
          state.currentIndex = noteIndex;
        }
      }
    }

    // Track which note is being edited
    this.currentlyEditingNoteId = noteId;

    // Expand the thread
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

    // Switch comment to edit mode
    if (thread.comments.length > 0) {
      const comment = thread.comments[0];
      const editableComment: vscode.Comment = {
        ...comment,
        mode: vscode.CommentMode.Editing,
        body: note.content, // Plain text for editing
        // Don't set reactions property - leaving it undefined disables reactions UI
      };
      thread.comments = [editableComment];
    }
  }

  /**
   * Get the comment that is currently being edited
   * Returns the comment object if a note is being edited, null otherwise
   * Note: VS Code updates the comment body in the thread as the user types,
   * so this should return the latest content
   */
  getCurrentlyEditingComment(): vscode.Comment | null {
    if (!this.currentlyEditingNoteId) {
      return null;
    }

    const thread = this.commentThreads.get(this.currentlyEditingNoteId);
    if (!thread || thread.comments.length === 0) {
      return null;
    }

    // Get the first comment from the thread
    // VS Code should update this comment's body as the user types in edit mode
    const comment = thread.comments[0];

    // Verify it's in edit mode
    if (comment.mode !== vscode.CommentMode.Editing) {
      return null;
    }

    return comment;
  }

  /**
   * Get the thread that is currently being used to create a new note
   * Returns the thread object if a new note is being created, null otherwise
   */
  getCurrentlyCreatingThread(): vscode.CommentThread | null {
    if (!this.currentlyCreatingThreadId) {
      return null;
    }

    const thread = this.commentThreads.get(this.currentlyCreatingThreadId);
    return thread || null;
  }

  /**
   * Save edited note by ID (finds the correct file automatically)
   */
  async saveEditedNoteById(
    noteId: string,
    newContent: string
  ): Promise<boolean> {
    // Find the thread by searching through all threads
    // Since we don't know the file path yet, we need to search
    let foundThread: vscode.CommentThread | undefined;
    let foundThreadKey: string | undefined;

    for (const [threadKey, thread] of this.commentThreads.entries()) {
      const state = this.threadStates.get(threadKey);
      if (state && state.noteIds.includes(noteId)) {
        foundThread = thread;
        foundThreadKey = threadKey;
        break;
      }
    }

    if (!foundThread || !foundThreadKey) {
      vscode.window.showErrorMessage("Note thread not found");
      return false;
    }

    const filePath = foundThread.uri.fsPath;

    // Open the document
    const document = await vscode.workspace.openTextDocument(filePath);

    // Update the note
    const updatedNote = await this.noteManager.updateNote(
      { id: noteId, content: newContent },
      document
    );

    // Update thread back to preview mode
    await this.updateThreadDisplay(foundThreadKey, document);

    // Clear editing state
    this.currentlyEditingNoteId = null;

    return true;
  }

  /**
   * Save edited note (legacy method - kept for compatibility)
   */
  async saveEditedNote(
    noteId: string,
    filePath: string,
    newContent: string,
    document: vscode.TextDocument
  ): Promise<void> {
    const updatedNote = await this.noteManager.updateNote(
      { id: noteId, content: newContent },
      document
    );

    // Update thread back to preview mode
    this.updateCommentThread(updatedNote, document);
  }

  /**
   * Update comment threads when document changes
   */
  async handleDocumentChange(document: vscode.TextDocument): Promise<void> {
    // Update note positions
    const updatedNotes = await this.noteManager.updateNotePositions(document);

    // Update comment threads for updated notes
    for (const note of updatedNotes) {
      this.updateCommentThread(note, document);
    }
  }

  /**
   * Dispose all comment threads
   */
  dispose(): void {
    for (const thread of this.commentThreads.values()) {
      thread.dispose();
    }
    this.commentThreads.clear();
    this.commentController.dispose();
  }
}
