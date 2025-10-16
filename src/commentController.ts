/**
 * Comment Controller for Code Context Notes
 * Manages VSCode comment threads for note UI
 */

import * as vscode from 'vscode';
import { Note, LineRange } from './types';
import { NoteManager } from './noteManager';

/**
 * CommentController manages the comment UI for notes
 * Integrates with VSCode's native commenting system
 */
export class CommentController {
  private commentController: vscode.CommentController;
  private noteManager: NoteManager;
  private commentThreads: Map<string, vscode.CommentThread>; // noteId -> CommentThread

  constructor(noteManager: NoteManager, context: vscode.ExtensionContext) {
    this.noteManager = noteManager;
    this.commentThreads = new Map();

    // Create the comment controller
    this.commentController = vscode.comments.createCommentController(
      'codeContextNotes',
      'Code Context Notes'
    );

    this.commentController.commentingRangeProvider = {
      provideCommentingRanges: (document: vscode.TextDocument) => {
        // Allow commenting on any line
        return [new vscode.Range(0, 0, document.lineCount - 1, 0)];
      }
    };

    // Register for disposal
    context.subscriptions.push(this.commentController);

    // Set up comment options to support markdown with formatting hints
    this.commentController.options = {
      prompt: 'Add a note (supports markdown) - Press F1 or use shortcuts below',
      placeHolder: 'Write your note here...\n\n' +
        '💡 Keyboard Shortcuts:\n' +
        '  Ctrl/Cmd+B = **bold**\n' +
        '  Ctrl/Cmd+I = *italic*\n' +
        '  Ctrl/Cmd+Shift+C = `code`\n' +
        '  Ctrl/Cmd+Shift+K = ```code block```\n' +
        '  Ctrl/Cmd+K = [link](url)\n\n' +
        '📝 Markdown Syntax:\n' +
        '  **bold** *italic* `code` [link](url)\n' +
        '  ```language\\ncode\\n``` for code blocks\n' +
        '  > quote | - list | # heading'
    };

    // Set up the acceptInputCommand to handle Save button
    this.commentController.reactionHandler = async (comment: vscode.Comment, reaction: vscode.CommentReaction) => {
      // Handle reactions if needed in the future
    };
  }

  /**
   * Create a comment thread for a note
   */
  createCommentThread(
    document: vscode.TextDocument,
    note: Note
  ): vscode.CommentThread {
    // Check if thread already exists
    const existingThread = this.commentThreads.get(note.id);
    if (existingThread) {
      return existingThread;
    }

    // Create range from line range
    const range = new vscode.Range(
      note.lineRange.start,
      0,
      note.lineRange.end,
      document.lineAt(note.lineRange.end).text.length
    );

    // Create comment thread
    const thread = this.commentController.createCommentThread(
      document.uri,
      range,
      []
    );

    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
    thread.canReply = false; // We'll handle creation through commands

    // Create comment for the note
    const comment = this.createComment(note);
    thread.comments = [comment];

    // Store thread reference
    this.commentThreads.set(note.id, thread);

    return thread;
  }

  /**
   * Create a VSCode comment from a note
   */
  private createComment(note: Note): vscode.Comment {
    const markdownBody = new vscode.MarkdownString(note.content);
    markdownBody.isTrusted = true;
    markdownBody.supportHtml = true;

    const comment: vscode.Comment = {
      body: markdownBody,
      mode: vscode.CommentMode.Preview,
      author: {
        name: note.author
      },
      label: `Created ${new Date(note.createdAt).toLocaleDateString()}`,
      // Add Edit button as a command
      // @ts-ignore - VSCode API supports this but types might be incomplete
      contextValue: note.id
    };

    return comment;
  }

  /**
   * Update a comment thread with new note data
   */
  updateCommentThread(note: Note, document: vscode.TextDocument): void {
    const thread = this.commentThreads.get(note.id);
    if (!thread) {
      // Create new thread if it doesn't exist
      this.createCommentThread(document, note);
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

    // Update comment
    const comment = this.createComment(note);
    thread.comments = [comment];
  }

  /**
   * Delete a comment thread
   */
  deleteCommentThread(noteId: string): void {
    const thread = this.commentThreads.get(noteId);
    if (thread) {
      thread.dispose();
      this.commentThreads.delete(noteId);
    }
  }

  /**
   * Load and display all comment threads for a document
   */
  async loadCommentsForDocument(document: vscode.TextDocument): Promise<void> {
    const filePath = document.uri.fsPath;

    // Get all notes for this file
    const notes = await this.noteManager.getNotesForFile(filePath);

    // Create comment threads for each note
    for (const note of notes) {
      this.createCommentThread(document, note);
    }
  }

  /**
   * Refresh comment threads for a document
   */
  async refreshCommentsForDocument(document: vscode.TextDocument): Promise<void> {
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

    for (const [noteId, thread] of this.commentThreads.entries()) {
      if (thread.uri.fsPath === uri.fsPath) {
        thread.dispose();
        threadsToDelete.push(noteId);
      }
    }

    threadsToDelete.forEach(id => this.commentThreads.delete(id));
  }

  /**
   * Open comment editor for creating a new note
   */
  async openCommentEditor(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<vscode.CommentThread> {
    const lineRange: LineRange = {
      start: range.start.line,
      end: range.end.line
    };

    // Create a temporary comment thread to collect input
    const thread = this.commentController.createCommentThread(
      document.uri,
      range,
      []
    );

    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    thread.canReply = true;
    thread.label = 'New Note';

    // Store thread temporarily with range info for the input handler
    const tempId = `temp-${Date.now()}`;
    // Store both the thread and the document in a temporary structure
    (thread as any).tempId = tempId;
    (thread as any).sourceDocument = document;
    this.commentThreads.set(tempId, thread);

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
    const document = (thread as any).sourceDocument as vscode.TextDocument;

    if (!document || !content || !thread.range) {
      thread.dispose();
      if (tempId) {
        this.commentThreads.delete(tempId);
      }
      return;
    }

    const lineRange: LineRange = {
      start: thread.range.start.line,
      end: thread.range.end.line
    };

    // Create the actual note
    const note = await this.noteManager.createNote(
      {
        filePath: document.uri.fsPath,
        lineRange,
        content
      },
      document
    );

    // Remove temporary thread
    thread.dispose();
    if (tempId) {
      this.commentThreads.delete(tempId);
    }

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
      end: range.end.line
    };

    const note = await this.noteManager.createNote(
      {
        filePath: document.uri.fsPath,
        lineRange,
        content
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
        content
      },
      document
    );

    // Update the comment thread
    this.updateCommentThread(note, document);

    return note;
  }

  /**
   * Handle note deletion via comment
   */
  async handleDeleteNote(noteId: string, filePath: string): Promise<void> {
    await this.noteManager.deleteNote(noteId, filePath);

    // Remove the comment thread
    this.deleteCommentThread(noteId);
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
    const thread = this.commentThreads.get(noteId);
    if (!thread) {
      vscode.window.showErrorMessage('Note thread not found');
      return;
    }

    // Open the document if not already open
    const document = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(document);

    // Expand the comment thread
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

    // Move cursor to the note location
    if (thread.range) {
      const position = new vscode.Position(thread.range.start.line, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(thread.range, vscode.TextEditorRevealType.InCenter);
    }
  }

  /**
   * Show note history as replies in the comment thread
   */
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

    // Create the main comment
    const mainComment = this.createComment(note);

    // Create history reply comments
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
        mode: vscode.CommentMode.Editing,
        body: note.content // Plain text for editing
      };
      thread.comments = [editableComment];
    }
  }

  /**
   * Save edited note
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
