import { z } from 'zod';
import type { NoteManager } from '@jnahian/code-notes-core';
import { buildDocumentFromFile } from '../fileDocument.js';
import { errorResult, isLockTimeout } from './errors.js';

export const editNoteToolDef = {
  name: 'edit_note',
  description: 'Edit the content of an existing note (adds a history entry).',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The note ID' },
      content: { type: 'string', description: 'New note content (markdown)' },
    },
    required: ['id', 'content'],
  },
};

export const editNoteInput = z.object({
  id: z.string(),
  content: z.string(),
});

export async function editNote(
  args: z.infer<typeof editNoteInput>,
  deps: { noteManager: NoteManager },
) {
  const existing = await deps.noteManager.getNoteByIdGlobal(args.id);
  if (!existing) return errorResult('not_found', { noteId: args.id });

  let doc;
  try {
    doc = await buildDocumentFromFile(existing.filePath);
  } catch {
    return errorResult('file_not_found', { file: existing.filePath });
  }

  try {
    const updated = await deps.noteManager.updateNote({ id: args.id, content: args.content }, doc);
    return { content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }] };
  } catch (e) {
    if (isLockTimeout(e)) return errorResult('lock_timeout', { retryable: true });
    if (e instanceof Error && /deleted/i.test(e.message)) return errorResult('note_deleted', { noteId: args.id });
    throw e;
  }
}
