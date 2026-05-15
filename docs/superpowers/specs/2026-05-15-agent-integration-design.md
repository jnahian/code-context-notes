# Code Context Notes — Agent Integration Design

- **Status:** Draft (awaiting user review)
- **Date:** 2026-05-15
- **Author:** Julkar Naen Nahian (with Claude Opus 4.7, brainstorming session)
- **Scope:** Releases v0.3, v0.4, v0.5
- **Companion docs:** `docs/USER_STORY_TEMPLATE.md`, `docs/changelogs/`, `docs/RELEASE_TEMPLATE.md`

## 1. Goals

Make Code Context Notes a first-class context source for coding agents (Claude Code, Cursor, Copilot agent mode, Aider, custom MCP-capable tools), with a full read+write loop:

- Agents **read** notes as workspace-aware context before editing code.
- Agents **write** notes as durable breadcrumbs, decisions, and handoffs.
- Notes become the workspace's institutional memory, not just per-developer scratch.

### 1.1 Non-goals

- Replacing CLAUDE.md / repo-level agent instruction files. Notes are line/scope-bound; CLAUDE.md is repo-bound. They complement.
- Acting as a security boundary. Anyone with write access to `.code-notes/` can write notes; allow-lists are discipline, not enforcement.
- Semantic / embedding search. Full-text only in this scope; embeddings are a v0.6+ wishlist item.
- Real-time agent-to-agent coordination. The model is filesystem-as-IPC, polled at request time.

## 2. Background

`code-context-notes` (v0.2.1 today) is a VS Code extension that attaches markdown notes to specific code lines. Notes are stored as markdown files under `.code-notes/`, tracked by content hash so they survive line-number drift, with full edit history. The extension provides a sidebar, CodeLens indicators, native VS Code comment UI, and git-aware authorship.

Today, notes are written and read by humans through the VS Code UI. Coding agents have no first-class way to consume them — an agent can technically read the markdown files but the schema is unstructured (free-form markdown), there's no index, no tool surface, and no convention for agent-authored notes.

The opportunity: notes are already *persistent, location-bound context*. The scaffolding for the most painful problem agents face — recovering the *why* of code — already exists. This design extends that scaffolding so agents can participate in the read+write loop natively.

## 3. Decisions summary

The four pivotal decisions made during brainstorming:

| Decision | Choice | Why |
|---|---|---|
| **Direction** | Read+write, equal weight | Read alone misses the institutional-memory accrual; write alone has no reason to exist. The loop is what makes notes durable. |
| **Surfaces** | MCP server + structured file exports | MCP for live agent integration (Claude Code, Cursor). Exports for any tool that just reads files (CLAUDE.md-style consumption, Aider, CI). CLI and VS Code agent API explicitly deferred. |
| **Agent identity** | Same shape as human, attributed | Agents are just authors with `authorType: agent`. No separate storage namespace. Sidebar/digest can filter by author type. |
| **Schema enrichment** | Full structured schema | Add `type`, `tags`, `scope`, `references`, `expiresAt`, `priority`. Necessary for agents to prioritize (instruction vs. context) and for digests to be useful. |
| **Trust model** | `agentWriteMode: direct \| queue \| audit`, default `audit` | Per-workspace setting. `audit` is the sweet spot: doesn't block, gives humans one place to spot-check. Teams can dial up to `queue` for sensitive codebases. |

## 4. Approach: staged rollout

Three milestones, each independently shippable and useful:

### 4.1 v0.3 — Schema + Exports

- Extend `Note` type with optional structured fields.
- Lazy migration: legacy notes load with defaults; on-disk shape upgrades only on next edit.
- Auto-generate `.code-notes/INDEX.json` and `.code-notes/AGENTS.md` on every save/delete.
- Sidebar gains type pill and type/expired filter.

**Ships value to:** any file-reading agent (Claude Code, Cursor, Aider) — even with zero new infra, an agent that's been told to read `.code-notes/AGENTS.md` immediately gets workspace context.

### 4.2 v0.4 — MCP server

- New separate npm package: `@jnahian/code-notes-mcp`.
- Extract `code-notes-core` into a shared package consumed by both the extension and the MCP server (avoids logic duplication / drift).
- Read tools first (`search_notes`, `get_notes_for_file`, `get_notes_for_changes`, `list_instructions`, `get_handoffs`, `get_note`).
- Write tools second (`create_note`, `edit_note`, `delete_note`, `add_handoff`, `add_decision`).
- Resources: `code-notes://digest`, `code-notes://index`, `code-notes://file/{path}`.

**Ships value to:** any MCP-capable agent. Adoption isn't gated on the VS Code extension.

### 4.3 v0.5 — Trust model + audit UI

- Add `codeContextNotes.agentWriteMode` setting.
- `direct`: writes go straight in, attributed.
- `audit` (default): writes go in, every op appended to `.code-notes/_audit.log` (JSONL), sidebar "Agent activity" view with Revert button.
- `queue`: writes go to `.code-notes/_pending/<id>.md`, sidebar "Pending agent proposals" view with Approve / Reject / Edit-and-approve actions.
- Conflict handling for queue mode (3-way diff or simple-pick — see §7).

**Ships value to:** teams adopting agent assistance; provides safety rails before agents accumulate a lot of writes.

### 4.4 Why staged

- Each milestone is independently shippable and rollback-safe.
- v0.3 unblocks file-reading agents immediately with zero new infrastructure.
- v0.4 lands the MCP surface against a stable schema (no churn from late schema decisions).
- v0.5 adds safety before agent-write volume grows.
- Three review/test cycles is a deliberate cost, accepted for the feedback value.

### 4.5 Approaches considered and rejected

- **B. Big-bang v0.3** (everything in one release): rejected because the trust-model UI is the slowest piece and would block ship. No real-world feedback between schema decisions and MCP shape.
- **C. MCP-first against plain markdown, schema later**: rejected because MCP tool shapes (filters by type, scope, tags) would change when schema lands, breaking early agent configs.

## 5. Detailed design

### 5.1 Extended note schema (v0.3)

Optional fields added to the `Note` type. Existing notes load fine (back-compat).

```ts
type NoteType =
  | 'context'      // default: explanatory background
  | 'instruction'  // directive: agent/human MUST follow
  | 'warning'      // hazard: don't do X, see why
  | 'decision'     // architectural decision + rationale
  | 'todo'         // outstanding work
  | 'handoff'      // "next session pick up here" (often agent-authored)
  | 'rationale';   // why this code exists (links to PRs/commits)

type NoteScope =
  | 'line'      // default — current behavior
  | 'function'  // applies to enclosing function
  | 'class'     // applies to enclosing class
  | 'file'      // applies to whole file
  | 'directory';// applies to all files in a directory subtree

interface NoteReference {
  kind: 'note' | 'pr' | 'issue' | 'commit' | 'test' | 'url';
  value: string;          // note ID, PR number, URL, etc.
  label?: string;
}

interface Note {
  // ...existing fields unchanged...

  // NEW (all optional for back-compat)
  type?: NoteType;             // default 'context'
  tags?: string[];
  scope?: NoteScope;           // default 'line'
  references?: NoteReference[];
  expiresAt?: string;          // ISO 8601
  authorType?: 'human' | 'agent';
  priority?: 'low' | 'normal' | 'high' | 'critical';
}
```

**Storage:** stored in the markdown frontmatter (same format used today for metadata). Reader is forward-compatible (older versions ignore unknown keys). Writer omits any field equal to its default to keep frontmatter compact.

**Sidebar UI in v0.3:** small type pill on each note item; filter dropdown (type / tags / expired). Add/edit flow gets a "More fields" expander for the new fields. Richer UI deferred to v0.5.

**Why these specific types:**
- `instruction` and `warning` give agents prioritization signal — load these first, never ignore.
- `handoff` and `decision` are the highest-value *agent-authored* types: handoffs survive session boundaries; decisions are the durable "why" record.

**Three trade-offs:**
1. `scope: directory` requires storing notes against directory paths. Solution: allow `filePath` to point to a directory when `scope: 'directory'`. Document the convention.
2. `function` / `class` scope needs a symbol resolver. v0.3 stores the symbol *name* the user picked at creation time and re-resolves on read. If the symbol disappears, fall back to line-range matching with a `scopeStatus: 'stale'` indicator. No tree-sitter integration in v0.3.
3. `expiresAt` is computed lazily on read. No background timer needed.

### 5.2 File exports (v0.3)

Two artifacts regenerated atomically on every note save/delete/migration. Live in `.code-notes/` so they ship with the existing storage convention.

#### 5.2.1 `.code-notes/INDEX.json`

Single machine-readable index. The format any tool reads.

```json
{
  "version": 1,
  "generatedAt": "2026-05-15T12:34:56Z",
  "workspaceRoot": "/abs/path",
  "notes": [
    {
      "id": "note-abc123",
      "filePath": "src/foo.ts",
      "lineRange": { "start": 12, "end": 18 },
      "type": "instruction",
      "scope": "function",
      "tags": ["legacy-abi", "do-not-refactor"],
      "priority": "high",
      "author": "alice",
      "authorType": "human",
      "createdAt": "...",
      "updatedAt": "...",
      "expiresAt": null,
      "isExpired": false,
      "references": [{ "kind": "pr", "value": "#42" }],
      "contentPreview": "First 200 chars of markdown...",
      "contentPath": ".code-notes/src/foo.ts/note-abc123.md"
    }
  ],
  "byFile": { "src/foo.ts": ["note-abc123"] },
  "byType": { "instruction": ["note-abc123"] },
  "byTag": { "legacy-abi": ["note-abc123"] },
  "errors": []
}
```

Pre-built reverse indexes mean an agent can answer "what instruction notes apply to `src/foo.ts`" by reading one file, no scan. `contentPath` lets the agent fetch full markdown when needed.

#### 5.2.2 `.code-notes/AGENTS.md`

Human-and-agent-readable digest. The single file an agent can read at task start to absorb workspace knowledge. Skim-first organization:

```markdown
# Code Notes Digest
*Auto-generated. Do not edit. Source: `.code-notes/INDEX.json`*

## Critical instructions and warnings
- **`src/auth.ts:42` — instruction (high):** Never bypass `validateSession()` — see PR #42.
- **`src/db/migrations/`** — warning (critical): Migrations are non-reversible in prod. Test against staging first.

## Open handoffs
- **`src/parser.ts:88-95`** — handoff from claude-code 2026-05-14: blocked on tokenizer test failure, see test/parser.spec.ts:120.

## Decisions worth knowing
- **`src/cache.ts:10`** — decision: chose LRU over LFU because... (PR #38)

## All notes by file
### `src/auth.ts`
- L42 — instruction (high) [legacy-abi]: Never bypass...
- L88 — context: Token refresh runs every 5 min...
```

Critical-first ordering ensures an agent can never miss high-priority guidance. Handoffs come second because they're time-sensitive.

#### 5.2.3 Regeneration

- Triggered from `noteManager` after every save/delete and on workspace startup if missing.
- Single debounced writer (200ms) coalesces bursts.
- Atomic write: `INDEX.json.tmp` → rename. Same for `AGENTS.md`.
- Manual command: `Code Notes: Regenerate Exports`.

#### 5.2.4 Configuration

```jsonc
"codeContextNotes.exports": {
  "enabled": true,
  "indexJson": true,
  "agentsMarkdown": true,
  "expandedDigest": false  // include full content in AGENTS.md, not just summaries
}
```

#### 5.2.5 Trade-offs

- `AGENTS.md` is generated content but lives in the workspace. Teams who don't want it in git should `.gitignore` it. Documented; not auto-added.
- Two files instead of one (JSON + Markdown) because humans don't read JSON well and a 50KB JSON blob in `AGENTS.md` would defeat its purpose.

### 5.3 MCP server (v0.4)

Separate npm package `@jnahian/code-notes-mcp`. Reads/writes the same `.code-notes/` directory the extension uses — sync via filesystem, no IPC.

#### 5.3.1 Why a separate package

- Adoption isn't gated on installing the VS Code extension.
- Independent release cadence; MCP protocol churn doesn't force extension releases.
- Smaller surface to test in isolation.

The extension's `noteManager` and `storageManager` get extracted into a shared `code-notes-core` package consumed by both. This is the one structural refactor v0.4 requires.

#### 5.3.2 Configuration (in agent's MCP config)

```json
{
  "mcpServers": {
    "code-notes": {
      "command": "npx",
      "args": ["-y", "@jnahian/code-notes-mcp", "--workspace", "${workspaceFolder}", "--agent", "claude-code"]
    }
  }
}
```

`--workspace` is required (no implicit cwd guessing — too easy to point at the wrong directory). `--agent` is required for write access; without it the server starts in read-only mode.

#### 5.3.3 Tools (read)

| Tool | Purpose |
|---|---|
| `search_notes(query, type?, tags?, file?, includeExpired?)` | Full-text + structured filter. Ranked list with previews. |
| `get_notes_for_file(file, includeScopeMatches?)` | All notes attached to file plus directory-scoped notes that apply. Sorted by line. |
| `get_notes_for_changes(files[] \| diff)` | **Killer tool.** Pass files an agent is about to edit (or a unified diff); returns notes whose line ranges overlap edited regions, plus all `instruction`/`warning` notes scoped to file/dir. |
| `list_instructions(scope?)` | All `instruction` and `warning` notes ranked by priority. The "load this first" call. |
| `get_note(id)` | Full note with history and references. |
| `get_handoffs(stale?)` | Open handoffs (defaults to non-expired). For resuming work. |

#### 5.3.4 Tools (write)

All writes respect the trust model (§5.4). The MCP server doesn't enforce trust itself — it calls into `code-notes-core`, which routes based on the workspace setting.

| Tool | Purpose |
|---|---|
| `create_note(file, lineRange, content, type, tags?, scope?, references?, priority?, expiresAt?)` | Standard create. |
| `edit_note(id, content)` | Standard edit; history preserved. |
| `delete_note(id)` | Soft delete. |
| `add_handoff(file, lineRange, content, references?)` | Convenience: type=handoff with sensible defaults. |
| `add_decision(file, lineRange, content, references[])` | Convenience: type=decision; references required. |

#### 5.3.5 Resources

- `code-notes://digest` → contents of `AGENTS.md`
- `code-notes://index` → contents of `INDEX.json`
- `code-notes://file/{path}` → all notes for a file as one rendered markdown doc

Agents that support resources can auto-load the digest at session start. Tools cover on-demand operations.

#### 5.3.6 Identity & attribution

The `--agent` arg's value is written to `author` and triggers `authorType: 'agent'`. Without it, write tools refuse and return a structured error. Prevents anonymous agent writes from polluting the audit trail.

#### 5.3.7 Trade-offs

1. **Filesystem-as-IPC.** Atomic file rename + per-note advisory lock files (`.code-notes/.locks/<id>`) avoid lost updates. Cheap; not as bulletproof as a database. Acceptable because note writes are infrequent.
2. **No streaming.** `get_notes_for_changes` against a giant diff caps results at 100 with `truncated: true`. Agents pass narrower file lists if they need more.
3. **No semantic search in v0.4.** Full-text only.

### 5.4 Trust model & audit (v0.5)

Single workspace setting picks the policy. Same code path handles all three modes; the difference is what happens after `code-notes-core` decides "this is an agent write."

```jsonc
"codeContextNotes.agentWriteMode": "audit"  // "direct" | "queue" | "audit", default "audit"
```

Detection: a write is an "agent write" iff the caller passed `authorType: 'agent'` (only the MCP server does this). No author-string sniffing.

#### 5.4.1 Mode: `direct`

Agent writes go straight to `.code-notes/<file>/<id>.md` like a human write. The note's `authorType: 'agent'` makes it filterable in sidebar and digest. Nothing else changes. *Use when:* solo dev with a trusted agent.

#### 5.4.2 Mode: `audit` (default)

Same as `direct`, but every agent operation appends one line to `.code-notes/_audit.log` (JSONL):

```jsonl
{"ts":"2026-05-15T12:34:56Z","op":"create","noteId":"note-abc","agent":"claude-code","file":"src/foo.ts","lineRange":[12,18],"type":"handoff"}
{"ts":"2026-05-15T12:35:10Z","op":"edit","noteId":"note-abc","agent":"claude-code","prevContentHash":"sha256:...","newContentHash":"sha256:..."}
```

Sidebar gains an **"Agent activity"** section showing the last 50 ops:
- Inline **Revert** button (re-applies prior content / restores deleted note from history)
- **Open note** to jump to it
- **Mute agent for this workspace** quick action (toggles to `queue`)

*Use when:* most teams. Doesn't block work; gives humans one place to spot-check.

#### 5.4.3 Mode: `queue`

Agent writes don't touch live notes. The MCP server writes a *proposal* to `.code-notes/_pending/<proposal-id>.md`:

```markdown
---
proposalId: prop-xyz
op: create | edit | delete
targetNoteId: note-abc  # for edit/delete
file: src/foo.ts
lineRange: [12, 18]
agent: claude-code
proposedAt: 2026-05-15T12:34:56Z
---
{proposed content}
```

Sidebar surfaces **"Pending agent proposals"** badge with Approve / Reject / Edit-then-approve actions. On approve: applied as if a human did it (`author` is the approver, `authorType: 'agent'`, `approvedBy: <human>` added). On reject: moved to `.code-notes/_pending/.rejected/` for audit.

*Use when:* shared codebases, regulated environments, first-time agent assistance.

#### 5.4.4 What the MCP server returns

In `audit`/`direct`: write tools return the new/updated note. In `queue`:

```json
{ "status": "pending", "proposalId": "prop-xyz", "message": "Awaiting human approval." }
```

Documented in MCP tool descriptions so agents don't loop retrying.

#### 5.4.5 Reverting in audit mode

Every `_audit.log` entry carries enough state to reverse the op:
- `create` → reverse is `delete`
- `edit` → reverse is restore from `history[]`
- `delete` → reverse is restore from `history[]`

The Revert button calls existing `noteManager` methods. No new storage primitives needed.

#### 5.4.6 Settings UI

```
Code Context Notes › Agent write mode: [direct | queue | audit ▼]
Code Context Notes › Agent allow-list:  [claude-code, cursor-agent]
Code Context Notes › Audit log retention: [last 1000 ops]
```

Allow-list is *informational* (rejects writes where `--agent` isn't in the list), not a security boundary.

#### 5.4.7 Trade-offs

1. **`queue` mode requires a sidebar UI** that doesn't exist today. Biggest single chunk of v0.5 work.
2. **Mode switches mid-session** can leave orphaned proposals. One-time prompt: "You have N pending proposals — review them or move to `.rejected/`?"
3. **`_audit.log` grows unbounded** without retention. Default cap: last 1000 ops; older lines rotate to `_audit.log.1`. Configurable.
4. **No git integration for revert.** Revert restores extension-tracked state but doesn't make a git commit. Documented.

### 5.5 Agent-killer features

Five features that make this *worth* an agent's attention.

#### 5.5.1 `get_notes_for_changes` — pre-edit context loading

The single highest-leverage tool.

**Input shapes:**
```ts
{ files: ["src/auth.ts", "src/db/user.ts"] }
// or
{ diff: "<unified diff string>" }
```

**Ranking:**
1. Notes whose line range overlaps changed lines (highest signal)
2. `instruction`/`warning` notes scoped to the file or any parent directory
3. `decision` notes on the file
4. Other notes on the file
5. Open `handoff` notes on the file

**Filtering:** expired notes excluded by default; `priority: 'critical'` always included.

**Why killer:** the agent's biggest gap is missing context that lives outside the file (PR comments, Slack threads, an engineer's head). Notes attached to specific lines, surfaced *before* edit, fills it.

#### 5.5.2 Scoped instructions

A note with `type: instruction` and `scope: directory` becomes a binding rule for that subtree. Example: a note on `src/migrations/` saying *"All migrations must be reversible; see PR #42"* — every agent edit anywhere under `src/migrations/` includes this in `get_notes_for_changes`.

**Resolution:** walk up the directory tree collecting all directory-scoped notes. Closer ancestors rank higher. Cheap — runs against `INDEX.json.byFile` keys.

**UI in v0.3:** "Add note" on a folder defaults to `scope: directory`. Editor-driven creation defaults to `line`.

#### 5.5.3 Handoffs

`type: handoff` is the type agents write most often.

```markdown
---
type: handoff
priority: normal
author: claude-code
authorType: agent
references:
  - { kind: test, value: "test/parser.spec.ts:120" }
expiresAt: 2026-05-22T00:00:00Z   # 7 days from creation by default
---
Stopped here: tokenizer drops trailing whitespace in raw strings.
Tried: lookahead regex (broke fenced code), state machine for ws (worked locally, failed CI).
Next: try ANTLR grammar from `vendor/lang/`.
```

`add_handoff` tool fills these defaults; the agent only supplies `file`, `lineRange`, `content`, optionally `references`.

**Surfacing:** AGENTS.md hoists open handoffs to section 2 (after critical instructions). `get_handoffs` returns sorted by recency. New "Resume" CodeLens above any line with an active handoff.

**Expiry:** default 7 days. Stale handoffs hidden from MCP responses (unless `stale: true`); muted in sidebar with Dismiss / Renew.

#### 5.5.4 Decisions with first-class references

`type: decision` requires at least one reference. `add_decision` enforces this; manual creation shows "Reference required" validation.

**Reference rendering:**
- `kind: pr` / `kind: issue` → GitHub/GitLab link if `git remote origin` parseable; no-op otherwise.
- `kind: commit` → `git show` link via VS Code's git extension; remote link if available.
- `kind: test` → `file:line` link openable in editor.
- `kind: note` → deep link to another note in the sidebar.

#### 5.5.5 Expiry, priority, staleness

- **`expiresAt`** with type-specific defaults (handoffs 7d, todos 30d, others never).
- **`priority`** — `critical` always surfaces; `low` suppressed from `AGENTS.md` summary (still in `INDEX.json`).
- **Sidebar filter** — "Hide expired" on by default; toggle to show muted.

Combined: `get_notes_for_changes` returns *fewer, fresher, higher-signal* notes by default.

#### 5.5.6 Trade-offs

1. **Diff parsing** uses the `diff` npm package (~12KB). Acceptable.
2. **PR/commit references** assume Git. Non-Git workspaces store but don't render as links.
3. **Auto-expiry defaults are opinionated.** Override per-note and globally via `codeContextNotes.expiry.{type}`. Expired notes hide, not delete.
4. **Handoff "Resume" CodeLens** could visually conflict with the existing note CodeLens. Proposal: merge into one label like *"2 notes • 1 handoff"*.

## 6. Migration

Lazy by design. No batch script.

### 6.1 What migration means

1. **On read:** missing fields filled with defaults *in memory*. On-disk file untouched.
2. **On write:** new full-shape frontmatter emitted with defaults. Note "upgraded" on disk.
3. **On export regeneration:** all notes appear with effective fields regardless of on-disk shape.

Workspace can sit on v0.3 indefinitely; only edited notes get rewritten. No mass diff in `git status` after upgrade.

### 6.2 Defaults applied on read

| Field | Default for legacy notes |
|---|---|
| `type` | `context` |
| `scope` | `line` |
| `tags` | `[]` |
| `references` | `[]` |
| `priority` | `normal` |
| `expiresAt` | `null` |
| `authorType` | `human` |

Conservative — no legacy note suddenly becomes an `instruction` or gets an expiry.

### 6.3 Frontmatter format

Writer omits any field equal to its default. A plain note that's still just a `context` note on a line range stays the shape it always had.

### 6.4 Backward compatibility

A v0.2.x install opening a workspace with v0.3 notes: unknown frontmatter keys are ignored by the YAML loader. Note loads with its original fields. `INDEX.json`/`AGENTS.md` ignored. No data loss either direction. Mixed v0.2.x/v0.3 installs across a team are fine without coordination.

### 6.5 MCP server's view of legacy notes

By v0.4, v0.3 has shipped. MCP treats legacy notes (no `type`) as `context`. `list_instructions` and `get_handoffs` won't surface them unless re-saved with the right type.

Documented quick-start: *"Tag your most important notes"* — open new sidebar filter, find `instruction`-y notes, re-save with `type: instruction`. One-time curation, minutes per workspace.

### 6.6 Trade-offs

1. **No bulk-tag tool in v0.3.** Edit one at a time. Add bulk action in v0.5 if curation friction is real.
2. **`scope: directory` notes can't exist before v0.3.** Opt-in *new* note kind, not a migration of existing ones.
3. **First `AGENTS.md` generation** can be slow on 1000+ note workspaces (still under a second on a midrange laptop). Documented; one-time progress notification.
4. **No downgrade tool.** Rollback users keep using v0.2.x; new fields ignored.

## 7. Error handling & edge cases

### 7.1 Concurrent writes between extension and MCP server

Per-note advisory locks: `.code-notes/.locks/<id>.lock` containing `{pid, ts, holder}`. Acquired before read-modify-write; released after rename. Retries up to 500ms.

- **Extension on lock failure:** non-blocking notification *"Note is being edited by another process. Try again."* No data overwrite.
- **MCP server on lock failure:** returns `{ error: "lock_timeout", retryable: true }`.
- **Stale lock** (>60s old): forcibly broken; warning logged to audit.

### 7.2 Export regeneration failures

Note write succeeds (already committed). Export is best-effort:
- Failure logs to extension's output channel and `_audit.log`.
- Sidebar shows badge: *"Exports stale (last successful: 2 min ago)"*.
- Manual `Code Notes: Regenerate Exports` retries.
- MCP server reading stale `INDEX.json` notices via `generatedAt` vs. newest note's `updatedAt`; falls back to scanning `.code-notes/` directly.

Exports are a cache, not a source of truth. Markdown files are authoritative.

### 7.3 Malformed notes

- Loader catches parse error per file. Bad note excluded from in-memory state.
- Sidebar shows file with "1 unreadable note" badge and "Show errors" action.
- `INDEX.json` includes top-level `errors: [{file, message}]` array.
- Unknown `type`/`scope` values: log warning, treat as default. Don't drop the whole note.

### 7.4 MCP server on a non-workspace path

- Starts in **empty mode** — read tools return empty, write tools succeed (creates `.code-notes/` on first write).
- One-time log: *"No existing notes found at \<path\>."*
- `--require-existing` flag refuses startup with clear error (for CI checks).

### 7.5 Diff parsing in `get_notes_for_changes`

- Malformed diff: `{ error: "diff_parse_failed", detail: "..." }`. Agent falls back to `files[]`.
- Out-of-workspace files: silently filtered. `appliedFiles[]` tells the agent what matched.
- Renamed files: matched against both old and new paths. Notes follow the file via existing `contentHash` mechanism on next save.

### 7.6 Queue mode with stale targets

- Target edited between proposal and approve: detect via `prevContentHash` mismatch. Sidebar shows 3-way diff (original / proposed / current). Human picks or merges.
- Target deleted: proposal flagged orphaned, surfaced in "Orphaned proposals" subsection. Convert to new note or reject.

**Trade-off:** v0.5 ships with simple-pick (your version vs. theirs); add 3-way merge if conflicts happen in practice.

### 7.7 Audit log corruption

- Reader is line-by-line tolerant: skip unparseable lines, log single warning at startup with count.
- "Agent activity" view shows fewer entries; no crash.
- `Code Notes: Truncate Audit Log` command for manual recovery.

### 7.8 Symbol resolution failures (`scope: function | class`)

- Note loads with its `lineRange` as fallback.
- Sidebar shows "Symbol not found" indicator with "Reattach" action (pick new symbol or convert to `scope: line`).
- MCP responses include `scopeStatus: "stale" | "ok"`.

### 7.9 Trade-offs

1. **Lock files in `.code-notes/.locks/`** add directory entries inside storage. `.gitignore` by default; documented.
2. **3-way merge UI** is real surface area; ship simple-pick first.
3. **Audit log line-skip on parse error** silently loses information; alternative (refuse to load) is worse UX.

## 8. Testing strategy

### 8.1 Test layout

```
src/test/                          # extension tests (existing, extended)
packages/code-notes-core/test/     # NEW — extracted core
packages/code-notes-mcp/test/      # NEW — MCP server
```

Extension keeps `@vscode/test-electron`. Core and MCP packages run under `vitest` (fast, no VS Code shim).

### 8.2 What each layer owns

**`code-notes-core` (bulk of new tests):**
- Schema parsing: legacy round-trip, new round-trip, unknown fields preserved, malformed YAML
- Migration: read-then-write of legacy note produces new shape with no spurious changes
- Lock manager: happy path, timeout, stale recovery
- Export generator: deterministic `INDEX.json` output (order-stable, sorted indexes); `AGENTS.md` formatting snapshots
- Trust router: setting + write call → correct path (direct/queue/audit)
- Reference resolution: each kind, absent git remote degrades cleanly

**Extension (v0.3 + v0.5 surfaces):**
- Schema-aware sidebar: type filter, expired filter, "Hide expired" default
- Handoff "Resume" CodeLens with no visual conflict
- Settings UI writes correct setting keys
- Agent activity view (v0.5): renders audit log, Revert calls `noteManager` correctly
- Pending proposals view (v0.5): approve/reject/orphan handling

**`code-notes-mcp`:**
- Tool I/O contracts: every tool's input/output schema (snapshot-tested)
- `get_notes_for_changes`: stable ranking, truncation at 100 with `truncated: true`
- Read/write split: no `--agent` ⇒ read-only
- Diff parsing: known-good diffs match expected line ranges; malformed input documented error shape
- Resource endpoints return on-disk content, not stale cache

### 8.3 Cross-cutting integration tests

Highest-value tests; catch coordination bugs:

1. **Extension + MCP racing** on the same workspace. Spawn MCP in child process; overlapping writes; assert no lost updates and audit captures both ops in order.
2. **Migration round-trip across versions.** Fixture: v0.2.x `.code-notes/`. Load with v0.3 core, edit one note, assert on-disk shape matches spec exactly and untouched notes are unchanged on disk.
3. **`get_notes_for_changes` end-to-end.** Workspace with notes of every type/scope plus real unified diff. Assert returned list, ranking, truncation match the documented contract.
4. **Trust mode switching mid-session.** Queue-mode workspace with N pending proposals; flip to direct; assert prompt fires and proposals aren't silently lost.

### 8.4 Fixtures

`test/fixtures/workspaces/` per package:
- `legacy-v02-notes/` — migration tests
- `mixed-types/` — every type/scope/priority/expiry combination
- `large/` — 1000 generated notes for export-perf tests
- `corrupt/` — malformed frontmatter, broken locks, partial audit log

Generators next to fixtures.

### 8.5 Performance budgets

Tracked via `npm run bench`, not gating tests:
- Export regen on 1000-note workspace: <500ms
- `get_notes_for_changes` on 1000 notes + 50-file diff: <100ms
- MCP server cold start: <300ms

Regression in any of these is a release blocker.

### 8.6 CI matrix

- Node 18 / 20 / latest LTS
- VS Code stable + insiders
- macOS / Linux / Windows (explicit Windows test for path separators in `_audit.log`)

### 8.7 What we deliberately don't test

- **Real LLM agents.** No tests invoking Claude or Cursor against the MCP server. We test the protocol contract.
- **Marketplace publication.** Manual smoke-test post-publish per `RELEASE_TEMPLATE.md`.

### 8.8 Trade-offs

1. **Extracting `code-notes-core`** requires monorepo. Cheapest: npm workspaces. Three packages, one root `package.json`, one `tsconfig` base. Adopt in v0.4.
2. **MCP integration testing without a real agent** can miss ergonomic issues. Mitigation: dogfood with Claude Code during v0.4 development; capture friction in `MCP_FEEDBACK.md`.
3. **Performance budgets aspirational** without v0.2.x baselines. Establish in v0.3 before setting thresholds in v0.4.

## 9. Open questions

These are intentionally unresolved, to be decided during implementation planning or later:

- **Bulk re-tagging UX in v0.5.** Hold until users hit curation friction.
- **Embedding/semantic search.** Where do embeddings live? What model? v0.6+.
- **Auto-handoff on session end.** Should an agent auto-create a handoff when its session ends mid-task? Convention vs. enforced?
- **Cross-workspace notes.** Notes that follow code across repos (e.g., monorepo splits). Out of scope.
- **PR/issue auto-link patterns.** Today we'd parse `origin` URL; what about non-GitHub remotes (Bitbucket, GitLab self-hosted)?

## 10. Roadmap & ordering

| Release | Scope | Time-to-first-value for | Blocking deps |
|---|---|---|---|
| v0.3 | Schema + Exports + sidebar updates | Any file-reading agent | None |
| v0.4 | MCP server + `code-notes-core` extraction | MCP-capable agents (Claude Code, Cursor) | v0.3 (stable schema) |
| v0.5 | Trust model + audit/queue UI | Teams adopting agent assistance | v0.4 (write tools exist) |

Each release is independent enough to defer or accelerate based on feedback.

---

*End of design.*
