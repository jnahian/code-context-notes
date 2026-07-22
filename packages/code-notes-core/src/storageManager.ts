/**
 * Storage Manager for Code Context Notes
 * Handles reading and writing note files to the .code-notes directory
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { Note, NoteStorage, NoteMetadata, NoteType, NoteScope, NotePriority, AuthorType, NoteReference } from './types.js';
import { NOTE_DEFAULTS } from './noteDefaults.js';

// Allowed values for structured fields parsed from note markdown.
// Must stay in sync with the union types in types.ts.
const VALID_TYPES: NoteType[] = ['context', 'instruction', 'warning', 'decision', 'todo', 'handoff', 'rationale'];
const VALID_SCOPES: NoteScope[] = ['line', 'function', 'class', 'file', 'directory'];
const VALID_PRIORITIES: NotePriority[] = ['low', 'normal', 'high', 'critical'];
const VALID_AUTHOR_TYPES: AuthorType[] = ['human', 'agent'];
const VALID_REFERENCE_KINDS = ['note', 'pr', 'issue', 'commit', 'test', 'url'];

/**
 * StorageManager implements the NoteStorage interface
 * Manages persistence of notes as markdown files
 */
export class StorageManager implements NoteStorage {
  private workspaceRoot: string;
  private storageDirectory: string;

  constructor(workspaceRoot: string, storageDirectory: string = '.code-notes') {
    this.workspaceRoot = workspaceRoot;
    this.storageDirectory = storageDirectory;
  }

  /**
   * Get the full path to the storage directory
   */
  private getStoragePath(): string {
    return path.join(this.workspaceRoot, this.storageDirectory);
  }

  /**
   * Get the note file path based on note ID
   * Example: noteId abc123 -> .code-notes/abc123.md
   */
  getNoteFilePath(noteId: string): string {
    const noteFileName = `${noteId}.md`;
    return path.join(this.getStoragePath(), noteFileName);
  }

  /**
   * Get all note files in the storage directory
   */
  async getAllNoteFiles(): Promise<string[]> {
    const storagePath = this.getStoragePath();
    try {
      const files = await fs.readdir(storagePath);
      return files.filter(f => f.endsWith('.md')).map(f => path.join(storagePath, f));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to read storage directory: ${error}`);
    }
  }

  /**
   * Check if the storage directory exists
   */
  async storageExists(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.getStoragePath());
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Create the storage directory if it doesn't exist
   */
  async createStorage(): Promise<void> {
    const storagePath = this.getStoragePath();
    try {
      const created = await fs.mkdir(storagePath, { recursive: true });
      // ponytail: only on first creation, so deleting the file keeps it deleted
      if (created !== undefined) {
        await fs.writeFile(
          path.join(storagePath, '.gitignore'),
          [
            '# Code Context Notes stores its notes here, untracked by default.',
            '# Delete this file if you want to commit your notes and share them with your team.',
            '*',
            ''
          ].join('\n'),
          'utf-8'
        );
      }
    } catch (error) {
      throw new Error(`Failed to create storage directory: ${error}`);
    }
  }

  /**
   * Ensure the parent directory for a note file exists
   */
  private async ensureNoteDirectory(noteFilePath: string): Promise<void> {
    const directory = path.dirname(noteFilePath);
    try {
      await fs.mkdir(directory, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create note directory: ${error}`);
    }
  }

  /**
   * Save a note to storage
   * Converts the note to markdown and writes to file
   * Each note is saved to a separate file named by its note ID
   */
  async saveNote(note: Note): Promise<void> {
    const noteFilePath = this.getNoteFilePath(note.id);

    // Ensure storage directory exists
    await this.createStorage();

    // Convert note to markdown
    const markdown = this.noteToMarkdown(note);

    // Write to file
    try {
      await fs.writeFile(noteFilePath, markdown, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save note: ${error}`);
    }
  }

  /**
   * Load all notes for a given source file (excluding deleted notes)
   * Searches through all note files to find notes for the specified file
   */
  async loadNotes(filePath: string): Promise<Note[]> {
    const allNotes = await this.loadAllNotes(filePath);
    return allNotes.filter(n => !n.isDeleted);
  }

  /**
   * Load ALL notes for a given source file (including deleted notes)
   * Searches through all note files to find notes for the specified file
   */
  async loadAllNotes(filePath: string): Promise<Note[]> {
    const allNoteFiles = await this.getAllNoteFiles();
    const notes: Note[] = [];

    for (const noteFile of allNoteFiles) {
      try {
        const content = await fs.readFile(noteFile, 'utf-8');
        const note = this.markdownToNote(content);

        // Include all notes for the specified file (including deleted)
        if (note && note.filePath === filePath) {
          notes.push(note);
        }
      } catch (error) {
        console.error(`Failed to load note from ${noteFile}:`, error);
        // Continue with other files
      }
    }

    return notes;
  }

  /**
   * Load every note in the workspace, capturing per-file parse failures
   * instead of silently dropping them. Used by the workspace-wide export
   * loader (INDEX.json's errors[] field).
   */
  async loadAllNotesAndErrors(): Promise<{ notes: Note[]; errors: { file: string; message: string }[] }> {
    const allNoteFiles = await this.getAllNoteFiles();
    const notes: Note[] = [];
    const errors: { file: string; message: string }[] = [];

    for (const noteFile of allNoteFiles) {
      try {
        const content = await fs.readFile(noteFile, 'utf-8');
        const note = this.markdownToNote(content);
        if (note) {
          notes.push(note);
        } else {
          errors.push({ file: path.basename(noteFile), message: 'markdownToNote returned null (missing required fields)' });
        }
      } catch (error: any) {
        errors.push({ file: path.basename(noteFile), message: error?.message ?? String(error) });
      }
    }

    return { notes, errors };
  }

  /**
   * Delete a note from storage
   * This actually updates the file to mark the note as deleted in history
   */
  async deleteNote(noteId: string, filePath: string): Promise<void> {
    const notes = await this.loadNotes(filePath);
    const note = notes.find(n => n.id === noteId);

    if (!note) {
      throw new Error(`Note with id ${noteId} not found`);
    }

    note.isDeleted = true;
    note.updatedAt = new Date().toISOString();

    // Add deletion entry to history
    note.history.push({
      content: note.content,
      author: note.author,
      timestamp: note.updatedAt,
      action: 'deleted'
    });

    // Save updated note (will save to file named by note ID)
    await this.saveNote(note);
  }

  /**
   * Load a single note by its ID
   */
  async loadNoteById(noteId: string): Promise<Note | null> {
    const noteFilePath = this.getNoteFilePath(noteId);

    try {
      const content = await fs.readFile(noteFilePath, 'utf-8');
      return this.markdownToNote(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to load note: ${error}`);
    }
  }

  /**
   * Convert a Note object to markdown format
   * Stores complete history for this content hash
   */
  private noteToMarkdown(note: Note): string {
    const lines: string[] = [];

    // Header with source file info
    lines.push(`# Code Context Note`);
    lines.push('');
    lines.push(`**File:** ${note.filePath}`);
    lines.push(`**Lines:** ${note.lineRange.start + 1}-${note.lineRange.end + 1}`);
    lines.push(`**Content Hash:** ${note.contentHash}`);
    lines.push('');

    // Metadata
    lines.push(`## Note: ${note.id}`);
    // Format discriminator. v2 length-delimits the content and history-entry
    // regions so agent-controlled text can never reproduce a structural
    // delimiter and be re-parsed as one. A note without this marker is read
    // by the untouched v1 parser.
    lines.push(`**Format:** 2`);
    lines.push(`**Author:** ${note.author}`);
    lines.push(`**Created:** ${note.createdAt}`);
    lines.push(`**Updated:** ${note.updatedAt}`);

    // Structured fields — omitted if equal to default for compactness
    if (note.type && note.type !== NOTE_DEFAULTS.type) {
      lines.push(`**Type:** ${note.type}`);
    }
    if (note.scope && note.scope !== NOTE_DEFAULTS.scope) {
      lines.push(`**Scope:** ${note.scope}`);
    }
    if (note.priority && note.priority !== NOTE_DEFAULTS.priority) {
      lines.push(`**Priority:** ${note.priority}`);
    }
    if (note.tags && note.tags.length > 0) {
      lines.push(`**Tags:** ${note.tags.join(', ')}`);
    }
    if (note.authorType && note.authorType !== NOTE_DEFAULTS.authorType) {
      lines.push(`**AuthorType:** ${note.authorType}`);
    }
    if (note.approvedBy) {
      lines.push(`**ApprovedBy:** ${note.approvedBy}`);
    }
    if (note.expiresAt) {
      lines.push(`**ExpiresAt:** ${note.expiresAt}`);
    }
    if (note.references && note.references.length > 0) {
      lines.push(`**References:** ${JSON.stringify(note.references)}`);
    }

    if (note.isDeleted) {
      lines.push(`**Status:** DELETED`);
    }
    // The parser reads exactly this many lines as content, so a "## Edit
    // History" (or any delimiter) inside the content is just content.
    lines.push(`**Content Lines:** ${note.content.split('\n').length}`);
    lines.push('');

    // Current content
    lines.push('## Current Content');
    lines.push('');
    lines.push(note.content);
    lines.push('');

    // Full edit history for this content hash
    if (note.history.length > 0) {
      lines.push('## Edit History');
      lines.push('');
      lines.push('Complete chronological history of all edits to this code location:');
      lines.push('');
      for (const entry of note.history) {
        lines.push(`### ${entry.timestamp} - ${entry.author} - ${entry.action}`);
        lines.push('');
        if (entry.content) {
          // The count on the fence makes the entry length-delimited too, so a
          // ``` inside an edit's body can't break out and forge a later entry.
          lines.push('```lines=' + entry.content.split('\n').length);
          lines.push(entry.content);
          lines.push('```');
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Parse markdown content back into a single Note object
   */
  private markdownToNote(markdown: string): Note | null {
    const lines = markdown.split('\n');
    // Detect the format before the content section: a v1 note's content lives
    // after '## Current Content', so a content line can never masquerade as
    // the marker. Absent the marker, the untouched v1 parser handles it.
    let isV2 = false;
    for (const line of lines) {
      if (line === '## Current Content') break;
      if (line === '**Format:** 2') { isV2 = true; break; }
    }
    return isV2 ? this.parseNoteV2(lines) : this.parseNoteV1(lines);
  }

  /** Best-effort parse of one header/metadata line. Shared by both format
   *  parsers; unrecognized lines are ignored. Never handles content or
   *  history — those regions are the parsers' own concern. */
  private applyMetadataLine(note: Partial<Note>, line: string): void {
    if (line.startsWith('**File:**')) {
      note.filePath = line.substring(9).trim();
    } else if (line.startsWith('**Lines:**')) {
      const range = line.substring(10).trim().split('-');
      note.lineRange = { start: parseInt(range[0]) - 1, end: parseInt(range[1]) - 1 };
    } else if (line.startsWith('**Content Hash:**') && !note.contentHash) {
      note.contentHash = line.substring(17).trim();
    } else if (line.startsWith('## Note: ')) {
      note.id = line.substring(9).trim();
    } else if (line.startsWith('**Author:**')) {
      note.author = line.substring(11).trim();
    } else if (line.startsWith('**Created:**')) {
      note.createdAt = line.substring(12).trim();
    } else if (line.startsWith('**Updated:**')) {
      note.updatedAt = line.substring(12).trim();
    } else if (line.startsWith('**Status:** DELETED')) {
      note.isDeleted = true;
    } else if (line.startsWith('**Type:**')) {
      const v = line.substring(9).trim();
      if ((VALID_TYPES as string[]).includes(v)) note.type = v as NoteType;
      else console.warn(`[code-notes] Ignoring invalid Type for note: ${v}`);
    } else if (line.startsWith('**Scope:**')) {
      const v = line.substring(10).trim();
      if ((VALID_SCOPES as string[]).includes(v)) note.scope = v as NoteScope;
      else console.warn(`[code-notes] Ignoring invalid Scope for note: ${v}`);
    } else if (line.startsWith('**Priority:**')) {
      const v = line.substring(13).trim();
      if ((VALID_PRIORITIES as string[]).includes(v)) note.priority = v as NotePriority;
      else console.warn(`[code-notes] Ignoring invalid Priority for note: ${v}`);
    } else if (line.startsWith('**Tags:**')) {
      const raw = line.substring(9).trim();
      note.tags = raw ? raw.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
    } else if (line.startsWith('**ApprovedBy:**')) {
      note.approvedBy = line.substring(15).trim();
    } else if (line.startsWith('**AuthorType:**')) {
      const v = line.substring(15).trim();
      if ((VALID_AUTHOR_TYPES as string[]).includes(v)) note.authorType = v as AuthorType;
      else console.warn(`[code-notes] Ignoring invalid AuthorType for note: ${v}`);
    } else if (line.startsWith('**ExpiresAt:**')) {
      note.expiresAt = line.substring(14).trim();
    } else if (line.startsWith('**References:**')) {
      const raw = line.substring(15).trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          note.references = Array.isArray(parsed)
            ? parsed.filter((r: unknown): r is NoteReference =>
                !!r && typeof r === 'object' &&
                typeof (r as NoteReference).value === 'string' &&
                VALID_REFERENCE_KINDS.includes((r as NoteReference).kind))
            : [];
        } catch {
          console.warn(`[code-notes] Failed to parse References for note: ${raw}`);
          note.references = [];
        }
      }
    }
  }

  private finalizeNote(note: Partial<Note>): Note | null {
    if (note.isDeleted === undefined) note.isDeleted = false;
    return this.isValidNote(note) ? (note as Note) : null;
  }

  /**
   * Legacy parser for notes written before the v2 length-delimited format.
   * Delimiter-based, and kept intact for back-compat — do not extend it; new
   * fields belong in the v2 path. Its content/history regions are spoofable by
   * content that reproduces a delimiter, which is exactly why v2 exists; v1 is
   * only ever produced by pre-v0.5 code, and any note re-saved migrates to v2.
   */
  private parseNoteV1(lines: string[]): Note | null {
    const note: Partial<Note> = { history: [] };
    let inContent = false;
    let inHistory = false;
    let contentLines: string[] = [];
    let historyContentLines: string[] = [];
    let currentHistoryEntry: any = null;

    for (const line of lines) {
      if (inContent) {
        if (line === '## Edit History') { inContent = false; inHistory = true; }
        else contentLines.push(line);
        continue;
      }
      if (inHistory) {
        if (line.startsWith('### ')) {
          if (currentHistoryEntry && historyContentLines.length > 0) {
            currentHistoryEntry.content = historyContentLines.join('\n').trim();
          }
          const match = line.substring(4).match(/^(.+?) - (.+?) - (.+)$/);
          if (match) {
            currentHistoryEntry = { timestamp: match[1], author: match[2], action: match[3] as any, content: '' };
            note.history!.push(currentHistoryEntry);
            historyContentLines = [];
          }
        } else if (currentHistoryEntry && line !== '```') {
          if (line || historyContentLines.length > 0) historyContentLines.push(line);
        }
        continue;
      }
      if (line === '## Current Content') { inContent = true; inHistory = false; contentLines = []; continue; }
      if (line === '## Edit History') { inContent = false; inHistory = true; continue; }
      this.applyMetadataLine(note, line);
    }

    if (currentHistoryEntry && historyContentLines.length > 0) {
      currentHistoryEntry.content = historyContentLines.join('\n').trim();
    }
    if (contentLines.length > 0) note.content = contentLines.join('\n').trim();
    return this.finalizeNote(note);
  }

  /**
   * v2 parser. Content and every history entry are length-delimited: the
   * parser reads exactly the declared number of lines, so agent-controlled
   * text can contain any delimiter and is still captured verbatim.
   */
  private parseNoteV2(lines: string[]): Note | null {
    const note: Partial<Note> = { history: [] };
    let contentLineCount = 0;
    let i = 0;

    let sawContentSection = false;
    for (; i < lines.length; i++) {
      const line = lines[i];
      if (line === '## Current Content') { sawContentSection = true; break; }
      if (line === '**Format:** 2') continue;
      if (line.startsWith('**Content Lines:**')) {
        contentLineCount = parseInt(line.substring(18).trim(), 10) || 0;
        continue;
      }
      this.applyMetadataLine(note, line);
    }

    // Only set content if the section was actually present. An empty content
    // section is a valid empty note; a *missing* one is a corrupt file, and
    // leaving content undefined lets isValidNote reject it rather than
    // silently accept a blank note (or, worse, drop a real one on reload).
    if (sawContentSection) {
      // '## Current Content', then one blank separator, then exactly N lines.
      i += 2;
      note.content = lines.slice(i, i + contentLineCount).join('\n');
      i += contentLineCount;
    }

    while (i < lines.length && lines[i] !== '## Edit History') i++;
    i++;
    while (i < lines.length) {
      const header = lines[i].startsWith('### ')
        ? lines[i].substring(4).match(/^(.+?) - (.+?) - (.+)$/)
        : null;
      if (!header) { i++; continue; }
      const entry: any = { timestamp: header[1], author: header[2], action: header[3] as any, content: '' };
      note.history!.push(entry);
      i++;
      while (i < lines.length && !lines[i].startsWith('```lines=') && !lines[i].startsWith('### ')) i++;
      const fence = i < lines.length ? lines[i].match(/^```lines=(\d+)$/) : null;
      if (fence) {
        const m = parseInt(fence[1], 10) || 0;
        entry.content = lines.slice(i + 1, i + 1 + m).join('\n');
        i += m + 2; // opener + m content lines + closing ```
      }
    }

    return this.finalizeNote(note);
  }

  /**
   * Type guard to check if a partial note is valid
   */
  private isValidNote(note: Partial<Note>): note is Note {
    return !!(
      note.id &&
      // Empty-string content is a valid (contentless) note; only a missing
      // content section — undefined — is invalid. The extension supports
      // notes whose content is filled in later, and they must survive reload.
      note.content !== undefined &&
      note.author &&
      note.filePath &&
      note.lineRange &&
      note.contentHash &&
      note.createdAt &&
      note.updatedAt &&
      note.history
    );
  }
}
