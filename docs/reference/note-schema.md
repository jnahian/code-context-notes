# Note Schema

The canonical shape of a note, as defined in [`packages/code-notes-core/src/types.ts`](../../packages/code-notes-core/src/types.ts). All fields below the core set are optional and get schema defaults applied at the boundary (`applyDefaults`), so notes written by older versions keep working.

## `Note`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique note id (also the on-disk filename). |
| `content` | `string` | Current note body (markdown). May be empty. |
| `author` | `string` | Who wrote the current content. |
| `filePath` | `string` | Absolute path to the annotated file. |
| `lineRange` | `LineRange` | `{ start, end }`, **0-based, inclusive**. |
| `contentHash` | `string` | Hash of the annotated *code* (drives relocation). |
| `createdAt` | `string` | ISO 8601. |
| `updatedAt` | `string` | ISO 8601. |
| `history` | `NoteHistoryEntry[]` | Full, append-only edit history. |
| `isDeleted?` | `boolean` | Soft-delete flag. |
| `type?` | `NoteType` | Default `context`. |
| `tags?` | `string[]` | Free-form labels. |
| `scope?` | `NoteScope` | Default `line`. |
| `references?` | `NoteReference[]` | Links to PRs/issues/commits/etc. |
| `priority?` | `NotePriority` | Default `normal`. |
| `expiresAt?` | `string` | ISO 8601; expired notes are filtered from digests/search. |
| `authorType?` | `AuthorType` | `human` or `agent`. |
| `approvedBy?` | `string` | Set when a human approved an agent's queued proposal. |

## Enums

```ts
type NoteType     = 'context' | 'instruction' | 'warning' | 'decision'
                  | 'todo' | 'handoff' | 'rationale';   // default: context
type NoteScope    = 'line' | 'function' | 'class' | 'file' | 'directory';  // default: line
type NotePriority = 'low' | 'normal' | 'high' | 'critical';               // default: normal
type AuthorType   = 'human' | 'agent';
type NoteAction   = 'created' | 'edited' | 'deleted' | 'restored';
```

See [Note types & metadata](../guide/note-types-metadata.md) for what each value means in practice.

## `LineRange`

```ts
interface LineRange {
  start: number;  // 0-based
  end: number;    // 0-based, inclusive
}
```

> On disk, line ranges are written **1-based** (`**Lines:** 10-15`) for human readability and converted back to 0-based on load.

## `NoteHistoryEntry`

```ts
interface NoteHistoryEntry {
  content: string;    // the note content as of this entry
  author: string;
  timestamp: string;  // ISO 8601
  action: NoteAction; // created | edited | deleted | restored
}
```

Each entry stores the content **as of that version**. Reverting an edit restores the entry whose content matches the audit record's `prevContentHash` (not simply the previous array element).

## `NoteReference`

```ts
interface NoteReference {
  kind: 'note' | 'pr' | 'issue' | 'commit' | 'test' | 'url';
  value: string;
  label?: string;
}
```

## Related schemas

These support the [trust model](../guide/trust-model.md):

- **`WorkspaceConfig`** — `{ agentWriteMode, agentAllowList, auditLogRetention }`, persisted to `.code-notes/config.json`.
- **`AuditEntry`** — one agent op in `_audit.log`: `{ ts, op, noteId, agent, file, lineRange?, type?, prevContentHash?, newContentHash? }`.
- **`Proposal`** — a queued agent write in `_pending/`: `{ proposalId, op, targetNoteId?, file, lineRange?, agent, proposedAt, content, targetContentHash? }`.

See [Storage format](storage-format.md) for how each is serialized.
