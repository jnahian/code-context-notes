/**
 * Helpers for linking the generated notes digest into a user-owned agent
 * context file (AGENTS.md / CLAUDE.md) via a managed, marker-delimited block.
 *
 * The extension only ever owns the content between the markers — everything
 * the user wrote outside them is preserved verbatim. Writes are idempotent.
 */

export const BLOCK_BEGIN = '<!-- BEGIN code-notes (auto-generated) -->';
export const BLOCK_END = '<!-- END code-notes -->';

/**
 * Build the managed block. `storageDir` is the configured notes directory
 * (default `.code-notes`) so the pointer and the `@`-import resolve to the
 * real generated digest. The `@`-import is functional in Claude Code's
 * CLAUDE.md and harmless (plain text) in a generic AGENTS.md.
 */
export function buildBlock(storageDir: string): string {
  return [
    BLOCK_BEGIN,
    '## Workspace notes (Code Context Notes)',
    '',
    `Project note digest is auto-generated at \`${storageDir}/AGENTS.md\` — read it`,
    'for context, instructions, warnings, and open handoffs in this codebase.',
    '',
    `@${storageDir}/AGENTS.md`,
    BLOCK_END,
  ].join('\n');
}

/**
 * Insert or replace the managed block in `existing`, preserving all other
 * content. Returns the new file contents. Idempotent: re-running with the
 * same block leaves the file unchanged.
 */
export function upsertManagedBlock(existing: string, block: string): string {
  const start = existing.indexOf(BLOCK_BEGIN);
  const end = existing.indexOf(BLOCK_END);
  if (start !== -1 && end !== -1 && end > start) {
    return existing.slice(0, start) + block + existing.slice(end + BLOCK_END.length);
  }
  // Append to the end, keeping a blank line of separation from prior content.
  const prefix = existing.trim().length === 0 ? '' : existing.replace(/\s*$/, '') + '\n\n';
  return prefix + block + '\n';
}
