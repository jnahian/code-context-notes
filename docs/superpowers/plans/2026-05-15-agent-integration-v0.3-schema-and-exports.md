# Agent Integration v0.3 — Schema + Exports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Note schema with optional structured fields (type, scope, tags, references, expiry, priority, authorType) and auto-generate `.code-notes/INDEX.json` and `.code-notes/AGENTS.md` on every note change, so any file-reading coding agent can consume notes as workspace context.

**Architecture:** Lazy migration — legacy notes load with sensible defaults; on-disk shape upgrades only on next edit. New fields written as additional `**Field:**` lines in the existing bold-label markdown format (NOT YAML frontmatter — see deviation note below). Exports regenerated through a single debounced atomic writer hooked into `NoteManager`'s existing `noteChanged` event.

**Tech Stack:** TypeScript, VS Code Extension API, esbuild build, Mocha tests via `@vscode/test-electron`.

**Spec reference:** `docs/superpowers/specs/2026-05-15-agent-integration-design.md` sections 5.1, 5.2, 6.

## Deviations from spec

The spec said "stored in the markdown file's frontmatter (already used for metadata)." The actual existing format in `src/storageManager.ts` is **bold-label markdown** (`**File:** ...`, `**Author:** ...`), not YAML frontmatter. This plan extends the existing bold-label format because:
- The v0.2.x parser already silently ignores unknown bold-label lines, so forward-compat works the same way.
- Avoids maintaining two formats in parallel.
- `INDEX.json` is the machine-readable artifact for tools/agents — the on-disk note format only needs to round-trip with the parser.

Storage layout is **flat** (`.code-notes/<id>.md`), not nested per-file as the spec example suggested. `INDEX.json.contentPath` will reflect this.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/types.ts` | Modify | Add `NoteType`, `NoteScope`, `NoteReference` types; extend `Note` interface with new optional fields. |
| `src/noteDefaults.ts` | Create | Single function `applyDefaults(note)` that fills missing optional fields. Used on read. |
| `src/storageManager.ts` | Modify | Extend `noteToMarkdown` to emit new fields (omitted if equal to default); extend `markdownToNote` to parse them. |
| `src/exportGenerator.ts` | Create | Pure functions `buildIndex(notes)` → JSON-serializable object and `buildDigest(notes)` → markdown string. |
| `src/exportWriter.ts` | Create | Debounced atomic writer. Owns the debounce timer, the temp-file-and-rename logic, and the "Regenerate Exports" command implementation. |
| `src/extension.ts` | Modify | Wire `exportWriter` to `noteManager.on('noteChanged', ...)`; register `codeContextNotes.regenerateExports` command; trigger initial export on activation if missing. |
| `src/notesSidebarProvider.ts` | Modify | Render type pill on note tree items; add type and "show expired" filter state. |
| `src/noteTreeItem.ts` | Modify | Show type as a description suffix or tooltip element. |
| `package.json` | Modify | Add `codeContextNotes.exports.*` settings; register `codeContextNotes.regenerateExports` command + menu entry. |
| `src/test/suite/storageManager.test.ts` | Modify | Add tests for new fields round-tripping and legacy-note default behavior. |
| `src/test/suite/exportGenerator.test.ts` | Create | Unit tests for `buildIndex` and `buildDigest`. |
| `src/test/suite/exportWriter.test.ts` | Create | Tests for debounce, atomic write, error recovery. |
| `src/test/suite/noteDefaults.test.ts` | Create | Tests that `applyDefaults` produces correct values. |
| `docs/changelogs/v0.3.0.md` | Create | Per project changelog template. |
| `web/src/pages/ChangelogPage.tsx` | Modify | Add v0.3 entry per `web/CHANGELOG_WEB_GUIDE.md` (or use the `add-web-changelog` skill). |

---

## Task 1: Add new schema types and fields

**Files:**
- Modify: `src/types.ts`
- Test: (no test in this task — type-only changes verified by compilation; behavior tested in Task 2)

- [ ] **Step 1: Add new type definitions and extend `Note`**

Open `src/types.ts` and add the following after the existing `NoteAction` type (around line 14):

```typescript
/**
 * Type of note — drives prioritization in agent-facing exports
 */
export type NoteType =
  | 'context'      // default: explanatory background
  | 'instruction'  // directive: agent/human MUST follow
  | 'warning'      // hazard: don't do X
  | 'decision'     // architectural decision + rationale
  | 'todo'         // outstanding work
  | 'handoff'      // "next session pick up here" (often agent-authored)
  | 'rationale';   // why this code exists (links to PRs/commits)

/**
 * Scope of applicability for a note
 */
export type NoteScope =
  | 'line'      // default — current behavior
  | 'function'
  | 'class'
  | 'file'
  | 'directory';

/**
 * Author kind — explicit agent attribution
 */
export type AuthorType = 'human' | 'agent';

/**
 * Priority used for digest ordering and `critical` always-include behavior
 */
export type NotePriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Reference to an external artifact (PR, commit, test, etc.)
 */
export interface NoteReference {
  kind: 'note' | 'pr' | 'issue' | 'commit' | 'test' | 'url';
  value: string;
  label?: string;
}
```

Then extend the existing `Note` interface (around line 36) by appending these optional fields just before the closing brace:

```typescript
  // NEW (all optional for back-compat — see noteDefaults.applyDefaults)
  type?: NoteType;
  tags?: string[];
  scope?: NoteScope;
  references?: NoteReference[];
  expiresAt?: string;          // ISO 8601
  authorType?: AuthorType;
  priority?: NotePriority;
```

- [ ] **Step 2: Verify the project still compiles**

Run: `npm run compile:tsc`
Expected: Exit code 0; no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "✨ feat: add structured schema types to Note interface

Adds optional NoteType, NoteScope, NoteReference, AuthorType, NotePriority
fields. All optional for backward compatibility — defaults applied on read
in a follow-up task."
```

---

## Task 2: Create the defaults helper

**Files:**
- Create: `src/noteDefaults.ts`
- Create: `src/test/suite/noteDefaults.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/suite/noteDefaults.test.ts`:

```typescript
import * as assert from 'assert';
import { applyDefaults, isExpired } from '../../noteDefaults.js';
import { Note } from '../../types.js';

const baseNote: Note = {
  id: 'n1',
  content: 'hi',
  author: 'alice',
  filePath: '/abs/foo.ts',
  lineRange: { start: 0, end: 0 },
  contentHash: 'sha256:abc',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  history: [],
};

suite('noteDefaults', () => {
  test('applyDefaults fills all optional fields on a legacy note', () => {
    const filled = applyDefaults({ ...baseNote });
    assert.strictEqual(filled.type, 'context');
    assert.strictEqual(filled.scope, 'line');
    assert.deepStrictEqual(filled.tags, []);
    assert.deepStrictEqual(filled.references, []);
    assert.strictEqual(filled.priority, 'normal');
    assert.strictEqual(filled.authorType, 'human');
    assert.strictEqual(filled.expiresAt, undefined);
  });

  test('applyDefaults preserves explicitly set fields', () => {
    const filled = applyDefaults({
      ...baseNote,
      type: 'instruction',
      priority: 'high',
      tags: ['security'],
    });
    assert.strictEqual(filled.type, 'instruction');
    assert.strictEqual(filled.priority, 'high');
    assert.deepStrictEqual(filled.tags, ['security']);
    assert.strictEqual(filled.scope, 'line'); // still defaulted
  });

  test('isExpired returns false when expiresAt is undefined', () => {
    assert.strictEqual(isExpired(baseNote, new Date('2099-01-01')), false);
  });

  test('isExpired returns true when expiresAt is in the past', () => {
    const n = { ...baseNote, expiresAt: '2026-04-01T00:00:00Z' };
    assert.strictEqual(isExpired(n, new Date('2026-05-01T00:00:00Z')), true);
  });

  test('isExpired returns false when expiresAt is in the future', () => {
    const n = { ...baseNote, expiresAt: '2026-06-01T00:00:00Z' };
    assert.strictEqual(isExpired(n, new Date('2026-05-01T00:00:00Z')), false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (file doesn't exist)**

Run: `npm run test:unit`
Expected: Compile error or test failure: `Cannot find module '../../noteDefaults.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/noteDefaults.ts`:

```typescript
/**
 * Apply schema defaults to a Note loaded from disk.
 * Legacy notes from v0.2.x have no structured fields; this fills them
 * in memory only. The on-disk file is not modified.
 */

import { Note, NoteType, NoteScope, AuthorType, NotePriority } from './types.js';

export const NOTE_DEFAULTS = {
  type: 'context' as NoteType,
  scope: 'line' as NoteScope,
  tags: [] as string[],
  references: [] as never[], // typed as never — replaced via applyDefaults
  priority: 'normal' as NotePriority,
  authorType: 'human' as AuthorType,
};

/**
 * Returns a new Note with all optional fields populated.
 * Does not mutate the input.
 */
export function applyDefaults(note: Note): Note {
  return {
    ...note,
    type: note.type ?? NOTE_DEFAULTS.type,
    scope: note.scope ?? NOTE_DEFAULTS.scope,
    tags: note.tags ?? [],
    references: note.references ?? [],
    priority: note.priority ?? NOTE_DEFAULTS.priority,
    authorType: note.authorType ?? NOTE_DEFAULTS.authorType,
  };
}

/**
 * True if `expiresAt` is set and is at or before `now`.
 */
export function isExpired(note: Note, now: Date = new Date()): boolean {
  if (!note.expiresAt) return false;
  return new Date(note.expiresAt).getTime() <= now.getTime();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: All 5 tests in `noteDefaults` suite pass.

- [ ] **Step 5: Commit**

```bash
git add src/noteDefaults.ts src/test/suite/noteDefaults.test.ts
git commit -m "✨ feat: add applyDefaults helper for legacy notes

Lazily fills missing optional Note fields in memory. The on-disk file
is unchanged until the note is next saved (lazy migration)."
```

---

## Task 3: Extend storage to read new fields

**Files:**
- Modify: `src/storageManager.ts:248-359` (the `markdownToNote` method)
- Test: `src/test/suite/storageManager.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/test/suite/storageManager.test.ts` (inside the existing `suite('StorageManager', ...)` block):

```typescript
test('markdownToNote parses new structured fields when present', async () => {
  const markdown = `# Code Context Note

**File:** /abs/foo.ts
**Lines:** 1-1
**Content Hash:** sha256:abc

## Note: n1
**Author:** alice
**Created:** 2026-05-01T00:00:00Z
**Updated:** 2026-05-01T00:00:00Z
**Type:** instruction
**Scope:** function
**Priority:** high
**Tags:** security, legacy
**AuthorType:** human
**ExpiresAt:** 2026-12-01T00:00:00Z
**References:** [{"kind":"pr","value":"#42"}]

## Current Content

Do not bypass.
`;
  // Access the private parser via reflection for the test
  const sm: any = new (await import('../../storageManager.js')).StorageManager('/tmp');
  const note = sm.markdownToNote(markdown);
  assert.ok(note);
  assert.strictEqual(note!.type, 'instruction');
  assert.strictEqual(note!.scope, 'function');
  assert.strictEqual(note!.priority, 'high');
  assert.deepStrictEqual(note!.tags, ['security', 'legacy']);
  assert.strictEqual(note!.authorType, 'human');
  assert.strictEqual(note!.expiresAt, '2026-12-01T00:00:00Z');
  assert.deepStrictEqual(note!.references, [{ kind: 'pr', value: '#42' }]);
});

test('markdownToNote leaves new fields undefined for legacy notes', async () => {
  const markdown = `# Code Context Note

**File:** /abs/foo.ts
**Lines:** 1-1
**Content Hash:** sha256:abc

## Note: n1
**Author:** alice
**Created:** 2026-05-01T00:00:00Z
**Updated:** 2026-05-01T00:00:00Z

## Current Content

Hi.
`;
  const sm: any = new (await import('../../storageManager.js')).StorageManager('/tmp');
  const note = sm.markdownToNote(markdown);
  assert.ok(note);
  assert.strictEqual(note!.type, undefined);
  assert.strictEqual(note!.scope, undefined);
  assert.strictEqual(note!.tags, undefined);
});
```

- [ ] **Step 2: Run tests to confirm failures**

Run: `npm run test:unit`
Expected: Both new tests fail (parser doesn't read these fields).

- [ ] **Step 3: Extend `markdownToNote` to parse new fields**

In `src/storageManager.ts`, inside the `for` loop in `markdownToNote` (around line 260), add the following branches *before* the existing `else if (line === '## Current Content')` branch:

```typescript
      else if (line.startsWith('**Type:**')) {
        note.type = line.substring(9).trim() as any;
      }
      else if (line.startsWith('**Scope:**')) {
        note.scope = line.substring(10).trim() as any;
      }
      else if (line.startsWith('**Priority:**')) {
        note.priority = line.substring(13).trim() as any;
      }
      else if (line.startsWith('**Tags:**')) {
        const raw = line.substring(9).trim();
        note.tags = raw ? raw.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
      }
      else if (line.startsWith('**AuthorType:**')) {
        note.authorType = line.substring(15).trim() as any;
      }
      else if (line.startsWith('**ExpiresAt:**')) {
        note.expiresAt = line.substring(14).trim();
      }
      else if (line.startsWith('**References:**')) {
        const raw = line.substring(15).trim();
        if (raw) {
          try {
            note.references = JSON.parse(raw);
          } catch {
            // Malformed references — log and skip; don't drop the whole note.
            console.warn(`[code-notes] Failed to parse References for note: ${raw}`);
            note.references = [];
          }
        }
      }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: Both new parser tests pass; existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/storageManager.ts src/test/suite/storageManager.test.ts
git commit -m "✨ feat(storage): parse structured fields from note markdown

Extends markdownToNote to read Type/Scope/Priority/Tags/AuthorType/
ExpiresAt/References. Legacy notes without these fields parse exactly
as before (fields remain undefined; defaults applied at NoteManager
boundary in a follow-up task)."
```

---

## Task 4: Extend storage to write new fields

**Files:**
- Modify: `src/storageManager.ts:197-243` (the `noteToMarkdown` method)
- Test: `src/test/suite/storageManager.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/test/suite/storageManager.test.ts`:

```typescript
test('noteToMarkdown emits structured fields when set', async () => {
  const sm: any = new (await import('../../storageManager.js')).StorageManager('/tmp');
  const md = sm.noteToMarkdown({
    id: 'n1',
    content: 'do not refactor',
    author: 'alice',
    filePath: '/abs/foo.ts',
    lineRange: { start: 0, end: 0 },
    contentHash: 'sha256:abc',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    history: [],
    type: 'instruction',
    scope: 'function',
    priority: 'high',
    tags: ['security'],
    authorType: 'human',
    expiresAt: '2026-12-01T00:00:00Z',
    references: [{ kind: 'pr', value: '#42' }],
  });
  assert.ok(md.includes('**Type:** instruction'));
  assert.ok(md.includes('**Scope:** function'));
  assert.ok(md.includes('**Priority:** high'));
  assert.ok(md.includes('**Tags:** security'));
  assert.ok(md.includes('**AuthorType:** human'));
  assert.ok(md.includes('**ExpiresAt:** 2026-12-01T00:00:00Z'));
  assert.ok(md.includes('**References:** [{"kind":"pr","value":"#42"}]'));
});

test('noteToMarkdown omits fields equal to defaults', async () => {
  const sm: any = new (await import('../../storageManager.js')).StorageManager('/tmp');
  const md = sm.noteToMarkdown({
    id: 'n1',
    content: 'hi',
    author: 'alice',
    filePath: '/abs/foo.ts',
    lineRange: { start: 0, end: 0 },
    contentHash: 'sha256:abc',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    history: [],
    type: 'context',     // default
    scope: 'line',       // default
    priority: 'normal',  // default
    tags: [],            // default
    authorType: 'human', // default
  });
  assert.ok(!md.includes('**Type:**'));
  assert.ok(!md.includes('**Scope:**'));
  assert.ok(!md.includes('**Priority:**'));
  assert.ok(!md.includes('**Tags:**'));
  assert.ok(!md.includes('**AuthorType:**'));
});
```

- [ ] **Step 2: Run tests to confirm failures**

Run: `npm run test:unit`
Expected: Both new tests fail (writer doesn't emit these lines).

- [ ] **Step 3: Extend `noteToMarkdown` to emit structured fields**

In `src/storageManager.ts`, inside `noteToMarkdown` after the `**Updated:**` line and before the `if (note.isDeleted)` block (around line 213), insert:

```typescript
    // Structured fields — omitted if equal to default for compactness
    if (note.type && note.type !== 'context') {
      lines.push(`**Type:** ${note.type}`);
    }
    if (note.scope && note.scope !== 'line') {
      lines.push(`**Scope:** ${note.scope}`);
    }
    if (note.priority && note.priority !== 'normal') {
      lines.push(`**Priority:** ${note.priority}`);
    }
    if (note.tags && note.tags.length > 0) {
      lines.push(`**Tags:** ${note.tags.join(', ')}`);
    }
    if (note.authorType && note.authorType !== 'human') {
      lines.push(`**AuthorType:** ${note.authorType}`);
    }
    if (note.expiresAt) {
      lines.push(`**ExpiresAt:** ${note.expiresAt}`);
    }
    if (note.references && note.references.length > 0) {
      lines.push(`**References:** ${JSON.stringify(note.references)}`);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: All `noteToMarkdown` tests pass; existing tests unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/storageManager.ts src/test/suite/storageManager.test.ts
git commit -m "✨ feat(storage): emit structured fields in note markdown

Extends noteToMarkdown to write Type/Scope/Priority/Tags/AuthorType/
ExpiresAt/References. Fields equal to their default are omitted to
keep frontmatter compact for the common case (untouched legacy notes
remain shape-identical after a save)."
```

---

## Task 5: Apply defaults at the NoteManager boundary

**Files:**
- Modify: `src/noteManager.ts`
- Test: `src/test/suite/noteManager.test.ts`

The pattern: defaults are applied where notes leave storage (in `NoteManager`), so consumers of `NoteManager` (sidebar, exports, MCP server later) always see fully-populated notes. The on-disk file remains unchanged until the next save.

- [ ] **Step 1: Identify the read methods to patch**

Run: `grep -n "storage.loadNotes\|storage.loadAllNotes\|storage.loadNoteById" src/noteManager.ts`
Expected: List of call sites — these are the boundaries to patch.

- [ ] **Step 2: Write the failing test**

Append to `src/test/suite/noteManager.test.ts`:

```typescript
test('getNotes applies defaults to legacy notes', async () => {
  // This test assumes the existing test setup creates a NoteManager pointed
  // at a temp workspace. Reuse the pattern from existing tests.
  const noteManager = await createTestNoteManager(); // existing helper

  // Save a legacy-shaped note via storage directly (bypassing NoteManager
  // so we don't auto-fill defaults).
  await (noteManager as any).storage.saveNote({
    id: 'legacy-1',
    content: 'old',
    author: 'alice',
    filePath: '/abs/x.ts',
    lineRange: { start: 0, end: 0 },
    contentHash: 'sha256:legacy',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    history: [],
  });

  const notes = await noteManager.getNotesForFile('/abs/x.ts');
  const legacy = notes.find((n: any) => n.id === 'legacy-1');
  assert.ok(legacy);
  assert.strictEqual(legacy!.type, 'context');
  assert.strictEqual(legacy!.scope, 'line');
  assert.deepStrictEqual(legacy!.tags, []);
});
```

If `createTestNoteManager` doesn't exist, look at the top of `noteManager.test.ts` for the existing setup pattern and adapt.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:unit`
Expected: `legacy.type` is `undefined`, not `'context'`.

- [ ] **Step 4: Patch NoteManager to apply defaults on every read**

At the top of `src/noteManager.ts`, add the import:

```typescript
import { applyDefaults } from './noteDefaults.js';
```

Find every `await this.storage.loadNotes(...)`, `await this.storage.loadAllNotes(...)`, and `await this.storage.loadNoteById(...)` call in the file. For each one that returns a value used downstream, wrap with `.map(applyDefaults)` (for arrays) or `applyDefaults(...)` (for single notes) before returning or storing in cache.

Concretely (the calls visible in `grep` output from Step 1) — for each:
- Array results: `const notes = (await this.storage.loadNotes(filePath)).map(applyDefaults);`
- Single results: `const note = await this.storage.loadNoteById(id); return note ? applyDefaults(note) : null;`

Make sure to also wrap notes pulled from `this.noteCache` if the cache is populated from raw storage anywhere (it isn't today — caches receive notes that already passed through this boundary — but verify by inspection).

- [ ] **Step 5: Run all tests to verify**

Run: `npm run test:unit`
Expected: New test passes; all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/noteManager.ts src/test/suite/noteManager.test.ts
git commit -m "✨ feat(noteManager): apply schema defaults on read

Notes leaving NoteManager always have optional fields populated. Legacy
notes get defaults in memory; on-disk file unchanged until next save.
This is the single boundary where lazy migration happens."
```

---

## Task 6: Build the export generator (pure functions)

**Files:**
- Create: `src/exportGenerator.ts`
- Create: `src/test/suite/exportGenerator.test.ts`

- [ ] **Step 1: Write the failing test for `buildIndex`**

Create `src/test/suite/exportGenerator.test.ts`:

```typescript
import * as assert from 'assert';
import { buildIndex, buildDigest } from '../../exportGenerator.js';
import { Note } from '../../types.js';

const n = (overrides: Partial<Note>): Note => ({
  id: 'id',
  content: 'content',
  author: 'alice',
  filePath: '/ws/src/foo.ts',
  lineRange: { start: 0, end: 0 },
  contentHash: 'sha256:x',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  history: [],
  type: 'context',
  scope: 'line',
  tags: [],
  references: [],
  priority: 'normal',
  authorType: 'human',
  ...overrides,
});

suite('exportGenerator', () => {
  test('buildIndex includes notes, byFile, byType, byTag', () => {
    const notes = [
      n({ id: 'a', filePath: '/ws/src/foo.ts', type: 'instruction', tags: ['security'] }),
      n({ id: 'b', filePath: '/ws/src/bar.ts', type: 'context' }),
    ];
    const idx = buildIndex(notes, '/ws');
    assert.strictEqual(idx.version, 1);
    assert.strictEqual(idx.workspaceRoot, '/ws');
    assert.strictEqual(idx.notes.length, 2);
    assert.deepStrictEqual(idx.byFile['src/foo.ts'], ['a']);
    assert.deepStrictEqual(idx.byFile['src/bar.ts'], ['b']);
    assert.deepStrictEqual(idx.byType['instruction'], ['a']);
    assert.deepStrictEqual(idx.byType['context'], ['b']);
    assert.deepStrictEqual(idx.byTag['security'], ['a']);
  });

  test('buildIndex marks expired notes', () => {
    const past = new Date('2025-01-01T00:00:00Z').toISOString();
    const idx = buildIndex(
      [n({ id: 'a', expiresAt: past })],
      '/ws',
      new Date('2026-05-01T00:00:00Z'),
    );
    assert.strictEqual(idx.notes[0].isExpired, true);
  });

  test('buildIndex output is deterministic for same input', () => {
    const notes = [
      n({ id: 'b', filePath: '/ws/b.ts' }),
      n({ id: 'a', filePath: '/ws/a.ts' }),
    ];
    const idx1 = buildIndex(notes, '/ws', new Date('2026-05-01T00:00:00Z'));
    const idx2 = buildIndex(notes, '/ws', new Date('2026-05-01T00:00:00Z'));
    assert.strictEqual(JSON.stringify(idx1), JSON.stringify(idx2));
  });

  test('buildDigest hoists instructions and warnings', () => {
    const notes = [
      n({ id: 'i', type: 'instruction', priority: 'high', content: 'do not bypass auth', filePath: '/ws/auth.ts', lineRange: { start: 41, end: 41 } }),
      n({ id: 'c', type: 'context', content: 'just background', filePath: '/ws/auth.ts' }),
    ];
    const md = buildDigest(notes, '/ws');
    const instructionPos = md.indexOf('do not bypass auth');
    const contextPos = md.indexOf('just background');
    assert.ok(instructionPos !== -1);
    assert.ok(contextPos !== -1);
    assert.ok(instructionPos < contextPos, 'instructions must appear before context');
  });

  test('buildDigest hoists open handoffs to a dedicated section', () => {
    const md = buildDigest(
      [n({ id: 'h', type: 'handoff', content: 'pick up here', author: 'claude-code', authorType: 'agent' })],
      '/ws',
    );
    assert.ok(md.includes('## Open handoffs'));
    assert.ok(md.includes('pick up here'));
  });
});
```

- [ ] **Step 2: Run tests to confirm failures**

Run: `npm run test:unit`
Expected: Compile error — `Cannot find module '../../exportGenerator.js'`.

- [ ] **Step 3: Implement `exportGenerator.ts`**

Create `src/exportGenerator.ts`:

```typescript
/**
 * Pure functions that build the contents of INDEX.json and AGENTS.md
 * from a list of notes. No I/O — call these from exportWriter.
 */

import * as path from 'path';
import { Note, NoteType } from './types.js';
import { applyDefaults, isExpired } from './noteDefaults.js';

export interface IndexNoteEntry {
  id: string;
  filePath: string;
  lineRange: { start: number; end: number };
  type: NoteType;
  scope: string;
  tags: string[];
  priority: string;
  author: string;
  authorType: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  references: { kind: string; value: string; label?: string }[];
  contentPreview: string;
  contentPath: string;
}

export interface IndexFile {
  version: 1;
  generatedAt: string;
  workspaceRoot: string;
  notes: IndexNoteEntry[];
  byFile: Record<string, string[]>;
  byType: Record<string, string[]>;
  byTag: Record<string, string[]>;
  errors: { file: string; message: string }[];
}

const PREVIEW_MAX = 200;

function relativePath(absPath: string, workspaceRoot: string): string {
  return path.relative(workspaceRoot, absPath).split(path.sep).join('/');
}

function preview(content: string): string {
  const single = content.replace(/\s+/g, ' ').trim();
  return single.length <= PREVIEW_MAX ? single : single.slice(0, PREVIEW_MAX) + '…';
}

/**
 * Build the INDEX.json data. `now` is injectable for deterministic tests.
 */
export function buildIndex(rawNotes: Note[], workspaceRoot: string, now: Date = new Date()): IndexFile {
  const notes = rawNotes.map(applyDefaults);

  // Stable sort by id so output is deterministic for the same input set.
  const sorted = [...notes].sort((a, b) => a.id.localeCompare(b.id));

  const entries: IndexNoteEntry[] = sorted.map(n => ({
    id: n.id,
    filePath: relativePath(n.filePath, workspaceRoot),
    lineRange: n.lineRange,
    type: n.type!,
    scope: n.scope!,
    tags: n.tags!,
    priority: n.priority!,
    author: n.author,
    authorType: n.authorType!,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    expiresAt: n.expiresAt ?? null,
    isExpired: isExpired(n, now),
    references: n.references!,
    contentPreview: preview(n.content),
    contentPath: `.code-notes/${n.id}.md`,
  }));

  const byFile: Record<string, string[]> = {};
  const byType: Record<string, string[]> = {};
  const byTag: Record<string, string[]> = {};

  for (const e of entries) {
    (byFile[e.filePath] ??= []).push(e.id);
    (byType[e.type] ??= []).push(e.id);
    for (const t of e.tags) {
      (byTag[t] ??= []).push(e.id);
    }
  }

  return {
    version: 1,
    generatedAt: now.toISOString(),
    workspaceRoot,
    notes: entries,
    byFile,
    byType,
    byTag,
    errors: [],
  };
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };

/**
 * Build the AGENTS.md digest content.
 */
export function buildDigest(rawNotes: Note[], workspaceRoot: string, now: Date = new Date()): string {
  const notes = rawNotes.map(applyDefaults).filter(n => !isExpired(n, now));

  const out: string[] = [];
  out.push('# Code Notes Digest');
  out.push('*Auto-generated. Do not edit. Source: `.code-notes/INDEX.json`*');
  out.push('');

  const critical = notes
    .filter(n => n.type === 'instruction' || n.type === 'warning')
    .sort((a, b) => (PRIORITY_RANK[a.priority!] ?? 99) - (PRIORITY_RANK[b.priority!] ?? 99));
  if (critical.length > 0) {
    out.push('## Critical instructions and warnings');
    for (const n of critical) {
      out.push(`- **\`${relativePath(n.filePath, workspaceRoot)}:${n.lineRange.start + 1}\` — ${n.type} (${n.priority}):** ${preview(n.content)}`);
    }
    out.push('');
  }

  const handoffs = notes.filter(n => n.type === 'handoff');
  if (handoffs.length > 0) {
    out.push('## Open handoffs');
    for (const n of handoffs) {
      const range = n.lineRange.start === n.lineRange.end ? `${n.lineRange.start + 1}` : `${n.lineRange.start + 1}-${n.lineRange.end + 1}`;
      out.push(`- **\`${relativePath(n.filePath, workspaceRoot)}:${range}\`** — handoff from ${n.author}: ${preview(n.content)}`);
    }
    out.push('');
  }

  const decisions = notes.filter(n => n.type === 'decision');
  if (decisions.length > 0) {
    out.push('## Decisions worth knowing');
    for (const n of decisions) {
      out.push(`- **\`${relativePath(n.filePath, workspaceRoot)}:${n.lineRange.start + 1}\`** — decision: ${preview(n.content)}`);
    }
    out.push('');
  }

  // All notes by file, sorted
  out.push('## All notes by file');
  const byFile = new Map<string, Note[]>();
  for (const n of notes) {
    const key = relativePath(n.filePath, workspaceRoot);
    const arr = byFile.get(key) ?? [];
    arr.push(n);
    byFile.set(key, arr);
  }
  const fileKeys = Array.from(byFile.keys()).sort();
  for (const file of fileKeys) {
    out.push(`### \`${file}\``);
    const fileNotes = byFile.get(file)!.sort((a, b) => a.lineRange.start - b.lineRange.start);
    for (const n of fileNotes) {
      const tags = n.tags!.length > 0 ? ` [${n.tags!.join(', ')}]` : '';
      out.push(`- L${n.lineRange.start + 1} — ${n.type} (${n.priority})${tags}: ${preview(n.content)}`);
    }
    out.push('');
  }

  return out.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: All `exportGenerator` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/exportGenerator.ts src/test/suite/exportGenerator.test.ts
git commit -m "✨ feat: add INDEX.json and AGENTS.md generators

Pure functions buildIndex(notes, workspaceRoot) and buildDigest(notes,
workspaceRoot). Deterministic output for the same input. No I/O —
called by exportWriter."
```

---

## Task 7: Build the export writer (debounced atomic I/O)

**Files:**
- Create: `src/exportWriter.ts`
- Create: `src/test/suite/exportWriter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/suite/exportWriter.test.ts`:

```typescript
import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ExportWriter } from '../../exportWriter.js';
import { Note } from '../../types.js';

async function tmpdir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'cn-export-'));
}

const sampleNote = (id: string, ws: string): Note => ({
  id,
  content: `note ${id}`,
  author: 'alice',
  filePath: path.join(ws, 'src/foo.ts'),
  lineRange: { start: 0, end: 0 },
  contentHash: 'sha256:x',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  history: [],
});

suite('ExportWriter', () => {
  test('writes INDEX.json and AGENTS.md atomically', async () => {
    const ws = await tmpdir();
    await fs.mkdir(path.join(ws, '.code-notes'), { recursive: true });
    const writer = new ExportWriter(ws, '.code-notes', { debounceMs: 0 });
    await writer.regenerate([sampleNote('a', ws)]);
    const idxRaw = await fs.readFile(path.join(ws, '.code-notes', 'INDEX.json'), 'utf-8');
    const idx = JSON.parse(idxRaw);
    assert.strictEqual(idx.version, 1);
    assert.strictEqual(idx.notes[0].id, 'a');
    const digest = await fs.readFile(path.join(ws, '.code-notes', 'AGENTS.md'), 'utf-8');
    assert.ok(digest.startsWith('# Code Notes Digest'));
  });

  test('debounces rapid scheduleRegenerate calls', async () => {
    const ws = await tmpdir();
    await fs.mkdir(path.join(ws, '.code-notes'), { recursive: true });
    const writer = new ExportWriter(ws, '.code-notes', { debounceMs: 50 });
    let callCount = 0;
    const getNotes = async () => { callCount++; return [sampleNote(`n${callCount}`, ws)]; };
    writer.scheduleRegenerate(getNotes);
    writer.scheduleRegenerate(getNotes);
    writer.scheduleRegenerate(getNotes);
    await new Promise(r => setTimeout(r, 100));
    assert.strictEqual(callCount, 1, 'getNotes should be called once after debounce');
  });

  test('regeneration failure surfaces via onError without throwing', async () => {
    const ws = '/this/path/does/not/exist/anywhere';
    const writer = new ExportWriter(ws, '.code-notes', { debounceMs: 0 });
    let captured: Error | undefined;
    writer.onError = (e) => { captured = e; };
    await writer.regenerate([]);
    assert.ok(captured, 'onError should have been called');
  });
});
```

- [ ] **Step 2: Run tests to confirm failures**

Run: `npm run test:unit`
Expected: `Cannot find module '../../exportWriter.js'`.

- [ ] **Step 3: Implement `exportWriter.ts`**

Create `src/exportWriter.ts`:

```typescript
/**
 * Debounced atomic writer for INDEX.json and AGENTS.md.
 *
 * Owns the debounce timer and the temp-file-and-rename logic. Failures
 * are surfaced via the onError callback — never thrown — because export
 * regeneration is best-effort and must never block a note write.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Note } from './types.js';
import { buildIndex, buildDigest } from './exportGenerator.js';

export interface ExportWriterOptions {
  debounceMs?: number;
}

export class ExportWriter {
  private workspaceRoot: string;
  private storageDir: string;
  private debounceMs: number;
  private pendingTimer: NodeJS.Timeout | undefined;
  private pendingGetNotes: (() => Promise<Note[]>) | undefined;
  onError: (e: Error) => void = (e) => console.error('[code-notes] export failed:', e);

  constructor(workspaceRoot: string, storageDir: string, opts: ExportWriterOptions = {}) {
    this.workspaceRoot = workspaceRoot;
    this.storageDir = storageDir;
    this.debounceMs = opts.debounceMs ?? 200;
  }

  /**
   * Schedule a regeneration. Subsequent calls within the debounce window
   * coalesce — only the latest getNotes is used.
   */
  scheduleRegenerate(getNotes: () => Promise<Note[]>): void {
    this.pendingGetNotes = getNotes;
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
    }
    this.pendingTimer = setTimeout(() => {
      const fn = this.pendingGetNotes;
      this.pendingTimer = undefined;
      this.pendingGetNotes = undefined;
      if (fn) {
        fn().then(notes => this.regenerate(notes)).catch(e => this.onError(e));
      }
    }, this.debounceMs);
  }

  /**
   * Force an immediate (non-debounced) regeneration. Used at startup,
   * by the manual command, and by tests.
   */
  async regenerate(notes: Note[]): Promise<void> {
    try {
      const dir = path.join(this.workspaceRoot, this.storageDir);
      await fs.mkdir(dir, { recursive: true });
      const idx = buildIndex(notes, this.workspaceRoot);
      const digest = buildDigest(notes, this.workspaceRoot);
      await this.atomicWrite(path.join(dir, 'INDEX.json'), JSON.stringify(idx, null, 2));
      await this.atomicWrite(path.join(dir, 'AGENTS.md'), digest);
    } catch (e: any) {
      this.onError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private async atomicWrite(targetPath: string, content: string): Promise<void> {
    const tmpPath = `${targetPath}.tmp`;
    await fs.writeFile(tmpPath, content, 'utf-8');
    await fs.rename(tmpPath, targetPath);
  }

  /**
   * Cancel any pending debounced regeneration. Call from extension deactivate.
   */
  dispose(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = undefined;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: All 3 ExportWriter tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/exportWriter.ts src/test/suite/exportWriter.test.ts
git commit -m "✨ feat: add debounced atomic ExportWriter

Owns the 200ms debounce timer for note-write bursts and the
write-temp-then-rename atomic-write logic. Failures route through
onError so a disk-full event never blocks note saves."
```

---

## Task 8: Wire ExportWriter into NoteManager events

**Files:**
- Modify: `src/extension.ts`

The hook point is the existing `noteChanged` event on `NoteManager` (already emitted on create/update/delete — confirmed at `src/noteManager.ts:111, 167, 213`).

- [ ] **Step 1: Locate the activation function**

Run: `grep -n "noteManager\s*=\|new NoteManager\|export.*activate" src/extension.ts | head -20`
Expected: Line numbers of the NoteManager construction site and `activate` function.

- [ ] **Step 2: Read current activation flow**

Run: `head -150 src/extension.ts`
Expected: Understand where `noteManager` is constructed and the surrounding setup.

- [ ] **Step 3: Wire up the writer**

In `src/extension.ts`, after the line that constructs `NoteManager` (and after `storageManager` and `workspaceRoot` are available), add:

```typescript
import { ExportWriter } from './exportWriter.js';

// ... inside activate() ...

const exportsConfig = vscode.workspace.getConfiguration('codeContextNotes.exports');
const exportsEnabled = exportsConfig.get<boolean>('enabled', true);

const exportWriter = new ExportWriter(workspaceRoot, storageDirectory, { debounceMs: 200 });
context.subscriptions.push({ dispose: () => exportWriter.dispose() });

// Schedule initial export on activation (covers fresh installs, manual deletes).
if (exportsEnabled) {
  exportWriter.scheduleRegenerate(() => noteManager.getAllNotes());
  // Wire ongoing changes
  noteManager.on('noteChanged', () => {
    exportWriter.scheduleRegenerate(() => noteManager.getAllNotes());
  });
}
```

If `noteManager.getAllNotes()` doesn't exist with that exact name, search for a method that returns all notes across the workspace (e.g., `getAllWorkspaceNotes`). Use whichever exists. If none does, add a simple one in `noteManager.ts`:

```typescript
async getAllNotes(): Promise<Note[]> {
  const allFiles = await this.storage.getAllNoteFiles();
  const notes: Note[] = [];
  for (const file of allFiles) {
    const id = path.basename(file, '.md');
    const note = await this.storage.loadNoteById(id);
    if (note && !note.isDeleted) notes.push(applyDefaults(note));
  }
  return notes;
}
```

- [ ] **Step 4: Manual smoke test**

Run: `npm run compile`
Expected: Compiles cleanly.

Then in the Extensions Development Host (F5 in VS Code or `code --extensionDevelopmentPath=$(pwd)`), open a workspace, create a note, and verify `.code-notes/INDEX.json` and `.code-notes/AGENTS.md` appear within ~250ms.

- [ ] **Step 5: Commit**

```bash
git add src/extension.ts src/noteManager.ts
git commit -m "✨ feat: regenerate exports on note changes

Hooks ExportWriter to NoteManager's noteChanged event. Initial export
runs on activation. Disabled when codeContextNotes.exports.enabled is
false."
```

---

## Task 9: Add the manual `Regenerate Exports` command

**Files:**
- Modify: `package.json`
- Modify: `src/extension.ts`

- [ ] **Step 1: Register the command in package.json**

In `package.json` `contributes.commands` (where `codeContextNotes.refreshNotes` and friends live), add:

```json
{
  "command": "codeContextNotes.regenerateExports",
  "title": "Regenerate Exports (INDEX.json / AGENTS.md)",
  "category": "Code Notes"
}
```

- [ ] **Step 2: Implement the command handler**

In `src/extension.ts` `activate`, alongside other `commands.registerCommand` calls, add:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('codeContextNotes.regenerateExports', async () => {
    const notes = await noteManager.getAllNotes();
    await exportWriter.regenerate(notes);
    vscode.window.showInformationMessage(`Code Notes: regenerated exports for ${notes.length} notes.`);
  }),
);
```

- [ ] **Step 3: Manual smoke test**

Run: `npm run compile`
Expected: Compiles.

In the Extension Development Host: Cmd+Shift+P → "Code Notes: Regenerate Exports" → notification appears, files exist.

- [ ] **Step 4: Commit**

```bash
git add package.json src/extension.ts
git commit -m "✨ feat: add manual Regenerate Exports command

Lets users force a fresh INDEX.json/AGENTS.md, e.g. after a disk-full
recovery or a manual delete from the storage directory."
```

---

## Task 10: Add export configuration settings

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add settings to contribution properties**

In `package.json` `contributes.configuration.properties` (alongside `codeContextNotes.storageDirectory` etc.), add:

```json
"codeContextNotes.exports.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Auto-generate .code-notes/INDEX.json and .code-notes/AGENTS.md on every note change"
},
"codeContextNotes.exports.indexJson": {
  "type": "boolean",
  "default": true,
  "description": "Generate INDEX.json (machine-readable)"
},
"codeContextNotes.exports.agentsMarkdown": {
  "type": "boolean",
  "default": true,
  "description": "Generate AGENTS.md (human-readable digest)"
}
```

(`exports.expandedDigest` is mentioned in the spec but is genuine future work — leave it out of v0.3 to keep scope tight.)

- [ ] **Step 2: Honor the per-file toggles in `ExportWriter.regenerate`**

In `src/exportWriter.ts`, change the constructor to accept a config snapshot, or read the workspace config inline before each write. The simpler approach — read inline at the top of `regenerate`:

```typescript
async regenerate(notes: Note[]): Promise<void> {
  try {
    const cfg = vscode.workspace.getConfiguration('codeContextNotes.exports');
    if (!cfg.get<boolean>('enabled', true)) return;
    const writeIndex = cfg.get<boolean>('indexJson', true);
    const writeDigest = cfg.get<boolean>('agentsMarkdown', true);

    const dir = path.join(this.workspaceRoot, this.storageDir);
    await fs.mkdir(dir, { recursive: true });
    if (writeIndex) {
      const idx = buildIndex(notes, this.workspaceRoot);
      await this.atomicWrite(path.join(dir, 'INDEX.json'), JSON.stringify(idx, null, 2));
    }
    if (writeDigest) {
      const digest = buildDigest(notes, this.workspaceRoot);
      await this.atomicWrite(path.join(dir, 'AGENTS.md'), digest);
    }
  } catch (e: any) {
    this.onError(e instanceof Error ? e : new Error(String(e)));
  }
}
```

Add the import at the top: `import * as vscode from 'vscode';`

**Note:** existing `exportWriter` tests don't run inside the VS Code host (they're unit tests). The `vscode.workspace.getConfiguration` call will fail in vitest-style tests but they currently use `@vscode/test-electron`, so they have access. If a test fails because of this, pass an injectable `getConfig?: () => { enabled: boolean; indexJson: boolean; agentsMarkdown: boolean }` to the constructor with VS Code lookup as the default.

- [ ] **Step 3: Run tests to verify nothing broke**

Run: `npm run test:unit`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json src/exportWriter.ts
git commit -m "✨ feat: add codeContextNotes.exports.* settings

Three booleans: enabled (master switch), indexJson, agentsMarkdown.
All default true. Read on every regeneration so toggling takes effect
without reload."
```

---

## Task 11: Add `.code-notes/INDEX.json` and `.code-notes/AGENTS.md` to template `.gitignore` guidance

**Files:**
- Modify: `README.md`

The exports are generated content. Teams should opt in to committing or ignoring them. We document; we don't auto-edit `.gitignore`.

- [ ] **Step 1: Find the README section about storage / git**

Run: `grep -n "gitignore\|\\.code-notes" README.md | head -10`

- [ ] **Step 2: Add a short subsection**

Add after the existing storage explanation (locate by reading the file around the matched lines). Example block to add:

```markdown
### Generated exports

When auto-exports are enabled, two files are regenerated in `.code-notes/`
on every note change:

- **`INDEX.json`** — machine-readable index. Used by integrations like the MCP server (v0.4+).
- **`AGENTS.md`** — human-readable digest, hoisting instructions/warnings/handoffs. Useful as workspace context for coding agents.

Both are deterministic given the same notes. To exclude them from git, add to `.gitignore`:

```
.code-notes/INDEX.json
.code-notes/AGENTS.md
```

To disable export generation entirely, set `codeContextNotes.exports.enabled` to `false`.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "📝 docs: document INDEX.json / AGENTS.md exports in README"
```

---

## Task 12: Sidebar — show note type as a description suffix

**Files:**
- Modify: `src/noteTreeItem.ts`

The simplest visual indicator with no new icon assets: append `· {type}` to the existing tree item description for non-default types.

- [ ] **Step 1: Read current `NoteTreeItem`**

Run: `head -100 src/noteTreeItem.ts`
Expected: Understand how `description` and `tooltip` are built today.

- [ ] **Step 2: Apply default and append type**

Add the import at the top:

```typescript
import { applyDefaults } from './noteDefaults.js';
```

In the `NoteTreeItem` constructor (or wherever `description` is assigned), after `this.description = ...`, normalize the note and append the type if non-default:

```typescript
const filled = applyDefaults(note);
if (filled.type && filled.type !== 'context') {
  this.description = `${this.description ?? ''} · ${filled.type}`.trim();
}
if (filled.priority === 'critical' || filled.priority === 'high') {
  // Add a visual marker via tooltip
  this.tooltip = `[${filled.priority}] ${this.tooltip ?? ''}`;
}
```

- [ ] **Step 3: Manual smoke test**

Run: `npm run compile`. In Extension Development Host, create a note, edit it to type `instruction` (via the bold-label markdown directly in `.code-notes/<id>.md`, since the UI for type selection lands in Task 13), and verify the sidebar shows `· instruction` after the description.

- [ ] **Step 4: Commit**

```bash
git add src/noteTreeItem.ts
git commit -m "💄 feat(sidebar): show note type in tree item description"
```

---

## Task 13: Sidebar — type filter via context menu

**Files:**
- Modify: `src/notesSidebarProvider.ts`
- Modify: `package.json`

The minimum viable filter UX: a tree-view title-bar action that toggles a state, plus per-type filter via Quick Pick.

- [ ] **Step 1: Add filter state to the provider**

In `src/notesSidebarProvider.ts`, add a private field and a setter:

```typescript
private typeFilter: Set<string> | null = null; // null = no filter
private hideExpired: boolean = true;

setTypeFilter(types: Set<string> | null): void {
  this.typeFilter = types;
  this._onDidChangeTreeData.fire();
}

toggleHideExpired(): void {
  this.hideExpired = !this.hideExpired;
  this._onDidChangeTreeData.fire();
}
```

- [ ] **Step 2: Apply filter in `getChildren`**

Wherever the provider returns the list of notes (likely a `getChildren` method), filter:

```typescript
import { applyDefaults, isExpired } from './noteDefaults.js';

// inside getChildren, after fetching notes:
const filtered = notes
  .map(applyDefaults)
  .filter(n => !this.hideExpired || !isExpired(n))
  .filter(n => !this.typeFilter || this.typeFilter.has(n.type!));
```

- [ ] **Step 3: Add commands in package.json**

```json
{
  "command": "codeContextNotes.filterByType",
  "title": "Filter Notes by Type…",
  "category": "Code Notes",
  "icon": "$(filter)"
},
{
  "command": "codeContextNotes.toggleExpired",
  "title": "Toggle Expired Notes",
  "category": "Code Notes",
  "icon": "$(eye)"
}
```

In `contributes.menus.view/title`, add (replace `<your-view-id>` with the actual sidebar view id used in `package.json`):

```json
{
  "command": "codeContextNotes.filterByType",
  "when": "view == <your-view-id>",
  "group": "navigation"
},
{
  "command": "codeContextNotes.toggleExpired",
  "when": "view == <your-view-id>",
  "group": "navigation"
}
```

- [ ] **Step 4: Wire commands in `extension.ts`**

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('codeContextNotes.filterByType', async () => {
    const choices = ['context', 'instruction', 'warning', 'decision', 'todo', 'handoff', 'rationale'];
    const picked = await vscode.window.showQuickPick(choices, {
      canPickMany: true,
      title: 'Show only notes of these types (cancel to clear filter)',
    });
    sidebarProvider.setTypeFilter(picked && picked.length > 0 ? new Set(picked) : null);
  }),
  vscode.commands.registerCommand('codeContextNotes.toggleExpired', () => {
    sidebarProvider.toggleHideExpired();
  }),
);
```

(`sidebarProvider` is the existing variable name — confirm and replace if different.)

- [ ] **Step 5: Manual smoke test**

Compile and verify in dev host: filter command opens Quick Pick; selecting `instruction` hides non-instruction notes.

- [ ] **Step 6: Commit**

```bash
git add src/notesSidebarProvider.ts package.json src/extension.ts
git commit -m "✨ feat(sidebar): add type filter and expired-notes toggle

New title-bar actions: filter by type (multi-select Quick Pick) and
toggle expired-note visibility. Default hides expired notes."
```

---

## Task 14: "More fields" expander in the add/edit note flow

**Files:**
- Modify: `src/commentController.ts` (the comment-thread-based add/edit flow)

The minimum viable form: a "Set type / scope / priority…" command that runs a Quick Pick chain on the current draft note. We don't redesign the comment UI; we add an optional one-shot enrichment command.

- [ ] **Step 1: Locate the comment thread handlers**

Run: `grep -n "addNote\|saveNote\|createNote" src/commentController.ts | head -20`
Expected: Find the path where a new note's content is committed.

- [ ] **Step 2: Add a command for setting metadata**

Register in `package.json`:

```json
{
  "command": "codeContextNotes.setNoteMetadata",
  "title": "Set Note Type / Tags / Priority…",
  "category": "Code Notes"
}
```

In `extension.ts`:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('codeContextNotes.setNoteMetadata', async (noteIdArg?: string) => {
    let noteId = noteIdArg;
    if (!noteId) {
      const all = await noteManager.getAllNotes();
      const pick = await vscode.window.showQuickPick(
        all.map(n => ({ label: n.id, description: n.content.slice(0, 60) })),
        { title: 'Pick a note to update' },
      );
      if (!pick) return;
      noteId = pick.label;
    }

    const type = await vscode.window.showQuickPick(
      ['context', 'instruction', 'warning', 'decision', 'todo', 'handoff', 'rationale'],
      { title: 'Type' },
    );
    if (!type) return;

    const priority = await vscode.window.showQuickPick(
      ['low', 'normal', 'high', 'critical'],
      { title: 'Priority' },
    );
    if (!priority) return;

    const tagsRaw = await vscode.window.showInputBox({ title: 'Tags (comma-separated, optional)' });
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const expiresRaw = await vscode.window.showInputBox({ title: 'Expires at (ISO 8601, optional)' });
    const expiresAt = expiresRaw && expiresRaw.trim().length > 0 ? expiresRaw.trim() : undefined;

    await noteManager.updateNoteMetadata(noteId, { type: type as any, priority: priority as any, tags, expiresAt });
    vscode.window.showInformationMessage(`Code Notes: updated metadata for ${noteId}.`);
  }),
);
```

- [ ] **Step 3: Implement `updateNoteMetadata` on NoteManager**

In `src/noteManager.ts`, add:

```typescript
async updateNoteMetadata(
  noteId: string,
  fields: { type?: NoteType; priority?: NotePriority; tags?: string[]; expiresAt?: string; scope?: NoteScope },
): Promise<Note> {
  const existing = await this.storage.loadNoteById(noteId);
  if (!existing) throw new Error(`Note ${noteId} not found`);
  const updated: Note = {
    ...existing,
    ...fields,
    updatedAt: new Date().toISOString(),
  };
  await this.storage.saveNote(updated);
  this.invalidateCachesForFile(existing.filePath); // use whatever cache invalidator exists
  this.emit('noteUpdated', updated);
  this.emit('noteChanged', { type: 'updated', note: updated });
  return applyDefaults(updated);
}
```

(Add the necessary imports for `NoteType`, `NotePriority`, `NoteScope`.)

- [ ] **Step 4: Test the flow end-to-end manually**

`npm run compile`. In dev host, create a note, run "Code Notes: Set Note Type / Tags / Priority…", pick the note and fill the prompts. Verify the on-disk markdown gets the new fields and the sidebar updates.

- [ ] **Step 5: Commit**

```bash
git add package.json src/extension.ts src/noteManager.ts
git commit -m "✨ feat: add command to set note type/priority/tags/expiry

Quick Pick driven flow: codeContextNotes.setNoteMetadata. Lets users
enrich notes after creation. Future v0.5 work will inline this in the
add/edit comment thread UI; this command unblocks v0.3 use cases."
```

---

## Task 15: Changelog entry

**Files:**
- Create: `docs/changelogs/v0.3.0.md`

Per project `CLAUDE.md` and `docs/changelogs/CHANGELOG_TEMPLATE.md`.

- [ ] **Step 1: Read the template**

Run: `cat docs/changelogs/CHANGELOG_TEMPLATE.md`
Expected: Familiarize with required sections.

- [ ] **Step 2: Author the entry**

Create `docs/changelogs/v0.3.0.md` following the template. Sections to fill:

- **Summary:** "First release of agent-integration foundations: notes gain optional structured fields and the workspace auto-generates a machine-readable INDEX.json plus a human-readable AGENTS.md digest on every note change."
- **New features:** structured note types (context, instruction, warning, decision, todo, handoff, rationale); scopes; tags; priority; expiry; references; auto-generated `.code-notes/INDEX.json` and `.code-notes/AGENTS.md`; manual `Code Notes: Regenerate Exports` command; sidebar type filter and expired-toggle; `Set Note Type / Tags / Priority` command.
- **Settings added:** `codeContextNotes.exports.enabled`, `codeContextNotes.exports.indexJson`, `codeContextNotes.exports.agentsMarkdown`.
- **Compatibility:** Legacy v0.2.x notes load with sensible defaults; no migration step required. On-disk note format extended with new bold-label fields, omitted when equal to default — old notes that aren't edited remain byte-identical on disk.
- **Coming next:** v0.4 ships the standalone MCP server.

- [ ] **Step 3: Commit**

```bash
git add docs/changelogs/v0.3.0.md
git commit -m "📝 docs: add v0.3.0 changelog entry"
```

---

## Task 16: Update web changelog page

**Files:**
- Modify: `web/src/pages/ChangelogPage.tsx`

- [ ] **Step 1: Use the dedicated skill**

This step is the single use case for the `add-web-changelog` skill — invoke it rather than hand-editing.

- [ ] **Step 2: Verify**

Run: `cd web && npm run build:client`
Expected: Builds cleanly.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/ChangelogPage.tsx
git commit -m "📝 docs(web): add v0.3.0 to changelog timeline"
```

---

## Task 17: Bump extension version and finalize

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Bump version**

In root `package.json`, change `"version": "0.2.1"` to `"version": "0.3.0"`.

- [ ] **Step 2: Full verification**

Run all of these in sequence and confirm each:

```bash
npm run compile:tsc      # type-check
npm run test:unit        # all unit tests pass
npm run compile          # esbuild production
npm run package:dev      # generates a .vsix without bumping git tag
```

Expected:
- Type-check: 0 errors
- Tests: all green
- esbuild: succeeds
- vsce package: produces `code-context-notes-0.3.0.vsix`

- [ ] **Step 3: Manual install smoke test**

```bash
code --install-extension code-context-notes-0.3.0.vsix
```

In a clean test workspace:
- Add a note → verify `.code-notes/INDEX.json` and `.code-notes/AGENTS.md` appear within 1s
- Run "Set Note Type / Tags / Priority" → set type to `instruction`, priority `high`
- Re-open `AGENTS.md` → verify the note hoisted to "Critical instructions and warnings"
- Run "Filter Notes by Type" → pick `instruction` → sidebar shows only that note
- Open an existing v0.2.x workspace → verify all old notes still load and work

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "🔖 chore: bump version to 0.3.0"
```

- [ ] **Step 5: Hand off to release process**

Per `docs/RELEASE_TEMPLATE.md`. Do not publish without explicit user permission.

---

## Self-review (run before declaring done)

- **Spec coverage check:**
  - §5.1 (extended schema) → Tasks 1–5 ✓
  - §5.2.1 (`INDEX.json`) → Task 6 ✓
  - §5.2.2 (`AGENTS.md`) → Task 6 ✓
  - §5.2.3 (regeneration / debounce / atomic) → Task 7 ✓
  - §5.2.4 (configuration) → Task 10 ✓
  - §6 (lazy migration) → Task 5 (defaults applied at NoteManager boundary) ✓
  - §5.5.2 (scoped instructions) → partial — schema supports `scope: directory`, but `INDEX.json` doesn't yet resolve directory-scoped notes for downstream consumers. **Acceptable for v0.3** — that resolution is needed by the MCP server's `get_notes_for_changes`, which lands in v0.4. The schema field is in place; resolution logic is v0.4's job.
  - §7.2 (export failures graceful) → Task 7 (onError) + Task 9 (manual regen command for recovery) ✓
  - §7.3 (malformed notes — INDEX.json `errors[]`) → Task 6 includes the `errors: []` field but doesn't yet populate it. Populating is part of the read path that lives in `noteManager`'s file scanner — **deferred to v0.4** when we centralize the workspace-wide load.
- **Type consistency:** `NoteType`, `NoteScope`, `NotePriority`, `AuthorType`, `NoteReference` defined in Task 1 are used consistently in Tasks 2, 3, 4, 6, 13, 14. ✓
- **Method-name consistency:** `applyDefaults` (Task 2) called in Tasks 5, 6, 12, 13. ✓ `getAllNotes` (Task 8) used in Tasks 9, 14. ✓ `updateNoteMetadata` (Task 14) is a new method — not referenced elsewhere; isolated. ✓
- **No TBDs / placeholders.** Every step has concrete code or commands. The two deferrals above are explicit, justified, and scoped to v0.4.

---

*End of plan.*
