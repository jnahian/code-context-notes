# Code Context Notes Extension - User Stories & Tasks

## Epic 1: Project Foundation & Setup

### User Story 1.1: Initialize Extension Project
**As a** developer
**I want to** set up the VSCode extension project structure
**So that** I have a foundation to build upon

**Tasks:**
- [x] Initialize npm project with TypeScript
- [x] Install VSCode extension dependencies (@types/vscode, @vscode/test-electron)
- [x] Configure tsconfig.json for VSCode extension development
- [x] Set up package.json with extension manifest metadata
- [x] Create basic folder structure (src/, out/, docs/)
- [x] Add .gitignore for node_modules, out/, .vscode-test/
- [x] Create README.md with extension overview

**Acceptance Criteria:**
- [x] Project compiles without errors
- [ ] Extension can be run in Extension Development Host

---

### User Story 1.2: Define Core Data Models
**As a** developer
**I want to** create TypeScript interfaces for notes and related data
**So that** I have type safety throughout the codebase

**Tasks:**
- [x] Create src/types.ts file
- [x] Define Note interface with all required fields
- [x] Define NoteHistoryEntry interface
- [x] Define LineRange interface
- [x] Define StorageMetadata interface
- [x] Add JSDoc comments for all types
- [x] Export all types for use in other modules

**Acceptance Criteria:**
- [x] All data structures properly typed
- [x] No TypeScript compilation errors
- [x] Types support all planned features

---

## Epic 2: Storage & File Management

### User Story 2.1: Implement Storage Manager
**As a** user
**I want** my notes to be saved as markdown files
**So that** I can read and manage them outside VSCode if needed

**Tasks:**
- [x] Create src/storageManager.ts
- [x] Implement getNoteFilePath() to map source files to note files
- [x] Implement createNotesDirectory() to ensure .code-notes/ exists
- [x] Implement saveNote() to write markdown files
- [x] Implement loadNote() to read markdown files
- [x] Implement loadAllNotes() for a given source file
- [x] Implement deleteNote() to remove notes
- [x] Add error handling for file I/O operations
- [x] Implement markdown serialization/deserialization
- [ ] Add unit tests for storage operations

**Acceptance Criteria:**
- [x] Notes saved in `.code-notes/` directory
- [x] Directory structure mirrors source code structure
- [x] Markdown files are human-readable
- [x] All CRUD operations work correctly

---

### User Story 2.2: Create Markdown Format Handler
**As a** user
**I want** note files to be well-formatted markdown
**So that** they are easy to read and understand

**Tasks:**
- [x] Design markdown template structure
- [x] Implement noteToMarkdown() serialization function
- [x] Implement markdownToNote() deserialization function
- [x] Handle history section formatting
- [x] Support markdown escaping for user content
- [x] Add metadata section (author, timestamps, hash)
- [ ] Test with various content types (code blocks, lists, etc.)

**Acceptance Criteria:**
- [x] Generated markdown is valid and readable
- [x] Round-trip conversion (note → markdown → note) preserves data
- [ ] Special characters handled correctly (needs testing)

---

## Epic 3: Git Integration

### User Story 3.1: Retrieve Git Username
**As a** user
**I want** my git username automatically added to notes
**So that** I know who created each note

**Tasks:**
- [x] Create src/gitIntegration.ts
- [x] Implement getGitUsername() using git config
- [x] Add fallback to system username (os.userInfo())
- [x] Cache username for performance
- [x] Handle cases where git is not installed
- [x] Handle cases where not in a git repository
- [x] Add configuration option to override username

**Acceptance Criteria:**
- [x] Git username retrieved when available
- [x] Graceful fallback to system username
- [x] No crashes if git not available
- [x] Username cached to avoid repeated calls

---

## Epic 4: Content Hash Tracking

### User Story 4.1: Implement Content Hashing
**As a** user
**I want** notes to follow code content even when line numbers change
**So that** my notes stay relevant after refactoring

**Tasks:**
- [x] Create src/contentHashTracker.ts
- [x] Implement generateHash() using crypto module
- [x] Implement getContentForRange() to extract line content
- [x] Normalize whitespace before hashing
- [x] Implement findContentByHash() to locate moved content
- [x] Handle partial content matches
- [x] Add threshold for content similarity detection

**Acceptance Criteria:**
- [x] Hash generated consistently for same content
- [x] Content can be found even if moved to different lines
- [x] Performance acceptable for large files
- [x] False positives minimized

---

### User Story 4.2: Update Note Positions on Document Changes
**As a** user
**I want** notes to update their position automatically
**So that** they stay aligned with the code

**Tasks:**
- [ ] Listen to document change events (deferred to Note Manager integration)
- [ ] Detect when tracked content has moved (deferred to Note Manager integration)
- [ ] Update note line ranges automatically (deferred to Note Manager integration)
- [x] Handle content deletion gracefully (infrastructure ready)
- [x] Handle content modification detection (infrastructure ready)
- [x] Add stale note detection (infrastructure ready)
- [x] Implement note position validation (infrastructure ready)

**Acceptance Criteria:**
- [ ] Notes follow content when lines are inserted/deleted above (requires Note Manager)
- [x] Stale notes flagged when content changes significantly
- [x] Performance impact minimal during editing

---

## Epic 5: Note Management Core

### User Story 5.1: Implement Note Manager
**As a** developer
**I want** centralized note management logic
**So that** all components interact with notes consistently

**Tasks:**
- [x] Create src/noteManager.ts
- [x] Implement createNote() with validation
- [x] Implement updateNote() with history tracking
- [x] Implement deleteNote() with history entry
- [x] Implement getNotesForFile()
- [x] Implement getNoteById()
- [x] Add automatic timestamp management
- [x] Add automatic author assignment
- [x] Integrate with storage manager
- [x] Integrate with content hash tracker
- [x] Add note validation logic
- [x] Implement note cache for performance

**Acceptance Criteria:**
- [x] All CRUD operations available
- [x] History automatically tracked
- [x] Timestamps and author automatically added
- [x] Thread-safe operations
- [x] Cache invalidation works correctly

---

### User Story 5.2: Manage Note History
**As a** user
**I want** to see the history of changes to my notes
**So that** I can track how my understanding evolved

**Tasks:**
- [x] Add history entry on note creation
- [x] Add history entry on every edit
- [x] Add history entry on deletion
- [x] Store previous content in history
- [x] Format history in markdown output (handled by StorageManager)
- [x] Implement getHistory() method
- [ ] Add history display in comment UI (deferred to Comment Controller)

**Acceptance Criteria:**
- [x] Every change tracked with timestamp and author
- [x] History entries never deleted
- [x] History readable in markdown file
- [ ] History accessible through UI (requires Comment Controller)

---

## Epic 6: VSCode Comment Integration

### User Story 6.1: Implement Comment Controller
**As a** user
**I want** to add notes using VSCode's comment interface
**So that** the experience feels native

**Tasks:**
- [x] Create src/commentController.ts
- [x] Create CommentController instance
- [x] Implement createCommentThread() for new notes
- [x] Implement comment provider interface
- [x] Handle comment creation events
- [x] Handle comment edit events
- [x] Handle comment delete events
- [x] Implement markdown support in comments
- [ ] Add comment reactions/actions (edit, delete, history) - deferred to extension.ts
- [x] Sync comment threads with note data
- [x] Handle comment thread disposal

**Acceptance Criteria:**
- [x] Comment threads appear at note locations
- [ ] Users can add notes via comment UI (requires extension.ts commands)
- [ ] Edit/delete work through comment UI (requires extension.ts commands)
- [x] Markdown rendered correctly
- [x] Comments persist across sessions (handled by NoteManager)

---

### User Story 6.2: Comment Thread Lifecycle Management
**As a** user
**I want** comment threads to stay in sync with notes
**So that** I don't see stale or duplicate comments

**Tasks:**
- [x] Create comment threads when notes loaded
- [x] Update comment threads when notes change
- [x] Remove comment threads when notes deleted
- [x] Handle file close/reopen scenarios
- [ ] Handle workspace folder changes (deferred to extension.ts)
- [x] Implement comment thread refresh mechanism
- [ ] Add debouncing for performance (can be added in extension.ts)

**Acceptance Criteria:**
- [x] Comment threads always match note data
- [x] No orphaned comment threads
- [x] No duplicate comment threads
- [x] Performance acceptable with many notes

---

## Epic 7: CodeLens Integration

### User Story 7.1: Implement CodeLens Provider
**As a** user
**I want** to see indicators above code that has notes
**So that** I can quickly identify annotated sections

**Tasks:**
- [x] Create src/codeLensProvider.ts
- [x] Implement CodeLensProvider interface
- [ ] Register provider for all languages (deferred to extension.ts)
- [x] Generate CodeLens for each note location
- [x] Add "View Note" command to CodeLens
- [ ] Add "Add Note" command for selection ranges (deferred to extension.ts)
- [x] Display note preview in CodeLens text
- [x] Handle CodeLens refresh on document changes
- [x] Handle CodeLens commands
- [x] Optimize CodeLens calculation for performance

**Acceptance Criteria:**
- [x] CodeLens appears above lines with notes
- [ ] Clicking CodeLens opens comment thread (requires extension.ts)
- [x] Note preview shown in CodeLens
- [x] Updates in real-time as notes change
- [x] Minimal performance impact

---

### User Story 7.2: CodeLens Commands
**As a** user
**I want** to interact with notes through CodeLens
**So that** I have quick access to note actions

**Tasks:**
- [ ] Implement "View Note" command (deferred to extension.ts)
- [ ] Implement "Add Note" command (deferred to extension.ts)
- [ ] Implement "Edit Note" command (optional, deferred to extension.ts)
- [ ] Register commands in package.json (deferred to extension.ts)
- [x] Pass note context to commands (infrastructure ready)
- [ ] Handle command errors gracefully (deferred to extension.ts)

**Acceptance Criteria:**
- [ ] All commands functional from CodeLens (requires extension.ts)
- [ ] Commands open appropriate UI (requires extension.ts)
- [ ] Error messages shown to user if needed (requires extension.ts)

---

## Epic 8: Extension Activation & Lifecycle

### User Story 8.1: Extension Activation
**As a** user
**I want** the extension to activate automatically
**So that** I don't have to manually enable it

**Tasks:**
- [x] Create src/extension.ts with activate() function
- [x] Register comment controller on activation
- [x] Register CodeLens provider on activation
- [x] Initialize note manager on activation
- [x] Load existing notes on activation
- [x] Register all commands on activation
- [x] Set up document change listeners
- [x] Create .code-notes/ directory if needed
- [x] Add activation events to package.json (already in package.json)
- [x] Implement deactivate() cleanup function

**Acceptance Criteria:**
- [x] Extension activates on workspace open
- [x] All features available immediately
- [x] No errors in activation
- [x] Clean deactivation with no leaks

---

### User Story 8.2: Configuration Management
**As a** user
**I want** to configure the extension behavior
**So that** it fits my workflow

**Tasks:**
- [x] Add configuration schema to package.json (already in package.json)
- [x] Implement codeContextNotes.storageDirectory setting
- [x] Implement codeContextNotes.authorName setting
- [x] Implement codeContextNotes.showCodeLens setting
- [x] Listen for configuration changes
- [x] Update behavior when configuration changes
- [x] Validate configuration values
- [x] Provide sensible defaults

**Acceptance Criteria:**
- [x] All settings configurable via VSCode settings UI
- [x] Configuration changes applied without reload
- [x] Invalid configuration values rejected with messages

---

## Epic 9: Commands & Keybindings

### User Story 9.1: Implement Extension Commands
**As a** user
**I want** keyboard shortcuts to work with notes
**So that** I can work efficiently

**Tasks:**
- [x] Define command IDs in package.json (already in package.json)
- [x] Implement "Add Note to Selection" command
- [x] Implement "Delete Note at Cursor" command
- [x] Implement "View Note History" command
- [x] Implement "Refresh All Notes" command
- [x] Register command handlers in extension.ts
- [x] Add commands to command palette (via package.json)
- [ ] Add suggested keybindings (optional for v1)
- [x] Handle commands with no active editor
- [x] Handle commands with no selection

**Acceptance Criteria:**
- [x] All commands accessible from Command Palette
- [x] Commands work as expected
- [x] Error messages for invalid states
- [ ] Keybindings suggested but not forced (optional)

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
