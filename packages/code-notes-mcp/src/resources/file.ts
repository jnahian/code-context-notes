import type { Note, NoteManager } from '@jnahian/code-notes-core';
import { resolveInWorkspace } from '../pathGuard.js';

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
  let file: string;
  try {
    file = decodeURIComponent(encodedFile);
  } catch {
    // decodeURIComponent throws URIError on a malformed escape (e.g. a lone '%').
    return {
      contents: [{ uri, mimeType: fileResourceMimeType, text: `Error: malformed resource URI: ${uri}` }],
    };
  }

  const absFile = resolveInWorkspace(deps.workspace, file);
  if (absFile === null) {
    return {
      contents: [{ uri, mimeType: fileResourceMimeType, text: `Error: path escapes workspace: ${file}` }],
    };
  }

  const notes = await deps.noteManager.getNotesForFile(absFile);
  const md = renderFileNotesMarkdown(notes);
  return { contents: [{ uri, mimeType: fileResourceMimeType, text: md }] };
}
