import { z } from 'zod';
import type { NoteManager } from '@jnahian/code-notes-core';
import { createNote, lineRangeSchema, noteReferenceSchema } from './create_note.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const addHandoffToolDef = {
  name: 'add_handoff',
  description: 'Add a handoff note ("pick up here next session"). Expires in 7 days by default.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'Absolute path, or path relative to the workspace root' },
      lineRange: {
        type: 'object',
        description: '0-indexed, inclusive line range',
        properties: { start: { type: 'number' }, end: { type: 'number' } },
        required: ['start', 'end'],
      },
      content: { type: 'string', description: 'Note content (markdown)' },
      references: { type: 'array', items: { type: 'object' }, description: 'References to PRs/issues/commits/tests/urls' },
    },
    required: ['file', 'lineRange', 'content'],
  },
};

export const addHandoffInput = z.object({
  file: z.string(),
  lineRange: lineRangeSchema,
  content: z.string(),
  references: z.array(noteReferenceSchema).optional(),
});

export async function addHandoff(
  args: z.infer<typeof addHandoffInput>,
  deps: { noteManager: NoteManager; workspace: string },
) {
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
  return createNote({ ...args, type: 'handoff', expiresAt }, deps);
}
