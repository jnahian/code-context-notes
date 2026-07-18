import * as path from 'path';

/**
 * Resolve a caller-supplied file path (absolute or workspace-relative) against
 * the workspace root and reject anything that escapes it. Returns the resolved
 * absolute path, or null if it escapes.
 *
 * ponytail: lexical check only — no fs.realpath, so a symlink inside the
 * workspace that points outside would pass. Left out on purpose: callers only
 * expose notes attached to the path, never the file's contents, so the worst
 * case is note-metadata disclosure for an out-of-workspace path, not file
 * exfiltration. Add realpath resolution if a caller ever returns file bytes.
 */
export function resolveInWorkspace(workspace: string, file: string): string | null {
  const absFile = path.resolve(workspace, file);
  const rel = path.relative(workspace, absFile);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return absFile;
}
