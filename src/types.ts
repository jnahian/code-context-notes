/**
 * Core data types for Code Context Notes extension
 */

/**
 * Represents a line range in a document
 */
export interface LineRange {
  /** Starting line number (0-based) */
  start: number;
  /** Ending line number (0-based, inclusive) */
  end: number;
}

/**
 * Action type for note history entries
 */
export type NoteAction = 'created' | 'edited' | 'deleted';

/**
 * Type of note — drives prioritization in agent-facing exports
 */
export type NoteType =
  | 'context'      // default: explanatory background
  | 'instruction'  // directive: agent/human MUST follow
  | 'warning'      // hazard: don't do X
  | 'decision'     // architectural decision + rationale
  | 'todo'         // outstanding work
  | 'handoff'      // "next session pick up here" (often agent-authored)
  | 'rationale';   // why this code exists (links to PRs/commits)

/**
 * Scope of applicability for a note
 */
export type NoteScope =
  | 'line'      // default — current behavior
  | 'function'
  | 'class'
  | 'file'
  | 'directory';

/**
 * Author kind — explicit agent attribution
 */
export type AuthorType = 'human' | 'agent';

/**
 * Priority used for digest ordering and `critical` always-include behavior
 */
export type NotePriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Reference to an external artifact (PR, commit, test, etc.)
 */
export interface NoteReference {
  kind: 'note' | 'pr' | 'issue' | 'commit' | 'test' | 'url';
  value: string;
  label?: string;
}

/**
 * Represents a single history entry for a note
 */
export interface NoteHistoryEntry {
  /** The content of the note at this point in history */
  content: string;
  /** Author who made this change */
  author: string;
  /** ISO 8601 timestamp of when this change was made */
  timestamp: string;
  /** Type of action performed */
  action: NoteAction;
}

/**
 * Represents a complete note with all metadata
 */
export interface Note {
  /** Unique identifier for the note */
  id: string;
  /** Current content of the note (markdown) */
  content: string;
  /** Author who created the note */
  author: string;
  /** Absolute path to the file this note is attached to */
  filePath: string;
  /** Line range this note is attached to */
  lineRange: LineRange;
  /** Hash of the content in the line range for tracking */
  contentHash: string;
  /** ISO 8601 timestamp of when the note was created */
  createdAt: string;
  /** ISO 8601 timestamp of when the note was last updated */
  updatedAt: string;
  /** Complete history of all changes to this note */
  history: NoteHistoryEntry[];
  /** Whether this note has been deleted (soft delete) */
  isDeleted?: boolean;
  // NEW (all optional for back-compat — see noteDefaults.applyDefaults)
  type?: NoteType;
  tags?: string[];
  scope?: NoteScope;
  references?: NoteReference[];
  expiresAt?: string;          // ISO 8601
  authorType?: AuthorType;
  priority?: NotePriority;
}

/**
 * Metadata stored in the markdown file header
 */
export interface NoteMetadata {
  /** Unique identifier for the note */
  id: string;
  /** Starting line number */
  lineStart: number;
  /** Ending line number */
  lineEnd: number;
  /** Hash of the original content */
  contentHash: string;
  /** Author who created the note */
  author: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

/**
 * Configuration options for the extension
 */
export interface ExtensionConfig {
  /** Directory where notes are stored (relative to workspace root) */
  storageDirectory: string;
  /** Override for author name (empty string uses git/system username) */
  authorName: string;
  /** Whether to show CodeLens indicators */
  showCodeLens: boolean;
}

/**
 * Result of a content hash lookup operation
 */
export interface ContentHashResult {
  /** Whether the content was found */
  found: boolean;
  /** New line range if content was found at a different location */
  newLineRange?: LineRange;
  /** Similarity score (0-1) if partial match */
  similarity?: number;
}

/**
 * Parameters for creating a new note
 */
export interface CreateNoteParams {
  /** The file path where the note should be attached */
  filePath: string;
  /** The line range to attach the note to */
  lineRange: LineRange;
  /** The note content (markdown) */
  content: string;
  /** Optional author override */
  author?: string;
}

/**
 * Parameters for updating an existing note
 */
export interface UpdateNoteParams {
  /** The note ID to update */
  id: string;
  /** The new content */
  content: string;
  /** Optional author override */
  author?: string;
}

/**
 * Storage interface for note persistence
 */
export interface NoteStorage {
  /** Save a note to storage */
  saveNote(note: Note): Promise<void>;
  /** Load all notes for a given file (excluding deleted notes) */
  loadNotes(filePath: string): Promise<Note[]>;
  /** Load ALL notes for a given file (including deleted notes) */
  loadAllNotes(filePath: string): Promise<Note[]>;
  /** Load a single note by its ID */
  loadNoteById(noteId: string): Promise<Note | null>;
  /** Delete a note from storage */
  deleteNote(noteId: string, filePath: string): Promise<void>;
  /** Check if storage directory exists */
  storageExists(): Promise<boolean>;
  /** Create storage directory */
  createStorage(): Promise<void>;
}

/**
 * Thread state for managing multiple notes on a single line
 */
export interface MultiNoteThreadState {
  /** Array of note IDs at this position */
  noteIds: string[];
  /** Index of currently displayed note (0-based) */
  currentIndex: number;
  /** Shared line range for all notes in this thread */
  lineRange: LineRange;
  /** File path for this thread */
  filePath: string;
}
