# Getting Started

Code Context Notes lets you attach contextual notes to your code without touching your source files. Notes live in a `.code-notes/` directory and follow your code even when line numbers change.

## Install

### VS Code Marketplace

1. Open **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Search for **Code Context Notes**
3. Click **Install**

Or from the command line:

```bash
code --install-extension jnahian.code-context-notes
```

### Open VSX (VS Codium)

Available on the [Open VSX Registry](https://open-vsx.org/extension/jnahian/code-context-notes) for VS Codium and other editors that use it.

## Requirements

- VS Code `1.80.0` or higher
- Git (optional — used for author detection; falls back to your system username)

## Add your first note

**From code:**

1. Select the code you want to annotate (or just place the cursor on a line)
2. Press `Ctrl+Alt+N` (`Cmd+Alt+N` on Mac)
3. Type your note (markdown supported)
4. Click **Save** or press `Ctrl+Enter`

**From the sidebar:**

1. Click the **Code Notes** icon in the Activity Bar
2. Click the **+** button in the sidebar toolbar
3. Type your note and save

A CodeLens indicator appears above your code and the note shows up in the sidebar.

## Where notes are stored

Notes are written as one markdown file per note under `.code-notes/` at your workspace root:

```
project/
├── src/app.ts
└── .code-notes/
    ├── abc123-….md          # one file per note
    ├── config.json          # workspace policy (see Trust model)
    ├── INDEX.json           # generated machine index
    └── AGENTS.md            # generated agent digest
```

Commit `.code-notes/` to share notes with your team, or add it to `.gitignore` to keep them local. See [Storage format](../reference/storage-format.md) for the on-disk details and which files to ignore.

## Next steps

- [Usage guide](usage.md) — adding, editing, viewing, and navigating notes
- [Note types & metadata](note-types-metadata.md) — types, tags, priority, scope, references
- [Agents & MCP](agents-and-mcp.md) — give AI coding agents access to your notes
- [Trust model](trust-model.md) — control how agent writes are handled
- [Configuration](configuration.md) — all settings
