import * as path from 'path';
import type { Note } from './types.js';
import { applyDefaults } from './noteDefaults.js';

export function resolveDirectoryScopedNotes(allNotes: Note[], targetFile: string, workspaceRoot: string): Note[] {
  const rel = path.relative(workspaceRoot, targetFile);
  if (rel.startsWith('..')) return [];

  const candidates = allNotes.map(applyDefaults).filter(n => n.scope === 'directory');
  const matches = candidates.filter(n => {
    const noteRel = path.relative(workspaceRoot, n.filePath);
    if (noteRel.startsWith('..')) return false;
    // A directory-scoped note at `src` matches a target at `src/auth.ts`
    // iff target is under that directory (or equals it). noteRel === ''
    // means the note is scoped to the workspace root itself, which is an
    // ancestor of every file in it.
    return rel === noteRel || noteRel === '' || rel.startsWith(noteRel + path.sep);
  });
  // Closer (longer prefix) ranks higher
  matches.sort((a, b) =>
    path.relative(workspaceRoot, b.filePath).length - path.relative(workspaceRoot, a.filePath).length);
  return matches;
}
