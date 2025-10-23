# Changelog Template

Use this template when creating changelog entries for new versions.

## [X.Y.Z] - YYYY-MM-DD

### Added
- New features that have been added
- Use bullet points for each item
- Be specific and user-focused

### Changed
- Changes to existing functionality
- UI/UX improvements
- Performance enhancements
- Refactoring that affects users

### Fixed
- Bug fixes with issue references when applicable
- Format: `**Brief description** (GitHub Issue #N)`
- Include what was broken and how it was fixed

### Deprecated
- Features that are being phased out
- Include migration guidance

### Removed
- Features that have been removed
- Explain why and provide alternatives

### Security
- Security fixes and improvements
- Be specific but don't expose vulnerabilities

### Technical
- Internal changes that don't affect users directly
- Architecture updates
- Dependency updates
- Build system changes

---

## Guidelines

### Writing Style
- Use present tense ("Add feature" not "Added feature")
- Be concise but descriptive
- Focus on user impact, not implementation details
- Include issue/PR references when relevant

### Categories
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Security**: Security-related changes
- **Technical**: Internal/developer-focused changes

### Examples

#### Good
```markdown
### Fixed
- **Multiple note creation and navigation** (GitHub Issue #6)
  - Fixed thread lookup methods that were using note IDs instead of thread keys
  - Users can now easily add multiple notes to the same line via CodeLens
```

#### Bad
```markdown
### Fixed
- Fixed some bugs
- Updated code
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
