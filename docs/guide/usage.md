# Usage Guide

How to create, edit, view, navigate, and delete notes. For structured fields (type, tags, priority, …) see [Note types & metadata](note-types-metadata.md).

## Adding notes

There are four ways to add a note. All of them work **without a selection** — just place the cursor on a line.

| Method | How |
|---|---|
| **Keyboard** | Select line(s) or place cursor → `Ctrl+Alt+N` (`Cmd+Alt+N`) → type → **Save** |
| **Sidebar** | Open the Code Notes sidebar → **+** button → type → **Save** |
| **Command Palette** | `Ctrl/Cmd+Shift+P` → *Code Notes: Add Note* → type → **Save** |
| **CodeLens** | Click **➕ Add Note** in the CodeLens above your code |

> **Tips**
> - You can add **multiple notes to the same line** — click **➕ Add Note** again.
> - Notes added from the sidebar use your current cursor position.

## Markdown formatting

Notes support full markdown, with editor shortcuts inside the comment editor:

| Format | Shortcut | Markdown |
|---|---|---|
| Bold | `Ctrl/Cmd+B` | `**text**` |
| Italic | `Ctrl/Cmd+I` | `*text*` |
| Inline code | `Ctrl/Cmd+Shift+C` | `` `code` `` |
| Code block | `Ctrl/Cmd+Shift+K` | ` ```lang ` |
| Link | `Ctrl/Cmd+K` | `[text](url)` |
| List | — | type `- ` or `1. ` |
| Heading | — | type `# ` or `## ` |

Run *Code Notes: Show Markdown Formatting Guide* for an in-editor reference.

## Viewing notes

- **CodeLens** — click the indicator above annotated code to expand the note.
- **Inline** — notes render as native comment threads in the editor.
- **Multiple notes on one line** — the CodeLens shows `📝 Note 1 of N`; use the Previous (`<`) and Next (`>`) buttons to move between them.

**Button layout in the comment thread:**

- Single note: `[+] [Edit] [History] [Delete]`
- Multiple notes: `[<] [>] [+] [Edit] [History] [Delete]`

## Editing notes

1. Click the **Edit** (pencil) button in the comment thread
2. Modify the content
3. Click **Save** — this appends a new history entry with timestamp and author

Every edit is preserved; nothing is overwritten in place.

## Viewing history

Click the **History** (clock) button in the comment thread. History appears as replies showing the action (`created`, `edited`, `deleted`, `restored`), author, timestamp, and the content at that point.

## Deleting notes

1. Click the **Delete** (trash) button
2. Confirm

Deletes are **soft** — the note is marked deleted in history, not erased, and the CodeLens disappears. (Agent deletes in `audit` mode can be reverted from the Agent activity view — see [Trust model](trust-model.md).)

## The Notes sidebar

The **Code Notes** sidebar (Activity Bar icon) gives a workspace-wide view of every note, grouped by file.

**Structure**

- **Root** — total note count, e.g. `Code Notes (12)`
- **File nodes** — each file with notes and its count, e.g. `src/app.ts (3)`
- **Note nodes** — line number, preview text, and author

**Toolbar**

- **+** — add a note at the current cursor position
- **Collapse All** — collapse every file node
- **Refresh** — refresh the view

**Navigating**

- **Click a note** → opens the file and focuses the comment thread
- **Right-click a note** → *Go to Note*, *Edit Note*, *View History*, *Delete Note*
- **Right-click a file** → *Open File*

**Sorting** (see [Configuration](configuration.md)): by file path (default), by date (most recent first), or by author. File nodes are collapsed by default; set `sidebar.autoExpand` to `true` to expand them.

## Two more sidebar views

When AI agents write notes, two additional views appear:

- **Agent activity** — a log of agent operations with an inline **Revert** (in `audit` mode)
- **Pending agent proposals** — the approval queue for agent writes (in `queue` mode)

Both are covered in the [Trust model](trust-model.md) guide.
