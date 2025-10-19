# cmd+enter Keybinding Removal

## Summary
The `cmd+enter` (or `ctrl+enter` on Windows/Linux) keybinding has been **removed** from the extension due to inconsistent behavior between adding new notes and editing existing notes.

## Why It Was Removed

### VS Code API Limitations

VS Code's Comments API has fundamental limitations that prevent reliable keybinding support for comment operations:

1. **Different Contexts for Add vs Edit**:
   - Adding new notes: User types in a reply input box (no `commentEditorFocused` context)
   - Editing existing notes: User edits in comment editor (`commentEditorFocused` context is active)
   - No single keybinding can reliably handle both scenarios

2. **No Access to Input Text**:
   - When creating a new note, the text being typed in the reply box is not accessible via VS Code API until submission
   - Keybindings cannot capture or pass the reply text to commands
   - Only UI button clicks trigger the proper submission with text

3. **Inconsistent Behavior**:
   - `workbench.action.submitComment` works for editing existing comments
   - But doesn't work reliably for new comment creation
   - Creates confusing UX where cmd+enter sometimes works, sometimes doesn't

## What We Tried

### Attempt 1: Manual Comment Tracking
- **Approach**: Track currently editing comment and retrieve it on keybinding
- **Problem**: Comment object doesn't update as user types; only has old content
- **Result**: Saved old content instead of edited content ❌

### Attempt 2: Use workbench.action.submitComment
- **Approach**: Use VS Code's built-in submit command for keybinding
- **Problem**: Works for editing but not for creating new notes
- **Result**: Inconsistent behavior between add and edit ❌

### Attempt 3: Different Keybindings for Add/Edit
- **Approach**: Use different commands/contexts for new vs edit
- **Problem**: No reliable context key for new note reply input; no API to get typed text
- **Result**: Cannot implement for new notes at all ❌

## Decision

Given these limitations, we decided to **remove the cmd+enter keybinding entirely** to:

1. **Avoid Confusion**: Better to have no keybinding than one that works inconsistently
2. **Consistent UX**: Users click the Save button for both adding and editing notes
3. **Reliable Behavior**: UI buttons always work correctly in all scenarios
4. **Standard Practice**: Aligns with how most VS Code comment extensions work

## User Workflow

To save notes, users should:

### Adding a New Note
1. Select code and use `cmd+alt+n` (or click "Add Note")
2. Type note content in the reply box
3. **Click the Save button** (checkmark icon)

### Editing an Existing Note
1. Click the Edit button on the note
2. Modify the content
3. **Click the Save button** (checkmark icon)

### Other Helpful Keybindings

These keybindings **are** supported and work reliably:
- `cmd+alt+n` - Add note to selection
- `cmd+alt+d` - Delete note at cursor
- `cmd+alt+h` - View note history
- `cmd+alt+r` - Refresh all notes
- `cmd+b` - Bold text (when in comment editor)
- `cmd+i` - Italic text (when in comment editor)
- `cmd+shift+c` - Inline code (when in comment editor)
- `cmd+shift+k` - Code block (when in comment editor)
- `cmd+k` - Insert link (when in comment editor)

## Technical Details

The tracking infrastructure (currentlyEditingNoteId, etc.) remains in the codebase for:
- Error handling and validation
- Potential future use if VS Code API improves
- Thread lifecycle management

But the keybinding has been removed from `package.json`.

## Future Possibilities

If VS Code's Comments API is enhanced to provide:
- Access to reply input text before submission
- Unified context keys for both reply and edit scenarios
- Programmatic comment submission with custom text

Then we could reconsider adding cmd+enter support. For now, the UI buttons provide the most reliable user experience.

## Files Modified
- `package.json`: Removed cmd+enter keybinding (previously at lines 196-200)
- `docs/TODO.md`: Updated to reflect removal
- `docs/KEYBINDING_REMOVAL.md`: This documentation

## Related Issues
- VS Code Comments API: https://code.visualstudio.com/api/extension-guides/comment
- Submit comment discussion: https://github.com/microsoft/vscode/issues/151739
