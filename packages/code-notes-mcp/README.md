# @jnahian/code-notes-mcp

MCP server for [Code Context Notes](../..) — gives coding agents read/write access to workspace notes over stdio.

## Install

Run it straight from npm — no global install needed:

```bash
npx -y @jnahian/code-notes-mcp --workspace . --agent claude-code
```

`--workspace <path>` is required — no implicit cwd guessing. `--agent <name>` is required for write access; without it the server starts in read-only mode (only the read tools are listed). `--require-existing` fails startup (exit 3) if the workspace has no `.code-notes/` directory yet; otherwise the server starts in empty mode and creates it on first write. `--storage-dir <name>` overrides the notes directory (default `.code-notes`) — pass it if you changed the extension's `codeContextNotes.storageDirectory` setting.

## Configure

**Claude Code** — `.mcp.json` at the project root (`--workspace .` resolves against the project directory; for a user-level server in `~/.claude.json`, use an absolute path instead):

```json
{
  "mcpServers": {
    "code-notes": {
      "command": "npx",
      "args": ["-y", "@jnahian/code-notes-mcp", "--workspace", ".", "--agent", "claude-code"]
    }
  }
}
```

**Cursor** — `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "code-notes": {
      "command": "npx",
      "args": ["-y", "@jnahian/code-notes-mcp", "--workspace", ".", "--agent", "cursor"]
    }
  }
}
```

## Tools

Read tools are always available; write tools appear only when the server was started with `--agent`.

| Tool | Access | Input | Output |
|---|---|---|---|
| `get_note` | read | `id` | The full note with history and references. |
| `get_notes_for_file` | read | `file`, `includeScopeMatches?` | Notes attached to the file, plus directory-scoped notes covering it. |
| `get_notes_for_changes` | read | `files?` and/or `diff?` | Notes relevant to changed files or a unified diff, ranked by relevance. |
| `list_instructions` | read | `scope?` | Active `instruction`/`warning` notes, ranked by priority then recency. |
| `get_handoffs` | read | `stale?` | Handoff notes, most-recently-updated first (excludes expired unless `stale`). |
| `search_notes` | read | `query`, `type?`, `tags?`, `file?`, `includeExpired?` | Full-text matches with optional type/tag/file filters. |
| `create_note` | write | `file`, `lineRange`, `content`, `type?`, `tags?`, `scope?`, `references?`, `priority?`, `expiresAt?` | The created note (`authorType: agent`). |
| `edit_note` | write | `id`, `content` | The updated note (adds a history entry). |
| `delete_note` | write | `id` | Confirmation of the soft-delete. |
| `add_handoff` | write | `file`, `lineRange`, `content`, `references?` | A handoff note (expires in 7 days by default). |
| `add_decision` | write | `file`, `lineRange`, `content`, `references` | A decision note; `references` required. |

Every tool returns its result as text content whose body is JSON — a note object on success, or `{ "error": <code>, ... }` on failure (see [Error convention](#error-convention)).

## Resources

| URI | MIME | Contents |
|---|---|---|
| `code-notes://digest` | `text/markdown` | The `AGENTS.md` digest for the workspace. |
| `code-notes://index` | `application/json` | The `INDEX.json` note index. |
| `code-notes://file/{path}` | `text/markdown` | Notes for a single file (`path` is the workspace-relative path). Not enumerated in `resources/list`. |

## Trust model

Agent writes are governed by `agentWriteMode` in `<storageDir>/config.json` — a workspace-owned file, not a server flag. There is deliberately no `--write-mode` option: an agent that picks its own mode has no rails.

| Mode | Agent writes | Use when |
|---|---|---|
| `direct` | Land immediately, attributed `authorType: agent`. | Solo dev, trusted agent. |
| `audit` (default) | Land immediately, and every op is appended to `<storageDir>/_audit.log`. The extension's **Agent activity** view lists them with a Revert action. | Most teams. |
| `queue` | Do **not** touch live notes. Each write becomes a proposal in `<storageDir>/_pending/`, surfaced in the extension's **Pending agent proposals** view for Approve / Reject. | Shared or regulated codebases. |

```jsonc
// .code-notes/config.json
{
  "agentWriteMode": "audit",   // "direct" | "audit" | "queue"
  "agentAllowList": [],         // informational; empty allows any --agent name
  "auditLogRetention": 1000     // ops kept before rotating to _audit.log.1
}
```

Without `--agent`, the server is read-only and none of this applies.

### What write tools return in `queue` mode

Not a note, and **not an error** — retrying will not help:

```json
{ "status": "pending", "proposalId": "prop-xyz", "message": "Awaiting human approval." }
```

The mode is re-read from disk on every call, so a human changing it takes effect immediately — no server restart.

## Troubleshooting

- **`{ "error": "lock_timeout", "retryable": true }`** — another writer (the VS Code extension, or a second agent) held the note's lock. Retry the same call once after a short delay; if it times out again, treat it as a real conflict rather than looping.
- **No notes / empty results, and no `.code-notes/` in the workspace** — the server starts in empty mode when the workspace has no notes yet and creates `.code-notes/` on first write. Pass `--require-existing` if you want startup to fail (exit 3) instead.
- **Write tools return `{ "status": "pending" }` instead of a note** — the workspace is in `queue` mode. This is not a failure and retrying won't change it: a human approves the proposal in the extension's **Pending agent proposals** view. Check `agentWriteMode` in `<storageDir>/config.json`.
- **The agent sees no notes, or writes land somewhere the extension never shows** — the server defaults to `.code-notes/`, but the extension's `codeContextNotes.storageDirectory` setting can point elsewhere. If you changed it, pass the same value as `--storage-dir <name>`; otherwise the two sides read different directories and take their locks in different places, so their writes are no longer serialized against each other.
- **Version mismatch with the extension** — the MCP server and the VS Code extension share the on-disk note format via `@jnahian/code-notes-core`. Keep them on compatible versions; a note written by a newer format may not round-trip through an older reader.

## Error convention

Tool failures are never thrown as MCP protocol errors — they come back as a normal tool result whose text content is JSON: `{ "error": "<code>", ...extra fields }`. This keeps failure handling uniform for agents: always parse the result text and check for an `error` key first.

| Code | Meaning |
|---|---|
| `invalid_arguments` | Arguments failed schema validation, or the tool name itself is unrecognized; `detail` describes the issue(s). |
| `not_found` | No note exists with the given id. |
| `note_deleted` | `edit_note` was called on a note that has since been soft-deleted. |
| `file_not_found` | The target file doesn't exist in the workspace. |
| `invalid_line_range` | The requested line range doesn't fit the file. |
| `read_only_mode` | Server was started without `--agent`; write tools are unavailable. |
| `references_required` | `add_decision` requires at least one reference. |
| `lock_timeout` | Another writer holds the note's lock. `retryable: true` — safe to retry once. |
| `diff_parse_failed` | The supplied unified diff couldn't be parsed; `detail` has the reason. |
| `path_escapes_workspace` | The target file path resolves outside the workspace root. |
| `internal_error` | Unexpected failure; `detail` has the underlying message. Not safe to retry blindly. |

`lock_timeout` is transient: retry the same call once after a short delay. If it times out again, treat it as a real conflict rather than retrying in a loop.

This convention covers tools. The `code-notes://file/{path}` resource is a different transport shape (`contents[0].text` is markdown, not JSON) — a path that escapes the workspace returns `contents[0].text: "Error: path escapes workspace: <path>"` as plain text, not a coded JSON error.
