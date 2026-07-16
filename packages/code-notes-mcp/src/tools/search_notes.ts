import { z } from 'zod';
import * as path from 'path';
import { SearchManager, isExpired } from '@jnahian/code-notes-core';
import type { NoteManager, Note, NoteType, HistoryStore } from '@jnahian/code-notes-core';

export const searchNotesToolDef = {
  name: 'search_notes',
  description: 'Full-text search across workspace notes, with optional type/tags/file filters and expired-note exclusion.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Full-text search query' },
      type: { type: 'string', description: 'Filter by note type (e.g. "warning", "todo")' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Filter: note must have at least one of these tags' },
      file: { type: 'string', description: 'Filter by file path (absolute or workspace-relative)' },
      includeExpired: { type: 'boolean', description: 'Include expired notes (default false)' },
    },
    required: ['query'],
  },
};

export const searchNotesInput = z.object({
  query: z.string(),
  type: z.string().optional() as z.ZodOptional<z.ZodType<NoteType>>,
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
  if (note.filePath.endsWith(file)) return true;
  if (workspace && note.filePath === path.resolve(workspace, file)) return true;
  return false;
}

// ponytail: SearchManager.buildIndex/search call console.log directly (core isn't
// stdio-transport-aware). On stdio MCP transports stdout IS the JSON-RPC channel,
// so redirect to stderr for the duration of the call. Real fix belongs in core
// (inject a logger / use console.error) — flagged, not fixed here to stay in scope.
async function withStdoutSilenced<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.log;
  console.log = (...args: unknown[]) => console.error(...args);
  try {
    return await fn();
  } finally {
    console.log = original;
  }
}

export async function searchNotes(
  args: { query: string; type?: NoteType; tags?: string[]; file?: string; includeExpired?: boolean },
  deps: { noteManager: NoteManager; workspace?: string },
) {
  const notes = await deps.noteManager.getAllNotes();

  // ponytail: rebuild the index fresh on every call rather than caching a live
  // SearchManager across MCP calls — simplest correct option; revisit if this
  // becomes a hot path.
  const searchManager = new SearchManager(createInMemoryHistoryStore());
  const results = await withStdoutSilenced(async () => {
    await searchManager.buildIndex(notes);
    return searchManager.search({ text: args.query }, notes);
  });

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
