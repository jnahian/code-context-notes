# Code Context Notes Extension - User Stories & Tasks

## Epic 1: Project Foundation & Setup

### User Story 1.1: Initialize Extension Project
**As a** developer
**I want to** set up the VSCode extension project structure
**So that** I have a foundation to build upon

**Tasks:**
- [ ] Initialize npm project with TypeScript
- [ ] Install VSCode extension dependencies (@types/vscode, @vscode/test-electron)
- [ ] Configure tsconfig.json for VSCode extension development
- [ ] Set up package.json with extension manifest metadata
- [ ] Create basic folder structure (src/, out/, docs/)
- [ ] Add .gitignore for node_modules, out/, .vscode-test/
- [ ] Create README.md with extension overview

**Acceptance Criteria:**
- Project compiles without errors
- Extension can be run in Extension Development Host

---

### User Story 1.2: Define Core Data Models
**As a** developer
**I want to** create TypeScript interfaces for notes and related data
**So that** I have type safety throughout the codebase

**Tasks:**
- [ ] Create src/types.ts file
- [ ] Define Note interface with all required fields
- [ ] Define NoteHistoryEntry interface
- [ ] Define LineRange interface
- [ ] Define StorageMetadata interface
- [ ] Add JSDoc comments for all types
- [ ] Export all types for use in other modules

**Acceptance Criteria:**
- All data structures properly typed
- No TypeScript compilation errors
- Types support all planned features

---

## Epic 2: Storage & File Management

### User Story 2.1: Implement Storage Manager
**As a** user
**I want** my notes to be saved as markdown files
**So that** I can read and manage them outside VSCode if needed

**Tasks:**
- [ ] Create src/storageManager.ts
- [ ] Implement getNoteFilePath() to map source files to note files
- [ ] Implement createNotesDirectory() to ensure .code-notes/ exists
- [ ] Implement saveNote() to write markdown files
- [ ] Implement loadNote() to read markdown files
- [ ] Implement loadAllNotes() for a given source file
- [ ] Implement deleteNote() to remove notes
- [ ] Add error handling for file I/O operations
- [ ] Implement markdown serialization/deserialization
- [ ] Add unit tests for storage operations

**Acceptance Criteria:**
- Notes saved in `.code-notes/` directory
- Directory structure mirrors source code structure
- Markdown files are human-readable
- All CRUD operations work correctly

---

### User Story 2.2: Create Markdown Format Handler
**As a** user
**I want** note files to be well-formatted markdown
**So that** they are easy to read and understand

**Tasks:**
- [ ] Design markdown template structure
- [ ] Implement noteToMarkdown() serialization function
- [ ] Implement markdownToNote() deserialization function
- [ ] Handle history section formatting
- [ ] Support markdown escaping for user content
- [ ] Add metadata section (author, timestamps, hash)
- [ ] Test with various content types (code blocks, lists, etc.)

**Acceptance Criteria:**
- Generated markdown is valid and readable
- Round-trip conversion (note → markdown → note) preserves data
- Special characters handled correctly

---

## Epic 3: Git Integration

### User Story 3.1: Retrieve Git Username
**As a** user
**I want** my git username automatically added to notes
**So that** I know who created each note

**Tasks:**
- [ ] Create src/gitIntegration.ts
- [ ] Implement getGitUsername() using git config
- [ ] Add fallback to system username (os.userInfo())
- [ ] Cache username for performance
- [ ] Handle cases where git is not installed
- [ ] Handle cases where not in a git repository
- [ ] Add configuration option to override username

**Acceptance Criteria:**
- Git username retrieved when available
- Graceful fallback to system username
- No crashes if git not available
- Username cached to avoid repeated calls

---

## Epic 4: Content Hash Tracking

### User Story 4.1: Implement Content Hashing
**As a** user
**I want** notes to follow code content even when line numbers change
**So that** my notes stay relevant after refactoring

**Tasks:**
- [ ] Create src/contentHashTracker.ts
- [ ] Implement generateHash() using crypto module
- [ ] Implement getContentForRange() to extract line content
- [ ] Normalize whitespace before hashing
- [ ] Implement findContentByHash() to locate moved content
- [ ] Handle partial content matches
- [ ] Add threshold for content similarity detection

**Acceptance Criteria:**
- Hash generated consistently for same content
- Content can be found even if moved to different lines
- Performance acceptable for large files
- False positives minimized

---

### User Story 4.2: Update Note Positions on Document Changes
**As a** user
**I want** notes to update their position automatically
**So that** they stay aligned with the code

**Tasks:**
- [ ] Listen to document change events
- [ ] Detect when tracked content has moved
- [ ] Update note line ranges automatically
- [ ] Handle content deletion gracefully
- [ ] Handle content modification detection
- [ ] Add stale note detection
- [ ] Implement note position validation

**Acceptance Criteria:**
- Notes follow content when lines are inserted/deleted above
- Stale notes flagged when content changes significantly
- Performance impact minimal during editing

---

## Epic 5: Note Management Core

### User Story 5.1: Implement Note Manager
**As a** developer
**I want** centralized note management logic
**So that** all components interact with notes consistently

**Tasks:**
- [ ] Create src/noteManager.ts
- [ ] Implement createNote() with validation
- [ ] Implement updateNote() with history tracking
- [ ] Implement deleteNote() with history entry
- [ ] Implement getNotesForFile()
- [ ] Implement getNoteById()
- [ ] Add automatic timestamp management
- [ ] Add automatic author assignment
- [ ] Integrate with storage manager
- [ ] Integrate with content hash tracker
- [ ] Add note validation logic
- [ ] Implement note cache for performance

**Acceptance Criteria:**
- All CRUD operations available
- History automatically tracked
- Timestamps and author automatically added
- Thread-safe operations
- Cache invalidation works correctly

---

### User Story 5.2: Manage Note History
**As a** user
**I want** to see the history of changes to my notes
**So that** I can track how my understanding evolved

**Tasks:**
- [ ] Add history entry on note creation
- [ ] Add history entry on every edit
- [ ] Add history entry on deletion
- [ ] Store previous content in history
- [ ] Format history in markdown output
- [ ] Implement getHistory() method
- [ ] Add history display in comment UI

**Acceptance Criteria:**
- Every change tracked with timestamp and author
- History entries never deleted
- History readable in markdown file
- History accessible through UI

---

## Epic 6: VSCode Comment Integration

### User Story 6.1: Implement Comment Controller
**As a** user
**I want** to add notes using VSCode's comment interface
**So that** the experience feels native

**Tasks:**
- [ ] Create src/commentController.ts
- [ ] Create CommentController instance
- [ ] Implement createCommentThread() for new notes
- [ ] Implement comment provider interface
- [ ] Handle comment creation events
- [ ] Handle comment edit events
- [ ] Handle comment delete events
- [ ] Implement markdown support in comments
- [ ] Add comment reactions/actions (edit, delete, history)
- [ ] Sync comment threads with note data
- [ ] Handle comment thread disposal

**Acceptance Criteria:**
- Comment threads appear at note locations
- Users can add notes via comment UI
- Edit/delete work through comment UI
- Markdown rendered correctly
- Comments persist across sessions

---

### User Story 6.2: Comment Thread Lifecycle Management
**As a** user
**I want** comment threads to stay in sync with notes
**So that** I don't see stale or duplicate comments

**Tasks:**
- [ ] Create comment threads when notes loaded
- [ ] Update comment threads when notes change
- [ ] Remove comment threads when notes deleted
- [ ] Handle file close/reopen scenarios
- [ ] Handle workspace folder changes
- [ ] Implement comment thread refresh mechanism
- [ ] Add debouncing for performance

**Acceptance Criteria:**
- Comment threads always match note data
- No orphaned comment threads
- No duplicate comment threads
- Performance acceptable with many notes

---

## Epic 7: CodeLens Integration

### User Story 7.1: Implement CodeLens Provider
**As a** user
**I want** to see indicators above code that has notes
**So that** I can quickly identify annotated sections

**Tasks:**
- [ ] Create src/codeLensProvider.ts
- [ ] Implement CodeLensProvider interface
- [ ] Register provider for all languages
- [ ] Generate CodeLens for each note location
- [ ] Add "View Note" command to CodeLens
- [ ] Add "Add Note" command for selection ranges
- [ ] Display note preview in CodeLens text
- [ ] Handle CodeLens refresh on document changes
- [ ] Handle CodeLens commands
- [ ] Optimize CodeLens calculation for performance

**Acceptance Criteria:**
- CodeLens appears above lines with notes
- Clicking CodeLens opens comment thread
- Note preview shown in CodeLens
- Updates in real-time as notes change
- Minimal performance impact

---

### User Story 7.2: CodeLens Commands
**As a** user
**I want** to interact with notes through CodeLens
**So that** I have quick access to note actions

**Tasks:**
- [ ] Implement "View Note" command
- [ ] Implement "Add Note" command
- [ ] Implement "Edit Note" command (optional)
- [ ] Register commands in package.json
- [ ] Pass note context to commands
- [ ] Handle command errors gracefully

**Acceptance Criteria:**
- All commands functional from CodeLens
- Commands open appropriate UI
- Error messages shown to user if needed

---

## Epic 8: Extension Activation & Lifecycle

### User Story 8.1: Extension Activation
**As a** user
**I want** the extension to activate automatically
**So that** I don't have to manually enable it

**Tasks:**
- [ ] Create src/extension.ts with activate() function
- [ ] Register comment controller on activation
- [ ] Register CodeLens provider on activation
- [ ] Initialize note manager on activation
- [ ] Load existing notes on activation
- [ ] Register all commands on activation
- [ ] Set up document change listeners
- [ ] Create .code-notes/ directory if needed
- [ ] Add activation events to package.json
- [ ] Implement deactivate() cleanup function

**Acceptance Criteria:**
- Extension activates on workspace open
- All features available immediately
- No errors in activation
- Clean deactivation with no leaks

---

### User Story 8.2: Configuration Management
**As a** user
**I want** to configure the extension behavior
**So that** it fits my workflow

**Tasks:**
- [ ] Add configuration schema to package.json
- [ ] Implement codeContextNotes.storageDirectory setting
- [ ] Implement codeContextNotes.authorName setting
- [ ] Implement codeContextNotes.showCodeLens setting
- [ ] Listen for configuration changes
- [ ] Update behavior when configuration changes
- [ ] Validate configuration values
- [ ] Provide sensible defaults

**Acceptance Criteria:**
- All settings configurable via VSCode settings UI
- Configuration changes applied without reload
- Invalid configuration values rejected with messages

---

## Epic 9: Commands & Keybindings

### User Story 9.1: Implement Extension Commands
**As a** user
**I want** keyboard shortcuts to work with notes
**So that** I can work efficiently

**Tasks:**
- [ ] Define command IDs in package.json
- [ ] Implement "Add Note to Selection" command
- [ ] Implement "Delete Note at Cursor" command
- [ ] Implement "View Note History" command
- [ ] Implement "Refresh All Notes" command
- [ ] Register command handlers in extension.ts
- [ ] Add commands to command palette
- [ ] Add suggested keybindings
- [ ] Handle commands with no active editor
- [ ] Handle commands with no selection

**Acceptance Criteria:**
- All commands accessible from Command Palette
- Commands work as expected
- Error messages for invalid states
- Keybindings suggested but not forced

---

## Epic 10: Testing & Quality Assurance

### User Story 10.1: Unit Testing
**As a** developer
**I want** comprehensive unit tests
**So that** I can refactor confidently

**Tasks:**
- [ ] Set up testing framework (Mocha/Jest)
- [ ] Write tests for storageManager
- [ ] Write tests for contentHashTracker
- [ ] Write tests for gitIntegration
- [ ] Write tests for noteManager
- [ ] Write tests for markdown serialization
- [ ] Achieve >80% code coverage
- [ ] Set up CI pipeline for tests

**Acceptance Criteria:**
- All core logic covered by tests
- Tests pass consistently
- Coverage reports generated

---

### User Story 10.2: Integration Testing
**As a** developer
**I want** integration tests for VSCode features
**So that** I verify the extension works in real scenarios

**Tasks:**
- [ ] Set up VSCode extension test runner
- [ ] Test note creation through comment UI
- [ ] Test CodeLens rendering
- [ ] Test document change handling
- [ ] Test multi-file scenarios
- [ ] Test configuration changes
- [ ] Test activation/deactivation

**Acceptance Criteria:**
- Extension tested in real VSCode environment
- All user workflows covered
- Tests automated in CI

---

### User Story 10.3: Manual Testing & Bug Fixes
**As a** developer
**I want** to manually test edge cases
**So that** users have a smooth experience

**Tasks:**
- [ ] Test with very large files (10,000+ lines)
- [ ] Test with many notes (100+)
- [ ] Test with binary files
- [ ] Test with files that don't exist
- [ ] Test rapid editing scenarios
- [ ] Test concurrent edits in same file
- [ ] Test workspace reload
- [ ] Test extension disable/enable
- [ ] Fix any discovered bugs
- [ ] Document known limitations

**Acceptance Criteria:**
- No crashes in edge cases
- Performance acceptable in stress scenarios
- Known issues documented

---

## Epic 11: Documentation & Polish

### User Story 11.1: User Documentation
**As a** user
**I want** clear documentation
**So that** I can learn to use the extension

**Tasks:**
- [ ] Write comprehensive README.md
- [ ] Add feature overview with screenshots/GIFs
- [ ] Document installation instructions
- [ ] Document usage examples
- [ ] Document configuration options
- [ ] Add FAQ section
- [ ] Create CHANGELOG.md
- [ ] Add LICENSE file

**Acceptance Criteria:**
- README covers all features
- Examples clear and helpful
- Installation straightforward

---

### User Story 11.2: Developer Documentation
**As a** contributor
**I want** technical documentation
**So that** I can understand and extend the codebase

**Tasks:**
- [ ] Add inline code comments
- [ ] Document complex algorithms
- [ ] Create architecture diagram
- [ ] Write CONTRIBUTING.md
- [ ] Document build process
- [ ] Document testing approach
- [ ] Add JSDoc to all public APIs

**Acceptance Criteria:**
- Code self-documenting with comments
- Architecture clear from docs
- New contributors can get started

---

### User Story 11.3: Extension Marketplace Preparation
**As a** publisher
**I want** to prepare the extension for marketplace
**So that** users can discover and install it

**Tasks:**
- [ ] Create extension icon (128x128 PNG)
- [ ] Write compelling extension description
- [ ] Add categories and tags
- [ ] Create screenshot gallery
- [ ] Add demo GIF
- [ ] Set up GitHub repository
- [ ] Configure package.json for publishing
- [ ] Test .vsix package locally
- [ ] Publish to VSCode Marketplace

**Acceptance Criteria:**
- Extension visible in marketplace
- Description and media compelling
- Installation works smoothly

---

## Summary Statistics

**Total Epics:** 11
**Total User Stories:** 22
**Total Tasks:** ~150+

**Estimated Timeline:** 4-6 weeks
**Priority Order:** Epics 1-8 (MVP), Epics 9-11 (Polish)
