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
    const comment: vscode.Comment = {
      body: new vscode.MarkdownString(note.content),
      mode: vscode.CommentMode.Preview,
      author: {
        name: note.author
      },
      label: `Created ${new Date(note.createdAt).toLocaleDateString()}`
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
