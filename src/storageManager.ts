/**
 * Storage Manager for Code Context Notes
 * Handles reading and writing note files to the .code-notes directory
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Note, NoteStorage, NoteMetadata } from './types';

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
   * Map a source file path to its corresponding note file path
   * Example: src/app.ts -> .code-notes/src/app.ts.md
   */
  getNoteFilePath(sourceFilePath: string): string {
    // Get relative path from workspace root
    const relativePath = path.relative(this.workspaceRoot, sourceFilePath);
    // Add .md extension
    const noteFileName = `${relativePath}.md`;
    // Join with storage directory
    return path.join(this.getStoragePath(), noteFileName);
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
      await fs.mkdir(storagePath, { recursive: true });
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
   */
  async saveNote(note: Note): Promise<void> {
    const noteFilePath = this.getNoteFilePath(note.filePath);

    // Ensure storage directory exists
    await this.ensureNoteDirectory(noteFilePath);

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
   * Load all notes for a given source file
   */
  async loadNotes(filePath: string): Promise<Note[]> {
    const noteFilePath = this.getNoteFilePath(filePath);

    try {
      const content = await fs.readFile(noteFilePath, 'utf-8');
      return this.markdownToNotes(content, filePath);
    } catch (error: any) {
      // If file doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to load notes: ${error}`);
    }
  }

  /**
   * Delete a note from storage
   * This actually updates the file to mark the note as deleted in history
   */
  async deleteNote(noteId: string, filePath: string): Promise<void> {
    const notes = await this.loadNotes(filePath);
    const noteIndex = notes.findIndex(n => n.id === noteId);

    if (noteIndex === -1) {
      throw new Error(`Note with id ${noteId} not found`);
    }

    const note = notes[noteIndex];
    note.isDeleted = true;
    note.updatedAt = new Date().toISOString();

    // Add deletion entry to history
    note.history.push({
      content: note.content,
      author: note.author,
      timestamp: note.updatedAt,
      action: 'deleted'
    });

    // Save updated note
    await this.saveNote(note);
  }

  /**
   * Convert a Note object to markdown format
   */
  private noteToMarkdown(note: Note): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Notes for ${path.basename(note.filePath)}`);
    lines.push('');

    // Note section
    lines.push(`## Note: ${note.id}`);
    lines.push(`**Lines:** ${note.lineRange.start + 1}-${note.lineRange.end + 1}`);
    lines.push(`**Author:** ${note.author}`);
    lines.push(`**Created:** ${note.createdAt}`);
    lines.push(`**Updated:** ${note.updatedAt}`);
    lines.push(`**Content Hash:** ${note.contentHash}`);
    if (note.isDeleted) {
      lines.push(`**Status:** DELETED`);
    }
    lines.push('');

    // Current content
    lines.push('### Current Content');
    lines.push(note.content);
    lines.push('');

    // History
    if (note.history.length > 0) {
      lines.push('### History');
      lines.push('');
      for (const entry of note.history) {
        lines.push(`- **${entry.timestamp}** - ${entry.author} - ${entry.action}`);
        if (entry.content && entry.content !== note.content) {
          lines.push(`  > ${entry.content.replace(/\n/g, '\n  > ')}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Parse markdown content back into Note objects
   */
  private markdownToNotes(markdown: string, filePath: string): Note[] {
    const notes: Note[] = [];
    const lines = markdown.split('\n');

    let currentNote: Partial<Note> | null = null;
    let inContent = false;
    let inHistory = false;
    let contentLines: string[] = [];
    let historyEntry: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Start of a new note
      if (line.startsWith('## Note: ')) {
        // Save previous note if exists
        if (currentNote && contentLines.length > 0) {
          currentNote.content = contentLines.join('\n').trim();
          if (this.isValidNote(currentNote)) {
            notes.push(currentNote as Note);
          }
        }

        // Start new note
        currentNote = {
          id: line.substring(9).trim(),
          filePath,
          history: []
        };
        contentLines = [];
        inContent = false;
        inHistory = false;
        continue;
      }

      if (!currentNote) {
        continue;
      }

      // Parse metadata
      if (line.startsWith('**Lines:**')) {
        const range = line.substring(10).trim().split('-');
        currentNote.lineRange = {
          start: parseInt(range[0]) - 1,
          end: parseInt(range[1]) - 1
        };
      } else if (line.startsWith('**Author:**')) {
        currentNote.author = line.substring(11).trim();
      } else if (line.startsWith('**Created:**')) {
        currentNote.createdAt = line.substring(12).trim();
      } else if (line.startsWith('**Updated:**')) {
        currentNote.updatedAt = line.substring(12).trim();
      } else if (line.startsWith('**Content Hash:**')) {
        currentNote.contentHash = line.substring(17).trim();
      } else if (line.startsWith('**Status:** DELETED')) {
        currentNote.isDeleted = true;
      } else if (line === '### Current Content') {
        inContent = true;
        inHistory = false;
        contentLines = [];
      } else if (line === '### History') {
        inContent = false;
        inHistory = true;
      } else if (inContent && line.trim()) {
        contentLines.push(line);
      } else if (inHistory && line.startsWith('- **')) {
        // Parse history entry: - **timestamp** - author - action
        const match = line.match(/- \*\*(.+?)\*\* - (.+?) - (.+)/);
        if (match) {
          historyEntry = {
            timestamp: match[1],
            author: match[2],
            action: match[3] as any,
            content: ''
          };
          currentNote.history!.push(historyEntry);
        }
      } else if (inHistory && line.startsWith('  > ') && historyEntry) {
        // History content
        historyEntry.content += line.substring(4) + '\n';
      }
    }

    // Save last note
    if (currentNote && contentLines.length > 0) {
      currentNote.content = contentLines.join('\n').trim();
      if (this.isValidNote(currentNote)) {
        notes.push(currentNote as Note);
      }
    }

    return notes;
  }

  /**
   * Type guard to check if a partial note is valid
   */
  private isValidNote(note: Partial<Note>): note is Note {
    return !!(
      note.id &&
      note.content &&
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
