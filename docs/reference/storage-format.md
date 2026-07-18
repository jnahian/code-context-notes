# Storage Format

Everything lives under the storage directory (`.code-notes/` by default; configurable via `codeContextNotes.storageDirectory`). All formats are plain text so they read, diff, and merge like source.

## Directory layout

```
.code-notes/
├── <note-id>.md          # one file per note
├── config.json           # workspace policy (agentWriteMode, …)
├── _audit.log            # agent op log (audit mode); rotates to _audit.log.1
├── _pending/             # queued agent proposals (queue mode)
│   ├── <proposalId>.md
│   └── .rejected/        # rejected proposals, kept for audit
├── .locks/               # transient advisory write locks
├── INDEX.json            # generated machine index
└── AGENTS.md             # generated agent digest
```

## Note files (`<id>.md`)

Notes use a **versioned, length-delimited** format. The `**Format:** 2` marker distinguishes it from pre-v0.5 notes, which are read by an untouched legacy parser and migrate to v2 on next save.

```markdown
# Code Context Note

**File:** src/app.ts
**Lines:** 10-15
**Content Hash:** <hash-of-annotated-code>

## Note: <id>
**Format:** 2
**Author:** username
**Created:** 2026-07-18T10:30:00.000Z
**Updated:** 2026-07-18T14:45:00.000Z
**Type:** warning
**Priority:** high
**Tags:** security, auth
**AuthorType:** agent
**ApprovedBy:** Ada Lovelace
**Content Lines:** 2

## Current Content

Watch out: this bypasses the auth guard.
See the linked PR before touching it.

## Edit History

Complete chronological history of all edits to this code location:

### 2026-07-18T10:30:00.000Z - username - created

```lines=1
Original content
```
```

Metadata lines are only written when set / non-default (`**Type:**`, `**Scope:**`, `**Priority:**`, `**Tags:**`, `**AuthorType:**`, `**ApprovedBy:**`, `**ExpiresAt:**`, `**References:**`, and `**Status:** DELETED` for soft-deleted notes).

### Why length-delimited

`**Content Lines:** N` tells the parser to read exactly *N* lines as content, and each history entry's fence carries its own line count (` ```lines=M `). Because content is agent-controllable input, this guarantees a note body containing `**Status:** DELETED` or `## Edit History` is captured verbatim and can never be re-parsed as structure (which previously let a note delete itself or forge history on reload). Line ranges are stored **1-based** for readability and converted to 0-based on load.

## `config.json`

The workspace policy shared by the extension and the MCP server (see [Trust model](../guide/trust-model.md)):

```json
{
  "agentWriteMode": "audit",
  "agentAllowList": [],
  "auditLogRetention": 1000
}
```

Reads are tolerant: a missing or malformed file falls back to defaults field-by-field (`audit`, `[]`, `1000`) and never breaks note-taking.

## `_audit.log`

Append-only JSONL, one agent op per line, newest read last:

```json
{"ts":"2026-07-18T14:00:00.000Z","op":"edit","noteId":"abc…","agent":"claude-code","file":"src/app.ts","prevContentHash":"sha256:…","newContentHash":"sha256:…"}
```

Appends are lock-free single-line writes; once the line count exceeds `auditLogRetention`, the file is **atomically renamed** to `_audit.log.1`, so no entry is lost under concurrent writes. Both generations are read together.

## `_pending/<proposalId>.md`

A queued agent write, markdown-with-frontmatter. Free-text scalars (`file`, `agent`) are JSON-encoded so a newline can't split the frontmatter:

```markdown
---
proposalId: prop-<uuid>
op: edit
targetNoteId: abc…
file: "src/app.ts"
lineRange: [9, 14]
agent: "claude-code"
proposedAt: 2026-07-18T14:00:00.000Z
targetContentHash: sha256:…
---
The proposed note body.
```

Rejected proposals are moved to `_pending/.rejected/` (never deleted).

## Generated exports

- **`INDEX.json`** — machine-readable index of all notes. Only its `generatedAt` timestamp changes when nothing else did.
- **`AGENTS.md`** — human/agent-readable digest hoisting `instruction`/`warning`/`handoff` notes.

Both are regenerated (debounced) on note changes when `exports.enabled` is on; content and ordering are deterministic given the same notes.

## Version control

Commit `<id>.md` files (and `config.json`) to share notes and policy with your team. Ignore the transient and generated paths:

```gitignore
.code-notes/.locks/
.code-notes/_audit.log
.code-notes/_audit.log.1
.code-notes/_pending/
# Optional — if you don't want generated exports tracked:
.code-notes/INDEX.json
.code-notes/AGENTS.md
```

## See also

- [Note schema](note-schema.md) — the in-memory shape these files serialize
- [Architecture](architecture.md) — who reads and writes these files
