import * as vscode from 'vscode';
import { SearchManager } from './searchManager.js';
import { NoteManager } from './noteManager.js';
import { SearchQuery, SearchResult } from './searchTypes.js';
import { Note } from './types.js';

/**
 * QuickPick item for search results
 */
interface SearchQuickPickItem extends vscode.QuickPickItem {
  note?: Note;
  result?: SearchResult;
  type: 'result' | 'filter' | 'action' | 'separator';
  action?: 'clearFilters' | 'showHistory' | 'advancedSearch' | 'filterByAuthor' | 'filterByDate' | 'filterByFile' | 'clearAuthorFilter' | 'clearDateFilter' | 'clearFileFilter' | 'clearCaseSensitiveFilter';
}

/**
 * Active search filters
 */
interface SearchFilters {
  authors?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
    field: 'created' | 'updated';
  };
  filePattern?: string;
  caseSensitive?: boolean;
  useRegex?: boolean;
}

/**
 * Search UI using VSCode QuickPick
 */
export class SearchUI {
  private searchManager: SearchManager;
  private noteManager: NoteManager;
  private quickPick?: vscode.QuickPick<SearchQuickPickItem>;
  private activeFilters: SearchFilters = {};
  private searchDebounceTimer?: NodeJS.Timeout;
  private readonly DEBOUNCE_DELAY = 200; // ms
  private lastSearchQuery: string = '';
  private allNotes: Note[] = [];

  constructor(searchManager: SearchManager, noteManager: NoteManager) {
    this.searchManager = searchManager;
    this.noteManager = noteManager;
  }

  /**
   * Show the search UI
   */
  async show(): Promise<void> {
    // Load all notes for searching
    this.allNotes = await this.noteManager.getAllNotes();

    // Create QuickPick
    this.quickPick = vscode.window.createQuickPick<SearchQuickPickItem>();
    this.quickPick.title = '🔍 Search Notes';
    this.quickPick.placeholder = 'Type to search notes... (supports regex with /pattern/)';
    this.quickPick.matchOnDescription = true;
    this.quickPick.matchOnDetail = true;
    this.quickPick.canSelectMany = false;

    // Set up event handlers
    this.setupEventHandlers();

    // Show initial state
    await this.updateQuickPickItems('');

    // Show the QuickPick
    this.quickPick.show();
  }

  /**
   * Set up event handlers for QuickPick
   */
  private setupEventHandlers(): void {
    if (!this.quickPick) return;

    // Handle text input changes (live search)
    this.quickPick.onDidChangeValue(async (value) => {
      await this.handleSearchInput(value);
    });

    // Handle item selection
    this.quickPick.onDidAccept(async () => {
      await this.handleItemSelection();
    });

    // Handle QuickPick hide
    this.quickPick.onDidHide(() => {
      this.cleanup();
    });

    // Handle button clicks (if we add buttons)
    this.quickPick.onDidTriggerButton((button) => {
      // Future: handle custom buttons
    });
  }

  /**
   * Handle search input changes with debouncing
   */
  private async handleSearchInput(value: string): Promise<void> {
    // Clear existing debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Set new debounce timer
    this.searchDebounceTimer = setTimeout(async () => {
      this.lastSearchQuery = value;
      await this.performSearch(value);
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Perform the actual search
   */
  private async performSearch(searchText: string): Promise<void> {
    if (!this.quickPick) return;

    // Show busy indicator
    this.quickPick.busy = true;

    try {
      await this.updateQuickPickItems(searchText);
    } catch (error) {
      console.error('Search error:', error);
      vscode.window.showErrorMessage(`Search failed: ${error}`);
    } finally {
      this.quickPick.busy = false;
    }
  }

  /**
   * Update QuickPick items based on search and filters
   */
  private async updateQuickPickItems(searchText: string): Promise<void> {
    if (!this.quickPick) return;

    const items: SearchQuickPickItem[] = [];

    // Add filter indicators if active
    if (this.hasActiveFilters()) {
      items.push(...this.createFilterIndicators());
      items.push(this.createSeparator());
    }

    // Perform search if there's input
    if (searchText.trim().length > 0 || this.hasActiveFilters()) {
      const query = this.buildSearchQuery(searchText);
      const results = await this.searchManager.search(query, this.allNotes);

      // Save search to history
      if (searchText.trim().length > 0) {
        await this.searchManager.saveSearch(query, results.length);
      }

      // Add result count
      items.push({
        label: `$(search) ${results.length} result${results.length !== 1 ? 's' : ''}`,
        type: 'separator',
        alwaysShow: true
      });

      // Add search results
      if (results.length > 0) {
        items.push(...this.createResultItems(results));
      } else {
        items.push({
          label: '$(info) No notes found',
          description: 'Try different search terms or filters',
          type: 'separator',
          alwaysShow: true
        });
      }
    } else {
      // Show search history and filter options
      items.push(...await this.createDefaultItems());
    }

    // Add action items at the bottom
    items.push(this.createSeparator());
    items.push(...this.createActionItems());

    this.quickPick.items = items;
  }

  /**
   * Build search query from input and filters
   */
  private buildSearchQuery(searchText: string): SearchQuery {
    const query: SearchQuery = {
      maxResults: 100
    };

    // Parse search text for regex
    const regexMatch = searchText.match(/^\/(.+)\/([gimuy]*)$/);
    if (regexMatch && this.activeFilters.useRegex !== false) {
      // Regex pattern
      try {
        query.regex = new RegExp(regexMatch[1], regexMatch[2]);
      } catch (error) {
        // Invalid regex, fall back to text search
        query.text = searchText;
      }
    } else if (searchText.trim().length > 0) {
      // Normal text search
      query.text = searchText;
    }

    // Apply filters
    if (this.activeFilters.authors && this.activeFilters.authors.length > 0) {
      query.authors = this.activeFilters.authors;
    }

    if (this.activeFilters.dateRange) {
      query.dateRange = this.activeFilters.dateRange;
    }

    if (this.activeFilters.filePattern) {
      query.filePattern = this.activeFilters.filePattern;
    }

    if (this.activeFilters.caseSensitive) {
      query.caseSensitive = true;
    }

    return query;
  }

  /**
   * Create QuickPick items for search results
   */
  private createResultItems(results: SearchResult[]): SearchQuickPickItem[] {
    return results.map((result, index) => {
      const note = result.note;
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const relativePath = workspaceFolder
        ? vscode.workspace.asRelativePath(note.filePath)
        : note.filePath;

      // Format line range
      const lineInfo = note.lineRange.start === note.lineRange.end
        ? `Line ${note.lineRange.start + 1}`
        : `Lines ${note.lineRange.start + 1}-${note.lineRange.end + 1}`;

      // Truncate context for display
      const context = result.context.length > 80
        ? result.context.substring(0, 77) + '...'
        : result.context;

      // Calculate relevance indicator
      const scorePercent = Math.round(result.score * 100);
      const relevanceIcon = scorePercent >= 80 ? '$(star-full)' : scorePercent >= 50 ? '$(star-half)' : '$(star-empty)';

      return {
        label: `$(note) ${context}`,
        description: `${relativePath} · ${lineInfo} · ${note.author}`,
        detail: `${relevanceIcon} ${scorePercent}% relevance`,
        type: 'result',
        note,
        result,
        alwaysShow: true
      };
    });
  }

  /**
   * Create filter indicator items
   */
  private createFilterIndicators(): SearchQuickPickItem[] {
    const items: SearchQuickPickItem[] = [];

    items.push({
      label: '$(filter) Active Filters',
      type: 'separator',
      alwaysShow: true
    });

    if (this.activeFilters.authors && this.activeFilters.authors.length > 0) {
      items.push({
        label: `  $(person) Authors: ${this.activeFilters.authors.join(', ')}`,
        description: 'Click to remove',
        type: 'filter',
        action: 'clearAuthorFilter',
        alwaysShow: true
      });
    }

    if (this.activeFilters.dateRange) {
      const { start, end, field } = this.activeFilters.dateRange;
      let dateLabel = `${field === 'created' ? 'Created' : 'Updated'}: `;
      if (start && end) {
        dateLabel += `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
      } else if (start) {
        dateLabel += `after ${start.toLocaleDateString()}`;
      } else if (end) {
        dateLabel += `before ${end.toLocaleDateString()}`;
      }

      items.push({
        label: `  $(calendar) ${dateLabel}`,
        description: 'Click to remove',
        type: 'filter',
        action: 'clearDateFilter',
        alwaysShow: true
      });
    }

    if (this.activeFilters.filePattern) {
      items.push({
        label: `  $(file) Files: ${this.activeFilters.filePattern}`,
        description: 'Click to remove',
        type: 'filter',
        action: 'clearFileFilter',
        alwaysShow: true
      });
    }

    if (this.activeFilters.caseSensitive) {
      items.push({
        label: `  $(case-sensitive) Case Sensitive`,
        description: 'Click to remove',
        type: 'filter',
        action: 'clearCaseSensitiveFilter',
        alwaysShow: true
      });
    }

    return items;
  }

  /**
   * Create default items (history and filters)
   */
  private async createDefaultItems(): Promise<SearchQuickPickItem[]> {
    const items: SearchQuickPickItem[] = [];

    // Add recent searches
    const history = await this.searchManager.getSearchHistory();
    if (history.length > 0) {
      items.push({
        label: '$(history) Recent Searches',
        type: 'separator',
        alwaysShow: true
      });

      for (const entry of history.slice(0, 5)) {
        items.push({
          label: `  ${entry.label}`,
          description: `${entry.resultCount} results · ${entry.timestamp.toLocaleDateString()}`,
          type: 'action',
          action: 'showHistory',
          alwaysShow: true
        });
      }

      items.push(this.createSeparator());
    }

    // Add filter suggestions
    items.push({
      label: '$(info) Tips',
      type: 'separator',
      alwaysShow: true
    });

    items.push({
      label: '  • Type to search note content',
      type: 'separator',
      alwaysShow: true
    });

    items.push({
      label: '  • Use /pattern/ for regex search',
      type: 'separator',
      alwaysShow: true
    });

    items.push({
      label: '  • Click actions below to add filters',
      type: 'separator',
      alwaysShow: true
    });

    return items;
  }

  /**
   * Create action items (filters, clear, etc.)
   */
  private createActionItems(): SearchQuickPickItem[] {
    const items: SearchQuickPickItem[] = [];

    items.push({
      label: '$(add) Add Filter',
      type: 'separator',
      alwaysShow: true
    });

    items.push({
      label: '  $(person) Filter by Author',
      description: 'Select one or more authors',
      type: 'action',
      action: 'filterByAuthor',
      alwaysShow: true
    });

    items.push({
      label: '  $(calendar) Filter by Date Range',
      description: 'Select date range',
      type: 'action',
      action: 'filterByDate',
      alwaysShow: true
    });

    items.push({
      label: '  $(file) Filter by File Pattern',
      description: 'Enter file path pattern',
      type: 'action',
      action: 'filterByFile',
      alwaysShow: true
    });

    if (this.hasActiveFilters()) {
      items.push(this.createSeparator());
      items.push({
        label: '$(clear-all) Clear All Filters',
        description: 'Remove all active filters',
        type: 'action',
        action: 'clearFilters',
        alwaysShow: true
      });
    }

    return items;
  }

  /**
   * Create a separator item
   */
  private createSeparator(): SearchQuickPickItem {
    return {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
      type: 'separator'
    };
  }

  /**
   * Handle item selection
   */
  private async handleItemSelection(): Promise<void> {
    if (!this.quickPick) return;

    const selected = this.quickPick.selectedItems[0];
    if (!selected) return;

    // Handle different item types
    switch (selected.type) {
      case 'result':
        await this.openNote(selected.note!);
        this.quickPick.hide();
        break;

      case 'action':
        await this.handleAction(selected);
        break;

      case 'filter':
        if (selected.action === 'clearFilters') {
          await this.clearFilters();
        }
        break;
    }
  }

  /**
   * Handle action items
   */
  private async handleAction(item: SearchQuickPickItem): Promise<void> {
    switch (item.action) {
      case 'clearFilters':
        await this.clearFilters();
        break;
      case 'clearAuthorFilter':
        delete this.activeFilters.authors;
        await this.updateQuickPickItems(this.lastSearchQuery);
        break;
      case 'clearDateFilter':
        delete this.activeFilters.dateRange;
        await this.updateQuickPickItems(this.lastSearchQuery);
        break;
      case 'clearFileFilter':
        delete this.activeFilters.filePattern;
        await this.updateQuickPickItems(this.lastSearchQuery);
        break;
      case 'clearCaseSensitiveFilter':
        this.activeFilters.caseSensitive = false;
        await this.updateQuickPickItems(this.lastSearchQuery);
        break;
      case 'filterByAuthor':
        await this.showAuthorFilter();
        break;
      case 'filterByDate':
        await this.showDateFilter();
        break;
      case 'filterByFile':
        await this.showFileFilter();
        break;
      case 'showHistory':
        // Populate search input from history item
        if (this.quickPick) {
          this.quickPick.value = item.label.trim();
        }
        break;
    }
  }

  /**
   * Show author filter dialog
   */
  private async showAuthorFilter(): Promise<void> {
    const authors = await this.searchManager.getAuthors();

    const selected = await vscode.window.showQuickPick(
      authors.map(author => ({
        label: author,
        picked: this.activeFilters.authors?.includes(author)
      })),
      {
        canPickMany: true,
        title: 'Select Authors',
        placeHolder: 'Choose one or more authors to filter by'
      }
    );

    if (selected) {
      this.activeFilters.authors = selected.map(s => s.label);
      await this.updateQuickPickItems(this.lastSearchQuery);
    }
  }

  /**
   * Show date range filter dialog
   */
  private async showDateFilter(): Promise<void> {
    // Ask for date field (created or updated)
    const field = await vscode.window.showQuickPick(
      [
        { label: 'Created Date', value: 'created' as const },
        { label: 'Updated Date', value: 'updated' as const }
      ],
      {
        title: 'Filter by Date',
        placeHolder: 'Which date field to filter?'
      }
    );

    if (!field) return;

    // Ask for date range type
    const rangeType = await vscode.window.showQuickPick(
      [
        { label: 'Last 7 days', value: '7d' },
        { label: 'Last 30 days', value: '30d' },
        { label: 'Last 90 days', value: '90d' },
        { label: 'This year', value: 'year' },
        { label: 'Custom range...', value: 'custom' }
      ],
      {
        title: 'Select Date Range',
        placeHolder: 'Choose a time period'
      }
    );

    if (!rangeType) return;

    let start: Date | undefined;
    let end: Date | undefined = new Date();

    if (rangeType.value === 'custom') {
      // Custom date range (simplified for now)
      const startStr = await vscode.window.showInputBox({
        prompt: 'Enter start date (YYYY-MM-DD)',
        placeHolder: '2024-01-01'
      });

      const endStr = await vscode.window.showInputBox({
        prompt: 'Enter end date (YYYY-MM-DD)',
        placeHolder: '2024-12-31'
      });

      if (startStr) start = new Date(startStr);
      if (endStr) end = new Date(endStr);
    } else {
      // Preset ranges
      const now = new Date();
      switch (rangeType.value) {
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          break;
      }
    }

    this.activeFilters.dateRange = {
      start,
      end,
      field: field.value
    };

    await this.updateQuickPickItems(this.lastSearchQuery);
  }

  /**
   * Show file pattern filter dialog
   */
  private async showFileFilter(): Promise<void> {
    const pattern = await vscode.window.showInputBox({
      prompt: 'Enter file path pattern (glob syntax)',
      placeHolder: 'src/**/*.ts',
      value: this.activeFilters.filePattern
    });

    if (pattern !== undefined) {
      this.activeFilters.filePattern = pattern || undefined;
      await this.updateQuickPickItems(this.lastSearchQuery);
    }
  }

  /**
   * Clear all filters
   */
  private async clearFilters(): Promise<void> {
    this.activeFilters = {};
    await this.updateQuickPickItems(this.lastSearchQuery);
  }

  /**
   * Check if any filters are active
   */
  private hasActiveFilters(): boolean {
    return !!(
      (this.activeFilters.authors && this.activeFilters.authors.length > 0) ||
      this.activeFilters.dateRange ||
      this.activeFilters.filePattern ||
      this.activeFilters.caseSensitive
    );
  }

  /**
   * Open a note in the editor
   */
  private async openNote(note: Note): Promise<void> {
    try {
      // Open document
      const document = await vscode.workspace.openTextDocument(note.filePath);
      const editor = await vscode.window.showTextDocument(document);

      // Reveal and select the note's line range
      const range = new vscode.Range(
        note.lineRange.start,
        0,
        note.lineRange.end,
        document.lineAt(note.lineRange.end).text.length
      );

      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

      // Highlight the range temporarily
      const decoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
        isWholeLine: true
      });

      editor.setDecorations(decoration, [range]);

      // Remove highlight after 2 seconds
      setTimeout(() => {
        decoration.dispose();
      }, 2000);

    } catch (error) {
      console.error('Failed to open note:', error);
      vscode.window.showErrorMessage(`Failed to open note: ${error}`);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.quickPick?.dispose();
    this.quickPick = undefined;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.cleanup();
  }
}
