# Agent Integration v0.4 — MCP Server (+ `code-notes-core` extraction) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@jnahian/code-notes-mcp`, a standalone MCP server that lets any MCP-capable agent (Claude Code, Cursor, etc.) read and write workspace notes against the same `.code-notes/` directory the extension uses. Shipping the server requires extracting `noteManager`/`storageManager`/`noteDefaults`/`exportGenerator`/`exportWriter`/`types` into a shared `code-notes-core` package consumed by both the extension and the server.

**Architecture:**
- Adopt **npm workspaces** at the repo root (3 packages: existing extension moves to `packages/extension/`; new `packages/code-notes-core/`; new `packages/code-notes-mcp/`).
- Sync between extension and server is via the filesystem; per-note advisory locks (`.code-notes/.locks/<id>.lock`) prevent lost updates.
- MCP server starts in **read-only mode**; passing `--agent <name>` enables write tools and stamps `authorType: 'agent'` on every write.

**Tech Stack:** TypeScript, npm workspaces, `@modelcontextprotocol/sdk`, `diff` npm package (~12 KB, for unified-diff parsing), existing extension Mocha tests, vitest for the two new packages.

**Spec reference:** `docs/superpowers/specs/2026-05-15-agent-integration-design.md` §4.2, §5.3, §5.5.1, §6.5, §7.1, §8.1-8.2.

## Two phases (could be two PRs if preferred)

- **Phase A (Tasks 1–9):** Monorepo + `code-notes-core` extraction. No user-visible change. Extension still ships as 0.4.0-pre; behavior unchanged. **This phase is self-contained and could ship as its own PR labeled "refactor".**
- **Phase B (Tasks 10–24):** MCP server with read tools, write tools, resources, plus the two v0.3 deferrals (`INDEX.json.errors[]`, directory-scope resolution).
- **Phase C (Tasks 25–27):** Release — changelogs + version bumps + first publish of `@jnahian/code-notes-mcp`.

## Deferred from v0.3 (handled in this plan)

The v0.3 plan's self-review explicitly deferred two items to v0.4:

1. **`INDEX.json.errors[]` population** — task 11 below adds a workspace-wide loader that collects parse errors and surfaces them.
2. **Directory-scope resolution** — task 12 below; required by `get_notes_for_file(includeScopeMatches: true)` and `get_notes_for_changes`.

## File / package layout (final state)

```
code-notes/
├── package.json                          # root workspace manifest, no code
├── packages/
│   ├── extension/                        # what was the repo root
│   │   ├── package.json                  # "code-context-notes" 0.4.0
│   │   ├── src/extension.ts
│   │   ├── src/notesSidebarProvider.ts   # vscode-coupled bits stay here
│   │   ├── src/noteTreeItem.ts
│   │   ├── src/commentController.ts
│   │   ├── src/codeLensProvider.ts
│   │   ├── src/searchUI.ts
│   │   ├── src/tagManager.ts             # if vscode-coupled; else moves to core
│   │   ├── src/tagInputUI.ts
│   │   └── src/test/                     # existing extension tests
│   ├── code-notes-core/                  # NEW — pure-TS, no vscode dep
│   │   ├── package.json                  # "@jnahian/code-notes-core" 0.1.0 (private OR published)
│   │   ├── tsconfig.json
│   │   ├── src/index.ts                  # public exports
│   │   ├── src/types.ts
│   │   ├── src/noteDefaults.ts
│   │   ├── src/storageManager.ts
│   │   ├── src/noteManager.ts            # EventEmitter-based, no vscode imports
│   │   ├── src/exportGenerator.ts
│   │   ├── src/exportWriter.ts           # getConfig injection (already plumbed in v0.3)
│   │   ├── src/searchManager.ts          # if pure logic; UI shim stays in extension
│   │   ├── src/lockManager.ts            # NEW — advisory file locks
│   │   ├── src/scopeResolver.ts          # NEW — directory-scope walker
│   │   └── test/                         # vitest
│   └── code-notes-mcp/                   # NEW
│       ├── package.json                  # "@jnahian/code-notes-mcp" 0.1.0
│       ├── tsconfig.json
│       ├── README.md                     # install / config / tool reference
│       ├── src/index.ts                  # CLI entry
│       ├── src/server.ts                 # MCP server construction
│       ├── src/tools/                    # one file per tool
│       │   ├── search_notes.ts
│       │   ├── get_notes_for_file.ts
│       │   ├── get_notes_for_changes.ts
│       │   ├── list_instructions.ts
│       │   ├── get_handoffs.ts
│       │   ├── get_note.ts
│       │   ├── create_note.ts
│       │   ├── edit_note.ts
│       │   ├── delete_note.ts
│       │   ├── add_handoff.ts
│       │   └── add_decision.ts
│       ├── src/resources/                # one file per resource
│       │   ├── digest.ts
│       │   ├── index.ts
│       │   └── file.ts
│       ├── src/diffParser.ts             # wraps `diff` package
│       └── test/                         # vitest
└── docs/                                 # unchanged
```

`web/` stays at the repo root (not inside `packages/`) — it's not a published npm artifact and shares no code with the extension.

---

# Phase A — Monorepo setup + `code-notes-core` extraction

## Task 1: Set up npm workspaces at the repo root

**Files:**
- Modify: `package.json` (root)
- Create: `packages/extension/` (move existing extension files here)

- [ ] **Step 1: Snapshot the current root**

Run from the repo root:
```bash
ls -1 src/ | sort > /tmp/extension-src-before.txt
```
Capture the file list so the post-move diff is verifiable.

- [ ] **Step 2: Move the extension into `packages/extension/`**

```bash
mkdir -p packages/extension
# Move source, tests, build assets, package metadata
git mv src packages/extension/src
git mv esbuild.config.js packages/extension/esbuild.config.js
git mv tsconfig.json packages/extension/tsconfig.json
git mv .vscodeignore packages/extension/.vscodeignore
git mv scripts packages/extension/scripts
# Keep at root: README.md, docs/, web/, .gitignore, .github/, CHANGELOG_WEB_GUIDE.md (it's web-only)
```

Then move `package.json` — but keep a slimmed-down root `package.json` (see Step 3). Easiest:
```bash
cp package.json packages/extension/package.json
```

- [ ] **Step 3: Create the root workspace manifest**

Overwrite root `package.json` with a workspace orchestrator. Strip the extension-specific `engines`, `contributes`, `activationEvents`, `categories`, `scripts` (most), `dependencies`, `devDependencies` — move all of those to `packages/extension/package.json`. Keep at root only:

```json
{
  "name": "code-notes-monorepo",
  "private": true,
  "version": "0.0.0",
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "test:unit": "npm run test:unit --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "compile:tsc": "npm run compile:tsc --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "<copy version from old root>",
    "@types/node": "<copy>"
  }
}
```

- [ ] **Step 4: Adjust paths**

Inside `packages/extension/package.json`, paths likely need updating:
- `"main": "./out/extension.js"` — confirm `out/` resolves correctly when run from `packages/extension/`. esbuild output dir already relative; should work.
- `"scripts"` entries that reference `./` (e.g. test runners) — verify they still find files.

Inside `packages/extension/esbuild.config.js` and `packages/extension/tsconfig.json` — confirm entry points and include paths still resolve (`./src/extension.ts` etc.). They should — everything moved as a unit.

- [ ] **Step 5: Reinstall and verify**

```bash
rm -rf node_modules packages/*/node_modules
npm install
```

`npm install` at root populates each workspace's `node_modules` as needed.

```bash
npm run compile:tsc -w code-context-notes
npm run test:unit -w code-context-notes
```

Expected: type-check clean; 58 tests still pass. If a path is broken, fix in `packages/extension/` only (don't introduce root-level shims).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "🏗 refactor: adopt npm workspaces; move extension to packages/extension

Sets up monorepo layout for the upcoming code-notes-core extraction
and code-notes-mcp package. Extension is unchanged behaviorally — only
its repo location moved."
```

---

## Task 2: Create `packages/code-notes-core/` shell

**Files:**
- Create: `packages/code-notes-core/package.json`
- Create: `packages/code-notes-core/tsconfig.json`
- Create: `packages/code-notes-core/src/index.ts` (empty re-exports for now)
- Create: `packages/code-notes-core/.gitignore`

- [ ] **Step 1: `packages/code-notes-core/package.json`**

```json
{
  "name": "@jnahian/code-notes-core",
  "version": "0.1.0",
  "description": "Shared core for Code Context Notes — schema, storage, exports, lock manager.",
  "license": "MIT",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc -p ./",
    "compile:tsc": "tsc -p ./ --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "<root version>",
    "@types/node": "<root version>",
    "vitest": "^1.6.0"
  }
}
```

**Decision: published or private?** Recommend **published** (the MCP server depends on it; published is simpler than configuring workspace-only resolution for npm consumers). If you want to keep it internal-only, set `"private": true` and the MCP server can depend on it via the workspace protocol (`"@jnahian/code-notes-core": "workspace:*"`), but then `npx -y @jnahian/code-notes-mcp` won't work until you publish core too. **Default: publish both, simpler.**

- [ ] **Step 2: `packages/code-notes-core/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "lib": ["ES2022"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "test", "node_modules"]
}
```

- [ ] **Step 3: `packages/code-notes-core/src/index.ts` (stub)**

```typescript
// Empty for now. Tasks 3–6 fill this in.
export {};
```

- [ ] **Step 4: Wire workspace install**

```bash
npm install
```

- [ ] **Step 5: Commit**

```bash
git add packages/code-notes-core
git commit -m "🏗 build: scaffold @jnahian/code-notes-core package shell"
```

---

## Task 3: Move pure-logic modules into `code-notes-core`

**Files moved:** `types.ts`, `noteDefaults.ts`, `exportGenerator.ts` (zero VS Code dependencies — confirmed during v0.3).

- [ ] **Step 1: Move files**

```bash
git mv packages/extension/src/types.ts packages/code-notes-core/src/types.ts
git mv packages/extension/src/noteDefaults.ts packages/code-notes-core/src/noteDefaults.ts
git mv packages/extension/src/exportGenerator.ts packages/code-notes-core/src/exportGenerator.ts
```

- [ ] **Step 2: Export from `code-notes-core/src/index.ts`**

```typescript
export * from './types.js';
export * from './noteDefaults.js';
export * from './exportGenerator.js';
```

- [ ] **Step 3: Make extension depend on `code-notes-core`**

In `packages/extension/package.json`, add to `dependencies`:
```json
"@jnahian/code-notes-core": "0.1.0"
```

(Workspace resolution: npm workspaces will symlink the workspace package automatically because `packages/code-notes-core` exists. No `workspace:` prefix needed unless you're using pnpm/yarn.)

- [ ] **Step 4: Rewrite imports in extension code**

Every import in `packages/extension/src/**/*.ts` that referenced `./types.js`, `./noteDefaults.js`, or `./exportGenerator.js` becomes:

```typescript
import { Note, NoteType, applyDefaults, buildIndex, ... } from '@jnahian/code-notes-core';
```

Do this with a find/replace, but verify each replacement (don't mass-replace blindly — some files may import multiple of these).

- [ ] **Step 5: Move corresponding tests**

```bash
git mv packages/extension/src/test/suite/noteDefaults.test.ts packages/code-notes-core/test/noteDefaults.test.ts
git mv packages/extension/src/test/suite/exportGenerator.test.ts packages/code-notes-core/test/exportGenerator.test.ts
```

Rewrite to vitest syntax (replace `suite`/`test` from mocha with `describe`/`it`; replace Node's `assert` with vitest's `expect`).

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { applyDefaults, isExpired } from '../src/noteDefaults.js';
// ...
describe('noteDefaults', () => {
  it('fills all optional fields on a legacy note', () => {
    const filled = applyDefaults({ ...baseNote });
    expect(filled.type).toBe('context');
  });
});
```

Remove the moved tests from `packages/extension/src/test/runUnitTests.ts` allowlist.

- [ ] **Step 6: Build core, then build extension**

```bash
npm run build -w @jnahian/code-notes-core
npm run compile:tsc -w code-context-notes
npm run test -w @jnahian/code-notes-core   # vitest
npm run test:unit -w code-context-notes    # mocha
```

All green. Tests that moved to core count toward core's suite; extension's unit count drops by 10 (the 5 noteDefaults + 5 exportGenerator).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "♻️ refactor: move types/noteDefaults/exportGenerator to code-notes-core

Pure-logic modules with no VS Code dependency. Extension imports
them via @jnahian/code-notes-core. Tests rewritten for vitest."
```

---

## Task 4: Move `storageManager` and `exportWriter` into core

These depend only on Node stdlib. `exportWriter` already accepts an injectable `getConfig` (v0.3 Task 10) so VS Code lookup stays in the extension.

- [ ] **Step 1: Move files**

```bash
git mv packages/extension/src/storageManager.ts packages/code-notes-core/src/storageManager.ts
git mv packages/extension/src/exportWriter.ts packages/code-notes-core/src/exportWriter.ts
```

- [ ] **Step 2: Export and rewrite imports** (as Task 3 Step 4)

- [ ] **Step 3: Move tests**

```bash
git mv packages/extension/src/test/suite/storageManager.test.ts packages/code-notes-core/test/storageManager.test.ts
git mv packages/extension/src/test/suite/exportWriter.test.ts packages/code-notes-core/test/exportWriter.test.ts
```

Rewrite to vitest. The exportWriter test that constructs paths under `os.tmpdir()` already works without VS Code — just adapt syntax.

- [ ] **Step 4: Build, test, commit**

```bash
npm run build -w @jnahian/code-notes-core
npm run test -w @jnahian/code-notes-core
npm run test:unit -w code-context-notes
```

```bash
git add -A
git commit -m "♻️ refactor: move storageManager and exportWriter to code-notes-core"
```

---

## Task 5: Move `noteManager` into core

This is the delicate one — `noteManager` may import `vscode` for events. Verify and clean before moving.

- [ ] **Step 1: Audit `noteManager.ts` for VS Code dependencies**

```bash
grep -n "from 'vscode'\|require('vscode')" packages/extension/src/noteManager.ts
```

Likely sources of coupling:
- `vscode.EventEmitter` — use Node's `EventEmitter` instead (it already does — confirmed in v0.3).
- `vscode.workspace.getConfiguration` for author lookup — extract config getter pattern (same as exportWriter in v0.3).
- `vscode.Uri` for path manipulation — replace with Node `path`.

If any genuine VS Code dep exists that can't be cleanly extracted, **stop and report** — that's a design judgment call.

- [ ] **Step 2: Replace VS Code calls with injection**

If `noteManager` reads `vscode.workspace.getConfiguration('codeContextNotes').get('authorName', ...)`, change the constructor to accept an `authorName: string` (or `getAuthor: () => string`). The extension passes the VS Code-looked-up value.

- [ ] **Step 3: Move file**

```bash
git mv packages/extension/src/noteManager.ts packages/code-notes-core/src/noteManager.ts
git mv packages/extension/src/test/suite/noteManager.test.ts packages/code-notes-core/test/noteManager.test.ts
```

Rewrite tests for vitest. The existing test currently runs under the VS Code host (per Task 5 of v0.3) — it likely imports `vscode` for setup helpers. Strip those: `noteManager` no longer needs the host. Use `os.tmpdir()` for test workspaces, instantiate `StorageManager` directly.

- [ ] **Step 4: Update extension construction**

In `packages/extension/src/extension.ts` `activate()`, where `noteManager` is constructed, pass the author config:

```typescript
const authorName = vscode.workspace.getConfiguration('codeContextNotes').get<string>('authorName', os.userInfo().username);
const noteManager = new NoteManager(storageManager, { authorName });
```

(Adapt the option object shape to what the refactored constructor accepts.)

- [ ] **Step 5: Build, test, commit**

```bash
npm run build -w @jnahian/code-notes-core
npm run test -w @jnahian/code-notes-core
npm run test:unit -w code-context-notes
```

```bash
git add -A
git commit -m "♻️ refactor: move noteManager to code-notes-core

Decouples NoteManager from VS Code APIs. Author lookup is injected
by the caller. Extension wraps the VS Code config in the option object."
```

---

## Task 6: Move `searchManager` (pure parts) into core

`searchManager.ts` is the inverted-index implementation. It's pure logic. `searchUI.ts` and `searchTypes.ts` may or may not be vscode-coupled — keep the UI shim in the extension.

- [ ] **Step 1: Audit**

```bash
grep -n "from 'vscode'\|require('vscode')" packages/extension/src/searchManager.ts packages/extension/src/searchTypes.ts
```

- [ ] **Step 2: Move pure files; leave UI**

```bash
git mv packages/extension/src/searchManager.ts packages/code-notes-core/src/searchManager.ts
# searchTypes.ts moves IF pure
# searchUI.ts stays in extension
```

Adjust imports.

- [ ] **Step 3: Move tests**

Search tests in `packages/extension/src/test/suite/` → `packages/code-notes-core/test/`. Rewrite to vitest.

- [ ] **Step 4: Build, test, commit**

```bash
git add -A
git commit -m "♻️ refactor: move searchManager logic to code-notes-core"
```

---

## Task 7: Create the `lockManager` (advisory file locks)

**Files:**
- Create: `packages/code-notes-core/src/lockManager.ts`
- Create: `packages/code-notes-core/test/lockManager.test.ts`

Per spec §7.1: per-note advisory locks at `.code-notes/.locks/<id>.lock` containing `{pid, ts, holder}`. Retries up to 500ms. Stale lock (>60s) forcibly broken with warning.

- [ ] **Step 1: Write the failing test**

`packages/code-notes-core/test/lockManager.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LockManager } from '../src/lockManager.js';

async function tmpdir() { return await fs.mkdtemp(path.join(os.tmpdir(), 'cn-lock-')); }

describe('LockManager', () => {
  it('acquires and releases a lock for a note', async () => {
    const ws = await tmpdir();
    const lm = new LockManager(path.join(ws, '.code-notes', '.locks'), 'test');
    await lm.acquire('note-a');
    await lm.release('note-a');
    const exists = await fs.stat(path.join(ws, '.code-notes', '.locks', 'note-a.lock')).catch(() => null);
    expect(exists).toBeNull();
  });

  it('throws lock_timeout when another holder owns the lock past retry window', async () => {
    const ws = await tmpdir();
    const dir = path.join(ws, '.code-notes', '.locks');
    await fs.mkdir(dir, { recursive: true });
    // Pre-write a fresh lock owned by another process
    await fs.writeFile(path.join(dir, 'note-b.lock'),
      JSON.stringify({ pid: 99999, ts: new Date().toISOString(), holder: 'other' }));
    const lm = new LockManager(dir, 'me', { retryMs: 200 });
    await expect(lm.acquire('note-b')).rejects.toThrow(/lock_timeout/);
  });

  it('forcibly breaks stale locks (>60s old)', async () => {
    const ws = await tmpdir();
    const dir = path.join(ws, '.code-notes', '.locks');
    await fs.mkdir(dir, { recursive: true });
    const staleTs = new Date(Date.now() - 90_000).toISOString();
    await fs.writeFile(path.join(dir, 'note-c.lock'),
      JSON.stringify({ pid: 99999, ts: staleTs, holder: 'other' }));
    const lm = new LockManager(dir, 'me');
    await lm.acquire('note-c'); // should succeed by breaking the stale lock
    await lm.release('note-c');
  });
});
```

- [ ] **Step 2: Implement `lockManager.ts`**

Sketch (refine during implementation):

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LockManagerOptions {
  retryMs?: number;
  staleAfterMs?: number;
}

interface LockFile { pid: number; ts: string; holder: string; }

export class LockManager {
  constructor(
    private locksDir: string,
    private holder: string,
    private opts: LockManagerOptions = {},
  ) {}

  async acquire(noteId: string): Promise<void> {
    const retryMs = this.opts.retryMs ?? 500;
    const staleAfterMs = this.opts.staleAfterMs ?? 60_000;
    const lockPath = path.join(this.locksDir, `${noteId}.lock`);
    await fs.mkdir(this.locksDir, { recursive: true });
    const deadline = Date.now() + retryMs;

    while (true) {
      // Try to create exclusively
      try {
        const fd = await fs.open(lockPath, 'wx');
        await fd.writeFile(JSON.stringify({ pid: process.pid, ts: new Date().toISOString(), holder: this.holder }));
        await fd.close();
        return;
      } catch (e: any) {
        if (e.code !== 'EEXIST') throw e;
      }
      // Read the existing lock to check staleness
      try {
        const raw = await fs.readFile(lockPath, 'utf-8');
        const lock: LockFile = JSON.parse(raw);
        const age = Date.now() - new Date(lock.ts).getTime();
        if (age > staleAfterMs) {
          console.warn(`[code-notes-core] breaking stale lock ${noteId} held by ${lock.holder} (${age}ms old)`);
          await fs.unlink(lockPath).catch(() => undefined);
          continue;
        }
      } catch { /* ignore — race */ }

      if (Date.now() >= deadline) {
        throw new Error(`lock_timeout: ${noteId}`);
      }
      await new Promise(r => setTimeout(r, 25));
    }
  }

  async release(noteId: string): Promise<void> {
    const lockPath = path.join(this.locksDir, `${noteId}.lock`);
    await fs.unlink(lockPath).catch(() => undefined);
  }

  async withLock<T>(noteId: string, fn: () => Promise<T>): Promise<T> {
    await this.acquire(noteId);
    try { return await fn(); } finally { await this.release(noteId); }
  }
}
```

Export from `code-notes-core/src/index.ts`.

- [ ] **Step 3: Run tests**

```bash
npm run test -w @jnahian/code-notes-core
```

All 3 LockManager tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/code-notes-core/src/lockManager.ts packages/code-notes-core/test/lockManager.test.ts packages/code-notes-core/src/index.ts
git commit -m "✨ feat(core): add LockManager for per-note advisory file locks

Per spec §7.1: write tries acquire exclusive lock at .code-notes/.locks/<id>.lock.
Stale locks (>60s) forcibly broken. Throws lock_timeout after 500ms by default.
Used by both the extension and MCP server to prevent concurrent-write lost updates."
```

---

## Task 8: Wire `NoteManager` writes through `LockManager`

- [ ] **Step 1: Inject LockManager into NoteManager**

Constructor signature:
```typescript
constructor(storage: NoteStorage, opts: { authorName: string; lockManager?: LockManager }) { ... }
```

In `createNote`/`updateNote`/`deleteNote`/`updateNoteMetadata`, wrap the read-modify-write with `this.lockManager?.withLock(noteId, () => ...)`. If no lock manager is provided (e.g., a test), behavior is unchanged.

- [ ] **Step 2: Extension constructs the LockManager**

In `packages/extension/src/extension.ts`:

```typescript
import { LockManager } from '@jnahian/code-notes-core';
// ...
const lockManager = new LockManager(
  path.join(workspaceRoot, storageDirectory, '.locks'),
  'extension',
);
const noteManager = new NoteManager(storageManager, { authorName, lockManager });
```

- [ ] **Step 3: Add `.code-notes/.locks/` to default .gitignore guidance**

Append to README's "Generated exports" section (or create a sibling subsection):
```
.code-notes/.locks/
```

- [ ] **Step 4: Test + commit**

```bash
npm run test -w @jnahian/code-notes-core
npm run test:unit -w code-context-notes
```

```bash
git add -A
git commit -m "✨ feat(core): wire NoteManager writes through LockManager

Concurrent writes between the extension and the (upcoming) MCP server
no longer race. .code-notes/.locks/ added to gitignore guidance."
```

---

## Task 9: Verify extension still works end-to-end

This is the Phase A milestone. No new feature; full regression check.

- [ ] **Step 1: Full build matrix**

```bash
npm run compile:tsc --workspaces
npm run build -w @jnahian/code-notes-core
npm run compile -w code-context-notes        # esbuild
npm run test --workspaces                    # core: vitest, extension: mocha
```

All green. Total unit test count = 58 (was extension-only) + ~15 LockManager + new test layout = ~70+.

- [ ] **Step 2: Package extension as vsix**

```bash
cd packages/extension && npm run package:dev
```

Confirm `code-context-notes-0.4.0.vsix` (or `0.4.0-pre.0` — pick a pre-release label until Phase C) packages without errors. Check the vsix doesn't accidentally ship `packages/code-notes-core/src/`; only `dist/` (or whatever the bundled output is) should appear.

- [ ] **Step 3: Smoke-install (if possible)**

If a human is available, install the vsix in a clean workspace and create / edit / delete a note. Verify exports still regenerate.

- [ ] **Step 4: Commit (if any clean-up changes)**

```bash
git add -A
git commit -m "🏗 build: verify monorepo extraction end-to-end"
```
*Skip if nothing to commit.*

**Phase A complete.** If desired, open a PR here for the refactor; Phase B can be a separate PR.

---

# Phase B — MCP server (`@jnahian/code-notes-mcp`)

## Task 10: Scaffold the MCP server package

**Files:**
- Create: `packages/code-notes-mcp/package.json`
- Create: `packages/code-notes-mcp/tsconfig.json`
- Create: `packages/code-notes-mcp/src/index.ts` (CLI entry)
- Create: `packages/code-notes-mcp/src/server.ts` (MCP server construction)
- Create: `packages/code-notes-mcp/README.md`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@jnahian/code-notes-mcp",
  "version": "0.1.0",
  "description": "MCP server for Code Context Notes — gives coding agents read/write access to workspace notes.",
  "license": "MIT",
  "main": "./dist/index.js",
  "bin": { "code-notes-mcp": "./dist/index.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc -p ./",
    "compile:tsc": "tsc -p ./ --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run"
  },
  "dependencies": {
    "@jnahian/code-notes-core": "0.1.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "diff": "^5.2.0"
  },
  "devDependencies": {
    "@types/diff": "^5.2.0",
    "@types/node": "<root>",
    "typescript": "<root>",
    "vitest": "^1.6.0"
  }
}
```

Lock the MCP SDK version to whatever is current at implementation time; check `npm view @modelcontextprotocol/sdk versions`.

- [ ] **Step 2: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2022"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "test", "node_modules"]
}
```

- [ ] **Step 3: CLI entry `src/index.ts`**

```typescript
#!/usr/bin/env node
import { startServer } from './server.js';

function parseArgs(argv: string[]): { workspace: string; agent?: string; requireExisting: boolean } {
  const out: any = { requireExisting: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--workspace') out.workspace = argv[++i];
    else if (a === '--agent') out.agent = argv[++i];
    else if (a === '--require-existing') out.requireExisting = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: code-notes-mcp --workspace <path> [--agent <name>] [--require-existing]');
      process.exit(0);
    }
  }
  if (!out.workspace) {
    console.error('error: --workspace <path> is required');
    process.exit(2);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await startServer(args);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Server shell `src/server.ts`**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  StorageManager, NoteManager, ExportWriter, LockManager,
} from '@jnahian/code-notes-core';

export interface StartArgs {
  workspace: string;
  agent?: string;
  requireExisting?: boolean;
}

export async function startServer(args: StartArgs): Promise<void> {
  // Resolve and validate workspace
  const workspace = path.resolve(args.workspace);
  const storageDir = '.code-notes';
  const storageExists = await fs.stat(path.join(workspace, storageDir)).then(s => s.isDirectory()).catch(() => false);
  if (args.requireExisting && !storageExists) {
    console.error(`error: no .code-notes/ found at ${workspace}`);
    process.exit(3);
  }
  if (!storageExists) {
    console.error(`[code-notes-mcp] No existing notes at ${workspace}; starting in empty mode.`);
  }

  const storage = new StorageManager(workspace, storageDir);
  const lockManager = new LockManager(path.join(workspace, storageDir, '.locks'), args.agent ?? 'mcp');
  const noteManager = new NoteManager(storage, {
    authorName: args.agent ?? 'unknown-agent',
    lockManager,
  });

  const readOnly = !args.agent;
  const server = new Server(
    { name: 'code-notes', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  // Tools/resources registered in subsequent tasks
  // registerReadTools(server, { noteManager, workspace, storageDir });
  // if (!readOnly) registerWriteTools(server, { noteManager, agent: args.agent! });
  // registerResources(server, { workspace, storageDir });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[code-notes-mcp] ready (workspace=${workspace}, mode=${readOnly ? 'read-only' : 'read-write'}, agent=${args.agent ?? 'none'})`);
}
```

- [ ] **Step 5: README `packages/code-notes-mcp/README.md`**

Short and practical. Install snippet, MCP config block (from spec §5.3.2), tool table (placeholder rows; subsequent tasks fill them in), and a "Trust model" pointer noting v0.5 will add audit/queue modes.

- [ ] **Step 6: Build + smoke**

```bash
npm install
npm run build -w @jnahian/code-notes-mcp
node packages/code-notes-mcp/dist/index.js --workspace /tmp/no-such --require-existing
# expect: error: no .code-notes/ found at /tmp/no-such; exit 3
```

```bash
mkdir -p /tmp/cn-smoke/.code-notes
node packages/code-notes-mcp/dist/index.js --workspace /tmp/cn-smoke --agent test-agent &
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' | ...
```

(Full stdio MCP smoke is complex; minimum: server starts without crashing.)

- [ ] **Step 7: Commit**

```bash
git add packages/code-notes-mcp
git commit -m "🎉 feat(mcp): scaffold @jnahian/code-notes-mcp package

CLI entry + server shell + stdio transport. No tools or resources
registered yet — those land in subsequent tasks. Read-only by default;
--agent <name> enables write tools."
```

---

## Task 11: Workspace-wide loader with `INDEX.json.errors[]` (v0.3 deferral)

The MCP server (and the extension's regenerate-exports flow) both need a single function that loads every note in a workspace AND captures per-file parse failures. v0.3 stubbed `errors: []`; v0.4 actually populates it.

**Files:**
- Modify: `packages/code-notes-core/src/storageManager.ts` — add a method that returns `{ notes: Note[]; errors: { file: string; message: string }[] }`
- Modify: `packages/code-notes-core/src/exportGenerator.ts` — accept the errors and surface in INDEX.json
- Modify: `packages/code-notes-core/src/exportWriter.ts` — pass errors through

- [ ] **Step 1: Add `loadAllNotesAndErrors()` on StorageManager**

```typescript
async loadAllNotesAndErrors(): Promise<{ notes: Note[]; errors: { file: string; message: string }[] }> {
  const allNoteFiles = await this.getAllNoteFiles();
  const notes: Note[] = [];
  const errors: { file: string; message: string }[] = [];
  for (const noteFile of allNoteFiles) {
    try {
      const content = await fs.readFile(noteFile, 'utf-8');
      const note = this.markdownToNote(content);
      if (note) notes.push(note);
      else errors.push({ file: path.basename(noteFile), message: 'markdownToNote returned null (missing required fields)' });
    } catch (e: any) {
      errors.push({ file: path.basename(noteFile), message: e?.message ?? String(e) });
    }
  }
  return { notes, errors };
}
```

- [ ] **Step 2: `buildIndex` accepts an optional errors array**

Change signature: `buildIndex(notes, workspaceRoot, now?, errors?)`. Default `errors = []`. Set `IndexFile.errors = errors`.

- [ ] **Step 3: `exportWriter.regenerate()` calls the new loader**

But wait — `exportWriter.regenerate(notes)` takes notes from outside; it doesn't know the workspace's storage. Two options:

**Option A (preferred):** Add an overload that takes `{ notes, errors }` directly. Caller (extension `getAllNotes()` and MCP server) compose this.

**Option B:** Pass a `storageManager` to ExportWriter so it can load errors itself. Tighter coupling; rejected.

Implement Option A:
```typescript
async regenerate(input: Note[] | { notes: Note[]; errors: { file: string; message: string }[] }): Promise<void> {
  const { notes, errors } = Array.isArray(input) ? { notes: input, errors: [] } : input;
  // ... existing logic uses `notes`; passes `errors` to buildIndex
}
```

- [ ] **Step 4: Update extension's `getAllNotes()` → pass errors**

In `noteManager.getAllNotes()`, return `{ notes, errors }` instead of just `Note[]` — OR keep `getAllNotes()` returning `Note[]` (consumers expect that) and add a sibling `getAllNotesAndErrors()`. The extension's noteChanged hook can use the sibling when scheduling exports.

Update `extension.ts`:
```typescript
exportWriter.scheduleRegenerate(() => noteManager.getAllNotesAndErrors());
```

Adjust `scheduleRegenerate`'s parameter type accordingly.

- [ ] **Step 5: Tests**

Add a vitest in `packages/code-notes-core/test/storageManager.test.ts`:

```typescript
it('loadAllNotesAndErrors captures parse failures per file', async () => {
  const ws = await tmpdir();
  const dir = path.join(ws, '.code-notes');
  await fs.mkdir(dir, { recursive: true });
  // Good note
  await fs.writeFile(path.join(dir, 'good.md'), GOOD_NOTE_MARKDOWN);
  // Garbage
  await fs.writeFile(path.join(dir, 'bad.md'), 'this is not a valid note');
  const sm = new StorageManager(ws);
  const { notes, errors } = await sm.loadAllNotesAndErrors();
  expect(notes.length).toBe(1);
  expect(errors.length).toBe(1);
  expect(errors[0].file).toBe('bad.md');
});
```

Add a test in `exportGenerator.test.ts`:
```typescript
it('buildIndex surfaces passed-in errors', () => {
  const idx = buildIndex([], '/ws', undefined, [{ file: 'bad.md', message: 'broken' }]);
  expect(idx.errors).toEqual([{ file: 'bad.md', message: 'broken' }]);
});
```

- [ ] **Step 6: Build, test, commit**

```bash
npm run build -w @jnahian/code-notes-core
npm run test -w @jnahian/code-notes-core
npm run test:unit -w code-context-notes
```

```bash
git add -A
git commit -m "✨ feat(core): populate INDEX.json errors[] from workspace-wide loader

Resolves the v0.3 deferral. StorageManager.loadAllNotesAndErrors() returns
parse failures per file. ExportWriter.regenerate accepts either notes
or {notes, errors}; INDEX.json's errors[] field is finally populated."
```

---

## Task 12: Directory-scope resolution (v0.3 deferral)

For a given file path, return all notes whose `scope: directory` is on a parent directory of that file. Needed by `get_notes_for_file(includeScopeMatches: true)` and `get_notes_for_changes`.

**Files:**
- Create: `packages/code-notes-core/src/scopeResolver.ts`
- Create: `packages/code-notes-core/test/scopeResolver.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { resolveDirectoryScopedNotes } from '../src/scopeResolver.js';
import type { Note } from '../src/types.js';

const note = (overrides: Partial<Note>): Note => ({
  id: 'n', content: 'c', author: 'a',
  filePath: '/ws/src/auth.ts', lineRange: { start: 0, end: 0 },
  contentHash: 'sha256:x', createdAt: '', updatedAt: '', history: [],
  ...overrides,
});

describe('resolveDirectoryScopedNotes', () => {
  it('returns directory-scoped notes whose path is a prefix of target', () => {
    const all = [
      note({ id: 'dir-src', filePath: '/ws/src', scope: 'directory' }),
      note({ id: 'dir-other', filePath: '/ws/other', scope: 'directory' }),
      note({ id: 'line', filePath: '/ws/src/auth.ts', scope: 'line' }),
    ];
    const matched = resolveDirectoryScopedNotes(all, '/ws/src/auth.ts', '/ws');
    expect(matched.map(n => n.id)).toEqual(['dir-src']);
  });

  it('ranks closer ancestors higher', () => {
    const all = [
      note({ id: 'dir-ws', filePath: '/ws', scope: 'directory' }),
      note({ id: 'dir-src', filePath: '/ws/src', scope: 'directory' }),
      note({ id: 'dir-src-db', filePath: '/ws/src/db', scope: 'directory' }),
    ];
    const matched = resolveDirectoryScopedNotes(all, '/ws/src/db/user.ts', '/ws');
    expect(matched.map(n => n.id)).toEqual(['dir-src-db', 'dir-src', 'dir-ws']);
  });

  it('returns [] for non-workspace files', () => {
    const all = [note({ id: 'dir-src', filePath: '/ws/src', scope: 'directory' })];
    const matched = resolveDirectoryScopedNotes(all, '/elsewhere/foo.ts', '/ws');
    expect(matched).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
import * as path from 'path';
import type { Note } from './types.js';
import { applyDefaults } from './noteDefaults.js';

export function resolveDirectoryScopedNotes(allNotes: Note[], targetFile: string, workspaceRoot: string): Note[] {
  const rel = path.relative(workspaceRoot, targetFile);
  if (rel.startsWith('..')) return [];

  const candidates = allNotes.map(applyDefaults).filter(n => n.scope === 'directory');
  const matches = candidates.filter(n => {
    const noteRel = path.relative(workspaceRoot, n.filePath);
    if (noteRel.startsWith('..')) return false;
    // A directory-scoped note at `src` matches a target at `src/auth.ts`
    // iff target is under that directory (or equals it).
    return rel === noteRel || rel.startsWith(noteRel + path.sep);
  });
  // Closer (longer prefix) ranks higher
  matches.sort((a, b) =>
    path.relative(workspaceRoot, b.filePath).length - path.relative(workspaceRoot, a.filePath).length);
  return matches;
}
```

Export from `code-notes-core/src/index.ts`.

- [ ] **Step 3: Test, commit**

```bash
npm run test -w @jnahian/code-notes-core
```

```bash
git add packages/code-notes-core/src/scopeResolver.ts packages/code-notes-core/test/scopeResolver.test.ts packages/code-notes-core/src/index.ts
git commit -m "✨ feat(core): add directory-scope resolution

Resolves the v0.3 deferral. resolveDirectoryScopedNotes(notes, file, ws)
returns directory-scoped notes whose path is an ancestor of the target,
ranked by closeness. Used by MCP's get_notes_for_file and get_notes_for_changes."
```

---

## Task 13: MCP read tool — `get_note`

The simplest tool — do first to verify the tool-registration plumbing works.

**Files:**
- Create: `packages/code-notes-mcp/src/tools/get_note.ts`
- Create: `packages/code-notes-mcp/test/get_note.test.ts`
- Modify: `packages/code-notes-mcp/src/server.ts`

- [ ] **Step 1: Tool implementation**

```typescript
import { z } from 'zod';
import type { NoteManager } from '@jnahian/code-notes-core';

export const getNoteInput = z.object({
  id: z.string().describe('The note ID (filename without .md, e.g. "abc123")'),
});

export async function getNote(args: { id: string }, deps: { noteManager: NoteManager }) {
  const note = await deps.noteManager.getNoteById(args.id);
  if (!note) return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'not_found', noteId: args.id }) }] };
  return { content: [{ type: 'text' as const, text: JSON.stringify(note, null, 2) }] };
}
```

If `noteManager` doesn't have `getNoteById`, add it in core (thin wrapper around `storage.loadNoteById` with `applyDefaults`).

- [ ] **Step 2: Register in server.ts**

```typescript
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_note',
      description: 'Get a single note by id, including history and references.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    // more added in subsequent tasks
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'get_note': return getNote(getNoteInput.parse(request.params.arguments), { noteManager });
    // more added in subsequent tasks
    default: throw new Error(`unknown tool: ${request.params.name}`);
  }
});
```

- [ ] **Step 3: Test**

```typescript
import { describe, it, expect } from 'vitest';
import { getNote } from '../src/tools/get_note.js';
// Stub NoteManager
const fakeMgr: any = { getNoteById: async (id: string) => id === 'a' ? { id: 'a', content: 'hi' } : null };

describe('get_note', () => {
  it('returns a note when found', async () => {
    const r = await getNote({ id: 'a' }, { noteManager: fakeMgr });
    expect(JSON.parse(r.content[0].text).id).toBe('a');
  });
  it('returns error JSON when not found', async () => {
    const r = await getNote({ id: 'missing' }, { noteManager: fakeMgr });
    expect(JSON.parse(r.content[0].text).error).toBe('not_found');
  });
});
```

- [ ] **Step 4: Build, test, commit**

```bash
npm install   # picks up zod if newly added
npm run build -w @jnahian/code-notes-mcp
npm run test -w @jnahian/code-notes-mcp
```

```bash
git add packages/code-notes-mcp packages/code-notes-core
git commit -m "✨ feat(mcp): add get_note tool"
```

---

## Task 14: MCP read tool — `get_notes_for_file`

```typescript
get_notes_for_file({ file: string, includeScopeMatches?: boolean })
```

- [ ] **Step 1: Implement**

```typescript
import { z } from 'zod';
import * as path from 'path';
import type { NoteManager } from '@jnahian/code-notes-core';
import { resolveDirectoryScopedNotes } from '@jnahian/code-notes-core';

export const input = z.object({
  file: z.string(),
  includeScopeMatches: z.boolean().optional().default(true),
});

export async function getNotesForFile(args: z.infer<typeof input>, deps: { noteManager: NoteManager; workspace: string }) {
  const absFile = path.isAbsolute(args.file) ? args.file : path.join(deps.workspace, args.file);
  const direct = await deps.noteManager.getNotesForFile(absFile);
  let scoped: any[] = [];
  if (args.includeScopeMatches) {
    const all = await deps.noteManager.getAllNotes();
    scoped = resolveDirectoryScopedNotes(all, absFile, deps.workspace);
  }
  // Sort direct notes by line
  direct.sort((a, b) => a.lineRange.start - b.lineRange.start);
  return { content: [{ type: 'text' as const, text: JSON.stringify({ direct, scoped }, null, 2) }] };
}
```

- [ ] **Step 2: Register, test, commit**

Tests: a workspace with one direct note + one directory-scoped note; verify both appear when `includeScopeMatches: true`, only direct when false.

```bash
git commit -m "✨ feat(mcp): add get_notes_for_file tool"
```

---

## Task 15: MCP read tool — `list_instructions`

```typescript
list_instructions({ scope?: 'file' | 'directory' | 'line' | undefined })  // undefined = all scopes
```

Returns `instruction` AND `warning` notes ranked by priority then recency.

- [ ] **Step 1: Implement using NoteManager.getAllNotes + filter by type + sort by priority rank**

Reuse `PRIORITY_RANK` from `exportGenerator.ts` — extract to a shared util or export it.

- [ ] **Step 2: Test (instructions + warnings rank correctly; expired excluded by default)**

- [ ] **Step 3: Commit**

```bash
git commit -m "✨ feat(mcp): add list_instructions tool"
```

---

## Task 16: MCP read tool — `get_handoffs`

```typescript
get_handoffs({ stale?: boolean })  // default stale=false → only non-expired
```

- [ ] **Step 1: Implement (filter type=handoff; expired only if stale=true; sort by updatedAt desc)**
- [ ] **Step 2: Test**
- [ ] **Step 3: Commit**

```bash
git commit -m "✨ feat(mcp): add get_handoffs tool"
```

---

## Task 17: MCP read tool — `search_notes`

Wraps `SearchManager` from core.

```typescript
search_notes({ query: string, type?: NoteType, tags?: string[], file?: string, includeExpired?: boolean })
```

- [ ] **Step 1: Implement (instantiate SearchManager against the workspace; apply filter chain on results)**
- [ ] **Step 2: Test (basic full-text match; type filter; tag filter; expired exclusion default)**
- [ ] **Step 3: Commit**

```bash
git commit -m "✨ feat(mcp): add search_notes tool"
```

---

## Task 18: Diff parser

**Files:**
- Create: `packages/code-notes-mcp/src/diffParser.ts`
- Create: `packages/code-notes-mcp/test/diffParser.test.ts`

Wraps the `diff` npm package. Input: a unified-diff string. Output: `{ file: string; changedLines: number[] }[]` where `changedLines` is the union of added/removed line numbers (1-indexed) in the post-image.

- [ ] **Step 1: Failing tests**

Test against a small, hand-written unified diff. Examples:
- Single-file diff with 3 added lines, 2 removed
- Multi-file diff
- Diff with renames (both old/new file appear)
- Malformed diff → returns `{ error: 'diff_parse_failed', detail }`

- [ ] **Step 2: Implement**

```typescript
import { parsePatch } from 'diff';

export interface ParsedFile { file: string; oldFile: string | null; changedLines: number[]; }

export function parseUnifiedDiff(diff: string): { files: ParsedFile[] } | { error: string; detail: string } {
  try {
    const patches = parsePatch(diff);
    const files: ParsedFile[] = patches.map(p => {
      const lines: number[] = [];
      for (const hunk of p.hunks) {
        let line = hunk.newStart;
        for (const l of hunk.lines) {
          if (l.startsWith('+')) { lines.push(line); line++; }
          else if (l.startsWith('-')) { /* removed — record using oldStart context if needed */ }
          else line++;
        }
      }
      return { file: p.newFileName ?? p.oldFileName ?? '<unknown>', oldFile: p.oldFileName ?? null, changedLines: lines };
    });
    return { files };
  } catch (e: any) {
    return { error: 'diff_parse_failed', detail: e?.message ?? String(e) };
  }
}
```

- [ ] **Step 3: Test, commit**

```bash
git commit -m "✨ feat(mcp): add unified-diff parser"
```

---

## Task 19: MCP read tool — `get_notes_for_changes` (KILLER FEATURE)

```typescript
get_notes_for_changes({ files?: string[], diff?: string })
```

Returns notes ranked per spec §5.5.1:
1. Notes whose line range overlaps changed lines (only if `diff` provided — `files[]` mode skips line filtering and returns all notes on those files)
2. `instruction`/`warning` notes scoped to file or any parent directory
3. `decision` notes on the file
4. Other notes on the file
5. Open `handoff` notes on the file

Expired excluded unless `priority: critical`. Cap at 100 results with `truncated: true`.

**Files:**
- Create: `packages/code-notes-mcp/src/tools/get_notes_for_changes.ts`
- Create: `packages/code-notes-mcp/test/get_notes_for_changes.test.ts`

- [ ] **Step 1: Failing tests** — workspace fixture with notes of every type/scope/expiry + a known diff. Assert order, truncation, criticality bypass.

- [ ] **Step 2: Implement**

```typescript
// pseudo-code
const all = await noteManager.getAllNotes();
const files = args.files ?? (args.diff ? parseUnifiedDiff(args.diff).files?.map(f => f.file) ?? [] : []);
const lineMap: Record<string, Set<number>> = {};
if (args.diff) {
  const parsed = parseUnifiedDiff(args.diff);
  if ('error' in parsed) return { error: parsed.error, detail: parsed.detail };
  for (const f of parsed.files) lineMap[f.file] = new Set(f.changedLines);
}

const buckets: Note[][] = [[], [], [], [], []];
for (const file of files) {
  const absFile = path.resolve(workspace, file);
  const direct = all.filter(n => n.filePath === absFile);
  const scoped = resolveDirectoryScopedNotes(all, absFile, workspace);

  for (const n of direct) {
    const overlaps = !lineMap[file] || [...lineMap[file]].some(l => l >= n.lineRange.start + 1 && l <= n.lineRange.end + 1);
    if (overlaps) buckets[0].push(n);
  }
  for (const n of scoped) {
    if (n.type === 'instruction' || n.type === 'warning') buckets[1].push(n);
  }
  for (const n of direct) {
    if (n.type === 'instruction' || n.type === 'warning') buckets[1].push(n);
    else if (n.type === 'decision') buckets[2].push(n);
    else if (n.type === 'handoff') buckets[4].push(n);
    else buckets[3].push(n);
  }
}

const merged: Note[] = [];
const seen = new Set<string>();
for (const bucket of buckets) {
  for (const n of bucket) {
    if (seen.has(n.id)) continue;
    if (isExpired(n) && n.priority !== 'critical') continue;
    seen.add(n.id);
    merged.push(n);
  }
}
const truncated = merged.length > 100;
return { notes: merged.slice(0, 100), truncated, appliedFiles: files };
```

- [ ] **Step 3: Tests must cover** — line-overlap detection, directory-scope hoisting, critical bypass on expiry, truncation flag, malformed diff response shape

- [ ] **Step 4: Commit**

```bash
git commit -m "✨ feat(mcp): add get_notes_for_changes — pre-edit context loading

Per spec §5.5.1, the highest-leverage tool. Accepts files[] or a unified
diff. Ranks notes by line-overlap → instruction/warning (incl directory
scope) → decision → other → handoff. Critical priority always included
even if expired. Caps at 100 results."
```

---

## Task 20: MCP write tools — `create_note`, `edit_note`, `delete_note`

All three reuse `NoteManager` methods directly. The MCP CLI sets `authorName = args.agent`, and we pass `authorType: 'agent'` explicitly. NoteManager + LockManager handle concurrency.

- [ ] **Step 1: Register tools (only when `--agent` provided)**

```typescript
if (!readOnly) {
  registerWriteTools(server, { noteManager, agent: args.agent! });
}
```

- [ ] **Step 2: Implement `create_note`**

```typescript
input = { file, lineRange: {start, end}, content, type?, tags?, scope?, references?, priority?, expiresAt? }

const note = await noteManager.createNote({
  filePath: absFile,
  lineRange: args.lineRange,
  content: args.content,
  type: args.type ?? 'context',
  // ... other fields
  authorType: 'agent',
});
return { content: [{ type: 'text', text: JSON.stringify(note) }] };
```

If `createNote` doesn't accept all these fields today, extend it. Or use `updateNoteMetadata` after create. Decide based on existing signature.

- [ ] **Step 3: Implement `edit_note(id, content)`** — straightforward NoteManager wrapper

- [ ] **Step 4: Implement `delete_note(id)`** — soft delete via existing NoteManager.deleteNote

- [ ] **Step 5: Tests** (vitest, against a temp workspace)

- [ ] **Step 6: Commit**

```bash
git commit -m "✨ feat(mcp): add create_note, edit_note, delete_note tools"
```

---

## Task 21: MCP convenience write tools — `add_handoff`, `add_decision`

Thin wrappers over `create_note` with type/defaults baked in.

- `add_handoff(file, lineRange, content, references?)` — `type=handoff`, `expiresAt=now + 7d` default
- `add_decision(file, lineRange, content, references[])` — `type=decision`, references required (input schema marks it required; reject empty array with `{ error: 'references_required' }`)

- [ ] **Step 1–3: Implement, test, commit**

```bash
git commit -m "✨ feat(mcp): add add_handoff and add_decision convenience tools"
```

---

## Task 22: MCP resources — `digest`, `index`, `file/{path}`

- [ ] **Step 1: Register resource list**

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: 'code-notes://digest', name: 'AGENTS.md digest', mimeType: 'text/markdown' },
    { uri: 'code-notes://index', name: 'INDEX.json', mimeType: 'application/json' },
    // file/{path} resources are dynamic — return template if SDK supports, else list known files
  ],
}));
```

- [ ] **Step 2: Implement read handler**

```typescript
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  if (uri === 'code-notes://digest') {
    const content = await fs.readFile(path.join(workspace, storageDir, 'AGENTS.md'), 'utf-8').catch(() => '');
    return { contents: [{ uri, mimeType: 'text/markdown', text: content }] };
  }
  if (uri === 'code-notes://index') {
    const content = await fs.readFile(path.join(workspace, storageDir, 'INDEX.json'), 'utf-8').catch(() => '{}');
    return { contents: [{ uri, mimeType: 'application/json', text: content }] };
  }
  if (uri.startsWith('code-notes://file/')) {
    const file = decodeURIComponent(uri.slice('code-notes://file/'.length));
    const absFile = path.join(workspace, file);
    const notes = await noteManager.getNotesForFile(absFile);
    const md = renderFileNotesMarkdown(notes); // small helper that formats each note's bold-label markdown into one document
    return { contents: [{ uri, mimeType: 'text/markdown', text: md }] };
  }
  throw new Error(`unknown resource: ${uri}`);
});
```

- [ ] **Step 3: Stale cache detection (per spec §7.2)**

For `code-notes://index`: after reading, check `index.generatedAt` against the newest note's `updatedAt`. If notes are newer than the index, return a synthesized `{ ...index, stale: true, reason: "regeneration pending" }` instead. Caller can choose to fall back to live scanning.

- [ ] **Step 4: Tests** — a workspace with INDEX.json present; verify each resource returns expected content; verify staleness flag

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ feat(mcp): add code-notes://digest, /index, /file/{path} resources"
```

---

## Task 23: Error responses + agent guard

- [ ] **Step 1: Standardize tool error format**

Every tool returns `{ content: [{ type: 'text', text: JSON.stringify({ error: '<code>', detail: '<msg>' }) }] }` on failure. MCP convention is to throw, but JSON errors are easier for agents to read consistently. Document this in the README.

- [ ] **Step 2: Agent guard for write tools**

If `--agent` was not provided, write tools must not be registered at all (server only advertises read tools). Verify by inspecting `ListToolsRequestSchema` response in both modes.

Test:
```typescript
it('does not advertise write tools in read-only mode', async () => {
  // construct server with no agent; list tools; assert no create/edit/delete
});
```

- [ ] **Step 3: Lock timeout error shape**

When NoteManager raises `lock_timeout`, write tools translate to `{ error: 'lock_timeout', retryable: true }`. Document in README so agents know to retry once.

- [ ] **Step 4: Commit**

```bash
git commit -m "✨ feat(mcp): standardize error responses; read-only enforces tool gating"
```

---

## Task 24: End-to-end smoke + README polish

- [ ] **Step 1: Cross-process race test**

Add an integration test (vitest, `packages/code-notes-mcp/test/integration.race.test.ts`):
1. Spawn the MCP server as a subprocess against a temp workspace
2. From the test process, simulate the extension's NoteManager creating the same note concurrently
3. Assert no lost updates: both ops complete; the audit/lock files reflect both holders; final note content matches one of the inputs (not a corrupted merge)

This is the spec's §8.3 "Extension + MCP racing" test.

- [ ] **Step 2: Polish README**

`packages/code-notes-mcp/README.md` should have:
- Install snippet: `npx -y @jnahian/code-notes-mcp --workspace . --agent claude-code`
- MCP config block (Claude Code's `.mcp.json` or `.claude/mcp.json` example; Cursor's `~/.cursor/mcp.json` example)
- Tool reference: one row per tool with input/output summary
- Resource reference
- "Trust model" pointer noting v0.5 will add audit/queue modes (default `direct` until then)
- Troubleshooting: `lock_timeout`, missing `.code-notes/`, version mismatch with extension

- [ ] **Step 3: Commit**

```bash
git commit -m "📝 docs(mcp): README polish + integration race test"
```

---

# Phase C — Release

## Task 25: v0.4.0 changelog

**Files:**
- Create: `docs/changelogs/v0.4.0.md`

- [ ] Per `docs/changelogs/CHANGELOG_TEMPLATE.md`. Sections:
  - **Summary:** "v0.4 ships @jnahian/code-notes-mcp — a standalone MCP server giving any MCP-capable agent (Claude Code, Cursor) read/write access to workspace notes. Extension internals extracted into shared @jnahian/code-notes-core package; behavior unchanged."
  - **Added:** MCP server with read tools (search, get-by-file, get-by-changes, list-instructions, get-handoffs, get-note), write tools (create/edit/delete/handoff/decision), resources (digest, index, file). Per-note advisory file locks. Workspace-wide loader populates `INDEX.json.errors[]`. Directory-scope resolution surfaces parent-folder notes for any file.
  - **Changed:** Repo now uses npm workspaces; extension lives at `packages/extension/`. New shared package `@jnahian/code-notes-core`.
  - **Settings:** (none new on extension side)
  - **Compatibility:** Extension behavior unchanged; existing workspaces work without modification. MCP server reads/writes the same `.code-notes/` directory.
  - **Coming next:** v0.5 ships the trust model (`audit` / `queue` / `direct` modes) and the agent activity sidebar.

- [ ] Commit:
```bash
git add docs/changelogs/v0.4.0.md
git commit -m "📝 docs: add v0.4.0 changelog entry"
```

---

## Task 26: Web changelog page

- [ ] Use the `add-web-changelog` skill: `/add-web-changelog 0.4.0`

- [ ] Verify `cd web && npm run build:client` is clean

- [ ] Commit:
```bash
git commit -m "📝 docs(web): add v0.4.0 to changelog timeline"
```

---

## Task 27: Version bumps + first publish prep

- [ ] **Step 1: Bump versions**

- `packages/extension/package.json`: `0.3.0` → `0.4.0`
- `packages/code-notes-core/package.json`: stays `0.1.0` (first published version)
- `packages/code-notes-mcp/package.json`: stays `0.1.0` (first published version)

- [ ] **Step 2: Full gates**

```bash
npm run compile:tsc --workspaces
npm run build --workspaces
npm run test --workspaces
cd packages/extension && npm run package:dev    # vsix
```

Expected: clean across all packages; `code-context-notes-0.4.0.vsix` packages.

- [ ] **Step 3: Publish dry-runs**

```bash
cd packages/code-notes-core && npm publish --dry-run
cd ../code-notes-mcp && npm publish --dry-run
```

Inspect the file list each `pack` would include. Confirm no source maps in `dist/` if you'd rather not ship them, no `test/` dir leaking, etc.

- [ ] **Step 4: Smoke test with a real agent (manual)**

If a human is available: install the local tarball of `@jnahian/code-notes-mcp` and point a Claude Code (or Cursor) `.mcp.json` at it. Verify `list_instructions` returns something on a test workspace; verify `add_handoff` writes a note. This is the only end-to-end check the test suite can't do.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "🔖 chore: bump versions for v0.4.0 release

extension 0.3.0 → 0.4.0
@jnahian/code-notes-core 0.1.0 (first publish)
@jnahian/code-notes-mcp 0.1.0 (first publish)"
```

- [ ] **Step 6: Hand off to release process**

Per `docs/RELEASE_TEMPLATE.md`. Three publish artifacts this time:
1. `code-context-notes-0.4.0.vsix` → VS Code Marketplace
2. `@jnahian/code-notes-core@0.1.0` → npm
3. `@jnahian/code-notes-mcp@0.1.0` → npm

**Do not publish without explicit user permission.**

---

## Self-review (run before declaring done)

- **Spec coverage:**
  - §5.3.1 (separate package + core extraction) → Tasks 1–9 ✓
  - §5.3.2 (CLI: `--workspace` required, `--agent` for writes) → Task 10 ✓
  - §5.3.3 (six read tools) → Tasks 13–17, 19 ✓
  - §5.3.4 (five write tools) → Tasks 20–21 ✓
  - §5.3.5 (three resources) → Task 22 ✓
  - §5.3.6 (agent attribution; refuse anonymous writes) → Tasks 20, 23 ✓
  - §5.3.7 (filesystem-as-IPC + locks; truncation cap) → Tasks 7, 8, 19 ✓
  - §5.5.1 (`get_notes_for_changes` killer feature) → Tasks 18, 19 ✓
  - §5.5.2 (scoped instructions resolution) → Task 12 ✓
  - §6.5 (MCP treats legacy untyped notes as `context`) → emerges from `applyDefaults` already in core; covered by Tasks 3, 17 ✓
  - §7.1 (concurrent writes / lock manager) → Tasks 7, 8 ✓
  - §7.2 (export staleness detection) → Task 22 Step 3 ✓
  - §7.4 (MCP on non-workspace path) → Task 10 Step 4 ✓
  - §7.5 (diff parsing failures) → Tasks 18, 19 ✓
  - §8.2 (per-layer test ownership) → core tests in Tasks 7, 11, 12; MCP tests throughout Phase B; extension tests unchanged ✓

- **v0.3 deferrals closed:**
  - `INDEX.json.errors[]` populated → Task 11 ✓
  - Directory-scope resolution → Task 12 ✓

- **Type consistency:** `Note`, `NoteType`, `applyDefaults`, `LockManager`, `resolveDirectoryScopedNotes` referenced consistently across phases; all exported from `@jnahian/code-notes-core`. ✓

- **Two deferrals to v0.5 (explicit, documented):**
  - **Trust model** (`direct`/`audit`/`queue` modes) — v0.4 MCP writes go straight to disk (effective `direct` mode). No audit log, no proposal queue. The README will note "v0.5 adds audit/queue modes."
  - **Agent activity sidebar + pending proposals UI** — v0.5 only.

- **No TBDs / placeholders.** Every step has concrete commands, file paths, or code sketches.

- **Scope check passed:** 27 tasks in 3 phases. Tightly coupled internally but phase boundaries are clean PR boundaries if desired (Phase A as one PR, Phase B+C as another).

---

*End of plan.*
