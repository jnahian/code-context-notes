import { z } from 'zod';
import type { NoteManager } from '@jnahian/code-notes-core';
import { isExpired } from '@jnahian/code-notes-core';

export const getHandoffsToolDef = {
  name: 'get_handoffs',
  description: 'Get handoff notes ("next session pick up here"), sorted by most recently updated. Excludes expired handoffs unless stale=true.',
  inputSchema: {
    type: 'object',
    properties: {
      stale: { type: 'boolean', description: 'Include expired handoffs too (default false).' },
    },
  },
};

export const getHandoffsInput = z.object({
  stale: z.boolean().optional().describe('Include expired handoffs too (default false).'),
});

export async function getHandoffs(args: { stale?: boolean }, deps: { noteManager: NoteManager }) {
  const stale = args.stale ?? false;
  const notes = await deps.noteManager.getAllNotes();
  const handoffs = notes
    .filter(n => n.type === 'handoff' && (stale || !isExpired(n)))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return { content: [{ type: 'text' as const, text: JSON.stringify(handoffs, null, 2) }] };
}
