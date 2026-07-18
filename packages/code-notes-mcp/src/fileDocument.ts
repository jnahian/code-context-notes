import * as fs from 'fs/promises';
import type { NoteDocument } from '@jnahian/code-notes-core';

/**
 * Build a NoteDocument (the structural subset of vscode.TextDocument that
 * core needs) from a file on disk. The MCP server has no open editor, so
 * this is the read-tools-have-a-live-doc equivalent for write tools.
 */
export async function buildDocumentFromFile(absFile: string): Promise<NoteDocument> {
  const raw = await fs.readFile(absFile, 'utf-8');
  const lines = raw.split('\n');
  return {
    lineCount: lines.length,
    lineAt: (n: number) => ({ text: lines[n] ?? '' }),
    uri: { fsPath: absFile },
  };
}
