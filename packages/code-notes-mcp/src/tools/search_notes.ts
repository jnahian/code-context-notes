import { z } from 'zod';
import * as path from 'path';
import { SearchManager, isExpired } from '@jnahian/code-notes-core';
import type { NoteManager, Note, NoteType, HistoryStore } from '@jnahian/code-notes-core';

const NOTE_TYPES = ['context', 'instruction', 'warning', 'decision', 'todo', 'handoff', 'rationale'] as const;

export const searchNotesToolDef = {
  name: 'search_notes',
  description: 'Full-text search across workspace notes, with optional type/tags/file filters and expired-note exclusion.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Full-text search query' },
      type: { type: 'string', enum: NOTE_TYPES, description: 'Filter by note type' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Filter: note must have at least one of these tags' },
      file: { type: 'string', description: 'Filter by file path (absolute or workspace-relative)' },
      includeExpired: { type: 'boolean', description: 'Include expired notes (default false)' },
    },
    required: ['query'],
  },
};

export const searchNotesInput = z.object({
  query: z.string(),
  type: z.enum(NOTE_TYPES).optional() as z.ZodOptional<z.ZodType<NoteType>>,
  tags: z.array(z.string()).optional(),
  file: z.string().optional(),
  includeExpired: z.boolean().optional(),
});

// ponytail: Map-backed, in-memory only — search history persistence is irrelevant
// for a stateless per-call MCP tool.
function createInMemoryHistoryStore(): HistoryStore {
  const store = new Map<string, unknown>();
  return {
    get: <T>(key: string) => store.get(key) as T | undefined,
    update: async (key: string, value: unknown) => { store.set(key, value); },
  };
}

function matchesFile(note: Note, file: string, workspace?: string): boolean {
  if (note.filePath === file) return true;
  if (workspace && note.filePath === path.resolve(workspace, file)) return true;
  // endsWith alone would let 'th.ts' match 'auth.ts'; require the match to
  // start right after a path separator, not mid-filename.
  if (note.filePath.endsWith(file)) {
    const boundaryChar = note.filePath[note.filePath.length - file.length - 1];
    if (boundaryChar === '/' || boundaryChar === path.sep) return true;
  }
  return false;
}

export async function searchNotes(
  args: { query: string; type?: NoteType; tags?: string[]; file?: string; includeExpired?: boolean },
  deps: { noteManager: NoteManager; workspace?: string },
) {
  const notes = await deps.noteManager.getAllNotes();

  // ponytail: rebuild the index fresh on every call rather than caching a live
  // SearchManager across MCP calls — simplest correct option; revisit if this
  // becomes a hot path.
  // Core's SearchManager logs to stderr only, so it is stdio-transport safe.
  const searchManager = new SearchManager(createInMemoryHistoryStore());
  await searchManager.buildIndex(notes);
  const results = await searchManager.search({ text: args.query }, notes);

  let matched = results.map(r => r.note);

  if (args.type) matched = matched.filter(n => n.type === args.type);
  if (args.tags && args.tags.length > 0) {
    const tags = args.tags;
    matched = matched.filter(n => n.tags?.some(t => tags.includes(t)));
  }
  if (args.file) {
    matched = matched.filter(n => matchesFile(n, args.file!, deps.workspace));
  }
  if (!args.includeExpired) {
    matched = matched.filter(n => !isExpired(n));
  }

  return { content: [{ type: 'text' as const, text: JSON.stringify(matched, null, 2) }] };
}
