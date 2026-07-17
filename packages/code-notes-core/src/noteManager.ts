/**
 * Note Manager for Code Context Notes
 * Central coordinator for all note operations
 */

import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { Note, CreateNoteParams, UpdateNoteParams, LineRange, NoteType, NotePriority, NoteScope, NoteReference, AuthorType, NoteDocument, AuthorProvider, SearchIndexSync, AgentWriteMode, AuditEntry, Proposal } from './types.js';
import { applyDefaults } from './noteDefaults.js';
import { StorageManager } from './storageManager.js';
import { ContentHashTracker } from './contentHashTracker.js';
import { LockManager } from './lockManager.js';
import { AuditLog, hashNoteContent } from './auditLog.js';
import { ProposalStore, PendingWriteError } from './proposalStore.js';

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
  private auditLog?: AuditLog;
  private proposalStore?: ProposalStore;
  private agentWriteMode?: () => Promise<AgentWriteMode>;
  private agentName: string;
  private agentWriter: boolean;

  constructor(
    storage: StorageManager,
    hashTracker: ContentHashTracker,
    gitIntegration: AuthorProvider,
    opts?: {
      lockManager?: LockManager;
      auditLog?: AuditLog;
      proposalStore?: ProposalStore;
      /** A function, not a value: the mode is re-read per call so a
       *  long-lived process can't serve a stale policy. */
      agentWriteMode?: () => Promise<AgentWriteMode>;
      agentName?: string;
      /**
       * True when this NoteManager belongs to an agent (the MCP server), so
       * every write it makes is an agent write. One instance serves one
       * identity — the extension's manager leaves this false.
       *
       * Identity has to come from the writer, not the note: keying off a
       * note's authorType let an agent edit human-authored notes with no
       * approval, and would have diverted a human's own revert of an agent
       * note into a proposal.
       */
      agentWriter?: boolean;
    }
  ) {
    super();
    this.storage = storage;
    this.hashTracker = hashTracker;
    this.gitIntegration = gitIntegration;
    this.noteCache = new Map();
    this.lockManager = opts?.lockManager;
    this.auditLog = opts?.auditLog;
    this.proposalStore = opts?.proposalStore;
    this.agentWriteMode = opts?.agentWriteMode;
    this.agentName = opts?.agentName ?? 'unknown-agent';
    // An instance wired for agent routing but not explicitly flagged is still
    // an agent's — only the extension constructs a manager with neither.
    this.agentWriter = opts?.agentWriter ?? !!(opts?.proposalStore || opts?.auditLog);

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
   * Record an agent op if the workspace is in audit mode. Human writes are
   * never logged — detection is `authorType: 'agent'`, never author-string
   * sniffing.
   */
  private async recordAgentOp(isAgentWrite: boolean, entry: Omit<AuditEntry, 'ts' | 'agent'>): Promise<void> {
    if (!isAgentWrite || !this.auditLog || !this.agentWriteMode) return;
    const mode = await this.agentWriteMode();
    if (mode !== 'audit') return;
    await this.auditLog.append({ ...entry, ts: new Date().toISOString(), agent: this.agentName });
  }

  /**
   * In queue mode an agent write becomes a proposal and never touches live
   * notes. Throws PendingWriteError rather than returning a flag, so a caller
   * cannot accidentally carry on and write anyway.
   */
  private async divertToProposalIfQueued(
    isAgentWrite: boolean,
    proposal: Omit<Proposal, 'proposalId' | 'agent' | 'proposedAt'>,
  ): Promise<void> {
    if (!isAgentWrite || !this.proposalStore || !this.agentWriteMode) return;
    if (await this.agentWriteMode() !== 'queue') return;

    const proposalId = `prop-${uuidv4()}`;
    await this.proposalStore.save({
      ...proposal,
      proposalId,
      agent: this.agentName,
      proposedAt: new Date().toISOString(),
    });
    throw new PendingWriteError(proposalId);
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
      // Before any storage write: in queue mode this becomes a proposal and
      // no note is created.
      await this.divertToProposalIfQueued(this.agentWriter || params.authorType === 'agent', {
        op: 'create',
        file: params.filePath,
        lineRange: params.lineRange,
        content: params.content.trim(),
      });

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
        ...(params.type !== undefined && { type: params.type }),
        ...(params.tags !== undefined && { tags: params.tags }),
        ...(params.scope !== undefined && { scope: params.scope }),
        ...(params.references !== undefined && { references: params.references }),
        ...(params.priority !== undefined && { priority: params.priority }),
        ...(params.expiresAt !== undefined && { expiresAt: params.expiresAt }),
        ...(params.authorType !== undefined && { authorType: params.authorType }),
        ...(params.approvedBy !== undefined && { approvedBy: params.approvedBy }),
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

      await this.recordAgentOp(this.agentWriter || params.authorType === 'agent', {
        op: 'create',
        noteId: normalized.id,
        file: normalized.filePath,
        lineRange: [normalized.lineRange.start, normalized.lineRange.end],
        type: normalized.type,
      });

      return normalized;
    });
  }

  /**
   * Update an existing note
   */
  async updateNote(params: UpdateNoteParams, document: NoteDocument): Promise<Note> {
    return this.withNoteLock(params.id, async () => {
      // Read fresh from storage inside the lock, never from noteCache: another
      // process (the MCP server, or the extension) may have written this note
      // since our cache was warmed, and a cached read-modify-write would
      // silently erase their edit.
      const raw = await this.storage.loadNoteById(params.id);
      const note = raw ? applyDefaults(raw) : undefined;

      if (!note) {
        throw new Error(`Note with id ${params.id} not found`);
      }

      if (note.isDeleted) {
        throw new Error(`Cannot update deleted note ${params.id}`);
      }

      const prevContent = note.content;

      await this.divertToProposalIfQueued(this.agentWriter, {
        op: 'edit',
        targetNoteId: note.id,
        file: note.filePath,
        lineRange: note.lineRange,
        content: params.content.trim(),
        targetContentHash: hashNoteContent(prevContent),
      });

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

      await this.recordAgentOp(this.agentWriter, {
        op: 'edit',
        noteId: note.id,
        file: note.filePath,
        prevContentHash: hashNoteContent(prevContent),
        newContentHash: hashNoteContent(note.content),
      });

      return note;
    });
  }

  /**
   * Update only the metadata fields of an existing note (type, priority, tags, expiresAt, scope).
   * Does not touch content, lineRange, contentHash, or history.
   */
  async updateNoteMetadata(
    noteId: string,
    fields: { type?: NoteType; priority?: NotePriority; tags?: string[]; expiresAt?: string; scope?: NoteScope; references?: NoteReference[]; authorType?: AuthorType },
  ): Promise<Note> {
    // Human-only path: this writes notes but is NOT routed through the trust
    // model, and it is safe today only because no MCP tool reaches it. Fail
    // loudly rather than let a future agent-facing caller silently bypass the
    // rails — that class of mistake is exactly how agents got to edit
    // human-authored notes in queue mode.
    if (this.agentWriter) {
      throw new Error('updateNoteMetadata is not available to agent writers — route the change through updateNote');
    }

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
      // Fresh read inside the lock — see updateNote.
      const raw = await this.storage.loadNoteById(noteId);
      const note = raw ? applyDefaults(raw) : undefined;

      if (!note) {
        throw new Error(`Note with id ${noteId} not found`);
      }

      if (note.isDeleted) {
        throw new Error(`Note ${noteId} is already deleted`);
      }

      await this.divertToProposalIfQueued(this.agentWriter, {
        op: 'delete',
        targetNoteId: note.id,
        file: note.filePath,
        content: '',
        targetContentHash: hashNoteContent(note.content),
      });

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

      await this.recordAgentOp(this.agentWriter, {
        op: 'delete',
        noteId: note.id,
        file: note.filePath,
      });
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
   * Like getNoteByIdGlobal but returns soft-deleted notes too. The audit-mode
   * Revert of a delete needs to see the deleted note to restore it, and Open
   * needs to jump to a deleted note's location.
   */
  async getNoteByIdIncludingDeleted(noteId: string): Promise<Note | undefined> {
    const note = await this.storage.loadNoteById(noteId);
    return note ? applyDefaults(note) : undefined;
  }

  /**
   * Restore a soft-deleted note — the reverse of deleteNote, used by Revert.
   * The note's content survived the delete, so this clears isDeleted and
   * records the restore in history. Human-only, like the other unrouted write
   * paths: fail closed for agent writers rather than let a future agent tool
   * bypass the trust model.
   */
  async undeleteNote(noteId: string): Promise<Note> {
    if (this.agentWriter) {
      throw new Error('undeleteNote is not available to agent writers');
    }
    return this.withNoteLock(noteId, async () => {
      // Fresh read inside the lock — see updateNote.
      const raw = await this.storage.loadNoteById(noteId);
      const note = raw ? applyDefaults(raw) : undefined;
      if (!note) {
        throw new Error(`Note with id ${noteId} not found`);
      }
      if (!note.isDeleted) {
        throw new Error(`Note ${noteId} is not deleted`);
      }

      note.isDeleted = false;
      note.updatedAt = new Date().toISOString();
      note.history.push({
        content: note.content,
        author: await this.gitIntegration.getAuthorName(),
        timestamp: note.updatedAt,
        action: 'edited',
      });

      await this.storage.saveNote(note);
      this.updateNoteInCache(note);
      if (this.searchManager) {
        await this.searchManager.updateIndex(note);
      }
      this.clearWorkspaceCache();
      this.emit('noteUpdated', note);
      this.emit('noteChanged', { type: 'updated', note });
      return note;
    });
  }

  /**
   * Update note positions when document changes
   * Returns notes that were updated
   */
  async updateNotePositions(document: NoteDocument): Promise<Note[]> {
    // Human-only path, like updateNoteMetadata: repositioning follows the
    // editor's document changes and is not routed through the trust model.
    if (this.agentWriter) {
      throw new Error('updateNotePositions is not available to agent writers');
    }

    const filePath = document.uri.fsPath;
    const notes = await this.getNotesForFile(filePath);
    const updatedNotes: Note[] = [];

    for (const cached of notes) {
      // Deciding *whether* a note moved is a pure read of the document, so the
      // cached copy is fine for it — and it keeps the common case (nothing
      // moved) lock-free.
      const isValid = this.hashTracker.validateContentHash(
        document,
        cached.lineRange,
        cached.contentHash
      );
      if (isValid) continue;

      const result = await this.hashTracker.findContentByHash(
        document,
        cached.contentHash,
        cached.lineRange
      );
      if (!result.found || !result.newLineRange) continue;

      const newLineRange = result.newLineRange;
      await this.withNoteLock(cached.id, async () => {
        // Re-read inside the lock before writing: another process may have
        // edited this note's content since our cache warmed, and saving the
        // cached object would erase that edit (the v0.4 lost-update bug).
        const raw = await this.storage.loadNoteById(cached.id);
        if (!raw) return;
        const note = applyDefaults(raw);
        if (note.isDeleted) return;

        note.lineRange = newLineRange;
        note.updatedAt = new Date().toISOString();
        await this.storage.saveNote(note);
        this.updateNoteInCache(note);
        updatedNotes.push(note);
      });
    }

    if (updatedNotes.length > 0) {
      this.clearWorkspaceCache();
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

  /** The human's display name — used to attribute an approved proposal. */
  async getDefaultAuthor(): Promise<string> {
    return this.gitIntegration.getAuthorName();
  }

  /**
   * Clear the cache for a specific file
   */
  clearCacheForFile(filePath: string): void {
    this.noteCache.delete(filePath);
  }

  /**
   * Clear all cached notes, including the workspace-wide caches. Callers use
   * this when notes may have changed underneath us (an external writer, e.g.
   * the MCP server or the extension's file watcher), so every cache derived
   * from storage has to go — not just the per-file one.
   */
  clearAllCache(): void {
    this.noteCache.clear();
    this.clearWorkspaceCache();
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
