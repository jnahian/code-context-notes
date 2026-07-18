---
name: VS Code Extension Development
description: Handle VS Code extension packaging, publishing, and marketplace management. Use when packaging VSIX, publishing to marketplaces, validating package.json, creating releases, or bumping versions.
allowed-tools: Read, Grep, Glob, Bash
---

# VS Code Extension Development

Specialized skill for VS Code extension development lifecycle including local development, VSIX packaging, marketplace publishing (VS Code Marketplace and Open VSX Registry), and release management for the Code Context Notes project.

## Instructions

### When to Use This Skill

Use this skill when you need to:
- Package extension as VSIX (`npm run package`)
- Publish to VS Code Marketplace and Open VSX Registry
- Validate `package.json` extension manifest
- Test extension locally
- Create new releases with version bumps
- Manage extension dependencies
- Debug packaging or publishing issues

### Packaging Workflow

**Step 1: Package Extension**
```bash
npm run package
```

This runs the complete packaging process:
1. Build extension (`npm run compile`)
2. Run tests (`npm run test:unit`)
3. Check git status is clean
4. Create VSIX file (`vsce package`)
5. Create git tag `v{version}`
6. Push tag to remote

**Output**: `code-context-notes-{version}.vsix`

**For development** (skip git tagging):
```bash
npm run package:dev
```

**Step 2: Test Locally**
```bash
code --install-extension code-context-notes-{version}.vsix
```

### Publishing Workflow

**Prerequisites**:
- `.env` file with `VSCE_PAT` and `OVSX_PAT` tokens
- Clean git working directory
- All tests passing

**Step 1: Publish to Both Marketplaces**
```bash
npm run publish
```

This publishes to:
1. **VS Code Marketplace** - `https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes`
2. **Open VSX Registry** - `https://open-vsx.org/extension/jnahian/code-context-notes`

**Step 2: Verify Publication**
- Check extension appears in both marketplaces
- Test installation from both sources
- Verify version number is correct

**Step 3: Create GitHub Release**
- Tag release with `v{version}`
- Add changelog notes
- Attach VSIX file

### Version Management

**Bump Version**:
```bash
npm version patch   # 0.1.7 → 0.1.8
npm version minor   # 0.1.7 → 0.2.0
npm version major   # 0.1.7 → 1.0.0
```

Or manually edit `package.json`:
```json
"version": "0.1.8"
```

### Manifest Validation

**Required Fields** (check in `package.json`):
- ✅ `name`: Package identifier
- ✅ `displayName`: User-facing name
- ✅ `version`: Semantic version
- ✅ `publisher`: Marketplace publisher ID
- ✅ `engines.vscode`: Minimum VS Code version
- ✅ `main`: Entry point (`./out/extension.js`)
- ✅ `activationEvents`: When to activate
- ✅ `icon`: Extension icon (128x128 PNG)

**Contributes Section**:
- Commands registered
- Configuration properties
- Keybindings defined
- Categories and keywords for discoverability

### Project Structure

```
code-context-notes/
├── src/                    # Extension source (5,900 lines)
│   ├── extension.ts        # Main entry point
│   ├── types.ts           # Type definitions
│   └── test/suite/        # Test suites
├── out/                   # Compiled JavaScript
│   └── extension.js       # Bundled entry point
├── images/                # Extension assets
│   └── icon.png          # 128x128 icon
├── scripts/               # Publishing scripts
│   ├── package.mjs       # Packaging script
│   └── publish.mjs       # Publishing script
├── package.json          # Extension manifest
├── .vscodeignore         # Packaging configuration
└── CHANGELOG.md          # Version history
```

### Key Configuration Files

**package.json** - Extension manifest:
- Metadata (name, version, publisher)
- Commands, configuration, keybindings
- Dependencies and build scripts

**.vscodeignore** - Controls VSIX contents:
- Excludes source files (`src/`)
- Excludes tests (`out/test/`)
- Excludes development files (`.claude/`, `docs/`)
- Includes only runtime files

### Commands Reference

```bash
# Packaging
npm run package           # Full package with git tag
npm run package:simple    # Simple VSIX package
npm run package:dev       # Dev package (no git tag)

# Publishing
npm run publish           # Publish to both marketplaces
npm run publish:bash      # Alternative bash script

# Testing
npm run test:unit         # Fast unit tests
npm run test:coverage     # With coverage report
npm test                  # Full integration tests

# Development
npm run watch             # Auto-compile on changes
code --install-extension code-context-notes-{version}.vsix
```

### Environment Setup for Publishing

**Create `.env` file**:
```bash
VSCE_PAT=your_vscode_marketplace_token
OVSX_PAT=your_open_vsx_token
```

**Get Tokens**:
- VS Code Marketplace: https://marketplace.visualstudio.com/manage
- Open VSX: https://open-vsx.org/user-settings/tokens

### Best Practices

1. **Always run tests before packaging** - Ensure quality
2. **Update CHANGELOG.md** - Document all changes
3. **Follow semantic versioning** - Major.Minor.Patch
4. **Tag releases in git** - Match package version
5. **Test VSIX locally first** - Install and verify
6. **Publish to both marketplaces** - VS Code and Open VSX
7. **Create GitHub releases** - Include changelog and VSIX

## Examples

### Example 1: Package for Local Testing

**Task**: Package extension for local testing

**Actions**:
1. Run `npm run package`
2. Monitor build, test, and packaging
3. Provide installation command

**Success Output**:
```
📦 Packaging Code Context Notes Extension

✅ Build successful
✅ Tests passed (41 unit tests)
✅ Git working directory is clean
✅ Package created: code-context-notes-0.1.7.vsix
✅ Git tag v0.1.7 created and pushed

🎉 PACKAGING SUCCESSFUL!

Next steps:
1. Test locally:
   code --install-extension code-context-notes-0.1.7.vsix
2. Publish: npm run publish
```

### Example 2: Publish to Marketplaces

**Task**: Publish extension to VS Code Marketplace and Open VSX

**Actions**:
1. Check `.env` has tokens
2. Run `npm run publish`
3. Monitor publishing process
4. Report marketplace URLs

**Success Output**:
```
🚀 Publishing Code Context Notes Extension

✅ Build successful
✅ Tests passed
✅ Package created: code-context-notes-0.1.7.vsix
✅ Published to VS Code Marketplace
✅ Published to Open VSX Registry
✅ Git tag v0.1.7 created and pushed

🎉 PUBLICATION SUCCESSFUL!

📍 VS Code Marketplace:
   https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes

📍 Open VSX Registry:
   https://open-vsx.org/extension/jnahian/code-context-notes

Next steps:
1. Verify extensions in marketplaces
2. Test installation
3. Create GitHub release
```

### Example 3: Validate Extension Manifest

**Task**: Check if package.json is valid for VS Code extension

**Actions**:
1. Read `package.json`
2. Validate required fields
3. Check contributes section
4. Report issues or success

**Success Output**:
```
✅ Extension Manifest Validation

Required Fields:
✅ name: "code-context-notes"
✅ displayName: "Code Context Notes - Smart Annotations"
✅ version: "0.1.7"
✅ publisher: "jnahian"
✅ engines.vscode: "^1.80.0"
✅ main: "./out/extension.js"

Contributes:
✅ 12 commands registered
✅ Configuration section defined
✅ Keybindings defined

Metadata:
✅ icon: "images/icon.png" (exists)
✅ categories: 3 categories
✅ keywords: 10 keywords

🎉 Manifest is valid and ready for packaging!
```

### Example 4: Create New Release

**Task**: Prepare release v0.1.8

**Actions**:
1. Review commits since last release
2. Update CHANGELOG.md
3. Bump version in package.json
4. Commit changes
5. Run `npm run package`
6. Run `npm run publish`
7. Create GitHub release

**Success Output**:
```
📝 Preparing Release v0.1.8

Recent commits since v0.1.7:
- fix: Resolve scroll issue when adding notes
- feat: Add auto-collapse for other notes

✅ Updated CHANGELOG.md
✅ Version bumped: 0.1.7 → 0.1.8
✅ Committed: "chore: bump version to 0.1.8"
✅ Package created
✅ Published to marketplaces
✅ GitHub release v0.1.8 created

🎉 Release v0.1.8 complete!
```

## Troubleshooting

### Packaging Issues

**Error: "vsce not found"**
```bash
npm install -g @vscode/vsce
```

**Error: "Missing publisher name"**
Add `"publisher": "your-name"` to package.json

**Error: "Main entry point not found"**
```bash
npm run compile    # Build first
ls -la out/extension.js  # Verify exists
```

### Publishing Issues

**Error: "Authentication failed"**
- Check `.env` file exists with valid tokens
- Get new tokens from marketplace dashboards

**Error: "Version already exists"**
```bash
npm version patch  # Bump version
```

### Testing Issues

**Error: "Extension not activating"**
- Check `activationEvents` in package.json
- Add debug logs in `activate()` function

**Error: "Command not working"**
- Verify command in package.json `contributes.commands`
- Verify command registered in extension.ts
- Check command ID matches exactly

## Related Skills

- TypeScript Development Skill - Type checking before packaging
- Testing & Coverage Skill - Run tests before publish
- Git Workflow Skill - Tagging and release management

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)
- [VSCE CLI](https://github.com/microsoft/vscode-vsce)
- [Open VSX Publishing](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)
- Project: `package.json`, `.vscodeignore`
- Project: `scripts/package.mjs`, `scripts/publish.mjs`
