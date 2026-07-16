import { z } from 'zod';
import type { NoteManager } from '@jnahian/code-notes-core';
import { createNote, lineRangeSchema, noteReferenceSchema } from './create_note.js';
import { errorResult } from './errors.js';

export const addDecisionToolDef = {
  name: 'add_decision',
  description: 'Add a decision note (architectural decision + rationale). References are required.',
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
      references: { type: 'array', items: { type: 'object' }, minItems: 1, description: 'References to PRs/issues/commits/tests/urls (required, non-empty)' },
    },
    required: ['file', 'lineRange', 'content', 'references'],
  },
};

// Not enforced as a minimum-length array here — an empty array must produce
// an in-band error (references_required), not a thrown zod validation error.
export const addDecisionInput = z.object({
  file: z.string(),
  lineRange: lineRangeSchema,
  content: z.string(),
  references: z.array(noteReferenceSchema),
});

export async function addDecision(
  args: z.infer<typeof addDecisionInput>,
  deps: { noteManager: NoteManager; workspace: string },
) {
  if (args.references.length === 0) return errorResult('references_required');
  return createNote({ ...args, type: 'decision' }, deps);
}
