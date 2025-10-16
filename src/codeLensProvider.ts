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
    } catch (error) {
      console.error('Error providing CodeLenses:', error);
    }

    return codeLenses;
  }

  /**
   * Format the CodeLens title to show note preview
   */
  private formatCodeLensTitle(note: Note): string {
    // Get first line of note content as preview
    const firstLine = note.content.split('\n')[0];
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
