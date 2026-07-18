import { z } from 'zod';
import type { NoteManager } from '@jnahian/code-notes-core';

export const getNoteToolDef = {
  name: 'get_note',
  description: 'Get a single note by id, including history and references.',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string', description: 'The note ID (filename without .md, e.g. "abc123")' } },
    required: ['id'],
  },
};

export const getNoteInput = z.object({
  id: z.string().describe('The note ID (filename without .md, e.g. "abc123")'),
});

export async function getNote(args: { id: string }, deps: { noteManager: NoteManager }) {
  const note = await deps.noteManager.getNoteByIdGlobal(args.id);
  if (!note) return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'not_found', noteId: args.id }) }] };
  return { content: [{ type: 'text' as const, text: JSON.stringify(note, null, 2) }] };
}
