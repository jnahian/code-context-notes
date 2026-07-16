/**
 * Apply schema defaults to a Note loaded from disk.
 * Legacy notes from v0.2.x have no structured fields; this fills them
 * in memory only. The on-disk file is not modified.
 */

import { Note, NoteType, NoteScope, AuthorType, NotePriority } from './types.js';

export const NOTE_DEFAULTS = {
  type: 'context' as NoteType,
  scope: 'line' as NoteScope,
  tags: [] as string[],
  references: [] as never[], // typed as never — replaced via applyDefaults
  priority: 'normal' as NotePriority,
  authorType: 'human' as AuthorType,
};

/**
 * Returns a new Note with all optional fields populated.
 * Does not mutate the input.
 */
export function applyDefaults(note: Note): Note {
  return {
    ...note,
    type: note.type ?? NOTE_DEFAULTS.type,
    scope: note.scope ?? NOTE_DEFAULTS.scope,
    tags: note.tags ?? [],
    references: note.references ?? [],
    priority: note.priority ?? NOTE_DEFAULTS.priority,
    authorType: note.authorType ?? NOTE_DEFAULTS.authorType,
  };
}

/**
 * True if `expiresAt` is set and is at or before `now`.
 */
export function isExpired(note: Note, now: Date = new Date()): boolean {
  if (!note.expiresAt) return false;
  return new Date(note.expiresAt).getTime() <= now.getTime();
}
