<div align="center">
  <img src="https://raw.githubusercontent.com/jnahian/code-context-notes/main/packages/extension/images/icon.png" alt="Code Context Notes" width="128" height="128">

  # Code Context Notes

  Add contextual notes to your code with full version history and intelligent tracking. Notes stay with your code even when line numbers change — and AI coding agents can read and write them too, on your terms.

  [![VS Code Marketplace](https://vsmarketplacebadges.dev/version-short/jnahian.code-context-notes.svg?style=for-the-badge&logo=visual-studio-code&label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes)
  [![Open VSX](https://img.shields.io/open-vsx/v/jnahian/code-context-notes?style=for-the-badge&logo=eclipse-ide&label=Open%20VSX)](https://open-vsx.org/extension/jnahian/code-context-notes)
  [![Downloads](https://vsmarketplacebadges.dev/downloads-short/jnahian.code-context-notes.svg?style=for-the-badge&label=Downloads)](https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes)
</div>

## Why

Code comments clutter source files and pollute git history; external docs drift out of sync and lose their connection to the code. **Code Context Notes** is a third way: contextual annotations that live *alongside* your code without being part of it.

- ✅ **Non-invasive** — notes live in a `.code-notes/` directory, never in your source
- ✅ **Intelligent tracking** — notes follow code by content hash when it moves or is refactored
- ✅ **Complete history** — every edit preserved with author and timestamp
- ✅ **Structured** — type, tags, priority, scope, and references on every note
- ✅ **Workspace sidebar** — all notes organized by file, plus agent-activity and proposal views
- ✅ **AI-agent ready** — a standalone [MCP server](docs/guide/agents-and-mcp.md) gives agents access, governed by a [trust model](docs/guide/trust-model.md)
- ✅ **Team-friendly** — commit `.code-notes/` to share, or `.gitignore` it to keep local

## Install

```bash
code --install-extension jnahian.code-context-notes
```

Or search **Code Context Notes** in the Extensions view. Also on the [Open VSX Registry](https://open-vsx.org/extension/jnahian/code-context-notes) for VS Codium. Requires VS Code `1.80.0+`.

## Quick start

1. Select code (or place the cursor on a line)
2. Press `Ctrl+Alt+N` (`Cmd+Alt+N` on Mac)
3. Type your note and **Save** (`Ctrl+Enter`)

A CodeLens appears above your code and the note shows in the **Code Notes** sidebar. See [Getting started](docs/guide/getting-started.md).

## Documentation

**Guides**

- [Getting started](docs/guide/getting-started.md) — install and first note
- [Usage](docs/guide/usage.md) — add, edit, view, navigate, delete
- [Note types & metadata](docs/guide/note-types-metadata.md) — types, tags, priority, scope, references, expiry
- [Agents & MCP](docs/guide/agents-and-mcp.md) — give AI agents access to your notes
- [Trust model](docs/guide/trust-model.md) — audit / queue / direct agent-write modes
- [Configuration](docs/guide/configuration.md) — all settings
- [Commands & shortcuts](docs/guide/commands-shortcuts.md)
- [FAQ](docs/guide/faq.md)

**Reference**

- [Architecture](docs/reference/architecture.md) — the monorepo and how the pieces fit
- [Note schema](docs/reference/note-schema.md) — the `Note` type and enums
- [Storage format](docs/reference/storage-format.md) — the on-disk layout of `.code-notes/`

**Packages**

- [`@jnahian/code-notes-mcp`](packages/code-notes-mcp/README.md) — the MCP server

## Development

```bash
git clone https://github.com/jnahian/code-context-notes
cd code-context-notes
npm install
npm run compile
```

Press `F5` in VS Code to launch an Extension Development Host. The repo is an npm-workspaces monorepo (`packages/code-notes-core`, `packages/extension`, `packages/code-notes-mcp`) plus a `web/` site — see [Architecture](docs/reference/architecture.md). Tests: **446** across packages (core 168, MCP 76, extension 24 unit + 178 integration). See [CONTRIBUTING.md](CONTRIBUTING.md).

## Links

- **Issues:** [GitHub Issues](https://github.com/jnahian/code-context-notes/issues)
- **Discussions:** [GitHub Discussions](https://github.com/jnahian/code-context-notes/discussions)
- **Changelog:** [docs/changelogs/](docs/changelogs/)
- **License:** [MIT](LICENSE)
