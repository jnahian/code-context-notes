<div align="center">
  <img src="images/icon.png" alt="Code Context Notes" width="128" height="128">

  # Code Context Notes

  Add contextual notes to your code with full version history and intelligent tracking. Notes stay with your code even when line numbers change.

  [![VSCode Marketplace](https://img.shields.io/visual-studio-marketplace/v/jnahian.code-context-notes?style=for-the-badge&logo=visual-studio-code&label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes)
  [![Open VSX](https://img.shields.io/open-vsx/v/jnahian/code-context-notes?style=for-the-badge&logo=eclipse-ide&label=Open%20VSX)](https://open-vsx.org/extension/jnahian/code-context-notes)
  [![Downloads](https://img.shields.io/visual-studio-marketplace/d/jnahian.code-context-notes?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes)
</div>

## The Problem

Working on complex codebases, developers face a common dilemma:

**Traditional Code Comments:**
- ❌ Clutter your source files with non-code content
- ❌ Get committed to version control, polluting git history
- ❌ Mix documentation with implementation
- ❌ No version history for the comments themselves
- ❌ Can't be easily filtered or searched separately

**External Documentation:**
- ❌ Quickly becomes outdated as code changes
- ❌ Disconnected from the actual code location
- ❌ Requires context switching between editor and docs
- ❌ Hard to maintain alignment with code

**The result?** Important context gets lost, technical debt goes undocumented, and new team members struggle to understand why code exists the way it does.

## The Solution

**Code Context Notes** provides a third way: **contextual annotations that live alongside your code without being part of it.**

✅ **Non-invasive** - Notes stored separately in `.code-notes/` directory, never touching your source files
✅ **Intelligent tracking** - Notes follow your code even when you move, rename, or refactor it
✅ **Multiple notes per line** - Add multiple annotations to the same code with easy navigation
✅ **Workspace sidebar** - Dedicated Activity Bar panel showing all notes organized by file
✅ **Complete history** - Every edit preserved with timestamps and authors
✅ **Team collaboration** - Share notes by committing `.code-notes/` or keep them local with `.gitignore`
✅ **Native integration** - Uses VSCode's comment UI for a familiar, seamless experience
✅ **Markdown support** - Rich formatting with keyboard shortcuts
✅ **Zero performance impact** - Efficient caching and content hash tracking  

**Perfect for:**
- 📝 Documenting technical debt and TODOs
- 🎓 Onboarding new developers with contextual explanations
- 💡 Recording implementation decisions and trade-offs
- 🔍 Leaving breadcrumbs for future refactoring
- 🤝 Team knowledge sharing without code pollution

## Installation

### From VSCode Marketplace
1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Code Context Notes"
4. Click Install

### From Command Line
```bash
code --install-extension jnahian.code-context-notes
```

### From Open VSX (VS Codium)
Available on [Open VSX Registry](https://open-vsx.org/extension/jnahian/code-context-notes) for VS Codium users.

## Features

### Native VSCode Integration

- Add notes using VSCode's native comment UI
- CodeLens indicators show where notes exist
- **Multiple notes per line** - Add unlimited annotations to the same code location
- Icon-only navigation buttons for switching between multiple notes
- Markdown formatting with keyboard shortcuts (Ctrl/Cmd+B, I, K)
- Inline editing with Save/Cancel buttons

### Intelligent Content Tracking

- Notes follow code content even when line numbers change
- Content hash tracking detects moved code
- Automatic position updates on document changes

### Complete Version History

- Full audit trail of all note modifications
- View history directly in the comment thread
- Never lose context - all edits preserved with timestamps

### Human-Readable Storage

- Notes stored as markdown files in `.code-notes/` directory
- One file per note, named by note ID
- Easy to read, search, and version control

### Git Integration

- Automatic author detection using git username
- Fallback to system username
- Override via configuration

## Quick Start

**Method 1: From Code**
1. Select code you want to annotate (or just place cursor on a line)
2. Press `Ctrl+Alt+N` (or `Cmd+Alt+N` on Mac)
3. Type your note with markdown formatting
4. Click Save or press `Ctrl+Enter`

**Method 2: From Sidebar**
1. Click the Code Notes icon in the Activity Bar
2. Click the **+** button in the sidebar toolbar
3. Type your note and save

That's it! A CodeLens indicator appears above your code, and the note shows in the sidebar.

## Usage Guide

### Adding Notes

**Method 1: Keyboard Shortcut**

1. Select the line(s) of code (or just place cursor on a line)
2. Press `Ctrl+Alt+N` (Windows/Linux) or `Cmd+Alt+N` (Mac)
3. Enter your note in the comment editor
4. Click Save

**Method 2: From Sidebar**

1. Open the Code Notes sidebar (Activity Bar icon)
2. Click the **+** button in the toolbar
3. Enter your note and click Save

**Method 3: Command Palette**

1. Place cursor on the line of code (or select multiple lines)
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type "Code Notes: Add Note"
4. Enter your note and click Save

**Method 4: CodeLens**

1. Select the line(s) of code
2. Click "➕ Add Note" in the CodeLens that appears above your code
3. Enter your note and click Save

> **💡 Tips:**
> - You can add notes **without selecting text** - just place the cursor on a line
> - You can add **multiple notes to the same line** - just click "➕ Add Note" again
> - Notes added from the sidebar use your current cursor position

### Markdown Formatting

Notes support full markdown with keyboard shortcuts:

- **Bold**: `Ctrl/Cmd+B` or `**text**`
- **Italic**: `Ctrl/Cmd+I` or `*text*`
- **Inline Code**: `Ctrl/Cmd+Shift+C` or `` `code` ``
- **Code Block**: `Ctrl/Cmd+Shift+K` or ` `language `
- **Link**: `Ctrl/Cmd+K` or `[text](url)`
- **List**: Type `- ` or `1. `
- **Heading**: Type `# ` or `## `

### Viewing Notes

- **CodeLens**: Click the indicator above annotated code to expand the note
- **Inline**: Notes appear as comment threads in your editor
- **Preview**: CodeLens shows a preview of the note content
- **Multiple Notes**: When there are multiple notes on the same line:
  - CodeLens shows "📝 Note 1 of N" to indicate multiple annotations
  - Use Previous (`<`) and Next (`>`) buttons to navigate between notes
  - Each note displays its position (e.g., "Note 2 of 3")

### Editing Notes

1. Click the Edit button (pencil icon) in the comment thread
2. Modify the note content
3. Click Save to create a new history entry
4. Or click Cancel to discard changes

Each edit creates a new history entry with timestamp and author.

**Button Layout:**
- **Single note**: `[+] [Edit] [History] [Delete]`
- **Multiple notes**: `[<] [>] [+] [Edit] [History] [Delete]`
  - `[<]` and `[>]` - Navigate between notes
  - `[+]` - Add another note to the same line
  - `[Edit]`, `[History]`, `[Delete]` - Standard actions

### Viewing History

1. Click the History button (clock icon) in the comment thread
2. History appears as replies showing:
   - Action (created, edited, deleted)
   - Author
   - Timestamp
   - Previous content

### Deleting Notes

1. Click the Delete button (trash icon) in the comment thread
2. Confirm the deletion
3. Note is marked as deleted in history (not permanently removed)
4. CodeLens indicator disappears

### Sidebar View

The **Code Notes** sidebar provides a workspace-wide overview of all your notes, organized by file.

**Opening the Sidebar:**
- Click the Code Notes icon in the Activity Bar (left sidebar)
- A dedicated panel opens showing all notes across your workspace

**Sidebar Structure:**
- **Root Node**: Shows total note count ("Code Notes (N)")
- **File Nodes**: Show files with notes and note count per file ("src/app.ts (3)")
- **Note Nodes**: Show line number, preview text (50 chars), and author

**Quick Actions:**
- **+ Button** (toolbar): Add a note at current cursor position (no selection needed)
- **Collapse All** (toolbar): Reset all file nodes to collapsed state
- **Refresh** (toolbar): Manually refresh the sidebar

**Navigating from Sidebar:**
1. **Click a note**: Opens the file and focuses the comment thread inline
2. **Right-click a note** for context menu:
   - **Go to Note**: Opens file and shows the note in comment editor
   - **Edit Note**: Opens file and enables edit mode
   - **View History**: Opens file and shows note history inline
   - **Delete Note**: Confirms and deletes the note
3. **Right-click a file** for context menu:
   - **Open File**: Opens the file in editor

**Sorting Options:**
Configure how files are sorted in the sidebar (see Configuration section):
- **By File Path** (default): Alphabetical order
- **By Date**: Most recently updated notes first
- **By Author**: Alphabetical by author name

**Collapsing/Expanding:**
- File nodes are collapsed by default to keep the view clean
- Click to expand and see notes within each file
- Use "Collapse All" button to reset to default state

### Search & Filter Notes

The **Search Notes** feature provides powerful search and filtering capabilities to quickly find notes across your entire workspace.

**Opening Search:**
- **Keyboard Shortcut**: Press `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)
- **Sidebar Button**: Click the 🔍 (search) icon in Code Notes sidebar toolbar
- **Command Palette**: Type "Code Notes: Search Notes"

**Search Features:**
- ✅ **Full-text search** - Find notes by content
- ✅ **Regex patterns** - Use `/pattern/flags` for advanced searches
- ✅ **Filter by author** - Select one or more authors
- ✅ **Filter by date** - Created or updated date ranges
- ✅ **Filter by file** - Glob patterns (e.g., `src/**/*.ts`)
- ✅ **Combine filters** - Use multiple filters together (AND logic)
- ✅ **Search history** - Quick access to recent searches (last 20)
- ✅ **Relevance scoring** - Results ranked by match quality

**Search Syntax:**
```
# Regular text search
authentication

# Case-sensitive search (configure in settings)
Authentication

# Regex pattern search
/auth.*?token/i

# Multiple terms (all must match)
user authentication token
```

**Using Filters:**

1. **Filter by Author**:
   - Click "Filter by Author" in search panel
   - Select one or more authors
   - Results show notes from any selected author (OR logic)

2. **Filter by Date Range**:
   - Click "Filter by Date Range"
   - Choose created or updated date
   - Select preset (Last 7/30/90 days, This year) or custom range
   - Format: YYYY-MM-DD

3. **Filter by File Pattern**:
   - Click "Filter by File Pattern"
   - Enter glob pattern: `src/**/*.ts`, `*.js`, `components/**/*`
   - Supports standard glob syntax

4. **Combine Filters**:
   - Apply multiple filters together
   - All active filters must match (AND logic)
   - Clear individual filters or use "Clear All Filters"

**Search Results:**
- Results show file path, line number, preview, and author
- Click any result to navigate to the note
- Relevance score displayed (⭐ High, ⭐½ Medium, ☆ Low)
- Result count shown at top
- Debounced search (200ms delay for performance)

**Search History:**
- Recent searches appear when opening search panel
- Click any history entry to re-run the search
- History persists across sessions
- Configurable history size (default: 20 searches)

**Performance:**
- Inverted index for fast full-text search
- Background indexing (builds on workspace load)
- Search results typically < 100ms
- Optimized for 1000+ notes

## Configuration

Open VSCode Settings (`Ctrl+,` or `Cmd+,`) and search for "Code Context Notes":

### Storage Directory

```json
"codeContextNotes.storageDirectory": ".code-notes"
```

Directory where notes are stored (relative to workspace root). Default: `.code-notes`

### Author Name

```json
"codeContextNotes.authorName": "Your Name"
```

Override automatic username detection. Default: git username or system username

### Show CodeLens

```json
"codeContextNotes.showCodeLens": true
```

Enable/disable CodeLens indicators above code with notes. Default: `true`

### Sidebar: Sort By

```json
"codeContextNotes.sidebar.sortBy": "file"
```

Sort notes in sidebar by: `"file"` (path, alphabetically), `"date"` (most recent first), or `"author"` (alphabetically by author). Default: `"file"`

### Sidebar: Preview Length

```json
"codeContextNotes.sidebar.previewLength": 50
```

Maximum length of note preview text in sidebar (20-200 characters). Default: `50`

### Sidebar: Auto Expand

```json
"codeContextNotes.sidebar.autoExpand": false
```

Automatically expand file nodes in sidebar. Default: `false` (collapsed)

### Search: Fuzzy Matching

```json
"codeContextNotes.search.fuzzyMatching": false
```

Enable fuzzy matching for search queries (tolerates typos). Default: `false`

### Search: Case Sensitive

```json
"codeContextNotes.search.caseSensitive": false
```

Make search case-sensitive by default. Default: `false`

### Search: Max Results

```json
"codeContextNotes.search.maxResults": 100
```

Maximum number of search results to display (10-500). Default: `100`

### Search: Debounce Delay

```json
"codeContextNotes.search.debounceDelay": 200
```

Delay in milliseconds before triggering search (50-1000). Default: `200`

### Search: Save History

```json
"codeContextNotes.search.saveHistory": true
```

Save search history for quick access to recent searches. Default: `true`

### Search: History Size

```json
"codeContextNotes.search.historySize": 20
```

Number of recent searches to keep in history (5-100). Default: `20`

## Keyboard Shortcuts

| Command       | Windows/Linux  | Mac           | Description                            |
| ------------- | -------------- | ------------- | -------------------------------------- |
| Add Note      | `Ctrl+Alt+N`   | `Cmd+Alt+N`   | Add note to current line or selection  |
| Delete Note   | `Ctrl+Alt+D`   | `Cmd+Alt+D`   | Delete note at cursor                  |
| View History  | `Ctrl+Alt+H`   | `Cmd+Alt+H`   | View note history                      |
| Refresh Notes | `Ctrl+Alt+R`   | `Cmd+Alt+R`   | Refresh all notes                      |
| **Search Notes** | **`Ctrl+Shift+F`** | **`Cmd+Shift+F`** | **Open search panel for notes**     |
| Bold          | `Ctrl+B`       | `Cmd+B`       | Insert bold text (in comment editor)   |
| Italic        | `Ctrl+I`       | `Cmd+I`       | Insert italic text (in comment editor) |
| Inline Code   | `Ctrl+Shift+C` | `Cmd+Shift+C` | Insert inline code (in comment editor) |
| Code Block    | `Ctrl+Shift+K` | `Cmd+Shift+K` | Insert code block (in comment editor)  |
| Link          | `Ctrl+K`       | `Cmd+K`       | Insert link (in comment editor)        |

## Storage Format

Notes are stored in `.code-notes/` directory with one file per note:

```
project/
├── src/
│   └── app.ts
└── .code-notes/
    ├── abc123-def456-ghi789.md
    └── xyz789-uvw456-rst123.md
```

Each note file is named by its unique ID and contains:

```markdown
# Note

**File:** src/app.ts
**Lines:** 10-15
**Author:** username
**Created:** 2025-10-17T10:30:00.000Z
**Updated:** 2025-10-17T14:45:00.000Z
**Content Hash:** abc123def456

## Content

Your note content here with **markdown** formatting.

## History

### Created - 2025-10-17T10:30:00.000Z - username
```

Original content

```

### Edited - 2025-10-17T14:45:00.000Z - username

```

Previous content before this edit

```

```

### Version Control

You can add `.code-notes/` to `.gitignore` if you want notes to be local only, or commit them to share with your team.

## Commands

All commands are available in the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

**Note Operations:**
- **Code Notes: Add Note** - Add a note to selected code or current line
- **Code Notes: Delete Note at Cursor** - Delete note at current cursor position
- **Code Notes: View Note History** - View complete history of a note
- **Code Notes: Refresh All Notes** - Refresh all note displays

**Search & Filter:**
- **Code Notes: Search Notes** - Open search panel to find notes by content, author, date, or file

**Sidebar:**
- **Code Notes: Refresh Sidebar** - Manually refresh the sidebar view
- **Code Notes: Collapse All** - Collapse all file nodes in sidebar

**Formatting:**
- **Code Notes: Show Markdown Formatting Guide** - Display markdown help

## FAQ

### Do notes stay with my code when I refactor?

Yes! Notes use content hash tracking to follow code even when line numbers change. If you move code to a different location, the note moves with it.

### What happens if I significantly modify the code?

If the code content changes significantly, the note may become "stale" but is never deleted. You can update or delete the note manually.

### Can I use notes with any programming language?

Yes! Notes work with all file types and languages supported by VSCode.

### Are notes stored in my repository?

Notes are stored in `.code-notes/` directory. You can choose to commit them (to share with team) or add to `.gitignore` (to keep them local).

### Can I export my notes?

Notes are stored as markdown files, so you can read, search, and process them with any text tool. Future versions may include export features.

### How do I share notes with my team?

Commit the `.code-notes/` directory to your repository. Team members with the extension installed will see all notes.

### What's the performance impact?

Minimal. The extension uses caching and efficient algorithms. Even with 100+ notes, you won't notice any lag.

## Development

### Building from Source

```bash
git clone https://github.com/jnahian/code-context-notes
cd code-context-notes
npm install
npm run compile
```

### Running in Development

1. Open the project in VSCode
2. Press `F5` to launch Extension Development Host
3. Test the extension in the new window

### Running Tests

```bash
# Run unit tests (fast, ~50ms)
npm run test:unit

# Run with coverage report
npm run test:coverage

# Run all tests (requires VSCode)
npm test

# Package extension with git tagging
npm run package

# Publish to both marketplaces
npm run publish
```

**Test Coverage**: 88% overall with 100 total tests

- 41 unit tests (pure Node.js)
- 59+ integration tests (VSCode API)

See [docs/TESTING.md](docs/TESTING.md) for detailed testing documentation.

## Requirements

- VSCode 1.80.0 or higher
- Git (optional, for author detection)

## Known Limitations

- Notes are tracked by content hash; significant code changes may cause notes to become stale
- Large files (10,000+ lines) may experience slight performance impact
- Content tracking works best with unique code blocks

## Roadmap

Future enhancements being considered:

- Sidebar view for browsing all notes
- Search and filter notes across workspace
- Export notes to various formats
- Note templates
- Tags and categories
- Rich text editing
- Team collaboration features

## License

MIT - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

- Code of conduct
- Development setup
- Testing requirements
- Pull request process

## Support

- **Issues**: [GitHub Issues](https://github.com/jnahian/code-context-notes/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jnahian/code-context-notes/discussions)
- **Documentation**: [docs/](docs/)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.
