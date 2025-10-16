/**
 * Note Manager for Code Context Notes
 * Central coordinator for all note operations
 */

import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { Note, CreateNoteParams, UpdateNoteParams, LineRange } from './types';
import { StorageManager } from './storageManager';
import { ContentHashTracker } from './contentHashTracker';
import { GitIntegration } from './gitIntegration';

/**
 * NoteManager coordinates all note operations
 * Integrates storage, content tracking, and git username
 */
export class NoteManager {
  private storage: StorageManager;
  private hashTracker: ContentHashTracker;
  private gitIntegration: GitIntegration;
  private noteCache: Map<string, Note[]>; // filePath -> notes
  private defaultAuthor: string = 'Unknown User';

  constructor(
    storage: StorageManager,
    hashTracker: ContentHashTracker,
    gitIntegration: GitIntegration
  ) {
    this.storage = storage;
    this.hashTracker = hashTracker;
    this.gitIntegration = gitIntegration;
    this.noteCache = new Map();

    // Initialize default author
    this.initializeDefaultAuthor();
  }

  /**
   * Initialize the default author name
   */
  private async initializeDefaultAuthor(): Promise<void> {
    try {
      this.defaultAuthor = await this.gitIntegration.getAuthorName();
    } catch (error) {
      console.error('Failed to get author name:', error);
    }
  }

  /**
   * Create a new note
   */
  async createNote(params: CreateNoteParams, document: vscode.TextDocument): Promise<Note> {
    // Validate parameters
    this.validateLineRange(params.lineRange, document);

    // Generate content hash
    const contentHash = this.hashTracker.generateHash(document, params.lineRange);

    // Get author
    const author = params.author || await this.gitIntegration.getAuthorName();

    // Create note object
    const now = new Date().toISOString();
    const note: Note = {
      id: uuidv4(),
      content: params.content.trim(),
      author,
      filePath: params.filePath,
      lineRange: params.lineRange,
      contentHash,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          content: params.content.trim(),
          author,
          timestamp: now,
          action: 'created'
        }
      ],
      isDeleted: false
    };

    // Save to storage
    await this.storage.saveNote(note);

    // Update cache
    this.addNoteToCache(note);

    return note;
  }

  /**
   * Update an existing note
   */
  async updateNote(params: UpdateNoteParams, document: vscode.TextDocument): Promise<Note> {
    // Load existing note (including deleted notes to properly handle all cases)
    const filePath = document.uri.fsPath;
    const notes = await this.getAllNotesForFile(filePath);
    const note = notes.find(n => n.id === params.id);

    if (!note) {
      throw new Error(`Note with id ${params.id} not found`);
    }

    if (note.isDeleted) {
      throw new Error(`Cannot update deleted note ${params.id}`);
    }

    // Get author
    const author = params.author || await this.gitIntegration.getAuthorName();

    // Update note
    const now = new Date().toISOString();
    note.content = params.content.trim();
    note.author = author;
    note.updatedAt = now;

    // Add history entry
    note.history.push({
      content: params.content.trim(),
      author,
      timestamp: now,
      action: 'edited'
    });

    // Update content hash if needed
    note.contentHash = this.hashTracker.generateHash(document, note.lineRange);

    // Save to storage
    await this.storage.saveNote(note);

    // Update cache
    this.updateNoteInCache(note);

    return note;
  }

  /**
   * Delete a note (soft delete)
   */
  async deleteNote(noteId: string, filePath: string): Promise<void> {
    const notes = await this.getAllNotesForFile(filePath);
    const note = notes.find(n => n.id === noteId);

    if (!note) {
      throw new Error(`Note with id ${noteId} not found`);
    }

    if (note.isDeleted) {
      throw new Error(`Note ${noteId} is already deleted`);
    }

    // Mark as deleted
    note.isDeleted = true;
    note.updatedAt = new Date().toISOString();

    // Add history entry
    note.history.push({
      content: note.content,
      author: await this.gitIntegration.getAuthorName(),
      timestamp: note.updatedAt,
      action: 'deleted'
    });

    // Save to storage
    await this.storage.saveNote(note);

    // Remove from cache
    this.removeNoteFromCache(noteId, filePath);
  }

  /**
   * Get all notes for a file (excluding deleted notes)
   */
  async getNotesForFile(filePath: string): Promise<Note[]> {
    // Check cache first
    if (this.noteCache.has(filePath)) {
      return this.noteCache.get(filePath)!.filter(n => !n.isDeleted);
    }

    // Load from storage
    const notes = await this.storage.loadNotes(filePath);

    // Update cache
    this.noteCache.set(filePath, notes);

    // Return non-deleted notes
    return notes.filter(n => !n.isDeleted);
  }

  /**
   * Get all notes for a file including deleted notes
   */
  async getAllNotesForFile(filePath: string): Promise<Note[]> {
    // Check cache first
    if (this.noteCache.has(filePath)) {
      return this.noteCache.get(filePath)!;
    }

    // Load from storage
    const notes = await this.storage.loadNotes(filePath);

    // Update cache
    this.noteCache.set(filePath, notes);

    return notes;
  }

  /**
   * Get a specific note by ID
   */
  async getNoteById(noteId: string, filePath: string): Promise<Note | undefined> {
    const notes = await this.getAllNotesForFile(filePath);
    return notes.find(n => n.id === noteId);
  }

  /**
   * Update note positions when document changes
   * Returns notes that were updated
   */
  async updateNotePositions(document: vscode.TextDocument): Promise<Note[]> {
    const filePath = document.uri.fsPath;
    const notes = await this.getNotesForFile(filePath);
    const updatedNotes: Note[] = [];

    for (const note of notes) {
      // Check if content is still at the expected location
      const isValid = this.hashTracker.validateContentHash(
        document,
        note.lineRange,
        note.contentHash
      );

      if (!isValid) {
        // Try to find the content at a new location
        const result = await this.hashTracker.findContentByHash(
          document,
          note.contentHash,
          note.lineRange
        );

        if (result.found && result.newLineRange) {
          // Update note position
          note.lineRange = result.newLineRange;
          note.updatedAt = new Date().toISOString();

          // Save updated note
          await this.storage.saveNote(note);
          updatedNotes.push(note);
        }
      }
    }

    // Update cache
    if (updatedNotes.length > 0) {
      this.noteCache.set(filePath, notes);
    }

    return updatedNotes;
  }

  /**
   * Validate a line range against document bounds
   */
  private validateLineRange(lineRange: LineRange, document: vscode.TextDocument): void {
    if (lineRange.start < 0 || lineRange.end < 0) {
      throw new Error('Line range cannot contain negative numbers');
    }

    if (lineRange.start > lineRange.end) {
      throw new Error('Line range start must be less than or equal to end');
    }

    if (lineRange.end >= document.lineCount) {
      throw new Error(`Line range end (${lineRange.end}) exceeds document line count (${document.lineCount})`);
    }
  }

  /**
   * Add a note to the cache
   */
  private addNoteToCache(note: Note): void {
    const notes = this.noteCache.get(note.filePath) || [];
    notes.push(note);
    this.noteCache.set(note.filePath, notes);
  }

  /**
   * Update a note in the cache
   */
  private updateNoteInCache(updatedNote: Note): void {
    const notes = this.noteCache.get(updatedNote.filePath);
    if (notes) {
      const index = notes.findIndex(n => n.id === updatedNote.id);
      if (index !== -1) {
        notes[index] = updatedNote;
      }
    }
  }

  /**
   * Remove a note from the cache
   */
  private removeNoteFromCache(noteId: string, filePath: string): void {
    const notes = this.noteCache.get(filePath);
    if (notes) {
      const filtered = notes.filter(n => n.id !== noteId);
      this.noteCache.set(filePath, filtered);
    }
  }

  /**
   * Clear the cache for a specific file
   */
  clearCacheForFile(filePath: string): void {
    this.noteCache.delete(filePath);
  }

  /**
   * Clear all cached notes
   */
  clearAllCache(): void {
    this.noteCache.clear();
  }

  /**
   * Refresh notes for a file (reload from storage)
   */
  async refreshNotesForFile(filePath: string): Promise<Note[]> {
    this.clearCacheForFile(filePath);
    return this.getNotesForFile(filePath);
  }

  /**
   * Get the history of a note
   */
  async getNoteHistory(noteId: string, filePath: string): Promise<Note['history']> {
    const note = await this.getNoteById(noteId, filePath);
    if (!note) {
      throw new Error(`Note with id ${noteId} not found`);
    }
    return note.history;
  }

  /**
   * Update configuration (e.g., author name override)
   */
  updateConfiguration(authorName?: string): void {
    this.gitIntegration.updateConfigOverride(authorName);
    this.initializeDefaultAuthor();
  }
}
