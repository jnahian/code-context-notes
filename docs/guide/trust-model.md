# Agent Trust Model

When AI agents can write notes (via the [MCP server](agents-and-mcp.md)), you decide what happens to those writes. One workspace setting — `codeContextNotes.agentWriteMode` — picks the policy, and two sidebar views let you review and undo agent activity.

> Identity comes from the **writer**, not the note. The MCP server is the agent; the VS Code extension is you. Your own edits are never diverted or logged, even when you edit an agent-authored note.

## The three modes

| Mode | Agent writes | Use when |
|---|---|---|
| `direct` | Land immediately, attributed `authorType: agent`. | Solo dev, trusted agent. |
| `audit` **(default)** | Land immediately **and** every op is appended to `.code-notes/_audit.log`, reviewable (and revertible) in the **Agent activity** view. | Most teams. |
| `queue` | **Do not** touch live notes. Each write becomes a proposal in `.code-notes/_pending/`, surfaced in the **Pending agent proposals** view for approval. | Shared or regulated codebases. |

Set the mode in VS Code settings (search "agent write mode"). The extension mirrors it into `.code-notes/config.json`, which the MCP server reads and **re-reads on every call** — a change takes effect with no restart. There is deliberately no server flag for the mode.

## `audit` mode — Agent activity view

Every agent create/edit/delete is logged to `.code-notes/_audit.log` (JSONL) without blocking the write. The **Agent activity** sidebar lists recent operations, each with:

- **Revert** — a create reverses to a delete, an edit restores the exact prior content, a delete restores the note.
- **Open note** — jump to where the note lives (even if it was deleted).
- **Truncate Audit Log** command — clear the log (your notes are untouched).

The log rotates atomically past `auditLogRetention` entries (default 1000), losing no entry even under concurrent writes from several agents.

## `queue` mode — Pending agent proposals view

Agent writes never touch live notes; each becomes a proposal file in `.code-notes/_pending/`. The write tool returns `{ "status": "pending", proposalId }` — a **success** shape, not an error, so agents don't retry-loop. The **Pending agent proposals** sidebar offers:

- **Approve** — apply the note, attributed to you, with the approver recorded in `approvedBy`.
- **Reject** — move the proposal to `_pending/.rejected/` (kept for audit, never silently destroyed).
- **Edit and approve** — tweak the agent's text first, then apply your version.

If the target note changed after the proposal was made, you're shown both versions and pick one. A proposal whose target note is gone is flagged **orphaned** and can only be rejected. Turning `queue` mode off while proposals are pending prompts you to review or reject them.

## Compatibility notes

- **`audit` is the default.** A workspace that already has notes gains a `.code-notes/config.json` and starts logging agent writes. Set the mode to `direct` for the pre-v0.5 behavior. A workspace with no notes is untouched until it has some.
- **Upgrade the MCP server alongside the extension.** A pre-v0.5 server against a v0.5 workspace ignores `config.json` and behaves as `direct`.

## See also

- [Configuration](configuration.md) — `agentWriteMode`, `agentAllowList`, `auditLogRetention`
- [Storage format](../reference/storage-format.md) — `config.json`, `_audit.log`, `_pending/` on disk
- [Agent trust model design notes](../agent-trust-model/README.md) — the full spec and rationale
- [v0.5.0 changelog](../changelogs/v0.5.0.md)
