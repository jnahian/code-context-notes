# Agents & MCP Server

Code Context Notes ships a standalone **MCP server**, [`@jnahian/code-notes-mcp`](../../packages/code-notes-mcp/README.md), that gives MCP-capable AI agents (Claude Code, Cursor, …) read/write access to the same workspace notes the extension manages. Agents can read the context you've left, leave notes of their own, and hand off work — all governed by the [trust model](trust-model.md).

## How agents see your notes

Two files are generated automatically in `.code-notes/` whenever notes change (debounced, deterministic):

- **`AGENTS.md`** — a human-readable digest that hoists `instruction`, `warning`, and `handoff` notes to the top. Point your agent at it as workspace context.
- **`INDEX.json`** — a machine-readable index of all notes.

These are also exposed as MCP resources (`code-notes://digest`, `code-notes://index`). Toggle their generation with the `exports.*` settings ([Configuration](configuration.md)).

## Running the MCP server

No install needed — run it with `npx`:

```bash
npx -y @jnahian/code-notes-mcp --workspace . --agent claude-code
```

- `--workspace <path>` **(required)** — the project root.
- `--agent <name>` — enables write access. Without it the server is **read-only** (only read tools are listed).
- `--storage-dir <name>` — match a customized `codeContextNotes.storageDirectory` (default `.code-notes`).
- `--require-existing` — fail startup if the workspace has no `.code-notes/` yet.

### Claude Code (`.mcp.json`)

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

### Cursor (`~/.cursor/mcp.json` or `.cursor/mcp.json`)

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

## Tools at a glance

**Read** (always available): `get_note`, `get_notes_for_file`, `get_notes_for_changes` (pre-edit context for a diff), `list_instructions`, `get_handoffs`, `search_notes`.

**Write** (only with `--agent`): `create_note`, `edit_note`, `delete_note`, `add_handoff`, `add_decision`.

**Resources:** `code-notes://digest`, `code-notes://index`, `code-notes://file/{path}`.

See the [MCP server README](../../packages/code-notes-mcp/README.md) for the full tool signatures, error convention, and troubleshooting.

## Safe by default

The extension and the MCP server serialize writes to the same note through **advisory file locks** (`.code-notes/.locks/`), so a human editing in VS Code and an agent writing over stdio never clobber each other.

Agent writes are then routed by the workspace's **[trust model](trust-model.md)** — logged (`audit`, the default), queued for approval (`queue`), or applied immediately (`direct`). The mode lives in `.code-notes/config.json`, not in the server's flags: an agent can't choose its own rails.

## See also

- [Trust model](trust-model.md) — control and review agent writes
- [Note types & metadata](note-types-metadata.md) — the fields agents can set
- [Architecture](../reference/architecture.md) — how the packages fit together
