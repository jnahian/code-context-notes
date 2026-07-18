# Configuration

Open **Settings** (`Ctrl+,` / `Cmd+,`) and search for **Code Context Notes**, or edit `settings.json` directly. All keys are prefixed `codeContextNotes.`.

## General

| Setting | Default | Description |
|---|---|---|
| `storageDirectory` | `".code-notes"` | Directory where notes are stored, relative to the workspace root. |
| `authorName` | `""` | Override author detection. Empty uses your git username, then system username. |
| `showCodeLens` | `true` | Show CodeLens indicators above code that has notes. |

## Sidebar

| Setting | Default | Description |
|---|---|---|
| `sidebar.sortBy` | `"file"` | Sort notes by `"file"` (path, alphabetical), `"date"` (most recent first), or `"author"`. |
| `sidebar.previewLength` | `50` | Max length of note preview text in the sidebar (20–200). |
| `sidebar.autoExpand` | `false` | Automatically expand file nodes (default keeps them collapsed). |

> **Note:** the VS Code settings dropdown for `sidebar.sortBy` currently offers only `file`; `date` and `author` are honored if set in `settings.json` directly.

## Agent trust model

See the [Trust model](trust-model.md) guide for what these do. `agentWriteMode` is mirrored into `.code-notes/config.json` so the [MCP server](agents-and-mcp.md) reads the same policy.

| Setting | Default | Description |
|---|---|---|
| `agentWriteMode` | `"audit"` | How MCP-agent writes are handled: `"direct"`, `"audit"`, or `"queue"`. |
| `agentAllowList` | `[]` | Agent names allowed to write (matches the server's `--agent`). Empty allows any. Informational, **not** a security boundary. |
| `auditLogRetention` | `1000` | Audit-log entries kept before older ones rotate to `_audit.log.1`. |

## Exports

Auto-generated files that give AI agents workspace context — see [Agents & MCP](agents-and-mcp.md).

| Setting | Default | Description |
|---|---|---|
| `exports.enabled` | `true` | Auto-generate `INDEX.json` and `AGENTS.md` in the storage directory on every note change. |
| `exports.indexJson` | `true` | Generate `INDEX.json` (machine-readable index). |
| `exports.agentsMarkdown` | `true` | Generate `AGENTS.md` (human-readable digest). |

## Example `settings.json`

```json
{
  "codeContextNotes.storageDirectory": ".code-notes",
  "codeContextNotes.authorName": "Ada Lovelace",
  "codeContextNotes.agentWriteMode": "queue",
  "codeContextNotes.sidebar.sortBy": "date",
  "codeContextNotes.exports.enabled": true
}
```
