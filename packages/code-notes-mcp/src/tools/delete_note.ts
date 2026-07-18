import { z } from 'zod';
import type { NoteManager } from '@jnahian/code-notes-core';
import { errorResult, isLockTimeout } from './errors.js';

export const deleteNoteToolDef = {
  name: 'delete_note',
  description: 'Soft-delete a note by id.',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string', description: 'The note ID' } },
    required: ['id'],
  },
};

export const deleteNoteInput = z.object({ id: z.string() });

export async function deleteNote(
  args: z.infer<typeof deleteNoteInput>,
  deps: { noteManager: NoteManager },
) {
  const existing = await deps.noteManager.getNoteByIdGlobal(args.id);
  if (!existing) return errorResult('not_found', { noteId: args.id });

  try {
    await deps.noteManager.deleteNote(args.id, existing.filePath);
  } catch (e) {
    if (isLockTimeout(e)) return errorResult('lock_timeout', { retryable: true });
    throw e;
  }

  return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, id: args.id }) }] };
}
