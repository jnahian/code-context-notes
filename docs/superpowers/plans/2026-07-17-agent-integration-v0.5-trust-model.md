# v0.5 Trust Model + Audit UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give humans control over agent-authored notes via three write modes — `direct` (writes land), `audit` (writes land + are logged and revertable), `queue` (writes become proposals needing approval) — surfaced in the VS Code sidebar.

**Architecture:** `@jnahian/code-notes-core` gains a trust router: when a write carries `authorType: 'agent'`, `NoteManager` consults the workspace's write mode and either writes through (`direct`), writes through and appends to an audit log (`audit`), or diverts to a proposal file (`queue`). The mode lives in `.code-notes/config.json` — a workspace-owned file both the extension and the standalone MCP server read — so it is never agent-controllable. The extension adds two tree views over the audit log and the proposal directory.

**Tech Stack:** TypeScript, npm workspaces, vitest (core + mcp), mocha/@vscode/test-electron (extension), `@modelcontextprotocol/sdk`, VS Code TreeDataProvider API.

**Base branch:** `feat/v0.4-mcp-server` (PR #57, unmerged). Branch `feat/v0.5-trust-model` off it. If #57 takes review changes, rebase before merging.

**Spec:** `docs/superpowers/specs/2026-05-15-agent-integration-design.md` §4.3, §5.4, §7.6, §7.7, §8.2. Read §5.4 before starting.

## Global Constraints

- **Storage layout:** notes are flat at `<storageDir>/<noteId>.md`. `StorageManager.getAllNoteFiles()` is a **non-recursive** `readdir` filtered to `.md`, so anything in a subdirectory (`_pending/`) is invisible to the note loader. Keep it that way — proposals must never load as notes.
- **`<storageDir>` is not always `.code-notes`.** The extension reads `codeContextNotes.storageDirectory`; the MCP server takes `--storage-dir`. Never hardcode `.code-notes` outside a default value.
- **stdout is the MCP JSON-RPC channel.** In `packages/code-notes-core` and `packages/code-notes-mcp`, all logging goes to `console.error`/`console.warn`. A single `console.log` corrupts the protocol.
- **In-band error convention:** MCP tool failures return `{ content: [{ type: 'text', text: JSON.stringify({ error: '<code>', ...extra }) }] }`. Never throw for an expected failure. Existing codes: `not_found`, `invalid_arguments`, `file_not_found`, `invalid_line_range`, `read_only_mode`, `references_required`, `lock_timeout` (`retryable: true`), `diff_parse_failed`, `path_escapes_workspace`, `internal_error`.
- **Cross-process writes:** the extension and the MCP server are separate processes on the same files. Any read-modify-write must re-read inside the lock (this is what the v0.4 lost-update bug was). `LockManager.withLock(id, fn)` is the mechanism; it locks `<storageDir>/.locks/<id>.lock`.
- **The MCP server has no file watcher.** It calls `noteManager.clearAllCache()` before every tool dispatch and every resource read. Any new per-process state you add must be re-read per call for the same reason.
- **Mode is workspace-controlled, never agent-controlled.** Do not add a `--write-mode` CLI flag. An agent that can pick its own mode has no rails.
- **Every task ends green:** `npx tsc --noEmit -p packages/<pkg>` clean, and the package's suite passes.

---

## File Structure

**`packages/code-notes-core/src/`**
- `types.ts` — MODIFY: add `AgentWriteMode`, `AuditEntry`, `Proposal`, `WorkspaceConfig`; extend `CreateNoteParams` and `Note`.
- `workspaceConfig.ts` — NEW: read/write `.code-notes/config.json`, tolerant of malformed input.
- `auditLog.ts` — NEW: atomic append, tolerant read, rotation under lock.
- `proposalStore.ts` — NEW: write/list/load/reject proposals under `_pending/`.
- `noteManager.ts` — MODIFY: single-phase `createNote` metadata, agent-write routing, `updateNotePositions` lock fix.
- `index.ts` — MODIFY: export the new modules.

**`packages/code-notes-mcp/src/`**
- `server.ts` — MODIFY: load config per dispatch, construct `AuditLog`/`ProposalStore`.
- `tools/create_note.ts` — MODIFY: single-phase write, pending return shape.
- `tools/edit_note.ts`, `tools/delete_note.ts` — MODIFY: pending return shape.
- `README.md` — MODIFY: modes, pending shape, config.json.

**`packages/extension/src/`**
- `agentActivityProvider.ts` — NEW: "Agent activity" tree view + Revert.
- `pendingProposalsProvider.ts` — NEW: "Pending agent proposals" tree view + Approve/Reject.
- `extension.ts` — MODIFY: settings→config.json sync, watcher globs, view/command registration.
- `package.json` — MODIFY: settings, views, commands.

---

### Task 1: Single-phase `createNote` with metadata

**Why first:** the MCP server currently creates a note, then calls `updateNoteMetadata` to stamp `authorType: 'agent'` — two writes. The trust router must know *at write time* whether this is an agent write, which the two-phase flow can't tell it. This also closes the orphan window the v0.4 review flagged (if phase 2 fails, a note exists that the agent never learns the id of).

**Files:**
- Modify: `packages/code-notes-core/src/types.ts` (`CreateNoteParams`)
- Modify: `packages/code-notes-core/src/noteManager.ts` (`createNote`)
- Modify: `packages/code-notes-mcp/src/tools/create_note.ts`
- Test: `packages/code-notes-core/test/noteManager.test.ts`, `packages/code-notes-mcp/test/create_note.test.ts`

**Interfaces:**
- Produces: `CreateNoteParams` extended with `type?: NoteType; tags?: string[]; scope?: NoteScope; references?: NoteReference[]; priority?: NotePriority; expiresAt?: string; authorType?: AuthorType`. `NoteManager.createNote(params, document)` applies them in the single write. Tasks 4 and 5 route on `params.authorType === 'agent'`.

- [ ] **Step 1: Write the failing test**

In `packages/code-notes-core/test/noteManager.test.ts`, inside `describe('Note Creation', ...)`:

```typescript
it('applies metadata in the single create write, with no second save', async () => {
	const doc = createMockDocument('line0\nline1\n');
	const note = await noteManager.createNote({
		content: 'Watch out',
		filePath: doc.uri.fsPath,
		lineRange: { start: 0, end: 0 },
		type: 'warning',
		tags: ['security'],
		priority: 'high',
		authorType: 'agent',
	}, doc);

	expect(note.type).toBe('warning');
	expect(note.tags).toEqual(['security']);
	expect(note.priority).toBe('high');
	expect(note.authorType).toBe('agent');
	// One write means one history entry — a second save would add another.
	expect(note.history).toHaveLength(1);

	const onDisk = await noteManager.getNoteByIdGlobal(note.id);
	expect(onDisk!.type).toBe('warning');
	expect(onDisk!.authorType).toBe('agent');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/noteManager.test.ts -t "single create write" --root packages/code-notes-core`
Expected: FAIL — `note.type` is `'context'` (the default), because `createNote` ignores the new params.

- [ ] **Step 3: Extend `CreateNoteParams`**

In `packages/code-notes-core/src/types.ts`, replace the `CreateNoteParams` interface:

```typescript
export interface CreateNoteParams {
  /** The file path where the note should be attached */
  filePath: string;
  /** The line range to attach the note to */
  lineRange: LineRange;
  /** The note content (markdown) */
  content: string;
  /** Optional author override */
  author?: string;
  /** Optional metadata, applied in the same write as the note itself. */
  type?: NoteType;
  tags?: string[];
  scope?: NoteScope;
  references?: NoteReference[];
  priority?: NotePriority;
  expiresAt?: string;
  /** 'agent' marks this as an agent write — the trust router keys off it. */
  authorType?: AuthorType;
}
```

- [ ] **Step 4: Apply the metadata in `createNote`**

In `packages/code-notes-core/src/noteManager.ts`, find the `const note: Note = {` object literal inside `createNote` (it sets `id`, `content`, `author`, `filePath`, `lineRange`, `contentHash`, `createdAt`, `updatedAt`, `history`, `isDeleted`). Add the optional fields immediately before `isDeleted: false`, so only explicitly-provided values are set (leave `applyDefaults` to fill the rest):

```typescript
        ...(params.type !== undefined && { type: params.type }),
        ...(params.tags !== undefined && { tags: params.tags }),
        ...(params.scope !== undefined && { scope: params.scope }),
        ...(params.references !== undefined && { references: params.references }),
        ...(params.priority !== undefined && { priority: params.priority }),
        ...(params.expiresAt !== undefined && { expiresAt: params.expiresAt }),
        ...(params.authorType !== undefined && { authorType: params.authorType }),
        isDeleted: false
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/noteManager.test.ts -t "single create write" --root packages/code-notes-core`
Expected: PASS

- [ ] **Step 6: Switch the MCP tool to the single-phase write**

In `packages/code-notes-mcp/src/tools/create_note.ts`, replace the body of `createNote` from `let note;` through the final `try { ... } catch` block with one write:

```typescript
  try {
    const note = await deps.noteManager.createNote(
      {
        filePath: absFile,
        lineRange: args.lineRange,
        content: args.content,
        authorType: 'agent',
        ...(args.type !== undefined && { type: args.type }),
        ...(args.tags !== undefined && { tags: args.tags }),
        ...(args.scope !== undefined && { scope: args.scope }),
        ...(args.references !== undefined && { references: args.references }),
        ...(args.priority !== undefined && { priority: args.priority }),
        ...(args.expiresAt !== undefined && { expiresAt: args.expiresAt }),
      },
      doc,
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(note, null, 2) }] };
  } catch (e) {
    if (isLockTimeout(e)) return errorResult('lock_timeout', { retryable: true });
    // Core's range validation errors all start with "Line range"; anything
    // else is an unexpected failure and must not masquerade as a range error.
    const msg = (e as Error).message ?? String(e);
    if (msg.includes('Line range')) return errorResult('invalid_line_range', { detail: msg });
    return errorResult('internal_error', { detail: msg });
  }
```

Delete the now-unused `fields` object and the `NoteType`/`NoteScope`/`NotePriority`/`NoteReference` type-only imports if TypeScript reports them unused.

- [ ] **Step 7: Run the full suites**

Run: `npm run build -w @jnahian/code-notes-core && npm test -w @jnahian/code-notes-core && npm test -w @jnahian/code-notes-mcp`
Expected: all pass. `create_note.test.ts`'s existing metadata assertions still hold; the note now has one history entry instead of two.

- [ ] **Step 8: Commit**

```bash
git add packages/code-notes-core packages/code-notes-mcp
git commit -m "♻️ refactor(core,mcp): apply note metadata in a single create write"
```

---

### Task 2: `WorkspaceConfig` — `.code-notes/config.json`

**Files:**
- Create: `packages/code-notes-core/src/workspaceConfig.ts`
- Modify: `packages/code-notes-core/src/types.ts`, `packages/code-notes-core/src/index.ts`
- Test: `packages/code-notes-core/test/workspaceConfig.test.ts`

**Interfaces:**
- Produces: `type AgentWriteMode = 'direct' | 'audit' | 'queue'`; `interface WorkspaceConfig { agentWriteMode: AgentWriteMode; agentAllowList: string[]; auditLogRetention: number }`; `DEFAULT_WORKSPACE_CONFIG`; `async function readWorkspaceConfig(storagePath: string): Promise<WorkspaceConfig>`; `async function writeWorkspaceConfig(storagePath: string, config: WorkspaceConfig): Promise<void>`. Task 4 reads it in the router; Task 7 reads it per dispatch; Task 8 writes it from the VS Code setting.

- [ ] **Step 1: Write the failing test**

Create `packages/code-notes-core/test/workspaceConfig.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { readWorkspaceConfig, writeWorkspaceConfig, DEFAULT_WORKSPACE_CONFIG } from '../src/workspaceConfig.js';

describe('workspaceConfig', () => {
  let storagePath: string;

  beforeEach(async () => {
    storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'ws-config-test-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(storagePath, { recursive: true, force: true });
  });

  it('defaults to audit mode when no config file exists', async () => {
    const config = await readWorkspaceConfig(storagePath);
    expect(config).toEqual(DEFAULT_WORKSPACE_CONFIG);
    expect(config.agentWriteMode).toBe('audit');
  });

  it('round-trips a written config', async () => {
    await writeWorkspaceConfig(storagePath, {
      agentWriteMode: 'queue',
      agentAllowList: ['claude-code'],
      auditLogRetention: 500,
    });
    const config = await readWorkspaceConfig(storagePath);
    expect(config.agentWriteMode).toBe('queue');
    expect(config.agentAllowList).toEqual(['claude-code']);
    expect(config.auditLogRetention).toBe(500);
  });

  it('falls back to defaults on malformed JSON rather than throwing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.writeFile(path.join(storagePath, 'config.json'), '{ not json');
    const config = await readWorkspaceConfig(storagePath);
    expect(config).toEqual(DEFAULT_WORKSPACE_CONFIG);
  });

  it('falls back to the default mode for an unrecognized mode value, keeping valid siblings', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.writeFile(
      path.join(storagePath, 'config.json'),
      JSON.stringify({ agentWriteMode: 'yolo', auditLogRetention: 42 }),
    );
    const config = await readWorkspaceConfig(storagePath);
    expect(config.agentWriteMode).toBe('audit');
    expect(config.auditLogRetention).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/workspaceConfig.test.ts --root packages/code-notes-core`
Expected: FAIL — cannot resolve `../src/workspaceConfig.js`.

- [ ] **Step 3: Add the types**

In `packages/code-notes-core/src/types.ts`, append:

```typescript
/**
 * How agent-authored writes are handled. Lives in the workspace's
 * config.json, never in an agent's CLI flags — an agent that picks its own
 * mode has no rails.
 */
export type AgentWriteMode = 'direct' | 'audit' | 'queue';

/** Workspace-owned settings shared by the extension and the MCP server. */
export interface WorkspaceConfig {
  agentWriteMode: AgentWriteMode;
  /** Informational, not a security boundary: writes from agents not listed are rejected. Empty = allow all. */
  agentAllowList: string[];
  /** Audit log rotates once it exceeds this many entries. */
  auditLogRetention: number;
}
```

- [ ] **Step 4: Write the implementation**

Create `packages/code-notes-core/src/workspaceConfig.ts`:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { AgentWriteMode, WorkspaceConfig } from './types.js';

const CONFIG_FILE = 'config.json';
const MODES: AgentWriteMode[] = ['direct', 'audit', 'queue'];

/** Safe by default: agent writes are logged and reviewable unless a workspace opts out. */
export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  agentWriteMode: 'audit',
  agentAllowList: [],
  auditLogRetention: 1000,
};

export function getConfigPath(storagePath: string): string {
  return path.join(storagePath, CONFIG_FILE);
}

/**
 * Read the workspace config, falling back to defaults field-by-field. A
 * malformed or partial config must never break note-taking: the worst case
 * is that the workspace runs in the default (audit) mode.
 */
export async function readWorkspaceConfig(storagePath: string): Promise<WorkspaceConfig> {
  let raw: string;
  try {
    raw = await fs.readFile(getConfigPath(storagePath), 'utf-8');
  } catch {
    return { ...DEFAULT_WORKSPACE_CONFIG };
  }

  let parsed: Partial<WorkspaceConfig>;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn(`[code-notes-core] ignoring malformed ${CONFIG_FILE}: ${(e as Error).message}`);
    return { ...DEFAULT_WORKSPACE_CONFIG };
  }

  const mode = parsed.agentWriteMode;
  if (mode !== undefined && !MODES.includes(mode)) {
    console.warn(`[code-notes-core] unknown agentWriteMode "${mode}" — using "${DEFAULT_WORKSPACE_CONFIG.agentWriteMode}"`);
  }

  return {
    agentWriteMode: mode !== undefined && MODES.includes(mode) ? mode : DEFAULT_WORKSPACE_CONFIG.agentWriteMode,
    agentAllowList: Array.isArray(parsed.agentAllowList) ? parsed.agentAllowList : DEFAULT_WORKSPACE_CONFIG.agentAllowList,
    auditLogRetention: typeof parsed.auditLogRetention === 'number' ? parsed.auditLogRetention : DEFAULT_WORKSPACE_CONFIG.auditLogRetention,
  };
}

export async function writeWorkspaceConfig(storagePath: string, config: WorkspaceConfig): Promise<void> {
  await fs.mkdir(storagePath, { recursive: true });
  await fs.writeFile(getConfigPath(storagePath), `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
}
```

- [ ] **Step 5: Export from the package index**

In `packages/code-notes-core/src/index.ts`, add after the `./types.js` export:

```typescript
export * from './workspaceConfig.js';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run test/workspaceConfig.test.ts --root packages/code-notes-core`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/code-notes-core
git commit -m "✨ feat(core): add workspace config (.code-notes/config.json)"
```

---

### Task 3: `AuditLog` — atomic append, tolerant read, rotation

**Why the care:** several agent sessions mean several MCP processes appending to one file. Appending is safe if every entry is a single `O_APPEND` write; rotation is a read-modify-write and must hold a lock — this is the same hazard class as the v0.4 lost-update bug.

**Files:**
- Create: `packages/code-notes-core/src/auditLog.ts`
- Modify: `packages/code-notes-core/src/types.ts`, `packages/code-notes-core/src/index.ts`
- Test: `packages/code-notes-core/test/auditLog.test.ts`

**Interfaces:**
- Consumes: `LockManager` from Task 0 (exists: `packages/code-notes-core/src/lockManager.ts`, `withLock(id, fn)`).
- Produces: `interface AuditEntry { ts: string; op: 'create' | 'edit' | 'delete'; noteId: string; agent: string; file: string; lineRange?: [number, number]; type?: NoteType; prevContentHash?: string; newContentHash?: string }`; `class AuditLog { constructor(logPath: string, opts?: { lockManager?: LockManager; retention?: number }); append(entry: AuditEntry): Promise<void>; read(limit?: number): Promise<AuditEntry[]>; truncate(): Promise<void> }`; `function hashNoteContent(content: string): string`. Task 4 calls `append`; Task 9 calls `read`/`truncate`.

- [ ] **Step 1: Write the failing test**

Create `packages/code-notes-core/test/auditLog.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { AuditLog, hashNoteContent } from '../src/auditLog.js';
import { LockManager } from '../src/lockManager.js';
import type { AuditEntry } from '../src/types.js';

const entry = (noteId: string, op: AuditEntry['op'] = 'create'): AuditEntry => ({
  ts: '2026-07-17T00:00:00.000Z',
  op,
  noteId,
  agent: 'claude-code',
  file: 'src/app.ts',
});

describe('AuditLog', () => {
  let tempDir: string;
  let logPath: string;
  let log: AuditLog;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-log-test-'));
    logPath = path.join(tempDir, '_audit.log');
    log = new AuditLog(logPath, { lockManager: new LockManager(path.join(tempDir, '.locks'), 'test') });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns an empty list when the log does not exist yet', async () => {
    expect(await log.read()).toEqual([]);
  });

  it('appends entries as one JSON line each and reads them back newest-first', async () => {
    await log.append(entry('note-1'));
    await log.append(entry('note-2', 'edit'));

    const raw = await fs.readFile(logPath, 'utf-8');
    expect(raw.trimEnd().split('\n')).toHaveLength(2);

    const entries = await log.read();
    expect(entries.map(e => e.noteId)).toEqual(['note-2', 'note-1']);
    expect(entries[0].op).toBe('edit');
  });

  it('does not interleave lines when many appends race', async () => {
    await Promise.all(Array.from({ length: 50 }, (_, i) => log.append(entry(`note-${i}`))));

    const entries = await log.read();
    expect(entries).toHaveLength(50);
    // Every line parsed => no torn writes.
    expect(new Set(entries.map(e => e.noteId)).size).toBe(50);
  });

  it('skips unparseable lines instead of throwing, warning once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await log.append(entry('note-1'));
    await fs.appendFile(logPath, 'this is not json\n');
    await log.append(entry('note-2'));

    const entries = await log.read();
    expect(entries.map(e => e.noteId)).toEqual(['note-2', 'note-1']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('1');
  });

  it('rotates to _audit.log.1 once retention is exceeded', async () => {
    const small = new AuditLog(logPath, {
      lockManager: new LockManager(path.join(tempDir, '.locks'), 'test'),
      retention: 3,
    });
    for (let i = 0; i < 5; i++) await small.append(entry(`note-${i}`));

    const kept = await small.read();
    expect(kept.length).toBeLessThanOrEqual(3);
    // Nothing is lost — rotated lines are still on disk.
    const rotated = await fs.readFile(`${logPath}.1`, 'utf-8');
    expect(rotated).toContain('note-0');
  });

  it('truncate empties the log', async () => {
    await log.append(entry('note-1'));
    await log.truncate();
    expect(await log.read()).toEqual([]);
  });

  it('hashNoteContent is stable and content-sensitive', () => {
    expect(hashNoteContent('hello')).toBe(hashNoteContent('hello'));
    expect(hashNoteContent('hello')).not.toBe(hashNoteContent('world'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/auditLog.test.ts --root packages/code-notes-core`
Expected: FAIL — cannot resolve `../src/auditLog.js`.

- [ ] **Step 3: Add the `AuditEntry` type**

In `packages/code-notes-core/src/types.ts`, append:

```typescript
/**
 * One agent operation, as written to `<storageDir>/_audit.log` (JSONL).
 * Carries enough to display the op and to reverse it: create reverses to
 * delete; edit and delete restore from the note's `history[]`.
 */
export interface AuditEntry {
  ts: string;
  op: 'create' | 'edit' | 'delete';
  noteId: string;
  agent: string;
  file: string;
  lineRange?: [number, number];
  type?: NoteType;
  /** sha256 of the note's *content* before/after an edit — for display and
   *  stale-proposal detection. Distinct from Note.contentHash, which hashes
   *  the *code* the note is attached to. */
  prevContentHash?: string;
  newContentHash?: string;
}
```

- [ ] **Step 4: Write the implementation**

Create `packages/code-notes-core/src/auditLog.ts`:

```typescript
import * as fs from 'fs/promises';
import { createHash } from 'crypto';
import * as path from 'path';
import type { LockManager } from './lockManager.js';
import type { AuditEntry } from './types.js';

/** Lock id for rotation. Not a note id — no note can collide with it. */
const ROTATE_LOCK_ID = '_audit';

/** sha256 of a note's content. Named to contrast with Note.contentHash (code hash). */
export function hashNoteContent(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/**
 * Append-only JSONL log of agent operations.
 *
 * ponytail: appends are a bare fs.appendFile — one line, one O_APPEND write,
 * which the OS keeps atomic for small writes on a local filesystem. That is
 * why entries must stay short and single-line. Rotation is a read-modify-write
 * and takes the lock; if this ever moves to a network filesystem, neither
 * guarantee holds and this needs a real append service.
 */
export class AuditLog {
  private retention: number;

  constructor(
    private logPath: string,
    private opts: { lockManager?: LockManager; retention?: number } = {},
  ) {
    this.retention = opts.retention ?? 1000;
  }

  async append(entry: AuditEntry): Promise<void> {
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    await fs.appendFile(this.logPath, `${JSON.stringify(entry)}\n`, 'utf-8');
    await this.rotateIfNeeded();
  }

  /** Newest-first. Tolerant: unparseable lines are skipped, not fatal. */
  async read(limit?: number): Promise<AuditEntry[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.logPath, 'utf-8');
    } catch {
      return [];
    }

    const entries: AuditEntry[] = [];
    let skipped = 0;
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line) as AuditEntry);
      } catch {
        skipped++;
      }
    }
    if (skipped > 0) {
      console.warn(`[code-notes-core] skipped ${skipped} unparseable audit log line(s)`);
    }

    entries.reverse();
    return limit === undefined ? entries : entries.slice(0, limit);
  }

  async truncate(): Promise<void> {
    await fs.writeFile(this.logPath, '', 'utf-8');
  }

  /**
   * Rotation is read-modify-write: another process appending between our read
   * and our rewrite would lose its line. Hold the lock across the whole thing
   * and re-read inside it.
   */
  private async rotateIfNeeded(): Promise<void> {
    const run = async () => {
      let raw: string;
      try {
        raw = await fs.readFile(this.logPath, 'utf-8');
      } catch {
        return;
      }
      const lines = raw.split('\n').filter(l => l.trim());
      if (lines.length <= this.retention) return;

      const overflow = lines.length - this.retention;
      await fs.appendFile(`${this.logPath}.1`, `${lines.slice(0, overflow).join('\n')}\n`, 'utf-8');
      await fs.writeFile(this.logPath, `${lines.slice(overflow).join('\n')}\n`, 'utf-8');
    };

    try {
      await (this.opts.lockManager ? this.opts.lockManager.withLock(ROTATE_LOCK_ID, run) : run());
    } catch (e) {
      // A missed rotation is a log that grows; a thrown error here would fail
      // the agent's write. Losing the write is worse than a long log.
      console.warn(`[code-notes-core] audit log rotation skipped: ${(e as Error).message}`);
    }
  }
}
```

- [ ] **Step 5: Export from the package index**

In `packages/code-notes-core/src/index.ts`, add:

```typescript
export * from './auditLog.js';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run test/auditLog.test.ts --root packages/code-notes-core`
Expected: PASS (7 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/code-notes-core
git commit -m "✨ feat(core): add append-only agent audit log with rotation"
```

---

### Task 4: Trust router — `direct` and `audit` modes

**Files:**
- Modify: `packages/code-notes-core/src/noteManager.ts`
- Test: `packages/code-notes-core/test/noteManager.test.ts`

**Interfaces:**
- Consumes: `AuditLog`, `hashNoteContent` (Task 3); `AgentWriteMode` (Task 2); extended `CreateNoteParams` (Task 1).
- Produces: `NoteManager` constructor opts gain `{ agentWriteMode?: () => Promise<AgentWriteMode>; auditLog?: AuditLog; agentName?: string }`. `agentWriteMode` is a **function**, not a value — the MCP server re-reads config per dispatch, and a captured value would go stale exactly like the v0.4 caches did. Task 5 adds `proposalStore` to the same opts bag.

- [ ] **Step 1: Write the failing test**

In `packages/code-notes-core/test/noteManager.test.ts`, add a new top-level `describe` (after `describe('Caching', ...)`), and add these imports at the top of the file: `import { AuditLog } from '../src/auditLog.js';`

```typescript
	describe('Trust router', () => {
		let auditLog: AuditLog;
		let agentManager: NoteManager;

		const buildManager = (mode: 'direct' | 'audit') => new NoteManager(
			new StorageManager(tempDir, '.test-notes'),
			new ContentHashTracker(),
			new FakeAuthorProvider('claude-code'),
			{ auditLog, agentWriteMode: async () => mode, agentName: 'claude-code' },
		);

		beforeEach(() => {
			auditLog = new AuditLog(path.join(tempDir, '.test-notes', '_audit.log'));
		});

		it('logs an agent create in audit mode', async () => {
			agentManager = buildManager('audit');
			const doc = createMockDocument('line0\n');
			const note = await agentManager.createNote({
				content: 'agent note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				authorType: 'agent',
			}, doc);

			// The write still lands — audit logs, it doesn't block.
			expect(await agentManager.getNoteByIdGlobal(note.id)).toBeTruthy();

			const entries = await auditLog.read();
			expect(entries).toHaveLength(1);
			expect(entries[0]).toMatchObject({ op: 'create', noteId: note.id, agent: 'claude-code' });
		});

		it('logs an agent edit with before/after content hashes', async () => {
			agentManager = buildManager('audit');
			const doc = createMockDocument('line0\n');
			const note = await agentManager.createNote({
				content: 'first',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				authorType: 'agent',
			}, doc);
			await agentManager.updateNote({ id: note.id, content: 'second' }, doc);

			const entries = await auditLog.read();
			expect(entries[0].op).toBe('edit');
			expect(entries[0].prevContentHash).toBeTruthy();
			expect(entries[0].newContentHash).not.toBe(entries[0].prevContentHash);
		});

		it('does not log a human write, even in audit mode', async () => {
			agentManager = buildManager('audit');
			const doc = createMockDocument('line0\n');
			await agentManager.createNote({
				content: 'human note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
			}, doc);

			expect(await auditLog.read()).toEqual([]);
		});

		it('does not log in direct mode', async () => {
			agentManager = buildManager('direct');
			const doc = createMockDocument('line0\n');
			await agentManager.createNote({
				content: 'agent note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				authorType: 'agent',
			}, doc);

			expect(await auditLog.read()).toEqual([]);
		});
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/noteManager.test.ts -t "Trust router" --root packages/code-notes-core`
Expected: FAIL — audit log is empty; the constructor ignores the new opts.

- [ ] **Step 3: Accept the new options**

In `packages/code-notes-core/src/noteManager.ts`, add the imports:

```typescript
import { AuditLog, hashNoteContent } from './auditLog.js';
import type { AgentWriteMode, AuditEntry } from './types.js';
```

Add the fields next to `private lockManager?: LockManager;`:

```typescript
  private auditLog?: AuditLog;
  private agentWriteMode?: () => Promise<AgentWriteMode>;
  private agentName: string;
```

Replace the constructor's `opts` parameter and its body's `this.lockManager = opts?.lockManager;` line:

```typescript
  constructor(
    storage: StorageManager,
    hashTracker: ContentHashTracker,
    gitIntegration: AuthorProvider,
    opts?: {
      lockManager?: LockManager;
      auditLog?: AuditLog;
      /** A function, not a value: the mode is re-read per call so a
       *  long-lived process can't serve a stale policy. */
      agentWriteMode?: () => Promise<AgentWriteMode>;
      agentName?: string;
    }
  ) {
```

and, in the body:

```typescript
    this.lockManager = opts?.lockManager;
    this.auditLog = opts?.auditLog;
    this.agentWriteMode = opts?.agentWriteMode;
    this.agentName = opts?.agentName ?? 'unknown-agent';
```

- [ ] **Step 4: Add the router helper**

In `packages/code-notes-core/src/noteManager.ts`, add immediately after the `withNoteLock` method:

```typescript
  /**
   * Record an agent op if the workspace is in audit mode. Human writes are
   * never logged — detection is `authorType: 'agent'`, never author-string
   * sniffing.
   */
  private async recordAgentOp(isAgentWrite: boolean, entry: Omit<AuditEntry, 'ts' | 'agent'>): Promise<void> {
    if (!isAgentWrite || !this.auditLog || !this.agentWriteMode) return;
    const mode = await this.agentWriteMode();
    if (mode !== 'audit') return;
    await this.auditLog.append({ ...entry, ts: new Date().toISOString(), agent: this.agentName });
  }
```

- [ ] **Step 5: Log creates**

In `createNote`, immediately before `return normalized;` (after the `emit` calls):

```typescript
      await this.recordAgentOp(params.authorType === 'agent', {
        op: 'create',
        noteId: normalized.id,
        file: normalized.filePath,
        lineRange: [normalized.lineRange.start, normalized.lineRange.end],
        type: normalized.type,
      });

      return normalized;
```

- [ ] **Step 6: Log edits and deletes**

In `updateNote`, capture the previous content right after the `note.isDeleted` guard:

```typescript
      const prevContent = note.content;
```

and immediately before its `return note;`:

```typescript
      await this.recordAgentOp(note.authorType === 'agent', {
        op: 'edit',
        noteId: note.id,
        file: note.filePath,
        prevContentHash: hashNoteContent(prevContent),
        newContentHash: hashNoteContent(note.content),
      });

      return note;
```

In `deleteNote`, immediately before the method's closing `});`:

```typescript
      await this.recordAgentOp(note.authorType === 'agent', {
        op: 'delete',
        noteId: note.id,
        file: note.filePath,
      });
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run test/noteManager.test.ts --root packages/code-notes-core`
Expected: PASS — the four new Trust router tests plus every pre-existing test (managers built without the new opts log nothing, unchanged).

- [ ] **Step 8: Commit**

```bash
git add packages/code-notes-core
git commit -m "✨ feat(core): route agent writes through direct/audit trust modes"
```

---

### Task 5: `ProposalStore` + `queue` mode

**Files:**
- Create: `packages/code-notes-core/src/proposalStore.ts`
- Modify: `packages/code-notes-core/src/types.ts`, `packages/code-notes-core/src/index.ts`, `packages/code-notes-core/src/noteManager.ts`
- Test: `packages/code-notes-core/test/proposalStore.test.ts`, `packages/code-notes-core/test/noteManager.test.ts`

**Interfaces:**
- Produces: `interface Proposal { proposalId: string; op: 'create' | 'edit' | 'delete'; targetNoteId?: string; file: string; lineRange?: LineRange; agent: string; proposedAt: string; content: string; targetContentHash?: string }`; `class ProposalStore { constructor(pendingDir: string); save(p: Proposal): Promise<void>; list(): Promise<Proposal[]>; load(id): Promise<Proposal | null>; reject(id): Promise<void>; remove(id): Promise<void> }`; `class PendingWriteError extends Error { readonly proposalId: string }`. Task 7 maps `PendingWriteError` to the MCP pending shape; Task 10 drives the store from the sidebar.
- `targetContentHash` is sha256 of the **target note's content** at proposal time (via `hashNoteContent`), used to detect a stale target at approve time. Not `Note.contentHash` (code hash).

- [ ] **Step 1: Write the failing test**

Create `packages/code-notes-core/test/proposalStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ProposalStore } from '../src/proposalStore.js';
import type { Proposal } from '../src/types.js';

const proposal = (id: string): Proposal => ({
  proposalId: id,
  op: 'create',
  file: 'src/app.ts',
  lineRange: { start: 1, end: 2 },
  agent: 'claude-code',
  proposedAt: '2026-07-17T00:00:00.000Z',
  content: 'proposed note body',
});

describe('ProposalStore', () => {
  let tempDir: string;
  let store: ProposalStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'proposal-test-'));
    store = new ProposalStore(path.join(tempDir, '_pending'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns an empty list before anything is proposed', async () => {
    expect(await store.list()).toEqual([]);
  });

  it('round-trips a proposal through disk', async () => {
    await store.save(proposal('prop-1'));
    const loaded = await store.load('prop-1');
    expect(loaded).toMatchObject({
      proposalId: 'prop-1',
      op: 'create',
      file: 'src/app.ts',
      agent: 'claude-code',
      content: 'proposed note body',
    });
    expect(loaded!.lineRange).toEqual({ start: 1, end: 2 });
  });

  it('lists proposals oldest-first', async () => {
    await store.save({ ...proposal('prop-1'), proposedAt: '2026-07-17T00:00:01.000Z' });
    await store.save({ ...proposal('prop-2'), proposedAt: '2026-07-17T00:00:00.000Z' });
    expect((await store.list()).map(p => p.proposalId)).toEqual(['prop-2', 'prop-1']);
  });

  it('reject moves the file to .rejected/ rather than deleting it', async () => {
    await store.save(proposal('prop-1'));
    await store.reject('prop-1');

    expect(await store.load('prop-1')).toBeNull();
    expect(await store.list()).toEqual([]);
    const rejected = await fs.readFile(path.join(tempDir, '_pending', '.rejected', 'prop-1.md'), 'utf-8');
    expect(rejected).toContain('proposed note body');
  });

  it('remove deletes an applied proposal', async () => {
    await store.save(proposal('prop-1'));
    await store.remove('prop-1');
    expect(await store.load('prop-1')).toBeNull();
  });

  it('skips an unparseable proposal file instead of failing the whole list', async () => {
    await store.save(proposal('prop-1'));
    await fs.writeFile(path.join(tempDir, '_pending', 'garbage.md'), 'no frontmatter here');
    expect((await store.list()).map(p => p.proposalId)).toEqual(['prop-1']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/proposalStore.test.ts --root packages/code-notes-core`
Expected: FAIL — cannot resolve `../src/proposalStore.js`.

- [ ] **Step 3: Add the `Proposal` type**

In `packages/code-notes-core/src/types.ts`, append:

```typescript
/**
 * An agent write held for human approval, stored at
 * `<storageDir>/_pending/<proposalId>.md`. `_pending/` is a subdirectory, and
 * StorageManager.getAllNoteFiles() reads only the top level — that is what
 * keeps proposals from loading as real notes. Do not flatten this.
 */
export interface Proposal {
  proposalId: string;
  op: 'create' | 'edit' | 'delete';
  /** Present for edit/delete. */
  targetNoteId?: string;
  file: string;
  lineRange?: LineRange;
  agent: string;
  proposedAt: string;
  /** The proposed note body. Empty for a delete proposal. */
  content: string;
  /** sha256 of the target note's content when proposed — lets approve detect
   *  that a human changed the note in the meantime. */
  targetContentHash?: string;
}
```

- [ ] **Step 4: Write the implementation**

Create `packages/code-notes-core/src/proposalStore.ts`:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Proposal } from './types.js';

/**
 * Thrown by NoteManager when queue mode diverts an agent write. Not an
 * error condition for the human — it is the expected outcome in queue mode,
 * and the MCP layer turns it into a `{ status: 'pending' }` result.
 */
export class PendingWriteError extends Error {
  constructor(readonly proposalId: string) {
    super(`pending_approval: ${proposalId}`);
    this.name = 'PendingWriteError';
  }
}

const REJECTED_DIR = '.rejected';

/**
 * ponytail: proposals are markdown-with-frontmatter, hand-serialized like
 * notes are, rather than pulling in a YAML dependency for six scalar fields.
 * If the shape grows past scalars + one body, switch to the same serializer
 * StorageManager uses.
 */
export class ProposalStore {
  constructor(private pendingDir: string) {}

  private filePath(proposalId: string): string {
    return path.join(this.pendingDir, `${proposalId}.md`);
  }

  async save(p: Proposal): Promise<void> {
    await fs.mkdir(this.pendingDir, { recursive: true });
    const lines = [
      '---',
      `proposalId: ${p.proposalId}`,
      `op: ${p.op}`,
      ...(p.targetNoteId ? [`targetNoteId: ${p.targetNoteId}`] : []),
      `file: ${p.file}`,
      ...(p.lineRange ? [`lineRange: [${p.lineRange.start}, ${p.lineRange.end}]`] : []),
      `agent: ${p.agent}`,
      `proposedAt: ${p.proposedAt}`,
      ...(p.targetContentHash ? [`targetContentHash: ${p.targetContentHash}`] : []),
      '---',
      p.content,
    ];
    await fs.writeFile(this.filePath(p.proposalId), `${lines.join('\n')}\n`, 'utf-8');
  }

  async load(proposalId: string): Promise<Proposal | null> {
    try {
      return this.parse(await fs.readFile(this.filePath(proposalId), 'utf-8'));
    } catch {
      return null;
    }
  }

  /** Oldest-first: the review queue reads like a queue. */
  async list(): Promise<Proposal[]> {
    let files: string[];
    try {
      files = (await fs.readdir(this.pendingDir)).filter(f => f.endsWith('.md'));
    } catch {
      return [];
    }

    const proposals: Proposal[] = [];
    for (const f of files) {
      try {
        const parsed = this.parse(await fs.readFile(path.join(this.pendingDir, f), 'utf-8'));
        if (parsed) proposals.push(parsed);
      } catch {
        // One bad file must not hide the rest of the queue.
      }
    }
    proposals.sort((a, b) => a.proposedAt.localeCompare(b.proposedAt));
    return proposals;
  }

  /** Keep rejected proposals for audit rather than deleting them. */
  async reject(proposalId: string): Promise<void> {
    const rejectedDir = path.join(this.pendingDir, REJECTED_DIR);
    await fs.mkdir(rejectedDir, { recursive: true });
    await fs.rename(this.filePath(proposalId), path.join(rejectedDir, `${proposalId}.md`));
  }

  async remove(proposalId: string): Promise<void> {
    await fs.unlink(this.filePath(proposalId)).catch(() => undefined);
  }

  private parse(raw: string): Proposal | null {
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    if (!match) return null;

    const fields: Record<string, string> = {};
    for (const line of match[1].split('\n')) {
      const idx = line.indexOf(': ');
      if (idx > 0) fields[line.slice(0, idx)] = line.slice(idx + 2).trim();
    }
    if (!fields.proposalId || !fields.op) return null;

    const range = /\[(\d+),\s*(\d+)\]/.exec(fields.lineRange ?? '');
    return {
      proposalId: fields.proposalId,
      op: fields.op as Proposal['op'],
      ...(fields.targetNoteId && { targetNoteId: fields.targetNoteId }),
      file: fields.file ?? '',
      ...(range && { lineRange: { start: Number(range[1]), end: Number(range[2]) } }),
      agent: fields.agent ?? 'unknown-agent',
      proposedAt: fields.proposedAt ?? '',
      ...(fields.targetContentHash && { targetContentHash: fields.targetContentHash }),
      content: match[2].replace(/\n$/, ''),
    };
  }
}
```

- [ ] **Step 5: Export from the package index**

In `packages/code-notes-core/src/index.ts`, add:

```typescript
export * from './proposalStore.js';
```

- [ ] **Step 6: Run the store test**

Run: `npx vitest run test/proposalStore.test.ts --root packages/code-notes-core`
Expected: PASS (6 tests)

- [ ] **Step 7: Write the failing queue-routing test**

In `packages/code-notes-core/test/noteManager.test.ts`, inside `describe('Trust router', ...)`, add — with `import { ProposalStore, PendingWriteError } from '../src/proposalStore.js';` at the top of the file:

```typescript
		it('diverts an agent create to a proposal in queue mode, writing no note', async () => {
			const store = new ProposalStore(path.join(tempDir, '.test-notes', '_pending'));
			const queued = new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('claude-code'),
				{ proposalStore: store, agentWriteMode: async () => 'queue', agentName: 'claude-code' },
			);
			const doc = createMockDocument('line0\n');

			await expect(queued.createNote({
				content: 'proposed',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
				authorType: 'agent',
			}, doc)).rejects.toBeInstanceOf(PendingWriteError);

			// No note landed...
			expect(await queued.getAllNotes()).toHaveLength(0);
			// ...but a proposal did.
			const proposals = await store.list();
			expect(proposals).toHaveLength(1);
			expect(proposals[0]).toMatchObject({ op: 'create', agent: 'claude-code', content: 'proposed' });
		});

		it('lets a human write through untouched in queue mode', async () => {
			const store = new ProposalStore(path.join(tempDir, '.test-notes', '_pending'));
			const queued = new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('human'),
				{ proposalStore: store, agentWriteMode: async () => 'queue', agentName: 'claude-code' },
			);
			const doc = createMockDocument('line0\n');

			const note = await queued.createNote({
				content: 'human note',
				filePath: doc.uri.fsPath,
				lineRange: { start: 0, end: 0 },
			}, doc);

			expect(note.content).toBe('human note');
			expect(await store.list()).toEqual([]);
		});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npx vitest run test/noteManager.test.ts -t "queue mode" --root packages/code-notes-core`
Expected: FAIL — `createNote` resolves with a note instead of rejecting.

- [ ] **Step 9: Route queue-mode writes**

In `packages/code-notes-core/src/noteManager.ts`, add the import:

```typescript
import { ProposalStore, PendingWriteError } from './proposalStore.js';
```

Add the field beside `auditLog`:

```typescript
  private proposalStore?: ProposalStore;
```

Add `proposalStore?: ProposalStore;` to the constructor `opts` type, and in the body:

```typescript
    this.proposalStore = opts?.proposalStore;
```

Add this helper next to `recordAgentOp`:

```typescript
  /**
   * In queue mode an agent write becomes a proposal and never touches live
   * notes. Returns true if the write was diverted; the caller must not
   * proceed. Throws PendingWriteError so callers can't accidentally ignore it.
   */
  private async divertToProposalIfQueued(
    isAgentWrite: boolean,
    proposal: Omit<Proposal, 'proposalId' | 'agent' | 'proposedAt'>,
  ): Promise<void> {
    if (!isAgentWrite || !this.proposalStore || !this.agentWriteMode) return;
    if (await this.agentWriteMode() !== 'queue') return;

    const proposalId = `prop-${uuidv4()}`;
    await this.proposalStore.save({
      ...proposal,
      proposalId,
      agent: this.agentName,
      proposedAt: new Date().toISOString(),
    });
    throw new PendingWriteError(proposalId);
  }
```

Add the `Proposal` type to the existing `types.js` import in this file.

In `createNote`, as the **first** statement inside the `withNoteLock` callback (before any storage read):

```typescript
      await this.divertToProposalIfQueued(params.authorType === 'agent', {
        op: 'create',
        file: params.filePath,
        lineRange: params.lineRange,
        content: params.content.trim(),
      });
```

In `updateNote`, immediately after the `note.isDeleted` guard and the `const prevContent = note.content;` line:

```typescript
      await this.divertToProposalIfQueued(note.authorType === 'agent', {
        op: 'edit',
        targetNoteId: note.id,
        file: note.filePath,
        lineRange: note.lineRange,
        content: params.content.trim(),
        targetContentHash: hashNoteContent(prevContent),
      });
```

In `deleteNote`, immediately after its `note.isDeleted` guard:

```typescript
      await this.divertToProposalIfQueued(note.authorType === 'agent', {
        op: 'delete',
        targetNoteId: note.id,
        file: note.filePath,
        content: '',
        targetContentHash: hashNoteContent(note.content),
      });
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npx vitest run --root packages/code-notes-core`
Expected: PASS — all core tests, including the two new queue tests.

- [ ] **Step 11: Commit**

```bash
git add packages/code-notes-core
git commit -m "✨ feat(core): add queue mode with proposal store"
```

---

### Task 6: Lock `updateNotePositions` (v0.4 followup)

**Why here:** it is the last write path doing a cached read-modify-write with no lock — the same shape as the v0.4 lost-update bug. It is extension-only today, but v0.5's whole promise is that concurrent agent/human writes are safe.

**Files:**
- Modify: `packages/code-notes-core/src/noteManager.ts` (`updateNotePositions`)
- Test: `packages/code-notes-core/test/noteManager.test.ts`

**Interfaces:**
- Consumes: `withNoteLock`, `applyDefaults`, `this.hashTracker.validateContentHash`, `this.hashTracker.findContentByHash` (all exist).
- **Signature is unchanged:** `async updateNotePositions(document: NoteDocument): Promise<Note[]>`. It takes the document, decides for itself which notes moved (via `contentHash`), and returns the notes it moved. Do not change the signature — `extension.ts` calls it on every document change.

- [ ] **Step 1: Write the failing test**

In `packages/code-notes-core/test/noteManager.test.ts`, add a top-level `describe` in the suite:

```typescript
	describe('Position updates', () => {
		it('does not clobber a concurrent content edit made by another process', async () => {
			// Note attached to line 0; later the same text moves to line 2.
			const before = createMockDocument('target line\nfiller\nfiller\n');
			const note = await noteManager.createNote({
				content: 'original',
				filePath: before.uri.fsPath,
				lineRange: { start: 0, end: 0 }
			}, before);

			// Another process edits the note's *content* while our cache is warm.
			const other = new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('agent'),
			);
			await other.updateNote({ id: note.id, content: 'edited elsewhere' }, before);

			// The code moves down two lines, so repositioning kicks in for this note.
			const after = createMockDocument('new\nnew\ntarget line\n', before.uri.fsPath);
			await noteManager.updateNotePositions(after);

			const fresh = new NoteManager(
				new StorageManager(tempDir, '.test-notes'),
				new ContentHashTracker(),
				new FakeAuthorProvider('x'),
			);
			const final = await fresh.getNoteByIdGlobal(note.id);
			// Repositioning must move the note WITHOUT resurrecting stale content.
			expect(final!.content).toBe('edited elsewhere');
			expect(final!.lineRange.start).toBe(2);
		});
	});
```

Check `createMockDocument`'s signature at the bottom of the test file first — if it doesn't accept a path argument, extend it so both documents share one `uri.fsPath` (the note is keyed to that path).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/noteManager.test.ts -t "concurrent content edit" --root packages/code-notes-core`
Expected: FAIL — `final.content` is `'original'`: the stale cached note object was saved back over the other process's edit.

- [ ] **Step 3: Rewrite the body to lock and re-read per note**

Keep the signature and the return value. Replace the body of `updateNotePositions` in `packages/code-notes-core/src/noteManager.ts`:

```typescript
  async updateNotePositions(document: NoteDocument): Promise<Note[]> {
    const filePath = document.uri.fsPath;
    const notes = await this.getNotesForFile(filePath);
    const updatedNotes: Note[] = [];

    for (const cached of notes) {
      // Deciding *whether* a note moved is a pure read of the document — the
      // cached copy is fine for that, and it keeps the common (nothing moved)
      // case lock-free.
      const isValid = this.hashTracker.validateContentHash(
        document,
        cached.lineRange,
        cached.contentHash
      );
      if (isValid) continue;

      const result = await this.hashTracker.findContentByHash(
        document,
        cached.contentHash,
        cached.lineRange
      );
      if (!result.found || !result.newLineRange) continue;

      const newLineRange = result.newLineRange;
      await this.withNoteLock(cached.id, async () => {
        // Re-read inside the lock before writing: another process may have
        // edited this note's content since our cache warmed, and saving the
        // cached object would erase that edit (the v0.4 lost-update bug).
        const raw = await this.storage.loadNoteById(cached.id);
        if (!raw) return;
        const note = applyDefaults(raw);
        if (note.isDeleted) return;

        note.lineRange = newLineRange;
        note.updatedAt = new Date().toISOString();
        await this.storage.saveNote(note);
        this.updateNoteInCache(note);
        updatedNotes.push(note);
      });
    }

    if (updatedNotes.length > 0) {
      this.clearWorkspaceCache();
    }

    return updatedNotes;
  }
```

Note the cache handling changed deliberately: the old code did `this.noteCache.set(filePath, notes)`, writing the whole stale array back. `updateNoteInCache(note)` per note plus a workspace-cache clear is the correct equivalent.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --root packages/code-notes-core`
Expected: PASS — the new test plus every existing position-update test.

- [ ] **Step 5: Run the extension suite**

Run: `npm run build -w @jnahian/code-notes-core && npm run test:unit -w code-context-notes && npm test -w code-context-notes`
Expected: 19 unit + 176 integration pass. Repositioning is on the document-change path, so the integration suite is the real check here — it exercises `updateNotePositions` for real.

- [ ] **Step 6: Commit**

```bash
git add packages/code-notes-core
git commit -m "🐛 fix(core): lock and re-read note repositioning writes"
```

---

### Task 7: MCP server — config-driven modes and the pending shape

**Files:**
- Modify: `packages/code-notes-mcp/src/server.ts`
- Modify: `packages/code-notes-mcp/src/tools/create_note.ts`, `edit_note.ts`, `delete_note.ts`
- Modify: `packages/code-notes-mcp/README.md`
- Test: `packages/code-notes-mcp/test/queue_mode.test.ts`, `packages/code-notes-mcp/test/server.test.ts`

**Interfaces:**
- Consumes: `readWorkspaceConfig` (Task 2), `AuditLog` (Task 3), `ProposalStore`/`PendingWriteError` (Task 5).
- Produces: write tools return `{ status: 'pending', proposalId, message }` in queue mode. `pendingResult(proposalId)` helper in `tools/errors.ts`.

- [ ] **Step 1: Write the failing test**

Create `packages/code-notes-mcp/test/queue_mode.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  StorageManager, NoteManager, ContentHashTracker, ProposalStore, writeWorkspaceConfig,
} from '@jnahian/code-notes-core';
import { handleToolCall } from '../src/server.js';

describe('queue mode via the MCP dispatch', () => {
  let tempDir: string;
  let noteManager: NoteManager;
  let store: ProposalStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'queue-mode-test-'));
    const storagePath = path.join(tempDir, '.code-notes');
    await writeWorkspaceConfig(storagePath, {
      agentWriteMode: 'queue',
      agentAllowList: [],
      auditLogRetention: 1000,
    });
    store = new ProposalStore(path.join(storagePath, '_pending'));
    noteManager = new NoteManager(
      new StorageManager(tempDir, '.code-notes'),
      new ContentHashTracker(),
      { getAuthorName: async () => 'claude-code', updateConfigOverride: () => {} },
      {
        proposalStore: store,
        agentWriteMode: async () => 'queue',
        agentName: 'claude-code',
      },
    );
    await fs.writeFile(path.join(tempDir, 'app.ts'), 'line0\n');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns the pending shape instead of a note, and writes a proposal', async () => {
    const r = await handleToolCall(
      'create_note',
      { file: 'app.ts', lineRange: { start: 0, end: 0 }, content: 'proposed' },
      { noteManager, workspace: tempDir, readOnly: false },
    );
    const parsed = JSON.parse(r.content[0].text);

    expect(parsed.status).toBe('pending');
    expect(parsed.proposalId).toMatch(/^prop-/);
    expect(parsed.message).toContain('approval');
    // Not an error — agents must not treat this as retryable.
    expect(parsed.error).toBeUndefined();

    expect(await store.list()).toHaveLength(1);
    expect(await noteManager.getAllNotes()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/queue_mode.test.ts --root packages/code-notes-mcp`
Expected: FAIL — `PendingWriteError` escapes and `handleToolCall`'s catch-all turns it into `{ error: 'internal_error' }`.

- [ ] **Step 3: Add the pending helper**

In `packages/code-notes-mcp/src/tools/errors.ts`, append:

```typescript
/**
 * Queue mode's success shape. Deliberately not an `error` — an agent that
 * saw an error code here would retry-loop against a human approval step.
 */
export function pendingResult(proposalId: string) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ status: 'pending', proposalId, message: 'Awaiting human approval.' }),
    }],
  };
}
```

- [ ] **Step 4: Map `PendingWriteError` at the dispatch choke point**

In `packages/code-notes-mcp/src/server.ts`, add to the imports from `@jnahian/code-notes-core`: `PendingWriteError`, and from `./tools/errors.js`: `pendingResult`.

In `handleToolCall`, replace the existing `catch (e) {` block with:

```typescript
  } catch (e) {
    // Queue mode diverted the write — a normal outcome, not a failure.
    if (e instanceof PendingWriteError) return pendingResult(e.proposalId);
    // Last-resort guard: anything a tool still throws (e.g. an unexpected
    // failure after a note was already created) becomes an in-band error, so
    // tool failures are never surfaced as JSON-RPC protocol errors.
    return errorResult('internal_error', { detail: e instanceof Error ? e.message : String(e) });
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/queue_mode.test.ts --root packages/code-notes-mcp`
Expected: PASS

- [ ] **Step 6: Wire config, audit log, and proposal store into `startServer`**

In `packages/code-notes-mcp/src/server.ts`, add to the core imports: `AuditLog`, `ProposalStore`, `readWorkspaceConfig`.

In `startServer`, replace the `const noteManager = new NoteManager(storage, hashTracker, authorProvider, { lockManager });` line with:

```typescript
  const storagePath = path.join(workspace, storageDir);
  const auditLog = new AuditLog(path.join(storagePath, '_audit.log'), {
    lockManager,
    retention: (await readWorkspaceConfig(storagePath)).auditLogRetention,
  });
  const proposalStore = new ProposalStore(path.join(storagePath, '_pending'));
  const noteManager = new NoteManager(storage, hashTracker, authorProvider, {
    lockManager,
    auditLog,
    proposalStore,
    // Re-read per call, never captured: a human can change the mode while this
    // long-lived server runs, and a cached policy is a policy that lies.
    agentWriteMode: async () => (await readWorkspaceConfig(storagePath)).agentWriteMode,
    agentName: args.agent ?? 'unknown-agent',
  });
```

- [ ] **Step 7: Verify the mode is re-read, not captured**

Add to `packages/code-notes-mcp/test/server.test.ts`:

```typescript
describe('write mode is re-read per call', () => {
  it('picks up a mode change without restarting the server', async () => {
    const modes: string[] = ['direct', 'queue'];
    let calls = 0;
    const agentWriteMode = async () => modes[calls++] as 'direct' | 'queue';

    expect(await agentWriteMode()).toBe('direct');
    expect(await agentWriteMode()).toBe('queue');
    // The contract that matters: NoteManager holds the function, not its result.
    expect(calls).toBe(2);
  });
});
```

- [ ] **Step 8: Document the modes in the README**

In `packages/code-notes-mcp/README.md`, replace the entire `## Trust model` section with:

```markdown
## Trust model

Agent writes are governed by `agentWriteMode` in `<storageDir>/config.json` — a workspace-owned file, not a server flag. There is deliberately no `--write-mode` option: an agent that picks its own mode has no rails.

| Mode | Agent writes | Use when |
|---|---|---|
| `direct` | Land immediately, attributed `authorType: agent`. | Solo dev, trusted agent. |
| `audit` (default) | Land immediately, and every op is appended to `<storageDir>/_audit.log`. The extension's **Agent activity** view lists them with a Revert action. | Most teams. |
| `queue` | Do **not** touch live notes. Each write becomes a proposal in `<storageDir>/_pending/`, surfaced in the extension's **Pending agent proposals** view for Approve / Reject. | Shared or regulated codebases. |

```jsonc
// .code-notes/config.json
{
  "agentWriteMode": "audit",   // "direct" | "audit" | "queue"
  "agentAllowList": [],         // informational; empty allows any --agent name
  "auditLogRetention": 1000     // ops kept before rotating to _audit.log.1
}
```

Without `--agent`, the server is read-only and none of this applies.

### What write tools return in `queue` mode

Not a note, and **not an error** — retrying will not help:

```json
{ "status": "pending", "proposalId": "prop-xyz", "message": "Awaiting human approval." }
```

The mode is re-read from disk on every call, so a human changing it takes effect without restarting the server.
```

- [ ] **Step 9: Run the full suites**

Run: `npm run build --workspaces && npm test -w @jnahian/code-notes-core && npm test -w @jnahian/code-notes-mcp`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add packages/code-notes-mcp
git commit -m "✨ feat(mcp): drive write modes from workspace config"
```

---

### Task 8: Extension — settings, config sync, watcher globs

**Files:**
- Modify: `packages/extension/package.json` (configuration block)
- Modify: `packages/extension/src/extension.ts`
- Test: `packages/extension/src/test/suite/` (integration)

**Interfaces:**
- Consumes: `readWorkspaceConfig`, `writeWorkspaceConfig`, `DEFAULT_WORKSPACE_CONFIG` (Task 2).
- Produces: `.code-notes/config.json` kept in sync from VS Code settings; `noteManager` emits `auditLogChanged` and `proposalsChanged`. Tasks 9 and 10 subscribe to those events.

- [ ] **Step 1: Add the settings**

In `packages/extension/package.json`, inside `contributes.configuration.properties` (alongside `codeContextNotes.storageDirectory`), add:

```json
        "codeContextNotes.agentWriteMode": {
          "type": "string",
          "enum": ["direct", "audit", "queue"],
          "enumDescriptions": [
            "Agent writes land immediately.",
            "Agent writes land and are logged to .code-notes/_audit.log, reviewable in the Agent activity view.",
            "Agent writes become proposals needing approval in the Pending agent proposals view."
          ],
          "default": "audit",
          "description": "How writes from MCP agents are handled. Written to .code-notes/config.json so the standalone MCP server reads the same policy."
        },
        "codeContextNotes.agentAllowList": {
          "type": "array",
          "items": { "type": "string" },
          "default": [],
          "description": "Agent names allowed to write (matches the server's --agent value). Empty allows any. Informational, not a security boundary."
        },
        "codeContextNotes.auditLogRetention": {
          "type": "number",
          "default": 1000,
          "description": "Number of audit log entries kept before older ones rotate to _audit.log.1."
        }
```

- [ ] **Step 2: Sync the settings into config.json on activate and on change**

In `packages/extension/src/extension.ts`, add to the `@jnahian/code-notes-core` import: `readWorkspaceConfig`, `writeWorkspaceConfig`.

After the existing `const storageDirectory = config.get<string>('storageDirectory', '.code-notes');` in `activate`, add:

```typescript
	// The MCP server can't read VS Code settings — it reads config.json. Treat
	// the VS Code settings as the UI and config.json as the shared source of
	// truth, and keep them in sync.
	const storagePath = path.join(workspaceRoot, storageDirectory);
	const syncWorkspaceConfig = async () => {
		const cfg = vscode.workspace.getConfiguration('codeContextNotes');
		await writeWorkspaceConfig(storagePath, {
			agentWriteMode: cfg.get<'direct' | 'audit' | 'queue'>('agentWriteMode', 'audit'),
			agentAllowList: cfg.get<string[]>('agentAllowList', []),
			auditLogRetention: cfg.get<number>('auditLogRetention', 1000),
		});
	};
	await syncWorkspaceConfig();

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(async (e) => {
			if (
				e.affectsConfiguration('codeContextNotes.agentWriteMode') ||
				e.affectsConfiguration('codeContextNotes.agentAllowList') ||
				e.affectsConfiguration('codeContextNotes.auditLogRetention')
			) {
				await syncWorkspaceConfig();
			}
		}),
	);
```

- [ ] **Step 3: Extend the watcher to the new paths**

The current watcher globs `${storageDirectory}/**/*.md`. `_audit.log` doesn't match it at all (no event), and `_pending/*.md` matches but would be mistaken for a note. Replace the `fileWatcherPattern`/`fileWatcher` declarations with:

```typescript
	const fileWatcherPattern = new vscode.RelativePattern(
		vscode.workspace.workspaceFolders![0],
		`${storageDirectory}/**/*.{md,log}`
	);
	const fileWatcher = vscode.workspace.createFileSystemWatcher(fileWatcherPattern);

	// Proposals and the audit log live under the storage dir but are not notes.
	// Route them to their own views instead of the note cache/sidebar.
	const routeNonNoteFile = (uri: vscode.Uri): boolean => {
		const rel = path.relative(storagePath, uri.fsPath);
		if (rel.startsWith('_pending')) {
			noteManager.emit('proposalsChanged');
			return true;
		}
		if (path.basename(uri.fsPath).startsWith('_audit.log')) {
			noteManager.emit('auditLogChanged');
			return true;
		}
		return false;
	};
```

Then add `if (routeNonNoteFile(uri)) { return; }` as the first line of each of the three handlers (`onDidCreate`, `onDidChange`, `onDidDelete`), immediately before their existing `if (isGeneratedExport(uri))` guard.

- [ ] **Step 4: Compile and run the suites**

Run: `npm run compile:tsc -w code-context-notes && npm run test:unit -w code-context-notes && npm test -w code-context-notes`
Expected: clean compile; 19 unit + 176 integration pass.

- [ ] **Step 5: Verify config.json is actually written**

Run: `code --extensionDevelopmentPath=packages/extension .` (or F5 in VS Code), then in the dev host open a workspace and check:

```bash
cat .code-notes/config.json
```

Expected: `{ "agentWriteMode": "audit", "agentAllowList": [], "auditLogRetention": 1000 }`. Then change **Settings → Code Context Notes → Agent Write Mode** to `queue` and re-run the `cat`: `agentWriteMode` is now `"queue"`.

- [ ] **Step 6: Commit**

```bash
git add packages/extension
git commit -m "✨ feat(extension): sync agent write settings to .code-notes/config.json"
```

---

### Task 9: "Agent activity" view + Revert

**Files:**
- Create: `packages/extension/src/agentActivityProvider.ts`
- Modify: `packages/extension/src/extension.ts`, `packages/extension/package.json`
- Test: `packages/extension/src/test/suite/agentActivity.test.ts`

**Interfaces:**
- Consumes: `AuditLog.read()`, `AuditEntry` (Task 3); `auditLogChanged` event (Task 8).
- Produces: `class AgentActivityProvider implements vscode.TreeDataProvider<AgentActivityItem>` with `refresh()`; commands `codeContextNotes.revertAgentOp`, `codeContextNotes.truncateAuditLog`, `codeContextNotes.openAuditedNote`.

- [ ] **Step 1: Write the provider**

Create `packages/extension/src/agentActivityProvider.ts`:

```typescript
import * as vscode from 'vscode';
import type { AuditEntry, AuditLog } from '@jnahian/code-notes-core';

const DISPLAY_LIMIT = 50;

export class AgentActivityItem extends vscode.TreeItem {
	constructor(public readonly entry: AuditEntry) {
		super(`${entry.op} · ${vscode.workspace.asRelativePath(entry.file)}`, vscode.TreeItemCollapsibleState.None);
		this.description = `${entry.agent} · ${new Date(entry.ts).toLocaleString()}`;
		this.tooltip = `${entry.op} ${entry.noteId}\nby ${entry.agent}\n${entry.ts}`;
		this.contextValue = 'agentActivityItem';
		this.iconPath = new vscode.ThemeIcon(
			entry.op === 'create' ? 'add' : entry.op === 'edit' ? 'edit' : 'trash',
		);
		this.command = {
			command: 'codeContextNotes.openAuditedNote',
			title: 'Open note',
			arguments: [entry],
		};
	}
}

/** Read-only view over the audit log; the log itself is the source of truth. */
export class AgentActivityProvider implements vscode.TreeDataProvider<AgentActivityItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<AgentActivityItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(private auditLog: AuditLog) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: AgentActivityItem): vscode.TreeItem {
		return element;
	}

	async getChildren(): Promise<AgentActivityItem[]> {
		const entries = await this.auditLog.read(DISPLAY_LIMIT);
		return entries.map(e => new AgentActivityItem(e));
	}
}
```

- [ ] **Step 2: Register the view**

In `packages/extension/package.json`, add to `contributes.views.codeContextNotes` (after the existing `codeContextNotes.sidebarView` entry):

```json
        {
          "id": "codeContextNotes.agentActivityView",
          "name": "Agent activity",
          "contextualTitle": "Code Context Notes"
        }
```

Add to `contributes.commands`:

```json
      {
        "command": "codeContextNotes.revertAgentOp",
        "title": "Revert this agent change",
        "icon": "$(discard)"
      },
      {
        "command": "codeContextNotes.truncateAuditLog",
        "title": "Code Notes: Truncate Audit Log"
      },
      {
        "command": "codeContextNotes.openAuditedNote",
        "title": "Open the note this entry refers to"
      }
```

Add to `contributes.menus` (create the `view/item/context` key if absent):

```json
      "view/item/context": [
        {
          "command": "codeContextNotes.revertAgentOp",
          "when": "view == codeContextNotes.agentActivityView && viewItem == agentActivityItem",
          "group": "inline"
        }
      ]
```

- [ ] **Step 3: Wire it up in `extension.ts`**

Add the import:

```typescript
import { AgentActivityProvider } from './agentActivityProvider';
```

and to the core import: `AuditLog`.

In `activate`, after the config sync block from Task 8:

```typescript
	const auditLog = new AuditLog(path.join(storagePath, '_audit.log'), {
		retention: vscode.workspace.getConfiguration('codeContextNotes').get<number>('auditLogRetention', 1000),
	});
	const agentActivityProvider = new AgentActivityProvider(auditLog);
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('codeContextNotes.agentActivityView', agentActivityProvider),
	);
	noteManager.on('auditLogChanged', () => agentActivityProvider.refresh());

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.openAuditedNote', async (entry: AuditEntry) => {
			const note = await noteManager.getNoteByIdGlobal(entry.noteId);
			if (!note) {
				vscode.window.showWarningMessage(`Note ${entry.noteId} no longer exists.`);
				return;
			}
			const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(note.filePath));
			const editor = await vscode.window.showTextDocument(doc);
			const line = note.lineRange.start;
			editor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.InCenter);
			editor.selection = new vscode.Selection(line, 0, line, 0);
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.truncateAuditLog', async () => {
			const pick = await vscode.window.showWarningMessage(
				'Clear the agent audit log? Recorded activity will be lost; your notes are unaffected.',
				{ modal: true },
				'Clear log',
			);
			if (pick !== 'Clear log') return;
			await auditLog.truncate();
			agentActivityProvider.refresh();
		}),
	);
```

- [ ] **Step 4: Implement Revert**

Add in `activate`, after the commands above:

```typescript
	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.revertAgentOp', async (item: AgentActivityItem) => {
			const { entry } = item;
			const note = await noteManager.getNoteByIdGlobal(entry.noteId);
			if (!note) {
				vscode.window.showWarningMessage(`Note ${entry.noteId} no longer exists — nothing to revert.`);
				return;
			}

			const confirm = await vscode.window.showWarningMessage(
				`Revert the ${entry.op} by ${entry.agent}?`,
				{ modal: true },
				'Revert',
			);
			if (confirm !== 'Revert') return;

			try {
				const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(note.filePath));
				if (entry.op === 'create') {
					// Reverse of create is delete.
					await noteManager.deleteNote(note.id, note.filePath);
				} else {
					// Reverse of edit/delete is the previous content from history[].
					// history is append-only, so the entry before the last is the
					// state this op replaced.
					const prior = note.history[note.history.length - 2];
					if (!prior) {
						vscode.window.showWarningMessage('No prior version recorded for this note.');
						return;
					}
					await noteManager.updateNote({ id: note.id, content: prior.content }, doc);
				}
				agentActivityProvider.refresh();
				vscode.window.showInformationMessage(`Reverted ${entry.op} on ${path.basename(note.filePath)}.`);
			} catch (e) {
				vscode.window.showErrorMessage(`Revert failed: ${(e as Error).message}`);
			}
		}),
	);
```

Add `AuditEntry` and `AgentActivityItem` to the imports as needed.

- [ ] **Step 5: Write the integration test**

Create `packages/extension/src/test/suite/agentActivity.test.ts`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Agent activity view', () => {
	test('registers the view and its commands', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('codeContextNotes.revertAgentOp'), 'revert command registered');
		assert.ok(commands.includes('codeContextNotes.truncateAuditLog'), 'truncate command registered');
		assert.ok(commands.includes('codeContextNotes.openAuditedNote'), 'open command registered');
	});
});
```

- [ ] **Step 6: Run the suites**

Run: `npm run compile:tsc -w code-context-notes && npm test -w code-context-notes`
Expected: compile clean; integration suite passes including the new test.

- [ ] **Step 7: Verify by hand**

Run the extension dev host, set `agentWriteMode` to `audit`, then from a terminal in the same workspace:

```bash
node packages/code-notes-mcp/dist/index.js --workspace . --agent smoke <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"s","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_note","arguments":{"file":"README.md","lineRange":{"start":0,"end":0},"content":"from an agent"}}}
EOF
```

Expected: the note appears in the Notes view **and** an entry appears in **Agent activity** without reloading the window. Click Revert: the note is deleted and the entry list refreshes.

- [ ] **Step 8: Commit**

```bash
git add packages/extension
git commit -m "✨ feat(extension): add Agent activity view with revert"
```

---

### Task 10: "Pending agent proposals" view + Approve / Reject

**Files:**
- Create: `packages/extension/src/pendingProposalsProvider.ts`
- Modify: `packages/extension/src/extension.ts`, `packages/extension/package.json`
- Test: `packages/extension/src/test/suite/pendingProposals.test.ts`

**Interfaces:**
- Consumes: `ProposalStore` (Task 5), `hashNoteContent` (Task 3), `proposalsChanged` event (Task 8).
- Produces: `class PendingProposalsProvider implements vscode.TreeDataProvider<ProposalItem>`; commands `codeContextNotes.approveProposal`, `codeContextNotes.rejectProposal`, `codeContextNotes.editAndApproveProposal`.

**Stale/orphan handling (spec §7.6):** ship **simple-pick**, not a 3-way merge. If the target note's current content hash differs from the proposal's `targetContentHash`, ask the human to choose *their version* or *the agent's*. If the target is gone, the proposal is orphaned — offer reject only.

- [ ] **Step 1: Write the provider**

Create `packages/extension/src/pendingProposalsProvider.ts`:

```typescript
import * as vscode from 'vscode';
import type { Proposal, ProposalStore } from '@jnahian/code-notes-core';

export class ProposalItem extends vscode.TreeItem {
	constructor(public readonly proposal: Proposal, orphaned: boolean) {
		super(
			`${proposal.op} · ${vscode.workspace.asRelativePath(proposal.file)}`,
			vscode.TreeItemCollapsibleState.None,
		);
		this.description = orphaned
			? `${proposal.agent} · target missing`
			: `${proposal.agent} · ${new Date(proposal.proposedAt).toLocaleString()}`;
		this.tooltip = proposal.content || `(${proposal.op})`;
		this.contextValue = orphaned ? 'orphanedProposalItem' : 'proposalItem';
		this.iconPath = new vscode.ThemeIcon(orphaned ? 'warning' : 'git-pull-request');
	}
}

export class PendingProposalsProvider implements vscode.TreeDataProvider<ProposalItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<ProposalItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(
		private store: ProposalStore,
		private isOrphaned: (p: Proposal) => Promise<boolean>,
	) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ProposalItem): vscode.TreeItem {
		return element;
	}

	async getChildren(): Promise<ProposalItem[]> {
		const proposals = await this.store.list();
		return Promise.all(proposals.map(async p => new ProposalItem(p, await this.isOrphaned(p))));
	}
}
```

- [ ] **Step 2: Register the view, commands, and badge**

In `packages/extension/package.json`, add to `contributes.views.codeContextNotes`:

```json
        {
          "id": "codeContextNotes.pendingProposalsView",
          "name": "Pending agent proposals",
          "contextualTitle": "Code Context Notes"
        }
```

Add to `contributes.commands`:

```json
      {
        "command": "codeContextNotes.approveProposal",
        "title": "Approve",
        "icon": "$(check)"
      },
      {
        "command": "codeContextNotes.rejectProposal",
        "title": "Reject",
        "icon": "$(x)"
      },
      {
        "command": "codeContextNotes.editAndApproveProposal",
        "title": "Edit and approve",
        "icon": "$(edit)"
      }
```

Add to `contributes.menus.view/item/context`:

```json
        {
          "command": "codeContextNotes.approveProposal",
          "when": "view == codeContextNotes.pendingProposalsView && viewItem == proposalItem",
          "group": "inline@1"
        },
        {
          "command": "codeContextNotes.editAndApproveProposal",
          "when": "view == codeContextNotes.pendingProposalsView && viewItem == proposalItem",
          "group": "inline@2"
        },
        {
          "command": "codeContextNotes.rejectProposal",
          "when": "view == codeContextNotes.pendingProposalsView",
          "group": "inline@3"
        }
```

- [ ] **Step 3: Wire it up with approve/reject in `extension.ts`**

Add imports: `import { PendingProposalsProvider, ProposalItem } from './pendingProposalsProvider';` and to the core import: `ProposalStore`, `hashNoteContent`, `type Proposal`.

In `activate`, after the Agent activity block:

```typescript
	const proposalStore = new ProposalStore(path.join(storagePath, '_pending'));
	const isOrphaned = async (p: Proposal): Promise<boolean> =>
		p.op !== 'create' && !(await noteManager.getNoteByIdGlobal(p.targetNoteId!));
	const pendingProposalsProvider = new PendingProposalsProvider(proposalStore, isOrphaned);
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('codeContextNotes.pendingProposalsView', pendingProposalsProvider),
	);
	noteManager.on('proposalsChanged', () => pendingProposalsProvider.refresh());

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.rejectProposal', async (item: ProposalItem) => {
			await proposalStore.reject(item.proposal.proposalId);
			pendingProposalsProvider.refresh();
			vscode.window.showInformationMessage('Proposal rejected. Kept in _pending/.rejected/ for audit.');
		}),
	);

	const applyProposal = async (p: Proposal, content: string): Promise<void> => {
		const approver = await noteManager.getDefaultAuthor();
		const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(p.file));

		if (p.op === 'create') {
			await noteManager.createNote({
				filePath: p.file,
				lineRange: p.lineRange!,
				content,
				author: approver,
				authorType: 'agent',
				approvedBy: approver,
			}, doc);
		} else if (p.op === 'edit') {
			await noteManager.updateNote({ id: p.targetNoteId!, content, author: approver }, doc);
		} else {
			await noteManager.deleteNote(p.targetNoteId!, p.file);
		}
		await proposalStore.remove(p.proposalId);
		pendingProposalsProvider.refresh();
	};

	/**
	 * Simple-pick, not a 3-way merge (spec §7.6): if the note changed since the
	 * proposal was made, the human picks a side. Add a real merge only if
	 * conflicts turn out to be common.
	 */
	const resolveStaleTarget = async (p: Proposal): Promise<string | undefined> => {
		if (p.op === 'create' || !p.targetContentHash) return p.content;
		const current = await noteManager.getNoteByIdGlobal(p.targetNoteId!);
		if (!current) {
			vscode.window.showWarningMessage('The note this proposal targets no longer exists. Reject it instead.');
			return undefined;
		}
		if (hashNoteContent(current.content) === p.targetContentHash) return p.content;

		const pick = await vscode.window.showWarningMessage(
			'This note changed after the agent proposed its edit.',
			{ modal: true, detail: `Yours:\n${current.content}\n\nAgent's:\n${p.content}` },
			"Use agent's version",
			'Keep mine',
		);
		if (pick === "Use agent's version") return p.content;
		return undefined;
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.approveProposal', async (item: ProposalItem) => {
			try {
				const content = await resolveStaleTarget(item.proposal);
				if (content === undefined) return;
				await applyProposal(item.proposal, content);
				vscode.window.showInformationMessage('Proposal approved.');
			} catch (e) {
				vscode.window.showErrorMessage(`Approve failed: ${(e as Error).message}`);
			}
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codeContextNotes.editAndApproveProposal', async (item: ProposalItem) => {
			const edited = await vscode.window.showInputBox({
				prompt: 'Edit the proposed note before approving',
				value: item.proposal.content,
			});
			if (edited === undefined) return;
			try {
				await applyProposal(item.proposal, edited);
				vscode.window.showInformationMessage('Proposal approved with your edits.');
			} catch (e) {
				vscode.window.showErrorMessage(`Approve failed: ${(e as Error).message}`);
			}
		}),
	);
```

- [ ] **Step 4: Add `approvedBy` to the note model**

Approved proposals must record who approved them (spec §5.4.3). In `packages/code-notes-core/src/types.ts`, add to the `Note` interface and to `CreateNoteParams`:

```typescript
  /** Set when a human approved an agent's queued proposal. */
  approvedBy?: string;
```

In `noteManager.ts`'s `createNote`, add alongside the other optional spreads from Task 1:

```typescript
        ...(params.approvedBy !== undefined && { approvedBy: params.approvedBy }),
```

`StorageManager` serializes an **explicit field list** (`**AuthorType:**`, `**ExpiresAt:**`, …), so an unlisted field is silently dropped on save. Both sides need `approvedBy`. In `noteToMarkdown`, next to the `**AuthorType:**` block (~line 262):

```typescript
    if (note.approvedBy) {
      lines.push(`**ApprovedBy:** ${note.approvedBy}`);
    }
```

and in `markdownToNote`, mirror however the sibling `**AuthorType:**`/`**ExpiresAt:**` fields are parsed — find them with:

```bash
grep -n "AuthorType\|ExpiresAt" packages/code-notes-core/src/storageManager.ts
```

- [ ] **Step 5: Prove `approvedBy` survives a disk round-trip**

A serializer field that isn't tested is a field that gets dropped. In `packages/code-notes-core/test/storageManager.test.ts`:

```typescript
	it('round-trips approvedBy through markdown', async () => {
		const note = { ...makeTestNote(), approvedBy: 'Jane Dev' };
		await storage.saveNote(note);
		const loaded = await storage.loadNoteById(note.id);
		expect(loaded!.approvedBy).toBe('Jane Dev');
	});
```

Match the file's existing test-note helper name (it may be `makeTestNote`, `createNote`, or an inline literal — check the file). Run:

`npx vitest run test/storageManager.test.ts -t "approvedBy" --root packages/code-notes-core`
Expected: PASS. If it fails with `undefined`, the parser half of Step 4 is missing.

- [ ] **Step 6: Expose the default author**

`applyProposal` needs the approver's name, and `defaultAuthor` is private with no accessor (verified). Add to `NoteManager`:

```typescript
  /** The human's display name — used to attribute an approved proposal. */
  async getDefaultAuthor(): Promise<string> {
    return this.gitIntegration.getAuthorName();
  }
```

- [ ] **Step 7: Write the integration test**

Create `packages/extension/src/test/suite/pendingProposals.test.ts`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Pending proposals view', () => {
	test('registers the approve/reject commands', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('codeContextNotes.approveProposal'), 'approve registered');
		assert.ok(commands.includes('codeContextNotes.rejectProposal'), 'reject registered');
		assert.ok(commands.includes('codeContextNotes.editAndApproveProposal'), 'edit-and-approve registered');
	});
});
```

- [ ] **Step 8: Add the mode-switch orphan prompt (spec §5.4.2 trade-off 2)**

Switching out of `queue` can strand proposals. In the `onDidChangeConfiguration` handler from Task 8, after `await syncWorkspaceConfig();`:

```typescript
			if (e.affectsConfiguration('codeContextNotes.agentWriteMode')) {
				const mode = vscode.workspace.getConfiguration('codeContextNotes').get<string>('agentWriteMode');
				const stranded = await proposalStore.list();
				if (mode !== 'queue' && stranded.length > 0) {
					const pick = await vscode.window.showWarningMessage(
						`${stranded.length} agent proposal(s) are still pending, but queue mode is off.`,
						'Review them',
						'Reject all',
					);
					if (pick === 'Review them') {
						await vscode.commands.executeCommand('codeContextNotes.pendingProposalsView.focus');
					} else if (pick === 'Reject all') {
						for (const p of stranded) await proposalStore.reject(p.proposalId);
						pendingProposalsProvider.refresh();
					}
				}
			}
```

- [ ] **Step 9: Run the suites**

Run: `npm run build --workspaces && npm run compile:tsc -w code-context-notes && npm test -w code-context-notes && npm test -w @jnahian/code-notes-core`
Expected: all pass.

- [ ] **Step 10: Verify the whole queue loop by hand**

In the dev host, set **Agent Write Mode** to `queue`, then run the same MCP `create_note` snippet from Task 9 Step 7.

Expected: the tool returns `{"status":"pending","proposalId":"prop-…"}`; **no** note appears in the Notes view; the proposal appears under **Pending agent proposals**. Click Approve → the note appears in Notes, attributed to you as approver, and the proposal disappears. Repeat with Reject → `.code-notes/_pending/.rejected/` holds the file.

- [ ] **Step 11: Commit**

```bash
git add packages/extension packages/code-notes-core
git commit -m "✨ feat(extension): add pending agent proposals view with approve/reject"
```

---

### Task 11: Docs — changelog and user-story sign-off

**Files:**
- Modify: `docs/agent-trust-model/README.md` (the user story — already written; tick its boxes)
- Create: `docs/changelogs/v0.5.0.md` (per `docs/changelogs/CHANGELOG_TEMPLATE.md`)
- Modify: `web/src/pages/ChangelogPage.tsx`

- [ ] **Step 1: Tick off the user story**

`docs/agent-trust-model/README.md` was written during planning and holds the acceptance criteria for all four stories. Go through it and check off each task and criterion you actually verified. **Anything you can't tick is either not done or not tested** — resolve it before continuing rather than checking it optimistically.

- [ ] **Step 2: Write the changelog**

Read `docs/changelogs/CHANGELOG_TEMPLATE.md` and `docs/changelogs/v0.4.0.md` (for the section structure this repo actually uses: Added / Fixed / Changed / Settings / Compatibility / Testing / Technical / Coming Next). Create `docs/changelogs/v0.5.0.md` with:

- **Summary:** v0.5 puts you in control of agent-authored notes with three write modes and two review surfaces.
- **Added:** `agentWriteMode` (`direct` / `audit` / `queue`); `_audit.log` + **Agent activity** view with Revert; `_pending/` proposals + **Pending agent proposals** view with Approve / Reject / Edit-and-approve; `agentAllowList`, `auditLogRetention`; `Code Notes: Truncate Audit Log`.
- **Fixed:** note repositioning now locks and re-reads, so it can't overwrite a concurrent edit.
- **Changed:** agent writes are audited by default — **call this out as a behavior change**: upgrading workspaces gain `.code-notes/config.json` and `.code-notes/_audit.log`, and agent activity is logged unless the mode is set to `direct`.
- **Settings:** the three new keys, noting they are mirrored to `.code-notes/config.json` so the standalone MCP server reads the same policy.
- **Compatibility:** existing notes untouched; a v0.4 MCP server against a v0.5 workspace ignores the config and behaves as `direct` — call out the upgrade-both recommendation.
- **Coming Next:** whatever v0.6 holds (3-way merge if conflicts prove common; bulk re-tagging if curation friction is real).

Get the exact test counts from Step 4 before writing the Testing section.

- [ ] **Step 3: Add the web changelog entry**

Use the `add-web-changelog` skill: `/add-web-changelog 0.5.0`. It edits `web/src/pages/ChangelogPage.tsx`: adds the 0.5.0 timeline entry with the `Latest` badge and gradient card, and demotes 0.4.0 to a standard card with a non-orange node.

Then verify: `cd web && npm run build:client`
Expected: `✓ built`, no TypeScript errors.

- [ ] **Step 4: Collect the real test counts**

```bash
npm test -w @jnahian/code-notes-core 2>&1 | grep "Tests "
npm test -w @jnahian/code-notes-mcp 2>&1 | grep "Tests "
npm run test:unit -w code-context-notes 2>&1 | grep passing
npm test -w code-context-notes 2>&1 | grep passing
```

Put the actual numbers in both changelogs. Never estimate them.

- [ ] **Step 5: Commit**

```bash
git add docs web
git commit -m "📝 docs: add v0.5.0 user story and changelog"
```

---

### Task 12: Release prep

**Files:**
- Modify: `packages/extension/package.json`, `packages/code-notes-core/package.json`, `packages/code-notes-mcp/package.json`

- [ ] **Step 1: Bump versions**

- `packages/extension/package.json`: `0.4.0` → `0.5.0`
- `packages/code-notes-core/package.json`: `0.1.0` → `0.2.0` (new exported API: config, audit log, proposals)
- `packages/code-notes-mcp/package.json`: `0.1.0` → `0.2.0`

The MCP package depends on core by exact version — bump that dependency too:

```bash
grep -n '"@jnahian/code-notes-core"' packages/code-notes-mcp/package.json packages/extension/package.json
```

Update each to `"0.2.0"`, then run `npm install` to refresh the lockfile.

- [ ] **Step 2: Run the full gates**

```bash
npm run compile:tsc --workspaces --if-present
npm run build --workspaces --if-present
npm test -w @jnahian/code-notes-core
npm test -w @jnahian/code-notes-mcp
npm run test:unit -w code-context-notes
npm test -w code-context-notes
cd packages/extension && npm run package:dev
```

Expected: clean across all packages; `code-context-notes-0.5.0.vsix` packages.

- [ ] **Step 3: Publish dry-runs**

```bash
cd packages/code-notes-core && npm publish --dry-run
cd ../code-notes-mcp && npm publish --dry-run
```

Inspect each file list: `dist/` + `README.md` + `LICENSE` only; no `test/`, no stray files. Confirm zero `npm warn` lines — a warning here means npm is rewriting your `package.json` on publish (this is how v0.4 nearly shipped a stripped `bin` field).

- [ ] **Step 4: Smoke-test the packed tarballs**

Do not trust the dry-run alone — install what npm would actually ship:

```bash
SCRATCH=$(mktemp -d)
npm pack --pack-destination "$SCRATCH" -w @jnahian/code-notes-core -w @jnahian/code-notes-mcp
cd "$SCRATCH" && npm init -y >/dev/null
npm install ./jnahian-code-notes-core-0.2.0.tgz ./jnahian-code-notes-mcp-0.2.0.tgz
mkdir -p ws && printf 'x\n' > ws/a.ts
printf '{"agentWriteMode":"queue","agentAllowList":[],"auditLogRetention":1000}' > ws/.code-notes/config.json 2>/dev/null || (mkdir -p ws/.code-notes && printf '{"agentWriteMode":"queue","agentAllowList":[],"auditLogRetention":1000}' > ws/.code-notes/config.json)
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"s","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_note","arguments":{"file":"a.ts","lineRange":{"start":0,"end":0},"content":"queued"}}}' \
  | ./node_modules/.bin/code-notes-mcp --workspace ws --agent smoke 2>/dev/null | tail -1
```

Expected: `{"status":"pending","proposalId":"prop-…","message":"Awaiting human approval."}` and a file under `ws/.code-notes/_pending/`. This proves the published artifact reads config.json and honors queue mode.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "🔖 chore: bump versions for v0.5.0 release"
```

- [ ] **Step 6: STOP — do not publish**

Do **not** run `npm publish` or `vsce publish`. Report to the user that the release is staged and dry-run-verified, and let them decide. Publishing is theirs.

---

## Self-Review

**Spec coverage:**

| Spec | Task |
|---|---|
| §4.3 `agentWriteMode` setting | 2, 8 |
| §5.4.1 `direct` | 4 |
| §5.4.2 `audit` + `_audit.log` + Agent activity + Revert | 3, 4, 9 |
| §5.4.3 `queue` + `_pending/` + Approve/Reject/Edit + `.rejected/` | 5, 10 |
| §5.4.4 pending return shape + documented for agents | 7 |
| §5.4.5 revert semantics (create→delete, edit/delete→history) | 9 |
| §5.4.6 settings UI (mode, allow-list, retention) | 8 |
| §5.4.2 trade-off 2: mode-switch orphan prompt | 10 |
| §5.4.7 trade-off 3: retention + rotation | 3 |
| §7.6 stale target (simple-pick) + orphaned proposals | 10 |
| §7.7 audit log corruption tolerance + Truncate command | 3, 9 |
| §8.2 "trust router: setting + write call → correct path" | 4, 5 |

**Deviations from the spec, deliberate:**
1. **Mode lives in `.code-notes/config.json`, not only a VS Code setting.** The spec predates v0.4's standalone server, which cannot read VS Code settings — the same divergence the v0.4 review caught for `storageDirectory`. The setting remains the UI and is mirrored to the file. A CLI flag was rejected: an agent that picks its own mode has no rails.
2. **Audit entries use `prevContentHash`/`newContentHash` over the note's *content*.** `Note.contentHash` already means "hash of the attached code" — the plan names and comments the distinction rather than silently overloading it.
3. **§5.4.6's allow-list is carried as config + setting but not enforced in this plan.** The spec itself calls it informational, not a security boundary. Enforcement without a real identity boundary is theater; it is stored so a v0.6 can act on it.

**Assumptions checked against the real code while writing this plan** (don't re-derive them):
- `StorageManager` serializes an **explicit field list**, not a spread — an unlisted field is dropped on save. That is why Task 10 touches both `noteToMarkdown` and `markdownToNote` for `approvedBy`, and pins it with a round-trip test.
- `NoteManager.defaultAuthor` is private with no accessor — Task 10 adds `getDefaultAuthor()`.
- `updateNotePositions(document)` takes the **document** and derives the moves itself; it does not accept a list of updates. Task 6 keeps that signature.
- `StorageManager.getAllNoteFiles()` is a non-recursive `readdir` — this is the only reason `_pending/*.md` doesn't load as notes. If anyone makes it recursive, queue mode breaks silently.

**Open risk to watch during implementation:** the extension's `activate` is already long; Tasks 8-10 add three blocks to it. If it becomes unwieldy, extracting an `agentTrust.ts` wiring module is a reasonable in-task refactor — but keep it a separate commit from the feature work.

---

## Execution Handoff

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.
