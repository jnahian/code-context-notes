# @jnahian/code-notes-core

Shared internals for [Code Context Notes](https://github.com/jnahian/code-context-notes) — note storage, the note model and defaults, scope resolution, search, advisory file locks, and the `INDEX.json` / `AGENTS.md` export generators.

This package exists so the VS Code extension and the [`@jnahian/code-notes-mcp`](https://www.npmjs.com/package/@jnahian/code-notes-mcp) server can read and write the same `.code-notes/` directory through one implementation. It has no dependency on the `vscode` API — host-specific pieces (documents, author lookup, history storage) are injected as plain structural interfaces.

It's published for that purpose rather than as a general-purpose library: the API is not stable across versions yet, and consumers other than the extension and the MCP server should expect breaking changes. If you want to give an agent access to your notes, use the MCP server instead.

## License

MIT
