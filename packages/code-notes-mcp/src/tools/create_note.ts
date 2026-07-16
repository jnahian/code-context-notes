import { z } from 'zod';
import * as path from 'path';
import type { NoteManager, NoteType, NoteScope, NotePriority, NoteReference } from '@jnahian/code-notes-core';
import { buildDocumentFromFile } from '../fileDocument.js';
import { errorResult, isLockTimeout } from './errors.js';

export const createNoteToolDef = {
  name: 'create_note',
  description: 'Create a new note attached to a line range in a file.',
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
      type: { type: 'string', description: 'Note type, e.g. "context", "instruction", "warning", "decision", "todo", "handoff", "rationale" (default "context")' },
      tags: { type: 'array', items: { type: 'string' } },
      scope: { type: 'string', description: 'Note scope: "line", "function", "class", "file", "directory" (default "line")' },
      references: { type: 'array', items: { type: 'object' }, description: 'References to PRs/issues/commits/tests/urls' },
      priority: { type: 'string', description: 'Note priority: "low", "normal", "high", "critical" (default "normal")' },
      expiresAt: { type: 'string', description: 'ISO 8601 expiry timestamp' },
    },
    required: ['file', 'lineRange', 'content'],
  },
};

export const lineRangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

export const noteReferenceSchema = z.object({
  kind: z.enum(['note', 'pr', 'issue', 'commit', 'test', 'url']),
  value: z.string(),
  label: z.string().optional(),
});

export const createNoteInput = z.object({
  file: z.string(),
  lineRange: lineRangeSchema,
  content: z.string(),
  type: z.string().optional() as z.ZodOptional<z.ZodType<NoteType>>,
  tags: z.array(z.string()).optional(),
  scope: z.string().optional() as z.ZodOptional<z.ZodType<NoteScope>>,
  references: z.array(noteReferenceSchema).optional() as z.ZodOptional<z.ZodType<NoteReference[]>>,
  priority: z.string().optional() as z.ZodOptional<z.ZodType<NotePriority>>,
  expiresAt: z.string().optional(),
});

export async function createNote(
  args: z.infer<typeof createNoteInput>,
  deps: { noteManager: NoteManager; workspace: string },
) {
  const absFile = path.isAbsolute(args.file) ? args.file : path.join(deps.workspace, args.file);

  let doc;
  try {
    doc = await buildDocumentFromFile(absFile);
  } catch {
    return errorResult('file_not_found', { file: args.file });
  }

  let note;
  try {
    note = await deps.noteManager.createNote(
      { filePath: absFile, lineRange: args.lineRange, content: args.content },
      doc,
    );
  } catch (e) {
    if (isLockTimeout(e)) return errorResult('lock_timeout', { retryable: true });
    return errorResult('invalid_line_range', { detail: (e as Error).message });
  }

  const fields: {
    authorType: 'agent';
    type?: NoteType;
    tags?: string[];
    scope?: NoteScope;
    references?: NoteReference[];
    priority?: NotePriority;
    expiresAt?: string;
  } = { authorType: 'agent' };
  if (args.type !== undefined) fields.type = args.type;
  if (args.tags !== undefined) fields.tags = args.tags;
  if (args.scope !== undefined) fields.scope = args.scope;
  if (args.references !== undefined) fields.references = args.references;
  if (args.priority !== undefined) fields.priority = args.priority;
  if (args.expiresAt !== undefined) fields.expiresAt = args.expiresAt;

  try {
    const final = await deps.noteManager.updateNoteMetadata(note.id, fields);
    return { content: [{ type: 'text' as const, text: JSON.stringify(final, null, 2) }] };
  } catch (e) {
    if (isLockTimeout(e)) return errorResult('lock_timeout', { retryable: true });
    throw e;
  }
}
