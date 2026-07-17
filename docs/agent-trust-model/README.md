# Agent Trust Model (v0.5.0)

Implementation plan: [`docs/superpowers/plans/2026-07-17-agent-integration-v0.5-trust-model.md`](../superpowers/plans/2026-07-17-agent-integration-v0.5-trust-model.md)
Design spec: [`docs/superpowers/specs/2026-05-15-agent-integration-design.md`](../superpowers/specs/2026-05-15-agent-integration-design.md) §4.3, §5.4, §7.6, §7.7

v0.4 gave agents write access to workspace notes. v0.5 gives that access an off switch, a receipt, and a review step.

## Epic 5: Agent Trust Model

### User Story 5.1: Choose how agent writes are handled

**As a** developer sharing a codebase with coding agents
**I want to** choose whether agent notes land immediately, land with a log, or wait for my approval
**So that** I can adopt agent assistance without losing control of my workspace's notes

#### Tasks

- [x] Add `AgentWriteMode` (`direct` | `audit` | `queue`) and `WorkspaceConfig` types (plan Task 2)
- [x] Read/write `.code-notes/config.json`, tolerant of malformed input (plan Task 2)
- [x] Add the `codeContextNotes.agentWriteMode` setting and mirror it into config.json (plan Task 8)
- [x] Route agent writes by mode in `NoteManager` (plan Tasks 4, 5)
- [x] Re-read the mode per MCP call so a mode change needs no server restart (plan Task 7)

#### Acceptance Criteria

- [x] The mode is read from `.code-notes/config.json` by both the extension and the standalone MCP server
- [x] There is **no** `--write-mode` CLI flag — an agent cannot choose its own mode
- [x] Changing the setting in VS Code updates `config.json` without a reload
- [x] A running MCP server honors a mode change on its next call, with no restart
- [x] A malformed or missing `config.json` falls back to `audit` and never breaks note-taking
- [x] Human writes are unaffected in every mode (detection is `authorType: 'agent'`, never author-name sniffing)

---

### User Story 5.2: See and undo what an agent did

**As a** developer whose agent writes notes while I work
**I want to** see every agent operation in one place and undo any of them
**So that** I can spot-check an agent's contributions without reading git diffs of `.code-notes/`

#### Tasks

- [x] Append every agent op to `.code-notes/_audit.log` (JSONL) in `audit` mode (plan Tasks 3, 4)
- [x] Rotate the log at the retention cap, under a lock (plan Task 3)
- [x] Add the "Agent activity" sidebar view listing the last 50 ops (plan Task 9)
- [x] Add inline Revert, Open note, and the `Code Notes: Truncate Audit Log` command (plan Task 9)
- [x] Watch `_audit.log` so the view refreshes on external writes (plan Task 8)

#### Acceptance Criteria

- [x] `audit` is the default mode
- [x] Agent writes still land immediately in `audit` mode — logging never blocks the agent
- [x] Each entry shows the op, file, agent name, and time
- [x] Revert on a `create` deletes the note; on an `edit`/`delete` it restores the prior content from `history[]`
- [x] The view refreshes when an agent in another process writes, with no window reload
- [x] A corrupt log line is skipped with one warning — the view still renders, nothing crashes
- [x] The log rotates to `_audit.log.1` past the retention cap; no entry is lost
- [x] Concurrent appends from several agent processes never interleave into a torn line

---

### User Story 5.3: Approve agent notes before they land

**As a** developer on a shared or regulated codebase
**I want to** review each agent-proposed note and approve, edit, or reject it
**So that** an agent can suggest notes without writing to the workspace my team reads

#### Tasks

- [x] Add `Proposal` type and `ProposalStore` over `.code-notes/_pending/` (plan Task 5)
- [x] Divert agent writes to proposals in `queue` mode; return the pending shape from MCP tools (plan Tasks 5, 7)
- [x] Add the "Pending agent proposals" view with Approve / Reject / Edit-and-approve (plan Task 10)
- [x] Detect stale targets via `targetContentHash` and offer simple-pick (plan Task 10)
- [x] Flag orphaned proposals whose target note is gone (plan Task 10)
- [x] Prompt about stranded proposals when leaving `queue` mode (plan Task 10)

#### Acceptance Criteria

- [x] In `queue` mode an agent write creates **no** note — only a file in `_pending/`
- [x] Write tools return `{ status: "pending", proposalId, message }` — a success shape, not an error, so agents don't retry-loop
- [x] Proposals never load as notes (`_pending/` is a subdirectory; the note loader reads only the top level)
- [x] Approve applies the note attributed to the approver, with `approvedBy` recorded and round-tripped to disk
- [x] Edit-and-approve applies the human's edited text, not the agent's original
- [x] Reject moves the file to `_pending/.rejected/` — nothing is silently destroyed
- [x] If the target note changed since the proposal, the human is shown both versions and picks one
- [x] A proposal whose target note no longer exists is shown as orphaned and can only be rejected
- [x] Turning `queue` mode off with proposals pending prompts to review or reject them

---

### User Story 5.4: Trust the lock (carried over from v0.4)

**As a** developer editing notes while an agent writes to the same workspace
**I want** my edits to survive
**So that** the concurrency guarantee v0.5 advertises is actually true

#### Tasks

- [x] Lock and re-read inside `updateNotePositions` (plan Task 6)

#### Acceptance Criteria

- [x] Repositioning a note never writes stale content over a concurrent edit
- [x] The extension's 178 integration tests still pass — repositioning is on the document-change hot path

---

## Trust-boundary hardening (found during implementation)

An independent audit of the write path, plus adversarial testing, turned up defects that the trust model depends on but the stories above don't name. All fixed and regression-tested:

- **Agent-write identity comes from the writer, not the note.** An earlier cut keyed off the note's `authorType`, letting an agent edit or delete any *human*-authored note in `queue` mode with no approval. Identity is now a property of the NoteManager instance (the server is the agent, the extension is the human), fail-closed.
- **Note content can't forge note structure.** Content is agent-controlled input, and the on-disk markdown used unescaped section delimiters — so a note whose body was `**Status:** DELETED` or `## Edit History` deleted itself or forged history on reload (poisoning Revert). Storage is now a versioned, length-delimited format (`**Format:** 2`); pre-v0.5 notes read via the legacy parser and migrate on next save.
- **The audit log never loses an entry under load.** Rotation is atomic (rename, not rewrite), and appends are lock-free — an earlier lock-on-append design silently dropped entries when the lock budget was exhausted.
- **The two unrouted write paths (`updateNoteMetadata`, `updateNotePositions`) fail closed for agents** so a future agent-facing caller can't bypass the rails.

**Residual, filed for a later release:** note content containing a literal `## Edit History` line is handled by v2, but the broader principle — that the on-disk format should escape rather than length-delimit — is left as a possible future refactor. v2 closes the exploit; the format is not changing again in v0.5.

## Out of scope

- **3-way merge for stale proposals** — v0.5 ships simple-pick (spec §7.6). Add a real merge only if conflicts prove common.
- **Enforcing `agentAllowList`** — stored and surfaced, but not enforced. The spec itself calls it informational, not a security boundary; enforcement without an identity boundary is theater.
- **Git integration for Revert** — Revert restores extension-tracked state; it does not make a commit (spec §5.4.7 trade-off 4).
- **AI-assisted annotation generation** ([issue #29](https://github.com/jnahian/code-context-notes/issues/29)) — a content-generation feature, unrelated to trust rails.
