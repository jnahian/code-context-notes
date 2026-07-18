import { z } from 'zod';
import type { NoteManager, NoteScope } from '@jnahian/code-notes-core';
import { isExpired, PRIORITY_RANK } from '@jnahian/code-notes-core';

const SCOPES = ['line', 'function', 'class', 'file', 'directory'] as const;

export const listInstructionsToolDef = {
  name: 'list_instructions',
  description: 'List active instruction and warning notes, ranked by priority then recency.',
  inputSchema: {
    type: 'object',
    properties: {
      scope: { type: 'string', enum: SCOPES, description: 'Filter by note scope (default: all scopes)' },
    },
  },
};

export const listInstructionsInput = z.object({
  scope: z.enum(SCOPES).optional(),
});

export async function listInstructions(args: { scope?: NoteScope }, deps: { noteManager: NoteManager }) {
  const notes = await deps.noteManager.getAllNotes();
  const filtered = notes
    .filter(n => n.type === 'instruction' || n.type === 'warning')
    .filter(n => !isExpired(n))
    .filter(n => !args.scope || n.scope === args.scope)
    .sort((a, b) =>
      (PRIORITY_RANK[a.priority!] ?? 99) - (PRIORITY_RANK[b.priority!] ?? 99) ||
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  return { content: [{ type: 'text' as const, text: JSON.stringify(filtered, null, 2) }] };
}
