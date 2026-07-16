import * as path from 'path';
import type { Note, NoteManager } from '@jnahian/code-notes-core';

export const FILE_RESOURCE_URI_PREFIX = 'code-notes://file/';
export const fileResourceMimeType = 'text/markdown';

export interface FileResourceDeps {
  workspace: string;
  noteManager: NoteManager;
}

export function renderFileNotesMarkdown(notes: Note[]): string {
  if (notes.length === 0) {
    return '_No notes for this file._';
  }
  return notes
    .map(n => {
      const range = n.lineRange.start === n.lineRange.end
        ? `L${n.lineRange.start + 1}`
        : `L${n.lineRange.start + 1}-${n.lineRange.end + 1}`;
      return [
        `## ${range} — ${n.type ?? 'note'}`,
        `- **Author:** ${n.author}`,
        `- **Updated:** ${n.updatedAt}`,
        '',
        n.content,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

export async function readFileResource(uri: string, deps: FileResourceDeps) {
  const encodedFile = uri.slice(FILE_RESOURCE_URI_PREFIX.length);
  const file = decodeURIComponent(encodedFile);

  const absFile = path.resolve(deps.workspace, file);
  const rel = path.relative(deps.workspace, absFile);
  const escapesWorkspace = rel.startsWith('..') || path.isAbsolute(rel);
  if (escapesWorkspace) {
    return {
      contents: [{ uri, mimeType: fileResourceMimeType, text: `Error: path escapes workspace: ${file}` }],
    };
  }

  const notes = await deps.noteManager.getNotesForFile(absFile);
  const md = renderFileNotesMarkdown(notes);
  return { contents: [{ uri, mimeType: fileResourceMimeType, text: md }] };
}
