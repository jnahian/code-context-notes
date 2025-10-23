# Quick Reference Guide

Quick reference for Code Context Notes extension commands and shortcuts.

## What Problem Does This Solve?

**The Problem:**
- Code comments clutter source files and pollute git history
- External documentation becomes outdated and disconnected from code
- Important context gets lost over time

**The Solution:**
Code Context Notes provides contextual annotations that:
- ✅ Live alongside your code without being part of it
- ✅ Track code movement and refactoring automatically
- ✅ Maintain complete version history
- ✅ Integrate natively with VSCode's comment UI

**Perfect for:** Technical debt documentation, onboarding notes, implementation decisions, and team knowledge sharing.

For detailed explanation, see [PROBLEM_AND_SOLUTION.md](PROBLEM_AND_SOLUTION.md).

## Keyboard Shortcuts

### Note Operations

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Add Note | `Ctrl+Alt+N` | `Cmd+Alt+N` |
| Delete Note | `Ctrl+Alt+D` | `Cmd+Alt+D` |
| View History | `Ctrl+Alt+H` | `Cmd+Alt+H` |
| Refresh Notes | `Ctrl+Alt+R` | `Cmd+Alt+R` |

### Markdown Formatting (in comment editor)

| Format | Windows/Linux | Mac | Syntax |
|--------|--------------|-----|--------|
| Bold | `Ctrl+B` | `Cmd+B` | `**text**` |
| Italic | `Ctrl+I` | `Cmd+I` | `*text*` |
| Inline Code | `Ctrl+Shift+C` | `Cmd+Shift+C` | `` `code` `` |
| Code Block | `Ctrl+Shift+K` | `Cmd+Shift+K` | ` ```lang ``` |
| Link | `Ctrl+K` | `Cmd+K` | `[text](url)` |

## Commands

All commands available in Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **Code Notes: Add Note to Selection** - Add note to selected code
- **Code Notes: Delete Note at Cursor** - Delete note at cursor position
- **Code Notes: View Note History** - View complete note history
- **Code Notes: Refresh All Notes** - Refresh all note displays
- **Code Notes: Show Markdown Formatting Guide** - Display markdown help

## UI Elements

### CodeLens Indicators

Appear above code with notes:
- Click to expand and view note
- Shows note preview (first line)
- Updates in real-time

### Comment Threads

Native VSCode comment UI:
- **Edit button** (pencil icon) - Edit note content
- **History button** (clock icon) - View edit history
- **Delete button** (trash icon) - Delete note
- **Save button** - Save changes
- **Cancel button** - Discard changes

## Markdown Syntax

### Text Formatting

```markdown
**bold text**
*italic text*
***bold and italic***
~~strikethrough~~
`inline code`
```

### Links

```markdown
[link text](https://example.com)
[link with title](https://example.com "Title")
```

### Code Blocks

````markdown
```javascript
function example() {
  return true;
}
```
````

### Lists

```markdown
- Unordered item 1
- Unordered item 2
  - Nested item

1. Ordered item 1
2. Ordered item 2
   1. Nested item
```

### Headings

```markdown
# Heading 1
## Heading 2
### Heading 3
```

### Blockquotes

```markdown
> This is a quote
> Multiple lines
```

### Horizontal Rule

```markdown
---
```

## Configuration

### Settings Location

1. Open Settings: `Ctrl+,` (or `Cmd+,`)
2. Search for "Code Context Notes"
3. Modify settings

### Available Settings

```json
{
  // Storage directory (relative to workspace root)
  "codeContextNotes.storageDirectory": ".code-notes",
  
  // Override author name (empty = auto-detect)
  "codeContextNotes.authorName": "",
  
  // Show CodeLens indicators
  "codeContextNotes.showCodeLens": true
}
```

## File Structure

```
project/
├── src/
│   └── app.ts
└── .code-notes/
    ├── abc123-def456.md    # Note file (named by note ID)
    └── xyz789-uvw456.md    # Another note file
```

## Common Workflows

### Add a Note

1. Select code
2. Press `Ctrl+Alt+N` (or `Cmd+Alt+N`)
3. Type note content
4. Click Save

### Edit a Note

1. Click CodeLens or find comment thread
2. Click Edit button (pencil icon)
3. Modify content
4. Click Save

### View History

1. Click CodeLens or find comment thread
2. Click History button (clock icon)
3. History appears as replies

### Delete a Note

1. Click CodeLens or find comment thread
2. Click Delete button (trash icon)
3. Confirm deletion

## Tips & Tricks

### Markdown Shortcuts

- Type `**` and start typing for bold
- Type `*` and start typing for italic
- Type `` ` `` for inline code
- Type `- ` for bullet list
- Type `1. ` for numbered list
- Type `# ` for heading

### Selection Tips

- Select single line: Click line number
- Select multiple lines: Click and drag line numbers
- Select code block: Use `Ctrl+Shift+[` and `Ctrl+Shift+]`

### Organization

- Use headings in notes for structure
- Use lists for multiple points
- Use code blocks for examples
- Use links to reference docs

### Version Control

- Commit `.code-notes/` to share with team
- Add to `.gitignore` to keep notes local
- Notes are human-readable markdown

### Performance

- Extension handles 100+ notes easily
- CodeLens can be disabled if needed
- Notes are cached for fast access

## Troubleshooting

### Notes not appearing?

1. Check `.code-notes/` directory exists
2. Check file permissions
3. Run "Refresh All Notes" command
4. Check CodeLens enabled in settings

### Notes at wrong position?

1. Code content may have changed significantly
2. Run "Refresh All Notes" command
3. Edit note to update position

### Can't edit note?

1. Check file permissions
2. Check file not open in another editor
3. Try closing and reopening file

### Keyboard shortcuts not working?

1. Check for conflicting keybindings
2. Check comment editor has focus (for markdown shortcuts)
3. Check selection exists (for Add Note)

## Installation

### VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Code Context Notes"
4. Click Install

### Open VSX Registry (VS Codium)
Available at: https://open-vsx.org/extension/jnahian/code-context-notes

### Command Line
```bash
# VS Code
code --install-extension jnahian.code-context-notes

# VS Codium
codium --install-extension jnahian.code-context-notes
```

## Getting Help

- **Documentation**: See [README.md](../README.md)
- **Issues**: [GitHub Issues](https://github.com/jnahian/code-context-notes/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jnahian/code-context-notes/discussions)
