# Note Types & Metadata

Beyond free-text content, every note can carry structured metadata. These fields drive filtering in the sidebar and prioritization in the digests that AI agents read ([Agents & MCP](agents-and-mcp.md)). All fields are optional and default sensibly, so existing notes keep working unchanged.

Set them with **Code Notes: Set Note Type / Tags / Priority…**, or let an agent set them at creation time.

## Type

What kind of note this is. Default: `context`.

| Type | Meaning |
|---|---|
| `context` | Explanatory background (default) |
| `instruction` | A directive an agent or human **must** follow |
| `warning` | A hazard — "don't do X here" |
| `decision` | An architectural decision plus its rationale |
| `todo` | Outstanding work |
| `handoff` | "Next session, pick up here" (often agent-authored) |
| `rationale` | Why this code exists (usually links to PRs/commits) |

`instruction` and `warning` notes are hoisted to the top of the `AGENTS.md` digest and surfaced by the MCP `list_instructions` tool.

## Priority

Ordering weight for agent digests. Default: `normal`.

`low` · `normal` · `high` · `critical`

`critical` sorts first and is always included in digests. (Expired notes are still filtered out regardless of priority.)

## Scope

How widely the note applies. Default: `line`.

`line` · `function` · `class` · `file` · `directory`

Directory-scoped notes are returned for any file they cover — useful for "everything under `src/payments/` must…" style guidance.

## Tags

A free-form list of strings for grouping and filtering (e.g. `security`, `perf`, `tech-debt`). Filter the sidebar by tag or type with **Filter Notes by Type…**.

## References

Links to external artifacts. Each reference has a `kind`, a `value`, and an optional `label`.

Kinds: `pr` · `issue` · `commit` · `test` · `url` · `note`

`decision` notes created through the MCP server **require** at least one reference, so the "why" is always traceable.

## Expiry

`expiresAt` is an ISO 8601 timestamp. Once passed, the note is treated as **stale**: it's excluded from agent digests and search by default (pass an "include expired" option to see it). Handoff notes created by an agent default to a 7-day expiry. Use **Toggle Expired Notes** to show or hide expired notes in the UI.

Expiry never deletes a note — it only hides it from the default views.

## Author type

Every note records whether a `human` or an `agent` wrote it (`authorType`). This is how the trust model tells human and agent writes apart — see [Trust model](trust-model.md). When a human approves an agent's queued proposal, the approver's name is recorded in `approvedBy`.

## See also

- [Note schema reference](../reference/note-schema.md) — the exact field list and types
- [Storage format](../reference/storage-format.md) — how these fields are written to disk
