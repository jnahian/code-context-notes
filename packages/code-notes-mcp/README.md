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
