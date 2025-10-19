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

## [0.1.5] - 2025-10-19

### Added
- **Auto-collapse all other notes when working on one** - When opening, editing, or viewing a note, ALL other comment threads are automatically collapsed to improve focus and reduce visual clutter
  - Only one note is visible at a time for better concentration
  - All other notes (both expanded and already collapsed) are ensured to be collapsed
  - Temporary threads (new notes being created) are disposed completely
  - Editing threads are disposed when switching to another note
  - Applies to all interaction methods: keyboard shortcuts, CodeLens, and edit buttons
  - Creates a cleaner, more focused editing experience

### Fixed
- **Keyboard shortcuts now use modern comment UI** (Bug #9)
  - `Ctrl+Alt+N` (Add Note) now opens the comment editor instead of a simple input box
  - `Ctrl+Alt+H` (View History) now shows history inline in the comment thread instead of opening a separate document
  - Provides better UX with markdown support, formatting shortcuts, and Save/Cancel buttons
  - Consistent experience across all interaction methods

- **+ icon comment editor now saves notes** (Bug #10)
  - Fixed issue where clicking the + icon in the editor gutter would open a comment editor but Save wouldn't work
  - `handleSaveNewNote()` now handles threads created by both our code and VSCode's native + icon
  - Falls back to finding the document by URI matching if custom properties aren't set
  - Provides clear error messages if document cannot be found

- **Test coverage configuration** (Bug #8)
  - Fixed nyc coverage tool reporting 0% coverage after esbuild migration
  - Removed dependency on missing `@istanbuljs/nyc-config-typescript` package
  - Updated include path from `out/src/**/*.js` to `out/**/*.js`
  - All 41 unit tests continue to pass

### Changed
- Improved comment thread lifecycle management with better editor state tracking
- Enhanced user experience by preventing multiple simultaneous comment editors
- Updated internal methods: `openCommentEditor()`, `enableEditMode()`, and `focusNoteThread()` to auto-close other editors
- **Improved labels with more relevant information**
  - New note editor: "Add your note" (clearer action)
  - View/Edit notes: Shows "Last updated [date]" if modified, or "Created [date]" if new
  - History entries: Shows action with full timestamp (e.g., "Updated on 10/19/2025 at 2:30:00 PM")

### Technical
- New `closeAllCommentEditors()` helper method in CommentController
- Better detection of temporary vs. editing vs. viewing thread states
- Improved handling of VSCode's native + icon thread creation
- Continued compatibility with esbuild bundling

## [0.1.4] - 2025-10-17

### Changed - ES Module Migration
- **Migrated to ES Modules (ESM)** from CommonJS for better compatibility with modern npm packages
- Updated `package.json` with `"type": "module"`
- Updated `tsconfig.json` to use `"module": "ES2022"` and `"moduleResolution": "bundler"`
- Added `.js` extensions to all local import statements in TypeScript source files (6 files)
- Converted build scripts to ES modules (`scripts/package.js` and `scripts/publish.js`)
- Updated all test files with `.js` extensions in imports (4 test files)
- Fixed test runners to use `import.meta.url` instead of `__dirname` (3 test runners)
- Updated `.vscodeignore` to include production dependencies in packaged extension
- All 41 unit tests passing with ES modules

### Fixed
- Fixed `Cannot find module 'uuid'` error by migrating to ES modules (uuid v13.0.0 is ESM-only)
- Fixed `Cannot find module './storageManager'` error by adding `.js` extensions to imports
- Fixed `Cannot find package 'uuid'` error by updating packaging configuration to include dependencies

### Technical
- Now compatible with uuid v13.0.0 and other ESM-only packages
- Better tree-shaking and optimization with ES modules
- All TypeScript files compile to ES modules with proper import paths
- Package size: 103KB (includes uuid dependency)

### Migration Notes
- No breaking changes to extension API or functionality
- Extension continues to work with existing `.code-notes/` directories
- All existing notes remain compatible

## [0.1.1] - 2025-10-17

### Fixed
- Extension now activates properly when no workspace is initially open
- Added graceful handling for commands when no workspace is available
- Improved activation events for better responsiveness
- Users now get helpful messages to open a workspace when needed

### Added
- Package testing script (`npm run test:package`)
- Better error handling for workspace-dependent operations

### Changed
- Package size optimized to 79KB (down from 81KB)
- More responsive activation events

## [0.1.0] - 2025-10-17

### 🎉 Initial Release - Published to Marketplaces!

**Marketplace URLs:**
- VSCode Marketplace: https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes
- Open VSX Registry: https://open-vsx.org/extension/jnahian/code-context-notes

### Added
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

#### Package & Distribution
- Package size: 77KB (highly optimized)
- Supports VSCode 1.80.0+
- Published to both VSCode Marketplace and Open VSX Registry
- Automated publishing scripts included
- Git tagging integration

#### Development Tools
- 41 unit tests with 88% coverage
- Integration tests for VSCode API
- TypeScript compilation
- ESLint code quality
- Publishing automation (`npm run publish`)
- Package automation (`npm run package`)

### Installation

Install from VSCode Extensions marketplace or use:
```bash
code --install-extension jnahian.code-context-notes
```

### Links
- [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes)
- [Open VSX Registry](https://open-vsx.org/extension/jnahian/code-context-notes)
- [GitHub Repository](https://github.com/jnahian/code-context-notes)
- [Issues & Feedback](https://github.com/jnahian/code-context-notes/issues)