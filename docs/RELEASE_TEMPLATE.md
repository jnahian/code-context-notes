# Release Process Template

Use this template when creating a new release for Code Context Notes.

## Pre-Release Checklist

- [ ] All features/fixes for this version are merged to main branch
- [ ] Changelog file created/updated in `docs/changelogs/vX.Y.Z.md`
- [ ] All tests passing (`npm run test:unit`)
- [ ] TypeScript compilation successful (`npm run compile:tsc`)
- [ ] Version number updated in `package.json`
- [ ] Changelog date updated (replace "TBD" with release date)

## Release Steps

### 1. Update Version and Changelog

```bash
# Update package.json version
# Edit: "version": "X.Y.Z"

# Update changelog date in docs/changelogs/vX.Y.Z.md
# Replace: ## [X.Y.Z] - TBD
# With: ## [X.Y.Z] - YYYY-MM-DD
```

### 2. Commit Changes (if not already committed)

```bash
git add package.json docs/changelogs/vX.Y.Z.md
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

### 3. Create and Push Git Tag

```bash
# Create annotated tag
git tag -a vX.Y.Z -m "Release vX.Y.Z - Brief Title

Major highlights or key feature description.

See full changelog: docs/changelogs/vX.Y.Z.md"

# Push tag to remote
git push origin vX.Y.Z
```

### 4. Create GitHub Release

```bash
# Using gh CLI
gh release create vX.Y.Z \
  --title "vX.Y.Z - Release Title" \
  --notes "$(cat <<'EOF'
## [X.Y.Z] - YYYY-MM-DD

### Added
- **Feature name** (GitHub Issue #N)
  - Key feature details
  - Sub-features listed compactly

### Changed
- **Change description** - explanation

### Fixed
- **Bug fix description** (GitHub Issue #N)

### Testing
- Test coverage summary

### Technical
- Implementation details

---

**Full Changelog**: https://github.com/jnahian/code-context-notes/blob/main/docs/changelogs/vX.Y.Z.md
EOF
)"
```

### 5. Publish to Marketplaces (Optional)

```bash
# Build VSIX package
npm run package

# Publish to VS Code Marketplace
npm run publish

# Or manually using vsce
vsce publish

# Publish to Open VSX
npx ovsx publish code-context-notes-X.Y.Z.vsix -p YOUR_TOKEN
```

## Release Notes Template

Use this template for GitHub release notes:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- **Feature name** (GitHub Issue #N if applicable)
  - Concise summary of key features in 1-2 lines
  - Group related sub-features using commas
  - Focus on user-facing value

### Changed
- **Change description** - brief explanation
- Combine related changes into single bullets

### Fixed
- **Brief description** (GitHub Issue #N) - what was fixed

### Testing
- Test summary with numbers (e.g., "X tests covering Y features")

### Technical
- Implementation summary listing key components/commands/configs
- Keep to essential technical changes only

---

**Full Changelog**: https://github.com/jnahian/code-context-notes/blob/main/docs/changelogs/vX.Y.Z.md
```

## Post-Release Checklist

- [ ] GitHub release created and published
- [ ] Release appears at: https://github.com/jnahian/code-context-notes/releases/tag/vX.Y.Z
- [ ] Tag pushed to remote
- [ ] VSIX package published to VS Code Marketplace (if applicable)
- [ ] Release announcement posted (if applicable)
- [ ] Documentation updated (if needed)

## Version Numbering Guide (Semantic Versioning)

- **Major (X.0.0)**: Breaking changes, major rewrites
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, small improvements, backwards compatible

## Common Issues and Solutions

### Tag Already Exists

```bash
# Delete local tag
git tag -d vX.Y.Z

# Delete remote tag
git push origin :refs/tags/vX.Y.Z

# Recreate and push
git tag -a vX.Y.Z -m "Release message"
git push origin vX.Y.Z
```

### Release Already Exists on GitHub

```bash
# Delete the release using gh CLI
gh release delete vX.Y.Z --yes

# Or delete manually on GitHub web interface
# Then recreate using the command above
```

## Example Release Commands

Here's a complete example for version 0.2.0:

```bash
# 1. Update files (already done in editor)
# - package.json: "version": "0.2.0"
# - docs/changelogs/v0.2.0.md: date updated

# 2. Commit (if needed)
git add package.json docs/changelogs/v0.2.0.md
git commit -m "chore: bump version to 0.2.0"
git push origin main

# 3. Create and push tag
git tag -a v0.2.0 -m "Release v0.2.0 - Sidebar View for Browsing All Notes

Major new feature: Dedicated sidebar for browsing and managing all notes.

See full changelog: docs/changelogs/v0.2.0.md"

git push origin v0.2.0

# 4. Create GitHub release with full changelog
gh release create v0.2.0 \
  --title "v0.2.0 - Sidebar View for Browsing All Notes" \
  --notes-file docs/changelogs/v0.2.0.md
```

## Tips

1. **Always test before releasing**: Run all tests and verify compilation
2. **Use consistent naming**: Tags should be `vX.Y.Z`, releases titled "vX.Y.Z - Title"
3. **Keep changelogs compact**: Follow the compact format in CHANGELOG_TEMPLATE.md
4. **Link to issues**: Reference GitHub issues for features and fixes
5. **Announce breaking changes**: Clearly mark and explain in changelog
6. **Update date last**: Change "TBD" to actual date right before creating tag
