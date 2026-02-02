/**
 * CodeLens Provider for Code Context Notes
 * Displays visual indicators above code with notes
 */

import * as vscode from 'vscode';
import { Note } from './types.js';
import { NoteManager } from './noteManager.js';

/**
 * CodeLensProvider displays indicators above lines with notes
 */
export class CodeNotesLensProvider implements vscode.CodeLensProvider {
  private noteManager: NoteManager;
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(noteManager: NoteManager) {
    this.noteManager = noteManager;
  }

  /**
   * Provide CodeLens items for a document
   */
  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    try {
      const editor = vscode.window.activeTextEditor;

      // Get all notes for this file
      const notes = await this.noteManager.getNotesForFile(document.uri.fsPath);

      // Group notes by line to handle multiple notes per line
      const notesByLine = new Map<number, Note[]>();
      for (const note of notes) {
        const lineStart = note.lineRange.start;
        if (!notesByLine.has(lineStart)) {
          notesByLine.set(lineStart, []);
        }
        notesByLine.get(lineStart)!.push(note);
      }

      // Create CodeLens for each line with notes
      for (const [lineStart, lineNotes] of notesByLine) {
        if (token.isCancellationRequested) {
          break;
        }

        // Create range for the CodeLens (line before the note)
        const range = new vscode.Range(
          lineStart,
          0,
          lineStart,
          0
        );

        // Create CodeLens with command to view the note(s)
        const viewNoteLens = new vscode.CodeLens(range, {
          title: this.formatCodeLensTitle(lineNotes),
          command: 'codeContextNotes.viewNote',
          arguments: [lineNotes[0].id, document.uri.fsPath]
        });

        codeLenses.push(viewNoteLens);

        // Add "Add Note" button when notes exist (for multiple notes on same line)
        const addNoteLens = new vscode.CodeLens(range, {
          title: '➕ Add Note',
          command: 'codeContextNotes.addNoteToLine',
          arguments: [{ filePath: document.uri.fsPath, lineStart }]
        });

        codeLenses.push(addNoteLens);
      }

      // TODO: Re-enable this later with better control (configuration setting)
      // Add "Add Note" CodeLens above selection if there's a multi-line selection
      // if (editor && editor.document === document && !editor.selection.isEmpty) {
      //   const selection = editor.selection;
      //   const isMultiLineSelection = selection.end.line - selection.start.line > 0;

      //   // Only show codelens for multi-line selections (at least 2 lines)
      //   if (!isMultiLineSelection) {
      //     return codeLenses;
      //   }

      //   const selectionStart = selection.start.line;

      //   // Check if there's already a note at this position
      //   const notesAtSelection = await this.noteManager.getNotesAtPosition(
      //     document.uri.fsPath,
      //     selectionStart
      //   );

      //   if (notesAtSelection.length === 0) {
      //     const addNoteRange = new vscode.Range(selectionStart, 0, selectionStart, 0);
      //     const addNoteLens = new vscode.CodeLens(addNoteRange, {
      //       title: '➕ Add Note',
      //       command: 'codeContextNotes.addNoteViaCodeLens',
      //       arguments: [document, selection]
      //     });
      //     codeLenses.push(addNoteLens);
      //   }
      // }
    } catch (error) {
      console.error('Error providing CodeLenses:', error);
    }

    return codeLenses;
  }

  /**
   * Strip markdown formatting from text
   */
  private stripMarkdown(text: string): string {
    return text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove bold/italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/___(.+?)___/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Remove strikethrough
      .replace(/~~(.+?)~~/g, '$1')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
      // Remove headings
      .replace(/^#{1,6}\s+/gm, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove list markers
      .replace(/^[\*\-\+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[\*\-_]{3,}$/gm, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Format the CodeLens title to show note preview (supports multiple notes)
   */
  private formatCodeLensTitle(notes: Note[]): string {
    if (notes.length === 1) {
      const note = notes[0];

      // Format tags for display
      let tagsDisplay = '';
      if (note.tags && note.tags.length > 0) {
        tagsDisplay = note.tags.map(tag => `[${tag}]`).join(' ') + ' ';
      }

      // Strip markdown formatting and get first line
      const plainText = this.stripMarkdown(note.content);
      const firstLine = plainText.split('\n')[0];

      // Calculate available space for preview (account for tags) with minimum guard
      const maxPreviewLength = Math.max(10, 50 - tagsDisplay.length);
      const preview = firstLine.length > maxPreviewLength
        ? firstLine.substring(0, maxPreviewLength - 3) + '...'
        : firstLine;

      // Format: "📝 [TODO] [bug] Note: preview text (by author)"
      return `📝 ${tagsDisplay}Note: ${preview} (${note.author})`;
    } else {
      // Multiple notes - show count and authors
      const uniqueAuthors = [...new Set(notes.map(n => n.author))];
      const authorsDisplay = uniqueAuthors.length > 2
        ? `${uniqueAuthors.slice(0, 2).join(', ')} +${uniqueAuthors.length - 2} more`
        : uniqueAuthors.join(', ');

      // Collect all unique tags from all notes
      const allTags = new Set<string>();
      notes.forEach(note => {
        if (note.tags) {
          note.tags.forEach(tag => allTags.add(tag));
        }
      });

      // Format tags for display (limit to first 2 tags if many)
      let tagsDisplay = '';
      if (allTags.size > 0) {
        const tagArray = Array.from(allTags);
        const displayTags = tagArray.slice(0, 2);
        tagsDisplay = displayTags.map(tag => `[${tag}]`).join(' ');
        if (tagArray.length > 2) {
          tagsDisplay += ` +${tagArray.length - 2}`;
        }
        tagsDisplay += ' ';
      }

      // Get preview from first note
      const plainText = this.stripMarkdown(notes[0].content);
      const firstLine = plainText.split('\n')[0];
      const maxPreviewLength = Math.max(10, 35 - tagsDisplay.length);
      const preview = firstLine.length > maxPreviewLength
        ? firstLine.substring(0, maxPreviewLength - 3) + '...'
        : firstLine;

      // Format: "📝 [TODO] [bug] Notes (3): preview... (by author1, author2)"
      return `📝 ${tagsDisplay}Notes (${notes.length}): ${preview} (${authorsDisplay})`;
    }
  }

  /**
   * Refresh CodeLenses for all documents
   */
  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Dispose the provider
   */
  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}
