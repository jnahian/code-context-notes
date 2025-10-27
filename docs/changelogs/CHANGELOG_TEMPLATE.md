# Changelog Template

Use this template when creating changelog entries for new versions. **Always use the COMPACT format below.**

## [X.Y.Z] - YYYY-MM-DD

### Added
- **Feature name** (GitHub Issue #N if applicable)
  - Concise summary combining key features in 1-2 lines per major feature
  - Group related sub-features using commas or "and" for brevity
  - Focus on user-facing value, not implementation details

### Changed
- **Change description** - brief explanation of what changed and why
- Combine related changes into single bullet points where logical

### Fixed
- **Brief description** (GitHub Issue #N) - what was broken and the fix

### Testing
- Test summary with key numbers (e.g., "X tests covering Y features")
- Combine test details into concise bullets

### Technical
- Implementation summary listing key components/commands/configs
- Use commas to list multiple items compactly
- Keep to essential technical changes only

---

[X.Y.Z]: https://github.com/jnahian/code-context-notes/releases/tag/vX.Y.Z

---

## Guidelines

### Compact Format Principles
- **Combine details**: Merge related items into single bullets with sub-points
- **Remove verbosity**: Cut sections like "Benefits", "Migration Notes", "Known Limitations" unless critical
- **Dense prose**: Use commas, parentheses, and conjunctions to pack information
- **One feature, one section**: Group all aspects of a feature under single bullet with sub-bullets
- **Essential only**: Focus on what users need to know, omit obvious details

### Writing Style
- Use present tense ("Add feature" not "Added feature")
- Be concise but descriptive
- Focus on user impact, not implementation details
- Include issue/PR references when relevant

### Categories
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes
- **Testing**: Test coverage (optional, can merge into Technical)
- **Technical**: Internal/developer-focused changes
- **Deprecated**: Soon-to-be removed features (if needed)
- **Removed**: Removed features (if needed)
- **Security**: Security-related changes (if needed)

### Examples

#### Good (Compact)
```markdown
### Added
- **Sidebar View for Browsing All Notes** (GitHub Issue #9)
  - Dedicated Activity Bar icon with tree view showing all notes across workspace
  - Notes organized by file with collapsible nodes showing path, note count, and previews
  - **"+" button** for quick creation, **Collapse All** and Refresh buttons in toolbar
  - **Context menus**: Note items (Go to, Edit, Delete, History), File items (Open)
  - **Configurable sorting** by file/date/author with preview length (20-200 chars)
```

#### Bad (Too Verbose)
```markdown
### Added
- **Sidebar View for Browsing All Notes** (GitHub Issue #9)
  - Dedicated Activity Bar icon for Code Notes (standalone sidebar, not in Explorer)
  - Tree view showing all notes across workspace
  - Notes organized by file with collapsible file nodes
  - File nodes display relative path and note count (e.g., "src/extension.ts (3)")
  - Note nodes show line number, preview text (50 chars), and author name
  - Click on note to navigate directly to location in editor
  - Real-time updates when notes are created, edited, or deleted
  [continues with many more bullets...]
```

### Version Numbering (Semantic Versioning)
- **Major (X.0.0)**: Breaking changes
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, backwards compatible

### Links Section
Add at the bottom of each version file:
```markdown
[X.Y.Z]: https://github.com/jnahian/code-context-notes/releases/tag/vX.Y.Z
```
