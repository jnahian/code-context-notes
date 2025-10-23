# User Story: Sidebar View for Browsing All Notes

## Epic 12: Workspace Navigation & Overview

### User Story 12.1: Sidebar Tree View

**As a** developer working on a large codebase
**I want to** see all notes across my workspace in a browsable tree view
**So that** I can quickly navigate between notes and get an overview of documented areas

---

## Tasks

### Phase 1: Backend & Data Layer
- [ ] Add `getAllNotes(): Promise<Note[]>` to NoteManager
- [ ] Add `getNotesByFile(): Promise<Map<string, Note[]>>` to NoteManager
- [ ] Add `getNoteCount(): Promise<number>` to NoteManager
- [ ] Add `getFileCount(): Promise<number>` to NoteManager
- [ ] Implement caching for workspace-wide note queries
- [ ] Add file watcher for `.code-notes/` directory
- [ ] Emit events on note create/update/delete
- [ ] Trigger sidebar refresh on note changes

### Phase 2: Tree Data Provider
- [ ] Create `src/notesSidebarProvider.ts` with TreeDataProvider implementation
- [ ] Create `src/noteTreeItem.ts` with tree item classes
- [ ] Implement `getChildren()` method for tree structure
- [ ] Implement `getTreeItem()` method for node rendering
- [ ] Create RootNode showing workspace note count
- [ ] Create FileNode showing file path and note count
- [ ] Create NoteNode showing line, preview, and author
- [ ] Add tree item icons (folder, file, note)
- [ ] Implement tree item tooltips with full paths/content
- [ ] Add context values for conditional menus
- [ ] Strip markdown from note previews
- [ ] Truncate preview text to configurable length (default 50 chars)

### Phase 3: Sidebar Registration
- [ ] Add sidebar view contribution to package.json
- [ ] Configure view ID: `codeContextNotes.sidebarView`
- [ ] Set view name: "Code Notes"
- [ ] Add view icon (note/comment icon)
- [ ] Configure view location: "explorer" sidebar
- [ ] Add viewsWelcome contribution for empty state
- [ ] Register TreeDataProvider in extension.ts activate()
- [ ] Add sidebar provider to context.subscriptions
- [ ] Connect note change events to sidebar refresh

### Phase 4: Navigation & Commands
- [ ] Create `codeContextNotes.openNoteFromSidebar` command
- [ ] Implement file opening in editor
- [ ] Implement line range reveal and scroll
- [ ] Implement comment thread focus
- [ ] Add `codeContextNotes.refreshSidebar` command
- [ ] Add refresh button to sidebar title bar
- [ ] Add "Go to Note" context menu for NoteNode
- [ ] Add "Edit Note" context menu for NoteNode
- [ ] Add "Delete Note" context menu for NoteNode
- [ ] Add "View History" context menu for NoteNode
- [ ] Add "Open File" context menu for FileNode
- [ ] Add "Refresh" context menu for FileNode

### Phase 5: Features & Polish
- [ ] Implement collapsible file nodes (collapsed by default)
- [ ] Add note count badges to file nodes
- [ ] Add total note count to root node
- [ ] Create empty state with helpful message
- [ ] Add "Add Your First Note" action in empty state
- [ ] Add "Collapse All" command in sidebar title
- [ ] Implement lazy loading for file nodes
- [ ] Add debouncing for refresh calls (300ms)
- [ ] Add configuration option: `sidebar.sortBy` (file, date, author)
- [ ] Add configuration option: `sidebar.previewLength` (default 50)
- [ ] Add configuration option: `sidebar.autoExpand` (default false)

### Phase 6: Testing
- [ ] Write unit tests for NotesSidebarProvider
- [ ] Test getChildren() with 0, 1, many notes
- [ ] Test getTreeItem() for all node types
- [ ] Test label formatting and truncation
- [ ] Test preview text markdown stripping
- [ ] Test note grouping by file
- [ ] Write integration tests for sidebar registration
- [ ] Test navigation to notes from sidebar
- [ ] Test context menu actions
- [ ] Test refresh after note changes
- [ ] Test multi-note display (multiple notes per line)
- [ ] Test with large number of notes (100+)
- [ ] Test with many files (50+)
- [ ] Manual testing: create/edit/delete notes
- [ ] Manual testing: verify sidebar updates in real-time
- [ ] Manual testing: test all context menu actions

### Phase 7: Documentation
- [ ] Update README.md with sidebar feature
- [ ] Add screenshots of sidebar tree view
- [ ] Document navigation from sidebar
- [ ] Document context menu actions
- [ ] Add GIF demo of sidebar usage
- [ ] Update QUICK_REFERENCE.md with sidebar commands
- [ ] Update architecture documentation
- [ ] Document tree structure and node types
- [ ] Document performance considerations (lazy loading, caching)

---

## Acceptance Criteria

### Must Have (MVP)
- [ ] Sidebar displays all notes in workspace
- [ ] Notes grouped by file path in tree structure
- [ ] File nodes show relative path and note count
- [ ] Note nodes show line number, preview (50 chars), and author
- [ ] Click on note node navigates to note location in editor
- [ ] Focus comment thread when navigating to note
- [ ] Real-time updates when notes are created/edited/deleted
- [ ] Refresh button in sidebar title bar
- [ ] Empty state with "Add Note" action when no notes exist
- [ ] Collapsible/expandable file nodes
- [ ] Context menu with "Go to Note", "Edit", "Delete", "View History"
- [ ] Markdown stripped from previews (no **, __, etc.)
- [ ] Total note count displayed in root/title

### Nice to Have (Future Enhancements)
- [ ] Search/filter functionality
- [ ] Sort options (by file, date, author)
- [ ] Multi-select for bulk actions
- [ ] Drag and drop to move notes
- [ ] Export all notes to markdown
- [ ] Filter by author
- [ ] Filter by date range
- [ ] Note categories/tags

### Performance
- [ ] Sidebar loads in < 1 second with 100 notes
- [ ] Sidebar loads in < 3 seconds with 1000 notes
- [ ] Refresh completes in < 500ms
- [ ] Lazy loading prevents initial load of all note content
- [ ] Cache reduces file I/O operations
- [ ] No memory leaks from event listeners

### Compatibility
- [ ] Works with existing single notes
- [ ] Works with new multi-note feature (multiple notes per line)
- [ ] No breaking changes to storage format
- [ ] No data migration required
- [ ] Backward compatible with existing notes

---

## UI/UX Design

### Tree Structure
```
📁 Code Notes (15)
  📄 src/extension.ts (3)
    📝 Line 45: Initialize note manager and... (john_doe)
    📝 Line 120: Handle command registration for... (jane_smith)
    📝 Line 250: Error handling for edge cases... (john_doe)
  📄 src/noteManager.ts (2)
    📝 Line 30: Core business logic for CRUD... (john_doe)
    📝 Line 150: Cache invalidation strategy when... (john_doe)
```

### Node Types

**Root Node:**
- Label: "Code Notes ({total_count})"
- Icon: Folder icon
- Collapsible: Always expanded
- Children: File nodes

**File Node:**
- Label: "{relative_path} ({note_count})"
- Example: "src/extension.ts (3)"
- Icon: File icon (language-specific)
- Tooltip: Full absolute path
- Collapsible: Collapsed by default
- Children: Note nodes

**Note Node:**
- Label: "Line {line}: {preview}"
- Example: "Line 45: Initialize note manager and..."
- Description: Author name (right-aligned)
- Icon: Note/comment icon
- Tooltip: Full note content
- Command: Navigate to note on click
- Not collapsible (leaf node)

### Context Menus

**File Node:**
- Open File
- Refresh Notes

**Note Node:**
- Go to Note (default action)
- Edit Note
- Delete Note
- View History

---

## Technical Implementation

### File Structure
```
src/
├── notesSidebarProvider.ts    (New - TreeDataProvider)
├── noteTreeItem.ts            (New - Tree item classes)
├── noteManager.ts             (Update - Add workspace queries)
├── extension.ts               (Update - Register sidebar)
└── types.ts                   (Update - Add tree item types)
```

### Data Flow
```
Note Created/Updated/Deleted
    ↓
NoteManager emits 'noteChanged' event
    ↓
NotesSidebarProvider listens for event
    ↓
Calls refresh() → fires onDidChangeTreeData
    ↓
VSCode requests getChildren() for visible nodes
    ↓
Provider queries NoteManager for notes
    ↓
Returns FileNodes and NoteNodes
    ↓
VSCode renders updated tree
```

### Configuration Options
```json
{
  "codeContextNotes.sidebar.sortBy": {
    "type": "string",
    "enum": ["file", "date", "author"],
    "default": "file"
  },
  "codeContextNotes.sidebar.previewLength": {
    "type": "number",
    "default": 50
  },
  "codeContextNotes.sidebar.autoExpand": {
    "type": "boolean",
    "default": false
  }
}
```

---

## Success Metrics

**User Experience:**
- Users can see all workspace notes at a glance
- Navigation to any note takes ≤ 2 clicks
- Sidebar updates feel instant (< 500ms refresh)
- Empty state guides new users to add first note
- Context menus provide quick access to common actions

**Technical:**
- No performance degradation with 100+ notes
- Lazy loading prevents unnecessary file reads
- Cache hit rate > 80% for repeated queries
- No memory leaks from event listeners
- Real-time updates without manual refresh

---

## Timeline Estimate

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Backend queries in NoteManager | 2-3 hours |
| 2 | TreeDataProvider implementation | 4-5 hours |
| 3 | Sidebar registration & commands | 2-3 hours |
| 4 | Navigation & context menus | 2-3 hours |
| 5 | Polish & empty states | 2-3 hours |
| 6 | Testing (unit + integration + manual) | 4-6 hours |
| 7 | Documentation | 1-2 hours |

**Total Estimate:** 17-25 hours (2-3 days of focused work)

---

## Dependencies & Risks

### Dependencies
- VSCode TreeView API (stable, well-documented)
- Existing NoteManager (no changes to storage)
- File watcher API (built-in, reliable)
- Event emitter for note changes

### Risks & Mitigation

**Risk: Performance with many notes**
- Mitigation: Lazy loading, caching, debouncing

**Risk: UI clutter**
- Mitigation: Collapsed by default, configurable preview length

**Risk: Real-time sync complexity**
- Mitigation: Simple event-based refresh, proven pattern

**Risk: Maintenance burden**
- Mitigation: Reuses existing infrastructure, minimal new code

---

## Related

**GitHub Issue:** #9 - [FEATURE] Sidebar view for browsing all notes
**Target Version:** v0.2.0
**Type:** Minor version (new feature, backward compatible)
**Priority:** High (frequently requested feature)

---

## Notes

- This feature is purely additive - no breaking changes
- Works with existing note storage format
- Compatible with recent multi-note feature (Issue #6)
- Provides foundation for future features (search, filter, export)
- Addresses user need for workspace-wide note overview
- Complements existing inline CodeLens and comment thread UI
