/**
 * Note Manager for Code Context Notes
 * Central coordinator for all note operations
 */

import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { Note, CreateNoteParams, UpdateNoteParams, LineRange, NoteType, NotePriority, NoteScope, NoteDocument, AuthorProvider, SearchIndexSync } from './types.js';
import { applyDefaults } from './noteDefaults.js';
import { StorageManager } from './storageManager.js';
import { ContentHashTracker } from './contentHashTracker.js';
import { LockManager } from './lockManager.js';

/**
 * NoteManager coordinates all note operations
 * Integrates storage, content tracking, and git username
 */
export class NoteManager extends EventEmitter {
  private storage: StorageManager;
  private hashTracker: ContentHashTracker;
  private gitIntegration: AuthorProvider;
  private searchManager?: SearchIndexSync; // optional to avoid circular dependency
  private noteCache: Map<string, Note[]>; // filePath -> notes
  private workspaceNotesCache: Note[] | null = null; // cache for all notes
  private workspaceNotesByFileCache: Map<string, Note[]> | null = null; // cache for notes grouped by file
  private defaultAuthor: string = 'Unknown User';
  private lockManager?: LockManager;

  constructor(
    storage: StorageManager,
    hashTracker: ContentHashTracker,
    gitIntegration: AuthorProvider,
    opts?: { lockManager?: LockManager }
  ) {
    super();
    this.storage = storage;
    this.hashTracker = hashTracker;
    this.gitIntegration = gitIntegration;
    this.noteCache = new Map();
    this.lockManager = opts?.lockManager;

    // Initialize default author
    this.initializeDefaultAuthor();
  }

  /**
   * Run fn under the note's lock if a LockManager was provided; otherwise
   * run it directly (behavior unchanged for callers without locking).
   */
  private withNoteLock<T>(noteId: string, fn: () => Promise<T>): Promise<T> {
    return this.lockManager ? this.lockManager.withLock(noteId, fn) : fn();
  }

  /**
   * Set the search manager (called after both managers are created to avoid circular dependency)
   */
  setSearchManager(searchManager: SearchIndexSync): void {
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
  async createNote(params: CreateNoteParams, document: NoteDocument): Promise<Note> {
    // Validate parameters
    this.validateLineRange(params.lineRange, document);

    // Generate the id up front so it can serve as the lock key
    const noteId = uuidv4();

    return this.withNoteLock(noteId, async () => {
      // Generate content hash
      const contentHash = this.hashTracker.generateHash(document, params.lineRange);

      // Get author
      const author = params.author || await this.gitIntegration.getAuthorName();

      // Create note object
      const now = new Date().toISOString();
      const note: Note = {
        id: noteId,
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

      // Normalize before save/cache so this note matches the shape every other
      // load path guarantees (applyDefaults is a no-op for on-disk serialization
      // since storageManager omits fields already equal to their default).
      const normalized = applyDefaults(note);

      // Save to storage
      await this.storage.saveNote(normalized);

      // Update cache
      this.addNoteToCache(normalized);

      // Update search index
      if (this.searchManager) {
        await this.searchManager.updateIndex(normalized);
      }

      // Clear workspace cache and emit events
      this.clearWorkspaceCache();
      this.emit('noteCreated', normalized);
      this.emit('noteChanged', { type: 'created', note: normalized });

      return normalized;
    });
  }

  /**
   * Update an existing note
   */
  async updateNote(params: UpdateNoteParams, document: NoteDocument): Promise<Note> {
    return this.withNoteLock(params.id, async () => {
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
    });
  }

  /**
   * Update only the metadata fields of an existing note (type, priority, tags, expiresAt, scope).
   * Does not touch content, lineRange, contentHash, or history.
   */
  async updateNoteMetadata(
    noteId: string,
    fields: { type?: NoteType; priority?: NotePriority; tags?: string[]; expiresAt?: string; scope?: NoteScope },
  ): Promise<Note> {
    return this.withNoteLock(noteId, async () => {
      const existing = await this.storage.loadNoteById(noteId);
      if (!existing) throw new Error(`Note ${noteId} not found`);
      if (existing.isDeleted) throw new Error(`Cannot update deleted note ${noteId}`);

      // Merge: only overwrite fields explicitly provided, then normalize
      // defaults so cache/consumers see the same shape as every other load path.
      const updated: Note = applyDefaults({
        ...existing,
        ...fields,
        updatedAt: new Date().toISOString(),
      });
      await this.storage.saveNote(updated);

      // Mirror the cache-invalidation pattern used in updateNote
      this.updateNoteInCache(updated);
      this.clearWorkspaceCache();

      // Keep search index in sync (updatedAt / metadata affect search results)
      if (this.searchManager) {
        await this.searchManager.updateIndex(updated);
      }

      this.emit('noteUpdated', updated);
      this.emit('noteChanged', { type: 'updated', note: updated });
      return updated;
    });
  }

  /**
   * Delete a note (soft delete)
   */
  async deleteNote(noteId: string, filePath: string): Promise<void> {
    return this.withNoteLock(noteId, async () => {
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

      // Keep the soft-deleted note in the cache (the cache holds ALL notes;
      // getNotesForFile filters deleted ones at return). Removing it here
      // would make "already deleted" lookups report "not found" instead.
      this.updateNoteInCache(note);

      // Remove from search index
      if (this.searchManager) {
        await this.searchManager.removeFromIndex(noteId);
      }

      // Clear workspace cache and emit events
      this.clearWorkspaceCache();
      this.emit('noteDeleted', { noteId, filePath });
      this.emit('noteChanged', { type: 'deleted', noteId, filePath });
    });
  }

  /**
   * Get all notes for a file (excluding deleted notes)
   */
  async getNotesForFile(filePath: string): Promise<Note[]> {
    // Check cache first
    if (this.noteCache.has(filePath)) {
      return this.noteCache.get(filePath)!.filter(n => !n.isDeleted);
    }

    // Load from storage and apply defaults at the boundary. The cache always
    // holds ALL notes (including soft-deleted) — getAllNotesForFile shares
    // this cache, so caching a pre-filtered list here would make deleted
    // notes invisible to it.
    const notes = (await this.storage.loadAllNotes(filePath)).map(applyDefaults);

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

    // Load from storage (including deleted notes) and apply defaults at the boundary
    const notes = (await this.storage.loadAllNotes(filePath)).map(applyDefaults);

    // Update cache
    this.noteCache.set(filePath, notes);

    return notes;
  }

  /**
   * Get a specific note by ID
   */
  async getNoteById(noteId: string, filePath: string): Promise<Note | undefined> {
    const notes = await this.getAllNotesForFile(filePath);
    // Soft-deleted notes are not retrievable through the by-id lookup —
    // consumers (comment threads, edit mode) must treat them as gone
    return notes.find(n => n.id === noteId && !n.isDeleted);
  }

  /**
   * Get a note by ID alone, without needing its filePath (note files are
   * keyed by note ID on disk). Same by-id semantics as getNoteById: a
   * soft-deleted note is treated as gone.
   */
  async getNoteByIdGlobal(noteId: string): Promise<Note | undefined> {
    const note = await this.storage.loadNoteById(noteId);
    if (!note) return undefined;
    const normalized = applyDefaults(note);
    return normalized.isDeleted ? undefined : normalized;
  }

  /**
   * Update note positions when document changes
   * Returns notes that were updated
   */
  async updateNotePositions(document: NoteDocument): Promise<Note[]> {
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
  private validateLineRange(lineRange: LineRange, document: NoteDocument): void {
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
   * Add a note to the cache. Defaults are applied here so cached notes
   * always honor the NoteManager boundary guarantee.
   */
  private addNoteToCache(note: Note): void {
    const notes = this.noteCache.get(note.filePath) || [];
    notes.push(applyDefaults(note));
    this.noteCache.set(note.filePath, notes);
  }

  /**
   * Update a note in the cache. Defaults are applied here so cached notes
   * always honor the NoteManager boundary guarantee.
   */
  private updateNoteInCache(updatedNote: Note): void {
    const notes = this.noteCache.get(updatedNote.filePath);
    if (notes) {
      const index = notes.findIndex(n => n.id === updatedNote.id);
      if (index !== -1) {
        notes[index] = applyDefaults(updatedNote);
      }
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
        const rawNote = await this.storage.loadNoteById(noteId);
        // Apply defaults at the boundary before cache/consumer use
        const note = rawNote ? applyDefaults(rawNote) : null;

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
   * Get all notes across the workspace (excluding deleted notes) along with
   * per-file parse errors, via StorageManager's workspace-wide loader.
   * Uncached — intended for export regeneration, not the sidebar's hot path.
   */
  async getAllNotesAndErrors(): Promise<{ notes: Note[]; errors: { file: string; message: string }[] }> {
    const { notes: rawNotes, errors } = await this.storage.loadAllNotesAndErrors();
    const notes = rawNotes
      .map(applyDefaults)
      .filter(note => !note.isDeleted);

    return { notes, errors };
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
    const fileName = path.basename(filePath);
    return fileName.replace(path.extname(fileName), '');
  }
}
