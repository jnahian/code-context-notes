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
    lines.push(`**Author:** ${note.author}`);
    lines.push(`**Created:** ${note.createdAt}`);
    lines.push(`**Updated:** ${note.updatedAt}`);
    if (note.isDeleted) {
      lines.push(`**Status:** DELETED`);
    }
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
          lines.push('```');
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
    const note: Partial<Note> = {
      history: []
    };

    let inContent = false;
    let inHistory = false;
    let contentLines: string[] = [];
    let historyContentLines: string[] = [];
    let currentHistoryEntry: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Parse file path
      if (line.startsWith('**File:**')) {
        note.filePath = line.substring(9).trim();
      }
      // Parse line range
      else if (line.startsWith('**Lines:**')) {
        const range = line.substring(10).trim().split('-');
        note.lineRange = {
          start: parseInt(range[0]) - 1,
          end: parseInt(range[1]) - 1
        };
      }
      // Parse content hash (at top level)
      else if (line.startsWith('**Content Hash:**') && !note.contentHash) {
        note.contentHash = line.substring(17).trim();
      }
      // Parse note ID
      else if (line.startsWith('## Note: ')) {
        note.id = line.substring(9).trim();
      }
      // Parse metadata
      else if (line.startsWith('**Author:**')) {
        note.author = line.substring(11).trim();
      }
      else if (line.startsWith('**Created:**')) {
        note.createdAt = line.substring(12).trim();
      }
      else if (line.startsWith('**Updated:**')) {
        note.updatedAt = line.substring(12).trim();
      }
      else if (line.startsWith('**Status:** DELETED')) {
        note.isDeleted = true;
      }
      // Parse current content section
      else if (line === '## Current Content') {
        inContent = true;
        inHistory = false;
        contentLines = [];
      }
      // Parse history section
      else if (line === '## Edit History') {
        inContent = false;
        inHistory = true;
      }
      // Content lines (capture everything including blank lines)
      else if (inContent && !line.startsWith('##')) {
        contentLines.push(line);
      }
      // History entry header
      else if (inHistory && line.startsWith('### ')) {
        // Save previous history entry if exists
        if (currentHistoryEntry && historyContentLines.length > 0) {
          currentHistoryEntry.content = historyContentLines.join('\n').trim();
        }

        // Parse: ### timestamp - author - action
        const match = line.substring(4).match(/^(.+?) - (.+?) - (.+)$/);
        if (match) {
          currentHistoryEntry = {
            timestamp: match[1],
            author: match[2],
            action: match[3] as any,
            content: ''
          };
          note.history!.push(currentHistoryEntry);
          historyContentLines = [];
        }
      }
      // History content in code block
      else if (inHistory && currentHistoryEntry) {
        if (line === '```') {
          // Skip code fence markers
          continue;
        }
        if (line || historyContentLines.length > 0) {
          historyContentLines.push(line);
        }
      }
    }

    // Save last history entry content
    if (currentHistoryEntry && historyContentLines.length > 0) {
      currentHistoryEntry.content = historyContentLines.join('\n').trim();
    }

    // Set final content
    if (contentLines.length > 0) {
      note.content = contentLines.join('\n').trim();
    }

    // Set default for isDeleted if not specified
    if (note.isDeleted === undefined) {
      note.isDeleted = false;
    }

    return this.isValidNote(note) ? (note as Note) : null;
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
