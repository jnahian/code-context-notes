/**
 * Tag Input UI for Code Context Notes
 * Handles tag selection with autocomplete and predefined categories
 */

import * as vscode from 'vscode';
import { TagManager } from './tagManager.js';
import { CATEGORY_STYLES, NoteCategory } from './tagTypes.js';
import { Note } from './types.js';

export class TagInputUI {
  /**
   * Show tag selection UI with predefined categories and custom tag support
   * @param existingTags Optional array of existing tags for editing
   * @param allNotes Optional array of all notes for autocomplete suggestions
   * @returns Array of selected tags, or undefined if cancelled
   */
  static async showTagInput(
    existingTags?: string[],
    allNotes?: Note[]
  ): Promise<string[] | undefined> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = 'Select Tags for Note';
    quickPick.placeholder = 'Type to add custom tags or select predefined categories';
    quickPick.canSelectMany = true;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    // Get predefined categories
    const predefinedCategories = TagManager.getPredefinedCategories();

    // Get suggested tags from existing notes
    const suggestedTags = allNotes ? TagManager.getSuggestedTags(allNotes, 10) : [];

    // Create items for predefined categories
    const categoryItems: vscode.QuickPickItem[] = predefinedCategories.map(
      (category) => {
        const style = CATEGORY_STYLES[category as NoteCategory];
        return {
          label: `$(tag) ${category}`,
          description: style.description,
          detail: style.icon ? `Icon: $(${style.icon})` : undefined,
          alwaysShow: true,
        };
      }
    );

    // Create items for suggested tags (excluding predefined categories)
    const suggestedItems: vscode.QuickPickItem[] = suggestedTags
      .filter((tag) => !TagManager.isPredefinedCategory(tag))
      .map((tag) => ({
        label: `$(tag) ${tag}`,
        description: 'Custom tag (used before)',
        alwaysShow: false,
      }));

    // Combine all items
    const items: vscode.QuickPickItem[] = [
      {
        label: 'Predefined Categories',
        kind: vscode.QuickPickItemKind.Separator,
      },
      ...categoryItems,
    ];

    if (suggestedItems.length > 0) {
      items.push(
        {
          label: 'Recently Used',
          kind: vscode.QuickPickItemKind.Separator,
        },
        ...suggestedItems
      );
    }

    quickPick.items = items;

    // Pre-select existing tags if editing
    if (existingTags && existingTags.length > 0) {
      quickPick.selectedItems = items.filter((item) => {
        const tagName = item.label.replace('$(tag) ', '').trim();
        return existingTags.includes(tagName);
      });
    }

    // Handle custom tag input
    quickPick.onDidChangeValue((value) => {
      // If user types something not in the list, add it as a custom tag option
      if (value && !items.some((item) => item.label.includes(value))) {
        const customTag = value.trim();

        // Validate the custom tag
        const validation = TagManager.validateTag(customTag);

        if (validation.isValid && validation.normalizedTag) {
          const normalizedTag = validation.normalizedTag;

          // Check if this tag already exists (as category, suggested tag, or custom tag)
          const existingTag = items.find((item) => {
            const tagLabel = item.label.replace('$(tag) ', '').trim();
            return tagLabel.toLowerCase() === normalizedTag.toLowerCase();
          });

          // Also check if user is typing a predefined category in lowercase
          if (TagManager.isPredefinedCategory(normalizedTag)) {
            // Select the existing predefined category item instead of adding duplicate
            const categoryItem = items.find((item) =>
              item.label === `$(tag) ${normalizedTag}`
            );
            if (categoryItem && !quickPick.selectedItems.includes(categoryItem)) {
              quickPick.selectedItems = [...quickPick.selectedItems, categoryItem];
            }
            return;
          }

          if (!existingTag) {
            // Add custom tag option at the top (after categories)
            const customTagItem: vscode.QuickPickItem = {
              label: `$(tag) ${normalizedTag}`,
              description: 'Custom tag (type to add)',
              alwaysShow: true,
            };

            // Find where to insert (after predefined categories)
            const categoryEndIndex = items.findIndex(
              (item) => item.label === 'Recently Used'
            );

            if (categoryEndIndex !== -1) {
              items.splice(categoryEndIndex, 0, customTagItem);
            } else {
              items.push(customTagItem);
            }

            quickPick.items = items;
          }
        }
      }
    });

    // Return a promise that resolves when the user makes a selection
    return new Promise((resolve) => {
      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems.map((item) =>
          item.label.replace('$(tag) ', '').trim()
        );
        resolve(selected);
        quickPick.hide();
      });

      quickPick.onDidHide(() => {
        resolve(undefined);
        quickPick.dispose();
      });

      quickPick.show();
    });
  }

  /**
   * Show a simplified tag input for quick tagging
   * @param allNotes Optional array of all notes for autocomplete suggestions
   * @returns Array of selected tags, or undefined if cancelled
   */
  static async showQuickTagInput(allNotes?: Note[]): Promise<string[] | undefined> {
    // Get predefined categories
    const predefinedCategories = TagManager.getPredefinedCategories();

    // Get suggested tags from existing notes
    const suggestedTags = allNotes ? TagManager.getSuggestedTags(allNotes, 5) : [];

    // Combine suggestions
    const allSuggestions = [
      ...predefinedCategories,
      ...suggestedTags.filter((tag) => !TagManager.isPredefinedCategory(tag)),
    ];

    const input = await vscode.window.showInputBox({
      prompt: 'Enter tags (comma-separated)',
      placeHolder: 'e.g., TODO, authentication, bug',
      value: '',
      valueSelection: undefined,
      ignoreFocusOut: false,
      title: 'Add Tags',
    });

    if (input === undefined) {
      return undefined;
    }

    if (!input.trim()) {
      return [];
    }

    // Parse and validate tags
    const tags = TagManager.parseTagsFromString(input);
    return tags;
  }

  /**
   * Show tag editor for modifying tags on an existing note
   * @param note The note to edit tags for
   * @param allNotes Optional array of all notes for autocomplete suggestions
   * @returns Updated array of tags, or undefined if cancelled
   */
  static async showTagEditor(
    note: Note,
    allNotes?: Note[]
  ): Promise<string[] | undefined> {
    return this.showTagInput(note.tags, allNotes);
  }

  /**
   * Show a quick filter UI for filtering notes by tags
   * @param allNotes Array of all notes to extract available tags from
   * @returns Selected filter tags, or undefined if cancelled
   */
  static async showTagFilter(allNotes: Note[]): Promise<string[] | undefined> {
    const allTags = TagManager.getAllTags(allNotes);

    if (allTags.length === 0) {
      vscode.window.showInformationMessage('No tags found in your notes');
      return undefined;
    }

    const selected = await vscode.window.showQuickPick(
      allTags.map((tag) => ({
        label: tag,
        picked: false,
      })),
      {
        title: 'Filter Notes by Tags',
        placeHolder: 'Select tags to filter by',
        canPickMany: true,
        matchOnDescription: true,
      }
    );

    if (!selected) {
      return undefined;
    }

    return selected.map((item) => item.label);
  }
}
