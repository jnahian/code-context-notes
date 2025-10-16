# Code Context Notes

A VSCode extension that enables developers to attach contextual notes to specific lines or ranges of code. Notes are stored as markdown files with full version history and intelligent content tracking.

## Features

- **Contextual Notes**: Add notes to any line or range of code using VSCode's native comment UI
- **Markdown Storage**: Notes stored as human-readable markdown files in `.code-notes/` directory
- **Version History**: Full audit trail of all note modifications with timestamps
- **Content Tracking**: Notes follow code content even when line numbers change
- **Git Integration**: Automatic author detection using git username
- **CodeLens Integration**: Visual indicators and quick actions directly in the editor

## Installation

1. Install from VSCode Marketplace (coming soon)
2. Or install from VSIX file: `code --install-extension code-context-notes-*.vsix`

## Usage

### Adding a Note

1. Select the line(s) of code you want to annotate
2. Click the "Add Note" action in CodeLens, or use Command Palette: `Code Notes: Add Note to Selection`
3. Enter your note content in the comment editor (supports markdown)
4. Note is automatically saved with your git username and timestamp

### Viewing Notes

- CodeLens indicators appear above lines with notes
- Click the CodeLens to expand and view the note
- View full note history through the comment UI

### Editing Notes

1. Click the edit button in the comment thread
2. Modify the note content
3. Save to create a new history entry

### Deleting Notes

1. Click the delete button in the comment thread
2. Confirm the deletion
3. Note is marked as deleted in history

## Configuration

Configure the extension in VSCode settings:

```json
{
  // Directory where notes are stored (relative to workspace root)
  "codeContextNotes.storageDirectory": ".code-notes",

  // Override author name (defaults to git username or system username)
  "codeContextNotes.authorName": "",

  // Show CodeLens indicators above code with notes
  "codeContextNotes.showCodeLens": true
}
```

## Storage Format

Notes are stored in `.code-notes/` directory, mirroring your source code structure:

```
project/
├── src/
│   └── app.ts
└── .code-notes/
    └── src/
        └── app.ts.md
```

Each note file contains:
- Note content in markdown
- Metadata (author, timestamps, line range, content hash)
- Full version history

## Commands

- `Code Notes: Add Note to Selection` - Add a note to selected code
- `Code Notes: Delete Note at Cursor` - Delete note at current cursor position
- `Code Notes: View Note History` - View complete history of a note
- `Code Notes: Refresh All Notes` - Refresh all note displays

## Development

### Building from Source

```bash
git clone https://github.com/your-username/code-context-notes
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

## License

MIT

## Contributing

Contributions are welcome! Please read CONTRIBUTING.md for details.

## Support

Report issues at: https://github.com/your-username/code-context-notes/issues
