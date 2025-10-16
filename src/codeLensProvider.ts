/**
 * CodeLens Provider for Code Context Notes
 * Displays visual indicators above code with notes
 */

import * as vscode from 'vscode';
import { Note } from './types';
import { NoteManager } from './noteManager';

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

      // Create CodeLens for each note
      for (const note of notes) {
        if (token.isCancellationRequested) {
          break;
        }

        // Create range for the CodeLens (line before the note)
        const range = new vscode.Range(
          note.lineRange.start,
          0,
          note.lineRange.start,
          0
        );

        // Create CodeLens with command to view the note
        const codeLens = new vscode.CodeLens(range, {
          title: this.formatCodeLensTitle(note),
          command: 'codeContextNotes.viewNote',
          arguments: [note.id, document.uri.fsPath]
        });

        codeLenses.push(codeLens);
      }

      // Add "Add Note" CodeLens above selection if there's a selection
      if (editor && editor.document === document && !editor.selection.isEmpty) {
        const selection = editor.selection;
        const selectionStart = selection.start.line;

        // Check if there's already a note at this position
        const existingNote = notes.find(n =>
          selectionStart >= n.lineRange.start && selectionStart <= n.lineRange.end
        );

        if (!existingNote) {
          const addNoteRange = new vscode.Range(selectionStart, 0, selectionStart, 0);
          const addNoteLens = new vscode.CodeLens(addNoteRange, {
            title: '➕ Add Note',
            command: 'codeContextNotes.addNoteViaCodeLens',
            arguments: [document, selection]
          });
          codeLenses.push(addNoteLens);
        }
      }
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
   * Format the CodeLens title to show note preview
   */
  private formatCodeLensTitle(note: Note): string {
    // Strip markdown formatting and get first line
    const plainText = this.stripMarkdown(note.content);
    const firstLine = plainText.split('\n')[0];
    const preview = firstLine.length > 50
      ? firstLine.substring(0, 47) + '...'
      : firstLine;

    // Format: "📝 Note: preview text (by author)"
    return `📝 Note: ${preview} (${note.author})`;
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
