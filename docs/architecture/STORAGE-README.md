# Code Context Notes - Storage System Documentation

Complete analysis of how notes are stored and retrieved in the Code Context Notes extension.

## Documents in This Section

### 1. STORAGE-QUICK-REFERENCE.md (5 KB)
**Start here for a quick overview**
- TL;DR summary
- Configuration settings
- Key identifiers (note IDs, content hash, paths)
- Markdown file structure
- Version stability overview
- Risk areas at a glance
- Debugging tips

### 2. STORAGE-ANALYSIS.md (13 KB)
**Detailed technical analysis**
- Storage mechanisms (file system, NO database/workspace storage)
- Storage keys and paths with examples
- Version information and history
- Migration logic (none implemented - important!)
- Configuration and customization
- Storage paths by context
- Potential issues and edge cases (8 detailed scenarios)
- Data structure definitions
- Test coverage summary

### 3. STORAGE-CODE-REFERENCE.md (16 KB)
**Code implementation details**
- Initialization flow (step-by-step from extension activation)
- StorageManager core operations with complete code
- NoteManager business logic
- ContentHashTracker implementation
- CommentController UI integration
- Configuration flow and listeners
- Data flow diagrams
- Complete method signatures and implementations

## Quick Facts

| Aspect | Details |
|--------|---------|
| **Storage Type** | File system (markdown files) |
| **Default Location** | `.code-notes` directory in workspace root |
| **File Format** | Markdown (`.md`) with structured sections |
| **File Naming** | UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000.md`) |
| **Default Path Pattern** | `{workspace}/.code-notes/{noteId}.md` |
| **Configurable** | Yes, via `codeContextNotes.storageDirectory` |
| **Database Used** | None |
| **Migration Logic** | Not implemented |
| **Version-Specific Storage** | No (fully compatible across versions) |
| **Current Version** | 0.1.5 (as of 2025-10-19) |

## Key Storage Components

### 1. Note ID
- **Type**: UUID v4
- **Generated**: On note creation via `uuid.v4()`
- **Used As**: Filename and internal reference
- **Stored In**: Markdown header as `## Note: {id}`

### 2. Content Hash
- **Algorithm**: SHA-256
- **Purpose**: Tracks code location even when lines move
- **Recalculated**: On each note update
- **Stored In**: Markdown header as `**Content Hash:**`

### 3. Line Range
- **Format**: Start and end line numbers (0-based internally, 1-based in markdown)
- **Tracked**: In markdown as `**Lines:** {start+1}-{end+1}`
- **Used For**: Identifying code location in source file

### 4. Source File Path
- **Type**: Absolute file path
- **Stored In**: Markdown header as `**File:** {path}`
- **Purpose**: Links note to source code file

## Storage Directory

All notes stored in: `{workspace}/{storageDirectory}/`

Default: `{workspace}/.code-notes/`

Configurable via VS Code setting: `codeContextNotes.storageDirectory`

## Configuration

```json
{
  "codeContextNotes.storageDirectory": ".code-notes",
  "codeContextNotes.authorName": "",
  "codeContextNotes.showCodeLens": true
}
```

## Critical Findings

### No Database
- File system only
- No SQLite, PostgreSQL, MongoDB, etc.
- No VS Code extension storage APIs used

### No Version-Specific Storage
- No version identifiers in paths
- No version numbers in file names
- No version fields in markdown headers
- Forward-compatible format

### No Migration Logic
- No migration scripts
- No upgrade handlers
- No version checking on startup
- **Risk**: Changing `storageDirectory` config orphans existing notes

### Soft Delete Only
- Notes marked as deleted with `isDeleted` flag
- Not permanently removed from disk
- Deleted flag preserved in markdown
- Deletion tracked in edit history

## Core Files

| File | Purpose | Key Methods |
|------|---------|-------------|
| `src/storageManager.ts` | File I/O and serialization | `saveNote()`, `loadNoteById()`, `loadNotes()`, `deleteNote()` |
| `src/noteManager.ts` | Business logic and caching | `createNote()`, `updateNote()`, `deleteNote()` |
| `src/commentController.ts` | UI integration | `createCommentThread()`, `loadCommentsForDocument()` |
| `src/contentHashTracker.ts` | Content hashing | `generateHash()`, `findContentByHash()` |
| `src/extension.ts` | Initialization | `activate()`, config loading |

## Markdown File Format

```
# Code Context Note

**File:** /absolute/path/to/file.tsx
**Lines:** 10-15
**Content Hash:** {sha256}

## Note: {uuid}
**Author:** Author Name
**Created:** 2025-01-01T00:00:00.000Z
**Updated:** 2025-01-02T00:00:00.000Z

## Current Content

Note content here (markdown supported)

## Edit History

### 2025-01-01T00:00:00.000Z - Author - created
```
content
```
```

## Common Operations

### Finding a Note
```
1. Get workspace root + storage directory
2. Load all .md files from .code-notes/
3. Parse each file's markdown header
4. Match note by ID or file path
5. Return Note object
```

### Creating a Note
```
1. Generate UUID v4 for note ID
2. Calculate SHA-256 hash of selected code
3. Create Note object with metadata
4. Convert to markdown format
5. Write to {noteId}.md in .code-notes/
```

### Updating a Note
```
1. Load existing note by ID
2. Update content field
3. Recalculate content hash
4. Add entry to history array
5. Overwrite markdown file
```

### Deleting a Note
```
1. Load existing note by ID
2. Set isDeleted = true
3. Add to history with 'deleted' action
4. Overwrite markdown file
5. Note remains on disk (soft delete)
```

## Important Paths

### Extension Directory
- Default: `.code-notes/` (configurable)

### Note File Example
- `/Users/dev/myproject/.code-notes/550e8400-e29b-41d4-a716-446655440000.md`

### Configuration Location
- VS Code workspace settings (`.vscode/settings.json`)
- Key: `codeContextNotes.storageDirectory`

## Known Issues and Risks

### Risk 1: Configuration Directory Changes
- **Issue**: Changing `storageDirectory` config orphans existing notes
- **Impact**: Notes disappear from UI (not deleted, just inaccessible)
- **Mitigation**: Add migration logic or document the risk

### Risk 2: No Concurrent Access Protection
- **Issue**: Multiple VS Code instances could corrupt files
- **Mitigation**: Relies on OS file locking (not explicit in code)

### Risk 3: No Backup System
- **Issue**: Corrupted markdown files can't be recovered
- **Mitigation**: Git version control recommended

### Risk 4: Markdown Parsing Failures
- **Issue**: Malformed markdown returns `null` on load
- **Mitigation**: Validation in `isValidNote()` method

## Testing

All storage functionality tested in: `src/test/suite/storageManager.test.ts`

Test coverage includes:
- File path generation
- Storage directory creation
- Save and load operations
- Delete operations
- Multiple notes per file
- Deleted notes filtering
- Markdown serialization edge cases
- Special characters handling
- Multiline content
- Code blocks in notes
- History preservation

**All 41 tests passing** (as of version 0.1.5)

## Dependencies

- `fs/promises` - File I/O
- `path` - Path resolution
- `crypto` - SHA-256 hashing
- `uuid` - UUID generation
- `child_process` - Git integration (username retrieval)
- `os` - System username fallback

**No database packages needed**

## Extension Versioning

Current Version: `0.1.5` (2025-10-19)

Version History:
- 0.1.5 - Latest (October 19, 2025)
- 0.1.4 - ES Module migration (October 17, 2025)
- 0.1.3 - Earlier
- 0.1.1 - Initial with workspace support (October 17, 2025)

**No storage format changes between versions**

## When Version Changes Affect Storage

- File format changes → Need migration
- Storage location changes → Need migration
- Configuration key changes → Need migration
- Data structure changes → Need migration

**None of these have occurred yet**

## Recommendations for Future Development

1. **Add version field** to markdown if format changes
2. **Add migration system** for breaking changes
3. **Add backup/recovery** for corrupted notes
4. **Document migration path** if `storageDirectory` changes
5. **Add explicit locking** for concurrent access
6. **Consider database** if scale increases significantly

## Reference Implementation

The storage system is implemented across three main classes:

1. **StorageManager** - Low-level file I/O
2. **NoteManager** - Business logic and caching
3. **CommentController** - UI integration

All operations go through these classes for centralized management.

---

## Document Guide

- **New to the codebase?** Start with STORAGE-QUICK-REFERENCE.md
- **Need to understand design?** Read STORAGE-ANALYSIS.md
- **Implementing storage features?** Check STORAGE-CODE-REFERENCE.md
- **Debugging storage issues?** See STORAGE-QUICK-REFERENCE.md debugging section

---

Generated: October 19, 2025
For the Code Context Notes extension v0.1.5
