# Marketplace Preparation Guide

This guide walks through preparing the extension for publication to the VSCode Marketplace.

## Prerequisites

1. **Microsoft Account**: Create a Microsoft account if you don't have one
2. **Azure DevOps Organization**: Create an organization at https://dev.azure.com
3. **Publisher Account**: Create a publisher at https://marketplace.visualstudio.com/manage
4. **Personal Access Token**: Generate a PAT with Marketplace (Manage) scope

## Pre-Publication Checklist

### 1. Extension Icon

Create a 128x128 PNG icon:

- [ ] Design icon representing code notes/annotations
- [ ] Save as `images/icon.png`
- [ ] Ensure it looks good on light and dark backgrounds
- [ ] Test in VSCode by installing locally

**Icon Design Tips**:
- Simple, recognizable design
- Clear at small sizes
- Avoid text (hard to read at small sizes)
- Use colors that stand out

### 2. Screenshots

Create screenshots showing key features:

- [x] Adding a note (comment UI)
- [x] CodeLens indicator
- [x] Editing a note
- [x] Viewing history
- [x] Markdown formatting
- [x] Note file in `.code-notes/` directory

**Screenshot Guidelines**:
- Use high-resolution displays
- Show realistic code examples
- Highlight the extension's UI elements
- Use consistent theme (recommend Dark+)
- Annotate if needed to explain features

Save screenshots in `images/` directory:
```
images/
├── icon.png (✓ Added)
├── screenshot-add-note.jpg (✓ Added)
├── screenshot-codelens.jpg (✓ Added)
├── screenshot-edit.jpg (✓ Added)
├── screenshot-history.jpg (✓ Added)
├── screenshot-markdown.jpg (✓ Added)
└── screenshot-storage.jpg (✓ Added)
```

### 3. Demo GIF

Create an animated GIF showing the workflow:

- [ ] Record adding a note to code
- [ ] Show CodeLens appearing
- [ ] Show editing the note
- [ ] Keep it under 10 seconds
- [ ] Optimize file size (< 5MB)

**Tools for Recording**:
- **Windows**: ScreenToGif
- **Mac**: Kap, Gifox
- **Linux**: Peek, SimpleScreenRecorder + ffmpeg

**GIF Tips**:
- Focus on one clear workflow
- Use smooth, deliberate movements
- Pause briefly at key moments
- Optimize with tools like gifsicle

Save as `images/demo.gif`

### 4. Update README

Add visual content to README:

```markdown
## Demo

![Demo](images/demo.gif)

## Screenshots

### Adding Notes
![Add Note](images/screenshot-add-note.png)

### CodeLens Integration
![CodeLens](images/screenshot-codelens.png)

### Editing Notes
![Edit Note](images/screenshot-edit.png)
```

### 5. Update package.json

Update publisher and repository information:

```json
{
  "publisher": "your-actual-publisher-id",
  "repository": {
    "type": "git",
    "url": "https://github.com/jnahian/code-context-notes"
  },
  "bugs": {
    "url": "https://github.com/jnahian/code-context-notes/issues"
  },
  "homepage": "https://github.com/jnahian/code-context-notes#readme"
}
```

### 6. Version Number

Ensure version follows semantic versioning:

```json
{
  "version": "0.1.0"  // First release
}
```

For future releases:
- Patch: `0.1.1` - Bug fixes
- Minor: `0.2.0` - New features (backward compatible)
- Major: `1.0.0` - Breaking changes

## Building the Extension

### 1. Install vsce

```bash
npm install -g @vscode/vsce
```

### 2. Package the Extension

```bash
# Clean build
npm run compile

# Package
vsce package
```

This creates `code-context-notes-0.1.0.vsix`

### 3. Test the Package Locally

```bash
# Install in VSCode
code --install-extension code-context-notes-0.1.0.vsix

# Test all features
# - Add notes
# - Edit notes
# - Delete notes
# - View history
# - Check CodeLens
# - Test keyboard shortcuts
# - Test configuration

# Uninstall after testing
code --uninstall-extension your-publisher-name.code-context-notes
```

## Publishing to Marketplace

### 1. Create Publisher

1. Go to https://marketplace.visualstudio.com/manage
2. Click "Create publisher"
3. Fill in details:
   - **ID**: Unique identifier (lowercase, no spaces)
   - **Name**: Display name
   - **Email**: Contact email

### 2. Generate Personal Access Token

1. Go to https://dev.azure.com
2. Click User Settings → Personal Access Tokens
3. Click "New Token"
4. Configure:
   - **Name**: "VSCode Marketplace"
   - **Organization**: All accessible organizations
   - **Expiration**: 90 days (or custom)
   - **Scopes**: Marketplace (Manage)
5. Copy the token (you won't see it again!)

### 3. Login with vsce

```bash
vsce login your-publisher-id
# Enter your Personal Access Token when prompted
```

### 4. Publish

```bash
# Publish to marketplace
vsce publish

# Or publish with specific version bump
vsce publish patch  # 0.1.0 → 0.1.1
vsce publish minor  # 0.1.0 → 0.2.0
vsce publish major  # 0.1.0 → 1.0.0
```

### 5. Verify Publication

1. Go to https://marketplace.visualstudio.com/items?itemName=your-publisher-id.code-context-notes
2. Check all information displays correctly
3. Test installation from marketplace:
   ```bash
   code --install-extension your-publisher-id.code-context-notes
   ```

## Post-Publication

### 1. Update Repository

Tag the release in git:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Create GitHub release:
1. Go to GitHub repository
2. Click "Releases" → "Create a new release"
3. Select tag `v0.1.0`
4. Title: "v0.1.0 - Initial Release"
5. Description: Copy from CHANGELOG.md
6. Attach `.vsix` file
7. Publish release

### 2. Announce

Share the extension:
- Twitter/X
- Reddit (r/vscode)
- Dev.to
- Your blog
- Team/company channels

### 3. Monitor

Watch for:
- Installation metrics in marketplace dashboard
- GitHub issues
- User feedback
- Reviews and ratings

## Updating the Extension

### For Bug Fixes (Patch)

```bash
# Fix the bug
# Update tests
# Update CHANGELOG.md

# Bump version and publish
vsce publish patch
```

### For New Features (Minor)

```bash
# Implement feature
# Add tests
# Update documentation
# Update CHANGELOG.md

# Bump version and publish
vsce publish minor
```

### For Breaking Changes (Major)

```bash
# Implement changes
# Update all documentation
# Add migration guide
# Update CHANGELOG.md

# Bump version and publish
vsce publish major
```

## Marketplace Best Practices

### Description

- Start with a clear one-sentence summary
- List key features with bullet points
- Include screenshots and GIFs
- Add usage examples
- Link to documentation

### Keywords

Choose relevant keywords for discoverability:
- notes
- annotations
- comments
- context
- documentation
- markdown
- codelens
- history
- tracking

### Categories

Select appropriate categories:
- Other (primary)
- Notebooks
- Programming Languages

### Pricing

- Free for initial release
- Consider premium features later if needed

### Support

- Respond to issues promptly
- Update regularly
- Listen to user feedback
- Fix critical bugs quickly

## Troubleshooting

### "Publisher not found"

- Verify publisher ID is correct
- Ensure you're logged in: `vsce login`
- Check token has Marketplace (Manage) scope

### "Package failed"

- Run `npm run compile` first
- Check for TypeScript errors
- Verify all files in `package.json` exist

### "Icon not found"

- Ensure `images/icon.png` exists
- Check path in `package.json` is correct
- Verify icon is 128x128 PNG

### "README too long"

- Marketplace has size limits
- Move detailed docs to separate files
- Link to GitHub for full documentation

## Resources

- **Publishing Extensions**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Extension Manifest**: https://code.visualstudio.com/api/references/extension-manifest
- **Marketplace**: https://marketplace.visualstudio.com/manage
- **vsce Documentation**: https://github.com/microsoft/vscode-vsce

## Checklist Summary

Before publishing:

- [x] Extension icon created (128x128 PNG)
- [x] Screenshots taken and added to README
- [ ] Demo GIF created and added to README
- [ ] package.json updated with publisher info
- [ ] All tests passing
- [ ] Documentation complete
- [ ] CHANGELOG.md updated
- [ ] Version number correct
- [ ] Extension packaged and tested locally
- [ ] Publisher account created
- [ ] Personal Access Token generated
- [ ] Ready to publish!

After publishing:

- [ ] Verified extension in marketplace
- [ ] Created git tag and GitHub release
- [ ] Announced on social media
- [ ] Monitoring for feedback
