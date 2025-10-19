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

1. Select code you want to annotate
2. Press `Ctrl+Alt+N` (or `Cmd+Alt+N` on Mac)
3. Type your note with markdown formatting
4. Click Save or press `Ctrl+Enter`

That's it! A CodeLens indicator appears above your code.

## Usage Guide

### Adding Notes

**Method 1: Keyboard Shortcut**

1. Select the line(s) of code
2. Press `Ctrl+Alt+N` (Windows/Linux) or `Cmd+Alt+N` (Mac)
3. Enter your note in the comment editor
4. Click Save

**Method 2: Command Palette**

1. Select the line(s) of code
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type "Code Notes: Add Note to Selection"
4. Enter your note and click Save

**Method 3: CodeLens**

1. Select the line(s) of code
2. Click "Add Note" in the CodeLens that appears
3. Enter your note and click Save

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

### Editing Notes

1. Click the Edit button (pencil icon) in the comment thread
2. Modify the note content
3. Click Save to create a new history entry
4. Or click Cancel to discard changes

Each edit creates a new history entry with timestamp and author.

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

## Keyboard Shortcuts

| Command       | Windows/Linux  | Mac           | Description                            |
| ------------- | -------------- | ------------- | -------------------------------------- |
| Add Note      | `Ctrl+Alt+N`   | `Cmd+Alt+N`   | Add note to selected code              |
| Delete Note   | `Ctrl+Alt+D`   | `Cmd+Alt+D`   | Delete note at cursor                  |
| View History  | `Ctrl+Alt+H`   | `Cmd+Alt+H`   | View note history                      |
| Refresh Notes | `Ctrl+Alt+R`   | `Cmd+Alt+R`   | Refresh all notes                      |
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

- **Code Notes: Add Note to Selection** - Add a note to selected code
- **Code Notes: Delete Note at Cursor** - Delete note at current cursor position
- **Code Notes: View Note History** - View complete history of a note
- **Code Notes: Refresh All Notes** - Refresh all note displays
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
