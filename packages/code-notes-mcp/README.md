# @jnahian/code-notes-mcp

MCP server for [Code Context Notes](../..) — gives coding agents read/write access to workspace notes over stdio.

## Install

```bash
npm install -g @jnahian/code-notes-mcp
```

## Configure

Add to your agent's MCP config:

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

`--workspace` is required — no implicit cwd guessing. `--agent` is required for write access; without it the server starts in read-only mode. `--require-existing` fails startup (exit 3) if the workspace has no `.code-notes/` directory yet.

## Tools

Registered in subsequent milestones; this scaffold ships the server shell only.

| Tool | Purpose |
|---|---|
| `search_notes` | Full-text + structured filter search. |
| `get_notes_for_file` | Notes attached to a file, including scope matches. |
| `get_notes_for_changes` | Notes overlapping edited line ranges (files or diff). |
| `list_instructions` | `instruction`/`warning` notes ranked by priority. |
| `get_note` | Full note with history and references. |
| `get_handoffs` | Open handoffs. |
| `create_note` / `edit_note` / `delete_note` | Write tools (read-write mode only). |
| `add_handoff` / `add_decision` | Convenience write tools. |

## Trust model

All writes route through `@jnahian/code-notes-core`, which enforces the workspace trust setting. v0.5 will add audit and queue modes for reviewing agent-authored notes before they land.

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
