# AGENTS.md / CLAUDE.md Linking

## Epic 3: Agent Integration

### User Story 3.1: Link the generated notes digest into agent context files

**As a** developer using a coding agent (Claude Code, Cursor, etc.)
**I want to** wire the auto-generated `.code-notes/AGENTS.md` digest into my project's root `AGENTS.md`/`CLAUDE.md`
**So that** my agent actually discovers the workspace notes as context, without me hand-copying content or risking my own file being overwritten

#### Background

The v0.3 exports feature writes the digest to `.code-notes/AGENTS.md`. Because the
open `AGENTS.md` convention scopes nested files to their own subtree, a digest under
`.code-notes/` is not auto-discovered for edits elsewhere in the repo. The root file
is user-owned, so the extension must never clobber it — the safe pattern is an opt-in
command that manages only a marker-delimited block.

#### Tasks

- [x] Add `src/agentsLink.ts` with `buildBlock()` and idempotent `upsertManagedBlock()`
- [x] Register `codeContextNotes.linkExports` command (Quick-Pick: AGENTS.md / CLAUDE.md / Both)
- [x] Create the target file if missing; preserve all content outside the markers
- [x] Emit an `@`-import so Claude Code auto-pulls the digest; harmless plain text in generic AGENTS.md
- [x] Unit tests for insert / append / replace / idempotency
- [x] Changelog + web changelog entries

#### Acceptance Criteria

- [x] Running the command on a project with no `AGENTS.md` creates one containing the managed block
- [x] Running it on an existing hand-written file appends the block and leaves prior content byte-identical
- [x] Re-running is idempotent (managed block replaced in place, never duplicated)
- [x] The block points at the configured `storageDirectory`, not a hardcoded `.code-notes`
- [x] Command is opt-in (palette only) — nothing is written to user files on install

#### Deferred

- Auto-refreshing the inlined critical section on every export change (block is currently a static pointer). Revisit if users want the hoisted items inline rather than via the pointer/import.
