# User Story Template

## Epic [Number]: [Epic Name]

### User Story [Number]: [Story Title]

**As a** [role]
**I want to** [action]
**So that** [benefit]

#### Tasks

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

#### Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Guidelines

**User Story Format:**

- **As a** [user/developer/contributor] - Who is this for?
- **I want to** [specific action] - What do they want?
- **So that** [clear benefit] - Why do they want it?

**Tasks:** Specific, actionable items that can be checked off

**Acceptance Criteria:** Testable conditions that define "done"

---

## Example

### Epic 2: Storage & File Management

### User Story 2.1: Implement Storage Manager

**As a** user
**I want** my notes to be saved as markdown files
**So that** I can read and manage them outside VSCode if needed

#### Tasks

- [x] Create src/storageManager.ts
- [x] Implement saveNote() to write markdown files
- [x] Implement loadNotes() to read notes for a file
- [x] Add error handling for file I/O operations
- [x] Add unit tests for storage operations

#### Acceptance Criteria

- [x] Notes saved in `.code-notes/` directory
- [x] Markdown files are human-readable
- [x] All CRUD operations work correctly
- [x] File I/O errors caught and reported
