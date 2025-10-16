# Release Checklist

Use this checklist before releasing a new version of the extension.

## Pre-Release Testing

### Functionality Testing

- [ ] **Add Note**
  - [ ] Via keyboard shortcut (Ctrl/Cmd+Alt+N)
  - [ ] Via Command Palette
  - [ ] Via CodeLens "Add Note" action
  - [ ] With single line selection
  - [ ] With multi-line selection
  - [ ] With markdown formatting

- [ ] **Edit Note**
  - [ ] Click Edit button
  - [ ] Modify content
  - [ ] Save changes
  - [ ] Cancel changes
  - [ ] Verify history entry created

- [ ] **Delete Note**
  - [ ] Click Delete button
  - [ ] Confirm deletion
  - [ ] Verify note removed from UI
  - [ ] Verify history entry created

- [ ] **View History**
  - [ ] Click History button
  - [ ] Verify all history entries shown
  - [ ] Verify timestamps correct
  - [ ] Verify authors correct
  - [ ] Verify content preserved

- [ ] **CodeLens**
  - [ ] Indicators appear above notes
  - [ ] Preview text shows correctly
  - [ ] Click opens comment thread
  - [ ] Updates when notes change
  - [ ] "Add Note" appears for selections

- [ ] **Markdown Formatting**
  - [ ] Bold (Ctrl/Cmd+B)
  - [ ] Italic (Ctrl/Cmd+I)
  - [ ] Inline code (Ctrl/Cmd+Shift+C)
  - [ ] Code block (Ctrl/Cmd+Shift+K)
  - [ ] Link (Ctrl/Cmd+K)
  - [ ] Lists work correctly
  - [ ] Headings work correctly

- [ ] **Content Tracking**
  - [ ] Notes follow code when lines inserted above
  - [ ] Notes follow code when lines deleted above
  - [ ] Notes update when code moves
  - [ ] Notes handle significant code changes

- [ ] **Storage**
  - [ ] Notes saved to `.code-notes/` directory
  - [ ] Files named by note ID
  - [ ] Markdown files human-readable
  - [ ] History preserved in files
  - [ ] Files load correctly on restart

- [ ] **Configuration**
  - [ ] Storage directory setting works
  - [ ] Author name override works
  - [ ] CodeLens toggle works
  - [ ] Changes apply without restart

### Cross-Platform Testing

- [ ] **Windows**
  - [ ] All features work
  - [ ] Keyboard shortcuts work
  - [ ] File paths correct

- [ ] **macOS**
  - [ ] All features work
  - [ ] Keyboard shortcuts work
  - [ ] File paths correct

- [ ] **Linux**
  - [ ] All features work
  - [ ] Keyboard shortcuts work
  - [ ] File paths correct

### Edge Cases

- [ ] **Large Files**
  - [ ] Test with 1,000+ line file
  - [ ] Test with 10,000+ line file
  - [ ] Performance acceptable

- [ ] **Many Notes**
  - [ ] Test with 50+ notes in one file
  - [ ] Test with 100+ notes in workspace
  - [ ] Performance acceptable

- [ ] **Special Characters**
  - [ ] Unicode in notes
  - [ ] Emoji in notes
  - [ ] Special markdown characters
  - [ ] Code with special characters

- [ ] **File Operations**
  - [ ] Rename file with notes
  - [ ] Move file with notes
  - [ ] Delete file with notes
  - [ ] Close and reopen file

- [ ] **Workspace Operations**
  - [ ] Close and reopen workspace
  - [ ] Switch workspaces
  - [ ] Multiple workspace folders

- [ ] **Error Handling**
  - [ ] No workspace open
  - [ ] No file open
  - [ ] No selection
  - [ ] Read-only file
  - [ ] Permission errors

### Automated Testing

- [ ] **Unit Tests**
  ```bash
  npm run test:unit
  ```
  - [ ] All tests pass
  - [ ] No warnings or errors

- [ ] **Coverage**
  ```bash
  npm run test:coverage
  ```
  - [ ] Coverage ≥ 80%
  - [ ] No critical gaps

- [ ] **Compilation**
  ```bash
  npm run compile
  ```
  - [ ] No TypeScript errors
  - [ ] No warnings

- [ ] **Linting**
  ```bash
  npm run lint
  ```
  - [ ] No linting errors
  - [ ] Code style consistent

## Documentation Review

- [ ] **README.md**
  - [ ] All features documented
  - [ ] Examples up to date
  - [ ] Screenshots current
  - [ ] Links work
  - [ ] Version number correct

- [ ] **CHANGELOG.md**
  - [ ] New version entry added
  - [ ] All changes listed
  - [ ] Date correct
  - [ ] Links work

- [ ] **package.json**
  - [ ] Version number bumped
  - [ ] Description accurate
  - [ ] Keywords relevant
  - [ ] Repository URL correct
  - [ ] License correct

- [ ] **Other Docs**
  - [ ] CONTRIBUTING.md up to date
  - [ ] ARCHITECTURE.md accurate
  - [ ] TESTING.md current
  - [ ] All links work

## Visual Assets

- [ ] **Extension Icon**
  - [ ] 128x128 PNG exists
  - [ ] Looks good at small sizes
  - [ ] Works on light/dark backgrounds
  - [ ] Path correct in package.json

- [ ] **Screenshots**
  - [ ] All features shown
  - [ ] High quality
  - [ ] Consistent theme
  - [ ] Referenced in README

- [ ] **Demo GIF**
  - [ ] Shows key workflow
  - [ ] Smooth and clear
  - [ ] File size < 5MB
  - [ ] Referenced in README

## Package Testing

- [ ] **Build Package**
  ```bash
  vsce package
  ```
  - [ ] Package created successfully
  - [ ] No errors or warnings
  - [ ] File size reasonable

- [ ] **Install Locally**
  ```bash
  code --install-extension code-context-notes-*.vsix
  ```
  - [ ] Installs without errors
  - [ ] Appears in Extensions list
  - [ ] Icon displays correctly

- [ ] **Test Installed Extension**
  - [ ] All features work
  - [ ] No console errors
  - [ ] Performance good

- [ ] **Uninstall**
  ```bash
  code --uninstall-extension publisher.code-context-notes
  ```
  - [ ] Uninstalls cleanly
  - [ ] No leftover files

## Git & GitHub

- [ ] **Commit All Changes**
  ```bash
  git status
  git add .
  git commit -m "Release v0.1.0"
  ```

- [ ] **Tag Release**
  ```bash
  git tag v0.1.0
  git push origin main
  git push origin v0.1.0
  ```

- [ ] **GitHub Release**
  - [ ] Create release from tag
  - [ ] Title: "v0.1.0 - Release Name"
  - [ ] Description from CHANGELOG
  - [ ] Attach .vsix file
  - [ ] Mark as pre-release if needed

## Marketplace Publication

- [ ] **Publisher Setup**
  - [ ] Publisher account created
  - [ ] Personal Access Token generated
  - [ ] Logged in with vsce

- [ ] **Publish**
  ```bash
  vsce publish
  ```
  - [ ] Published successfully
  - [ ] No errors

- [ ] **Verify Marketplace**
  - [ ] Extension visible
  - [ ] Description correct
  - [ ] Icon displays
  - [ ] Screenshots show
  - [ ] Version correct
  - [ ] Install button works

- [ ] **Test Installation**
  ```bash
  code --install-extension publisher.code-context-notes
  ```
  - [ ] Installs from marketplace
  - [ ] All features work

## Post-Release

- [ ] **Announcement**
  - [ ] Tweet/post on social media
  - [ ] Post on Reddit r/vscode
  - [ ] Post on Dev.to
  - [ ] Notify team/users

- [ ] **Monitoring**
  - [ ] Watch GitHub issues
  - [ ] Monitor marketplace reviews
  - [ ] Check installation metrics
  - [ ] Respond to feedback

- [ ] **Next Version**
  - [ ] Create milestone for next version
  - [ ] Plan features/fixes
  - [ ] Update TODO.md

## Rollback Plan

If critical issues found after release:

1. **Unpublish** (if within 1 hour)
   ```bash
   vsce unpublish publisher.code-context-notes
   ```

2. **Or publish hotfix**
   - Fix critical issue
   - Bump patch version
   - Test thoroughly
   - Publish immediately

3. **Communicate**
   - Post issue on GitHub
   - Update marketplace description
   - Notify users

## Version Numbering

Follow semantic versioning:

- **Patch** (0.1.0 → 0.1.1): Bug fixes only
- **Minor** (0.1.0 → 0.2.0): New features, backward compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes

## Notes

- Test on a clean VSCode installation if possible
- Use a test workspace, not production code
- Keep a backup of the previous version
- Document any known issues in CHANGELOG
- Be ready to respond to issues quickly after release

## Checklist Summary

Quick overview:

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Visual assets ready
- [ ] Package tested locally
- [ ] Git tagged and pushed
- [ ] Published to marketplace
- [ ] Verified in marketplace
- [ ] Announced
- [ ] Monitoring for issues

---

**Release Date**: _______________

**Released By**: _______________

**Version**: _______________

**Notes**: _______________
