# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project workflow rules

- Always create a user story based TODO file for a new feature or an improvement. Save it under `docs/{feature-title or improvement-title}/`
- while creating a user story, follow the template provided in `docs/USER_STORY_TEMPLATE.md`
- Always create a changelog entry for every feature, improvement, or bug fix. Save it under `docs/changelogs/`
- While creating a changelog entry, make sure to follow the template provided in `docs/changelogs/CHANGELOG_TEMPLATE.md`
- Don't add changelog entry for repeated bugs in a feature or improvement in the same release.
- Always request explicit permission before committing any changes to the repository
- When requested to write tests, invoke the test-writer agent
- update the task user story once completed
- When creating a new release, follow the process documented in `docs/RELEASE_TEMPLATE.md`

## Repository layout

npm-workspaces monorepo (`workspaces: ["packages/*"]`). Three packages plus a standalone web app:

- **`packages/code-notes-core`** (`@jnahian/code-notes-core`) — framework-agnostic domain logic. **No `vscode` dependency.** Owns note types, storage, hashing, search, exports. This is where business logic belongs; both other packages consume it.
- **`packages/extension`** (`code-context-notes`) — the VS Code extension (the published product). Thin UI/glue layer over core: comment controller, CodeLens, sidebar tree, git author detection.
- **`packages/code-notes-mcp`** (`@jnahian/code-notes-mcp`) — an MCP server exposing notes to AI agents (tools like `create_note`, `get_notes_for_changes`, `add_handoff`, `add_decision`). Also depends on core.
- **`web/`** — separate Vite + React SSR marketing/landing site. **NOT part of the npm workspaces**; has its own dependency tree and `web:*` scripts in the root `package.json`.

Both `extension` and `mcp` depend on core via the workspace symlink (declared as `@jnahian/code-notes-core@0.2.0`, but resolved to the local package). **Core must be built before them.**

Core and MCP are ESM (`NodeNext`) — relative imports use explicit `.js` extensions even in `.ts` source. Keep that convention when adding files.

## Common commands

Run from the repo root; workspace scripts fan out with `--if-present`:

```bash
npm install                 # installs all workspaces + hoists
npm run build               # build every package (build core first if running per-package)
npm test                    # run each package's test suite
npm run test:unit           # unit tests only (skips VS Code integration harness)
npm run compile:tsc         # typecheck all packages
```

Per package (`cd packages/<pkg>`):

- **core / mcp** — `npm run build` (`tsc` → `dist/`), `npm test` / `npm run test:unit` (vitest), `npm run test:watch`. Run one test: `npx vitest run src/foo.test.ts` or `npx vitest -t "test name"`.
- **extension** — `npm run compile` (esbuild bundle → `out/`), `npm run watch` (dev bundle watch), `npm run compile:tsc` (typecheck only). `npm run test` runs the full VS Code integration harness via `@vscode/test-electron` (downloads VS Code, launches Electron); `npm run test:unit` runs the faster non-Electron unit tests. `npm run test:coverage` adds nyc.
- **web** — `npm run web:dev` (Vite), `npm run web:dev:ssr`, `npm run web:build`.

Packaging/publishing the extension lives in `packages/extension/scripts/` (`npm run package`, `npm run publish`). Do not hand-roll releases — follow `docs/RELEASE_TEMPLATE.md`.

Note: root `package.json` `version` is stale (0.3.0); the extension's own `package.json` version is the source of truth for what ships.

## How notes are stored

Notes are **not** in source files. Each note is a human-readable markdown file under the workspace's `.code-notes/` directory (configurable via `codeContextNotes.storageDirectory`), named by note UUID, containing current content + full edit history. Notes track code by **content hash**, not line number, so they follow code across moves/refactors (`contentHashTracker.ts` in core).

On every note change, core auto-regenerates two agent-facing exports in the storage dir: `INDEX.json` (machine-readable) and `AGENTS.md` (human digest). The MCP server and the "Link Notes Digest to AGENTS.md / CLAUDE.md" command read from these. Note metadata (`NoteType`, `NoteScope`, `NotePriority`, `AuthorType`) drives digest prioritization — see `packages/code-notes-core/src/types.ts`.

## Where to make a change

- Domain behavior (storage, hashing, search, note lifecycle, exports) → **core**, with a vitest test.
- VS Code UI wiring (commands, comment threads, sidebar, CodeLens) → **extension**, in `extension.ts` and the corresponding provider file.
- Agent-facing tool/resource → **mcp**, in `src/tools/` or `src/resources/`.

Reference docs (architecture, note schema, on-disk storage format) are under `docs/reference/`; user-facing guides (usage, note types, MCP/agents, trust model, configuration) are under `docs/guide/`. See `docs/README.md` for the index.
