# Architecture

Code Context Notes is an **npm-workspaces monorepo** (`workspaces: ["packages/*"]`) with three packages plus a standalone marketing site.

```
code-context-notes/
├── packages/
│   ├── code-notes-core/   @jnahian/code-notes-core   — framework-agnostic domain logic (no vscode)
│   ├── extension/         code-context-notes         — the VS Code extension (published product)
│   └── code-notes-mcp/    @jnahian/code-notes-mcp     — standalone MCP server for AI agents
└── web/                                                — Vite + React marketing/docs site (not a workspace)
```

Both the extension and the MCP server depend on **core** via the workspace symlink; **core must be built first**. Core and MCP are ESM (`NodeNext`) — relative imports use explicit `.js` extensions even in `.ts` source.

## Why a shared core

The extension and the MCP server are two *hosts* over the same notes. Putting all domain logic in `code-notes-core` — with **no `vscode` dependency** — means one implementation of storage, hashing, search, exports, and the trust model, consumed identically by a human's editor and an agent's stdio server. The hosts are thin: the extension is UI/glue (comment threads, CodeLens, sidebar trees, git author detection); the MCP server is a tool/resource adapter.

## Core components (`code-notes-core`)

| Component | Responsibility |
|---|---|
| `NoteManager` | Orchestrates every note operation; **routes agent writes** by `agentWriteMode` (see below). The trust boundary lives here. |
| `StorageManager` | Serializes/parses notes to the on-disk markdown format (v1 legacy + v2). See [Storage format](storage-format.md). |
| `ContentHashTracker` | Hashes annotated code and relocates notes when line numbers change. |
| `LockManager` | Per-note advisory file locks (`.code-notes/.locks/`) so hosts don't race on the same note. |
| `AuditLog` | Append-only JSONL log of agent ops (`audit` mode); atomic rotation. |
| `ProposalStore` | Agent writes held as proposals (`queue` mode) under `_pending/`. |
| `workspaceConfig` | Reads/writes `.code-notes/config.json` (the shared policy). |
| `ExportGenerator` / `ExportWriter` | Generate `INDEX.json` and `AGENTS.md`. |
| `SearchManager` | Full-text search index over notes. |
| `ScopeResolver` | Resolves directory/file-scoped notes to the files they cover. |
| `noteDefaults` | Applies schema defaults at the boundary (back-compat for older notes). |

## The trust boundary

Write identity is a property of the **`NoteManager` instance**, not of the note being written:

- The MCP server constructs its manager with `agentWriter: true` — every write it makes is an agent write, whatever note it targets.
- The extension's manager is `agentWriter: false` — a human. Its writes are never logged or diverted, even when it edits an agent-authored note.

On each agent write, `NoteManager` consults a **per-call** `agentWriteMode()` (re-read from `config.json`, never cached) and routes:

```
agent write ──▶ agentWriteMode?
                 ├─ direct → apply immediately
                 ├─ audit  → apply, then append to AuditLog
                 └─ queue  → divert to ProposalStore, throw PendingWriteError
```

`PendingWriteError` is thrown rather than returned, so no caller can accidentally apply the write anyway; the MCP layer turns it into a `{ status: "pending" }` result. Unrouted human-only write paths (`updateNoteMetadata`, `updateNotePositions`, `undeleteNote`) **fail closed** for an agent writer.

See the [Trust model guide](../guide/trust-model.md) and the [design notes](../agent-trust-model/README.md) for the full rationale.

## Data flow

```
  VS Code extension                 MCP server (stdio)
  (human, agentWriter=false)        (agent, agentWriter=true)
        │                                   │
        └───────────────┬───────────────────┘
                        ▼
                   NoteManager  ── agentWriteMode ──▶ AuditLog / ProposalStore
                        │
          ┌─────────────┼───────────────┐
          ▼             ▼               ▼
     StorageManager  LockManager   ExportGenerator
          │                              │
     .code-notes/*.md            INDEX.json / AGENTS.md
```

Both hosts read and write the same `.code-notes/` directory and take the same per-note locks, so their writes are serialized against each other.

## Concurrency

Writes to a single note are serialized by advisory lock files (`.code-notes/.locks/<id>.lock`, exclusive-create, ~500 ms acquire timeout, stale locks >60 s broken). Writers **re-read from storage inside the lock** before saving, so a concurrent edit is never overwritten (the v0.4 lost-update fix). The audit log is the exception: appends are lock-free single-line writes, and rotation is an atomic rename, so no entry is lost under load.

## See also

- [Note schema](note-schema.md) — the `Note` type and enums
- [Storage format](storage-format.md) — on-disk layout of `.code-notes/`
- [MCP server README](../../packages/code-notes-mcp/README.md)
