# Storage System - Quick Reference

## TL;DR

- **Storage Type**: File System (markdown files in `.code-notes` directory)
- **File Format**: Markdown (`.md`) with structured sections
- **File Naming**: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000.md`)
- **Default Path**: `{workspace}/.code-notes/{noteId}.md`
- **Configurable**: Yes, via `codeContextNotes.storageDirectory` setting
- **Version Specific Storage**: NO (fully compatible across versions)
- **Migration Logic**: NOT implemented
- **Database**: NOT used

## Storage Architecture

```
Workspace
└── .code-notes/                 # Default location
    ├── {noteId-1}.md           # Individual note files
    ├── {noteId-2}.md
    └── {noteId-3}.md
```

## Configuration

| Setting | Default | Type | Purpose |
|---------|---------|------|---------|
| `codeContextNotes.storageDirectory` | `.code-notes` | string | Changes note storage location |
| `codeContextNotes.authorName` | `""` | string | Overrides git/system username |

## Key Storage Identifiers

### Note ID
- **Type**: UUID v4
- **Example**: `550e8400-e29b-41d4-a716-446655440000`
- **Used As**: Filename and internal reference

### Content Hash
- **Type**: SHA-256
- **Purpose**: Tracks code even when lines move
- **Stored In**: Markdown header as `**Content Hash:**`
- **Recalculated**: On each note update

### Source File Path
- **Purpose**: Links note to source code file
- **Stored In**: Markdown header as `**File:** {path}`
- **Type**: Absolute file path

### Line Range
- **Format**: Start and end line numbers (0-based)
- **Stored As**: `**Lines:** {start+1}-{end+1}` (1-based for display)
- **Purpose**: Marks location of annotated code

## Markdown File Structure

```
# Code Context Note

**File:** /absolute/path/to/file.tsx
**Lines:** 10-15
**Content Hash:** abc123...

## Note: {noteId}
**Author:** Author Name
**Created:** 2025-01-01T00:00:00.000Z
**Updated:** 2025-01-02T00:00:00.000Z

## Current Content

Your note text here (markdown supported)

## Edit History

### 2025-01-01T00:00:00.000Z - Author - created

Initial content here

### 2025-01-02T00:00:00.000Z - Author - edited

Updated content here
```

## Important Files

| File | Role |
|------|------|
| `src/storageManager.ts` | All file I/O, serialization/deserialization |
| `src/extension.ts` | Initialization, config loading (lines 50-62) |
| `package.json` | Config schema (lines 245-264) |
| `src/types.ts` | Data structures (Note interface) |

## Critical Methods

### Save Note
```typescript
await storage.saveNote(note);  // Writes to {noteId}.md
```

### Load Note
```typescript
const note = await storage.loadNoteById(noteId);  // Returns null if not found
```

### Load All Notes for File
```typescript
const notes = await storage.loadNotes(filePath);  // Excludes deleted
```

## Version Stability

| Aspect | Status | Details |
|--------|--------|---------|
| Storage Format | Stable | No version IDs in paths or files |
| Migration Logic | Not Implemented | No version checking on startup |
| Compatibility | Forward Compatible | Markdown format is extensible |
| Existing Data | Safe | Old notes work with new versions |

## Risk Areas

1. **Configuration Changes**: Changing `storageDirectory` orphans existing notes
2. **Concurrent Access**: Multiple VS Code instances may cause conflicts
3. **File Corruption**: Malformed markdown results in null load
4. **No Backup**: Deleted notes are soft-deleted but not recoverable

## Fast Lookups

**Find note storage path**:
```
{workspaceRoot}/{storageDirectory}/{noteId}.md
```

**Parse note from markdown**:
- Line 1: Skip header (`# Code Context Note`)
- Lines 2-5: Parse metadata (**File**, **Lines**, **Content Hash**)
- Line 6: Skip
- Find `## Note: {id}` → extract UUID
- Find `## Current Content` → extract note text
- Find `## Edit History` → parse history entries

**Check if note is deleted**:
- Look for `**Status:** DELETED` in metadata section
- Or check `note.isDeleted` boolean

## Extension Version

Current: `0.1.5` (2025-10-19)
Package.json line: 5

## Environment Variables

None specific to storage. Uses:
- Workspace root (from VS Code)
- Git username (via git config)
- System username (via `os.userInfo()`)

## Debugging Storage

### Find all notes in workspace
```bash
find . -name ".code-notes" -type d
find ./.code-notes -name "*.md" -type f
```

### Check markdown structure
```bash
head -20 .code-notes/{noteId}.md
grep "^##" .code-notes/{noteId}.md  # Section headers
```

### Verify JSON metadata parsing
Each markdown file should contain:
- `**File:**` - source file path
- `**Lines:**` - line range (1-based)
- `**Content Hash:**` - SHA-256 hash
- `## Note: {uuid}` - note ID
- `**Author:**` - author name
- `**Created:**` - ISO timestamp
- `**Updated:**` - ISO timestamp

## Common Paths

### Default storage location
`.code-notes/`

### Example full path
`/Users/dev/myproject/.code-notes/550e8400-e29b-41d4-a716-446655440000.md`

### Custom storage location
Set in VS Code workspace settings:
```json
{
  "codeContextNotes.storageDirectory": "docs/notes"
}
```
Then notes stored at: `docs/notes/{noteId}.md`

---

For detailed analysis, see: `docs/STORAGE-ANALYSIS.md`
