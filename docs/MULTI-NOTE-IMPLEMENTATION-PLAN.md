# Multi-Note Per Line Implementation Plan

**Feature Request**: GitHub Issue #6 - Support multiple notes on a single line
**Version**: 0.2.0
**Date**: October 19, 2025
**Status**: Planning Phase

## Executive Summary

This document outlines the implementation plan for adding support for multiple context notes on a single line of code. The current system only supports one note per line due to architectural limitations in query methods and UI display.

## Current Architecture Constraints

### Key Limitations
1. **Query Methods**: Use `.find()` which returns only the first match
2. **Comment Threads**: One-to-one mapping (noteId → thread)
3. **UI Display**: No mechanism for showing multiple notes simultaneously
4. **Commands**: Assume single note at cursor position

### Data Flow
- Notes stored as individual markdown files in `.code-notes/{uuid}.md`
- Flat storage structure with O(N) linear search
- In-memory caching by filePath
- Single note association per line range

## Implementation Strategy

### Phase 1: Data Model & Storage (No UI Changes)
**Goal**: Enable backend to support multiple notes while maintaining backward compatibility

#### 1.1 Update Query Methods
**Files**: `src/noteManager.ts`

Current behavior:
```typescript
// Returns only first note
const note = notes.find(n => n.lineRange.start === lineNumber);
```

New behavior:
```typescript
// Returns all notes at given position
const notesAtLine = notes.filter(n =>
  lineNumber >= n.lineRange.start && lineNumber <= n.lineRange.end
);
```

**Changes Required**:
- `getNotesForFile()`: Already returns array, no change needed
- `getNoteAtPosition(filePath, line)`: Rename to `getNotesAtPosition()`, return array
- `getNoteById()`: Keep as-is (returns single note by ID)
- Update all callers to handle arrays

#### 1.2 Storage Layer Updates
**Files**: `src/storageManager.ts`

**Current**: Already stores notes independently (one file per note)
**Status**: ✅ No changes needed - storage already supports multiple notes

**Verification**:
- Multiple notes can already be saved for the same file/line
- Storage format doesn't enforce uniqueness
- Migration not needed for storage layer

#### 1.3 Content Hash Tracking
**Files**: `src/contentHashTracker.ts`

**Current**: Tracks code content, not dependent on note count
**Status**: ✅ No changes needed

**Verification**:
- Hash calculation works per note independently
- Finding content works regardless of how many notes reference it

### Phase 2: UI - Multiple Note Display
**Goal**: Show count indicators and create interface for managing multiple notes

#### 2.1 Gutter Decoration Updates
**Files**: `src/codeLensProvider.ts`

**Current**:
```
📝 Note: {preview} ({author})
```

**New**:
```
📝 Note (3): {first note preview}... ({authors})
or
📝 Notes (3) | Click to view all
```

**Implementation**:
- Check note count at each line
- If count > 1, show count badge
- Update preview to indicate multiple notes
- Consider showing multiple authors if different

#### 2.2 Comment Thread UI Strategy
**Files**: `src/commentController.ts`

**Chosen Approach**: **Sequential Display with Navigation**

Rationale:
- Leverages existing VSCode comment thread API
- Minimal UI complexity
- Familiar pattern for users
- Easy to implement incrementally

**UI Design**:
```
┌─────────────────────────────────────┐
│ Note 1 of 3                    [×] │
│ ─────────────────────────────────── │
│ This is the first note content     │
│ with full markdown support         │
│                                    │
│ Author: Alice | Created: 2 days ago│
│                                    │
│ [< Previous] [Next >] [Add Note]   │
│ [Edit] [Delete] [History]          │
└─────────────────────────────────────┘
```

**Features**:
- Navigation buttons: Previous/Next to cycle through notes
- Note counter: "Note 1 of 3"
- All existing features per note: Edit, Delete, History
- Quick add: "Add Note" button to add another note to this line
- Keyboard shortcuts: Ctrl+← / Ctrl+→ to navigate

**Implementation Details**:
```typescript
interface CommentThreadState {
  noteIds: string[];      // All note IDs for this line
  currentIndex: number;   // Which note is currently displayed
  lineRange: LineRange;   // Shared line range
}
```

**Thread Management**:
- One VSCode comment thread per line (not per note)
- Thread stores array of note IDs
- Switching notes updates thread content in place
- Thread lifecycle tied to line, not individual note

#### 2.3 Command Updates
**Files**: `src/extension.ts`, `src/commentController.ts`

**Commands Requiring Updates**:

1. **addNote**
   - Check if note already exists at cursor
   - If yes, ask: "Add another note or edit existing?"
   - Create new note with same line range

2. **viewNote** (via CodeLens)
   - If multiple notes, show first by default
   - Provide navigation to others

3. **deleteNote**
   - If multiple notes at position, show quick pick menu
   - Allow selecting which note(s) to delete

4. **editNote**
   - Update current note in view (based on currentIndex)

5. **viewHistory**
   - Show history for currently displayed note

**New Commands**:

1. **navigateNextNote**
   - Command: `codeContextNotes.nextNote`
   - Keybinding: `Ctrl+→` (when in comment)
   - Action: Increment currentIndex, update display

2. **navigatePreviousNote**
   - Command: `codeContextNotes.previousNote`
   - Keybinding: `Ctrl+←` (when in comment)
   - Action: Decrement currentIndex, update display

3. **addNoteToLine**
   - Command: `codeContextNotes.addNoteToLine`
   - Button in comment thread
   - Action: Create new note with same lineRange

### Phase 3: Enhanced Features
**Goal**: Improve UX for managing multiple notes

#### 3.1 Note Categories (Optional)
**Files**: `src/types.ts`, UI components

Add optional category field:
```typescript
interface Note {
  // ... existing fields
  category?: 'TODO' | 'BUG' | 'REFERENCE' | 'NOTE' | 'QUESTION';
}
```

**UI Updates**:
- Category badge in note header
- Filter/sort by category
- Color coding per category

#### 3.2 Note List Sidebar (Optional)
**Files**: New `src/notesTreeView.ts`

Create tree view showing:
```
📁 CurrentFile.ts
  📍 Line 42 (3 notes)
    📝 TODO: Refactor this
    🐛 BUG: Edge case issue
    📚 REFERENCE: See docs
  📍 Line 78 (1 note)
    📝 NOTE: Important pattern
```

Features:
- Quick navigation to notes
- See all notes for file at glance
- Group by line or category
- Search/filter capabilities

#### 3.3 Quick Pick Interface (Optional)
**Alternative to sequential display**

Show all notes in a menu:
```typescript
const items = notes.map((note, index) => ({
  label: `$(note) Note ${index + 1}: ${note.content.substring(0, 50)}...`,
  description: note.author,
  detail: formatDistanceToNow(new Date(note.createdAt))
}));

const selected = await vscode.window.showQuickPick(items);
```

### Phase 4: Migration & Compatibility
**Goal**: Ensure smooth upgrade for existing users

#### 4.1 Data Migration
**Status**: ✅ No migration needed

**Reason**:
- Storage format unchanged (one file per note)
- Data model unchanged (Note interface same)
- Only query/display logic changes
- Existing notes work immediately

#### 4.2 Backward Compatibility
**Guarantees**:
- ✅ Existing notes load without modification
- ✅ Existing .code-notes structure unchanged
- ✅ All existing commands continue to work
- ✅ No data loss or corruption risk

**Edge Cases**:
- Users with multiple notes on same line (currently hidden)
  - Will now be visible automatically
  - No action required

#### 4.3 Version Detection
Not required - no breaking changes

### Phase 5: Testing Strategy

#### 5.1 Unit Tests
**Files**: `src/test/suite/`

**Test Cases**:
1. Multiple notes at same position
   - Create 3 notes on line 10
   - Verify all are returned by `getNotesAtPosition()`

2. Navigation logic
   - Test next/previous with 1, 2, 3+ notes
   - Test boundary conditions (first/last)

3. Query methods
   - Verify filters return all matching notes
   - Verify single note queries still work

4. Thread state management
   - Create thread with multiple notes
   - Switch between notes
   - Verify state persistence

#### 5.2 Integration Tests
**Test Scenarios**:

1. **Multi-note creation**
   - Create note on line 10
   - Create another note on line 10
   - Verify both appear in CodeLens

2. **Note navigation**
   - Open multi-note comment
   - Navigate to next note
   - Verify content updates

3. **Code movement tracking**
   - Create 2 notes on line 10
   - Edit code to move line 10 to line 15
   - Verify both notes move together

4. **Delete handling**
   - Create 3 notes on line 10
   - Delete middle note
   - Verify navigation still works

5. **Performance**
   - Create 10 notes on same line
   - Verify UI remains responsive
   - Check memory usage

#### 5.3 Manual Testing Checklist
- [ ] Create multiple notes on same line via different methods
- [ ] Navigate between notes using keyboard shortcuts
- [ ] Edit each note independently
- [ ] Delete notes in various orders
- [ ] View history for each note
- [ ] Add note to line that already has notes
- [ ] Test with long note content (>1000 chars)
- [ ] Test with markdown formatting in multiple notes
- [ ] Test across file reload/VSCode restart
- [ ] Test with code movement/refactoring

### Phase 6: Documentation Updates

#### 6.1 User Documentation
**Files**: `README.md`, `docs/`

**Sections to Add**:
1. **Multiple Notes Feature**
   - How to add multiple notes to a line
   - Navigation between notes
   - Best practices

2. **Keyboard Shortcuts**
   - Ctrl+← / Ctrl+→ for navigation
   - Updated keybinding table

3. **Use Cases**
   - Examples from issue #6
   - Screenshots/GIFs

#### 6.2 Developer Documentation
**Files**: `docs/ARCHITECTURE.md`

**Updates**:
1. Multi-note design decisions
2. Thread state management
3. Query method changes
4. Future optimization opportunities

#### 6.3 Changelog
**File**: `CHANGELOG.md`

```markdown
## [0.2.0] - 2025-10-XX

### Added
- Support for multiple notes on a single line (#6)
- Note counter badge in CodeLens
- Navigation buttons (Previous/Next) in comment threads
- Quick add button to add note to existing line
- Keyboard shortcuts for note navigation (Ctrl+←/→)

### Changed
- Query methods now return all notes at position
- Comment thread lifecycle per line instead of per note
- CodeLens preview shows note count when multiple exist

### Fixed
- Previously hidden notes at same position now visible
```

## Implementation Timeline

### Sprint 1 (Week 1): Foundation
- [ ] Update query methods in NoteManager
- [ ] Add tests for multi-note queries
- [ ] Update CodeLens to show note count
- [ ] Document changes

**Deliverables**: Backend supports multiple notes, CodeLens shows counts

### Sprint 2 (Week 2): UI Core
- [ ] Implement thread state management
- [ ] Add navigation buttons to comment UI
- [ ] Implement next/previous commands
- [ ] Add keyboard shortcuts
- [ ] Update tests

**Deliverables**: Users can navigate between notes

### Sprint 3 (Week 3): Commands & Polish
- [ ] Update addNote command for multi-note
- [ ] Update delete/edit commands
- [ ] Add "Add Note" button to threads
- [ ] Improve UI/UX polish
- [ ] Integration testing

**Deliverables**: Full feature complete

### Sprint 4 (Week 4): Testing & Documentation
- [ ] Comprehensive testing (unit + integration)
- [ ] Performance testing (10+ notes per line)
- [ ] Update all documentation
- [ ] Create demo GIFs/screenshots
- [ ] Release candidate

**Deliverables**: Production-ready release

## Success Metrics

### Functional Goals
- ✅ Multiple notes can coexist on same line
- ✅ All notes are visible and accessible
- ✅ Navigation is intuitive and fast
- ✅ No data loss or corruption
- ✅ Backward compatible with existing notes

### Performance Goals
- Comment thread renders in <100ms with 10 notes
- Navigation between notes <50ms
- No memory leaks with many notes
- CodeLens refresh <200ms

### UX Goals
- Users can find and navigate multiple notes easily
- No confusion about which note is being edited
- Clear visual indicators for note count
- Keyboard shortcuts feel natural

## Risk Assessment

### Low Risk
- ✅ Storage layer changes (none needed)
- ✅ Data migration (none needed)
- ✅ Backward compatibility (guaranteed)

### Medium Risk
- ⚠️ UI complexity (navigation state management)
- ⚠️ Performance with many notes per line
- ⚠️ User confusion with multiple notes

**Mitigation**:
- Comprehensive testing of thread state
- Performance benchmarks and optimization
- Clear UI indicators and documentation

### High Risk
- None identified

## Future Enhancements (Post-MVP)

### v0.3.0: Enhanced Organization
- Note categories/types
- Color coding by category
- Filter/sort options
- Bulk operations

### v0.4.0: Collaboration Features
- Note list sidebar/tree view
- Search across all notes
- Export/import notes
- Team sharing

### v1.0.0: Performance Optimization
- Nested storage by file hash
- Metadata indexing
- Lazy loading for large note sets
- Database backend option

## Conclusion

This implementation plan provides a clear path to supporting multiple notes per line while maintaining backward compatibility and system stability. The phased approach allows for incremental development and testing, reducing risk and ensuring quality.

**Next Steps**:
1. Review and approve this plan
2. Begin Sprint 1 implementation
3. Set up project tracking (GitHub Project board)
4. Create feature branch: `feature/multi-note-support`
