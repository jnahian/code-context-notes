import { z } from 'zod';
import * as path from 'path';
import type { NoteManager } from '@jnahian/code-notes-core';
import { resolveDirectoryScopedNotes } from '@jnahian/code-notes-core';

export const getNotesForFileToolDef = {
  name: 'get_notes_for_file',
  description: 'Get notes attached directly to a file, plus (optionally) directory-scoped notes that cover it.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'Absolute path, or path relative to the workspace root' },
      includeScopeMatches: { type: 'boolean', description: 'Include directory-scoped notes that cover this file (default true)' },
    },
    required: ['file'],
  },
};

export const getNotesForFileInput = z.object({
  file: z.string(),
  includeScopeMatches: z.boolean().optional().default(true),
});

export async function getNotesForFile(
  args: z.infer<typeof getNotesForFileInput>,
  deps: { noteManager: NoteManager; workspace: string },
) {
  const absFile = path.isAbsolute(args.file) ? args.file : path.join(deps.workspace, args.file);
  const direct = await deps.noteManager.getNotesForFile(absFile);
  direct.sort((a, b) => a.lineRange.start - b.lineRange.start);

  let scoped: Awaited<ReturnType<NoteManager['getAllNotes']>> = [];
  if (args.includeScopeMatches) {
    const all = await deps.noteManager.getAllNotes();
    scoped = resolveDirectoryScopedNotes(all, absFile, deps.workspace);
  }

  return { content: [{ type: 'text' as const, text: JSON.stringify({ direct, scoped }, null, 2) }] };
}
