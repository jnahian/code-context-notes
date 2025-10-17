# Changelog

All notable changes to the "Code Context Notes" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Sidebar view for browsing all notes
- Search and filter notes across workspace
- Export notes to various formats
- Note templates
- Tags and categories

## [0.1.0] - 2025-10-17

### Added
- Initial release of Code Context Notes
- Add notes to code using VSCode's native comment UI
- Markdown formatting support with keyboard shortcuts
- CodeLens indicators above code with notes
- Intelligent content tracking - notes follow code when line numbers change
- Complete version history for all note modifications
- Git integration for automatic author detection
- Human-readable markdown storage in `.code-notes/` directory
- Keyboard shortcuts for common actions
- Configuration options for storage directory, author name, and CodeLens display
- Edit, delete, and view history buttons in comment UI
- Inline history display as comment replies
- Automatic note position updates on document changes
- Content hash tracking for moved code detection

### Features

#### Note Management
- Create notes for selected code ranges
- Edit notes with full history tracking
- Delete notes with confirmation dialog
- View complete edit history inline

#### UI Integration
- Native VSCode comment threads
- CodeLens indicators with note previews
- Markdown formatting toolbar
- Save/Cancel buttons for editing
- Edit/Delete/History buttons in comment title

#### Markdown Support
- Bold (`Ctrl/Cmd+B`)
- Italic (`Ctrl/Cmd+I`)
- Inline code (`Ctrl/Cmd+Shift+C`)
- Code blocks (`Ctrl/Cmd+Shift+K`)
- Links (`Ctrl/Cmd+K`)
- Lists, headings, and more

#### Storage
- One markdown file per note
- Files named by note ID
- Complete metadata (author, timestamps, line range, content hash)
- Full edit history preserved
- Human-readable format

#### Content Tracking
- Content hash generation for code blocks
- Automatic position updates when code moves
- Stale note detection when content changes significantly
- Document change event handling with debouncing

#### Git Integration
- Automatic git username detection
- Fallback to system username
- Configuration override support

#### Commands
- Add Note to Selection (`Ctrl+Alt+N` / `Cmd+Alt+N`)
- Delete Note at Cursor (`Ctrl+Alt+D` / `Cmd+Alt+D`)
- View Note History (`Ctrl+Alt+H` / `Cmd+Alt+H`)
- Refresh All Notes (`Ctrl+Alt+R` / `Cmd+Alt+R`)
- Markdown formatting commands
- Show Markdown Formatting Guide

#### Configuration
- `codeContextNotes.storageDirectory` - Custom storage location
- `codeContextNotes.authorName` - Override author name
- `codeContextNotes.showCodeLens` - Toggle CodeLens display

### Technical

#### Architecture
- TypeScript with strict mode
- Modular design with separation of concerns
- Dependency injection for testability
- Comprehensive error handling

#### Testing
- 100 total tests (41 unit + 59 integration)
- 88% code coverage
- Mocha test framework
- NYC coverage reporting
- Fast unit tests (~50ms)

#### Performance
- Note caching for fast lookups
- Debounced document change handling
- Efficient content hash algorithms
- Minimal performance impact with 100+ notes

### Bug Fixes
- Fixed "id not found" error on repeated edits by changing filename strategy from content-hash to note-ID
- Fixed CodeLens showing raw markdown formatting by adding markdown stripping
- Fixed second edit failure by using note ID instead of active editor document
- Fixed duplicate note files by using stable note ID as filename

### Known Issues
- Notes may become stale if code content changes significantly
- Large files (10,000+ lines) may experience slight performance impact
- Content tracking works best with unique code blocks

### Documentation
- Comprehensive README with quick start guide
- Detailed usage examples
- Configuration documentation
- FAQ section
- Contributing guidelines
- Testing documentation
- Architecture overview

[Unreleased]: https://github.com/jnahian/code-context-notes/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jnahian/code-context-notes/releases/tag/v0.1.0
