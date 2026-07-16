import { z } from 'zod';
import * as path from 'path';
import type { NoteManager, Note } from '@jnahian/code-notes-core';
import { resolveDirectoryScopedNotes, isExpired } from '@jnahian/code-notes-core';
import { parseUnifiedDiff } from '../diffParser.js';

export const getNotesForChangesToolDef = {
  name: 'get_notes_for_changes',
  description: 'Get notes relevant to a set of changed files or a unified diff, ranked by relevance: line-overlap, then instruction/warning (incl. directory scope), then decision, then other, then handoff. Critical-priority notes are included even if expired.',
  inputSchema: {
    type: 'object',
    properties: {
      files: { type: 'array', items: { type: 'string' }, description: 'Files to check, absolute or workspace-relative' },
      diff: { type: 'string', description: 'A unified diff; changed-line overlap is used to rank notes' },
    },
  },
};

// Not parsed with .parse() in server.ts like other tools — the "at least one
// of files/diff" failure must come back in-band (see invalid_arguments below)
// rather than throwing, so this tool validates its own raw args via safeParse.
export const getNotesForChangesInput = z.object({
  files: z.array(z.string()).optional(),
  diff: z.string().optional(),
}).refine(data => !!data.files || !!data.diff, { message: 'at least one of files or diff is required' });

function errorResponse(error: string, detail: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error, detail }) }] };
}

export async function getNotesForChanges(
  rawArgs: unknown,
  deps: { noteManager: NoteManager; workspace: string },
) {
  const parsed = getNotesForChangesInput.safeParse(rawArgs);
  if (!parsed.success) {
    return errorResponse('invalid_arguments', parsed.error.issues.map(i => i.message).join('; '));
  }
  const args = parsed.data;

  const lineMap: Record<string, Set<number>> = {};
  let diffFiles: string[] = [];
  if (args.diff) {
    const parsedDiff = parseUnifiedDiff(args.diff);
    if ('error' in parsedDiff) return errorResponse(parsedDiff.error, parsedDiff.detail);
    for (const f of parsedDiff.files) lineMap[f.file] = new Set(f.changedLines);
    diffFiles = parsedDiff.files.map(f => f.file);
  }

  // If both files and diff are given, the diff's file set wins for line
  // mapping (lineMap is keyed by diff-parsed names) but the file lists union.
  const files = Array.from(new Set([...(args.files ?? []), ...diffFiles]));

  const all = await deps.noteManager.getAllNotes();
  const buckets: Note[][] = [[], [], [], [], []];
  for (const file of files) {
    const absFile = path.resolve(deps.workspace, file);
    const direct = all.filter(n => n.filePath === absFile);
    const scoped = resolveDirectoryScopedNotes(all, absFile, deps.workspace);

    for (const n of direct) {
      // No lineMap entry (files[] mode, or file untouched by the diff) means
      // "no line filter" — every direct note on the file overlaps.
      const overlaps = !lineMap[file] || [...lineMap[file]].some(l => l >= n.lineRange.start + 1 && l <= n.lineRange.end + 1);
      if (overlaps) buckets[0].push(n);
    }
    for (const n of scoped) {
      if (n.type === 'instruction' || n.type === 'warning') buckets[1].push(n);
    }
    for (const n of direct) {
      if (n.type === 'instruction' || n.type === 'warning') buckets[1].push(n);
      else if (n.type === 'decision') buckets[2].push(n);
      else if (n.type === 'handoff') buckets[4].push(n);
      else buckets[3].push(n);
    }
  }

  const merged: Note[] = [];
  const seen = new Set<string>();
  for (const bucket of buckets) {
    for (const n of bucket) {
      if (seen.has(n.id)) continue;
      if (isExpired(n) && n.priority !== 'critical') continue;
      seen.add(n.id);
      merged.push(n);
    }
  }
  const truncated = merged.length > 100;

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ notes: merged.slice(0, 100), truncated, appliedFiles: files }, null, 2),
    }],
  };
}
