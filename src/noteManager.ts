/**
 * Note Manager for Code Context Notes
 * Central coordinator for all note operations
 */

import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { Note, CreateNoteParams, UpdateNoteParams, LineRange } from './types.js';
import { StorageManager } from './storageManager.js';
import { ContentHashTracker } from './contentHashTracker.js';
import { GitIntegration } from './gitIntegration.js';
import { SearchManager } from './searchManager.js';

/**
 * NoteManager coordinates all note operations
 * Integrates storage, content tracking, and git username
 */
export class NoteManager extends EventEmitter {
  private storage: StorageManager;
  private hashTracker: ContentHashTracker;
  private gitIntegration: GitIntegration;
  private searchManager?: SearchManager; // optional to avoid circular dependency
  private noteCache: Map<string, Note[]>; // filePath -> notes
  private workspaceNotesCache: Note[] | null = null; // cache for all notes
  private workspaceNotesByFileCache: Map<string, Note[]> | null = null; // cache for notes grouped by file
  private defaultAuthor: string = 'Unknown User';

  constructor(
    storage: StorageManager,
    hashTracker: ContentHashTracker,
    gitIntegration: GitIntegration
  ) {
    super();
    this.storage = storage;
    this.hashTracker = hashTracker;
    this.gitIntegration = gitIntegration;
    this.noteCache = new Map();

    // Initialize default author
    this.initializeDefaultAuthor();
  }

  /**
   * Set the search manager (called after both managers are created to avoid circular dependency)
   */
  setSearchManager(searchManager: SearchManager): void {
    this.searchManager = searchManager;
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
      isDeleted: false,
      tags: params.tags || []
    };

    // Save to storage
    await this.storage.saveNote(note);

    // Update cache
    this.addNoteToCache(note);

    // Update search index
    if (this.searchManager) {
      await this.searchManager.updateIndex(note);
    }

    // Clear workspace cache and emit events
    this.clearWorkspaceCache();
    this.emit('noteCreated', note);
    this.emit('noteChanged', { type: 'created', note });

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

    // Update tags if provided
    if (params.tags !== undefined) {
      note.tags = params.tags;
    }

    // Add history entry
    note.history.push({
      content: params.content.trim(),
      author,
      timestamp: now,
      action: 'edited'
    });

    // Update content hash (may change if code was edited)
    note.contentHash = this.hashTracker.generateHash(document, note.lineRange);

    // Save to storage (file named by note ID, so always same file)
    await this.storage.saveNote(note);

    // Update cache
    this.updateNoteInCache(note);

    // Update search index
    if (this.searchManager) {
      await this.searchManager.updateIndex(note);
    }

    // Clear workspace cache and emit events
    this.clearWorkspaceCache();
    this.emit('noteUpdated', note);
    this.emit('noteChanged', { type: 'updated', note });

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

    // Remove from search index
    if (this.searchManager) {
      await this.searchManager.removeFromIndex(noteId);
    }

    // Clear workspace cache and emit events
    this.clearWorkspaceCache();
    this.emit('noteDeleted', { noteId, filePath });
    this.emit('noteChanged', { type: 'deleted', noteId, filePath });
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

    // Load from storage (including deleted notes)
    const notes = await this.storage.loadAllNotes(filePath);

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
   * Get all notes at a specific line position (supports multiple notes per line)
   */
  async getNotesAtPosition(filePath: string, line: number): Promise<Note[]> {
    const notes = await this.getNotesForFile(filePath);
    return notes.filter(note =>
      line >= note.lineRange.start && line <= note.lineRange.end
    );
  }

  /**
   * Get all notes that overlap with a line range (supports multiple notes per line)
   */
  async getNotesInRange(filePath: string, lineRange: LineRange): Promise<Note[]> {
    const notes = await this.getNotesForFile(filePath);
    return notes.filter(note =>
      // Check if ranges overlap
      !(note.lineRange.end < lineRange.start || note.lineRange.start > lineRange.end)
    );
  }

  /**
   * Check if a line has any notes
   */
  async hasNotesAtPosition(filePath: string, line: number): Promise<boolean> {
    const notes = await this.getNotesAtPosition(filePath, line);
    return notes.length > 0;
  }

  /**
   * Count notes at a specific line position
   */
  async countNotesAtPosition(filePath: string, line: number): Promise<number> {
    const notes = await this.getNotesAtPosition(filePath, line);
    return notes.length;
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

  // ========================================
  // Workspace-Wide Query Methods (for Sidebar)
  // ========================================

  /**
   * Get all notes across the entire workspace (excluding deleted notes)
   * Uses caching for performance
   */
  async getAllNotes(): Promise<Note[]> {
    // Check cache first
    if (this.workspaceNotesCache !== null) {
      return this.workspaceNotesCache;
    }

    // Load all note files from storage
    const allNoteFiles = await this.storage.getAllNoteFiles();
    const notes: Note[] = [];

    for (const noteFilePath of allNoteFiles) {
      try {
        const noteId = this.extractNoteIdFromFilePath(noteFilePath);
        const note = await this.storage.loadNoteById(noteId);

        // Include only non-deleted notes
        if (note && !note.isDeleted) {
          notes.push(note);
        }
      } catch (error) {
        console.error(`Failed to load note from ${noteFilePath}:`, error);
        // Continue with other files
      }
    }

    // Cache the results
    this.workspaceNotesCache = notes;

    return notes;
  }

  /**
   * Get all notes grouped by file path
   * Returns a Map with filePath as key and array of notes as value
   * Uses caching for performance
   */
  async getNotesByFile(): Promise<Map<string, Note[]>> {
    // Check cache first
    if (this.workspaceNotesByFileCache !== null) {
      return this.workspaceNotesByFileCache;
    }

    // Get all notes
    const allNotes = await this.getAllNotes();

    // Group by file path
    const notesByFile = new Map<string, Note[]>();

    for (const note of allNotes) {
      const existing = notesByFile.get(note.filePath) || [];
      existing.push(note);
      notesByFile.set(note.filePath, existing);
    }

    // Sort notes within each file by line range
    for (const [filePath, notes] of notesByFile.entries()) {
      notes.sort((a, b) => a.lineRange.start - b.lineRange.start);
    }

    // Cache the results
    this.workspaceNotesByFileCache = notesByFile;

    return notesByFile;
  }

  /**
   * Get total count of notes in workspace (excluding deleted)
   */
  async getNoteCount(): Promise<number> {
    const notes = await this.getAllNotes();
    return notes.length;
  }

  /**
   * Get count of files that have notes
   */
  async getFileCount(): Promise<number> {
    const notesByFile = await this.getNotesByFile();
    return notesByFile.size;
  }

  /**
   * Clear workspace-wide caches
   * Should be called when notes are created, updated, or deleted
   */
  private clearWorkspaceCache(): void {
    this.workspaceNotesCache = null;
    this.workspaceNotesByFileCache = null;
  }

  /**
   * Extract note ID from a note file path
   * Example: /path/.code-notes/abc123.md -> abc123
   */
  private extractNoteIdFromFilePath(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace('.md', '');
  }
}
