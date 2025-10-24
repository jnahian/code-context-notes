import * as vscode from 'vscode';
import { Note } from './types';
import {
  SearchQuery,
  SearchResult,
  SearchMatch,
  SearchHistoryEntry,
  SearchStats,
  InvertedIndexEntry,
  SearchCacheEntry
} from './searchTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Manages search indexing and queries for notes
 */
export class SearchManager {
  // Inverted index: term -> note IDs
  private contentIndex: Map<string, InvertedIndexEntry> = new Map();

  // Metadata indexes
  private authorIndex: Map<string, Set<string>> = new Map(); // author -> noteIds
  private dateIndex: Map<string, Note> = new Map(); // noteId -> note
  private fileIndex: Map<string, Set<string>> = new Map(); // filePath -> noteIds
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> noteIds

  // Search cache
  private searchCache: Map<string, SearchCacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Search history
  private searchHistory: SearchHistoryEntry[] = [];
  private readonly MAX_HISTORY_SIZE = 20;

  // Statistics
  private stats: SearchStats = {
    totalNotes: 0,
    totalTerms: 0,
    indexSize: 0,
    lastUpdate: new Date(),
    averageSearchTime: 0
  };

  // Search timing
  private searchTimes: number[] = [];
  private readonly MAX_TIMING_SAMPLES = 100;

  // Configuration
  private context: vscode.ExtensionContext;

  // Stop words to skip during indexing (common words with low search value)
  private readonly STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'it',
    'its', 'we', 'you', 'they', 'them', 'their', 'our', 'your', 'my', 'me'
  ]);

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadSearchHistory();
  }

  /**
   * Build complete search index from all notes
   */
  async buildIndex(notes: Note[]): Promise<void> {
    const startTime = Date.now();
    console.log(`[SearchManager] Building search index for ${notes.length} notes...`);

    // Clear existing indexes
    this.contentIndex.clear();
    this.authorIndex.clear();
    this.dateIndex.clear();
    this.fileIndex.clear();
    this.tagIndex.clear();

    // Index each note
    for (const note of notes) {
      await this.indexNote(note);
    }

    // Update statistics
    this.stats.totalNotes = notes.length;
    this.stats.totalTerms = this.contentIndex.size;
    this.stats.lastUpdate = new Date();
    this.stats.indexSize = this.estimateIndexSize();

    const duration = Date.now() - startTime;
    const indexSizeMB = (this.stats.indexSize / (1024 * 1024)).toFixed(2);
    console.log(`[SearchManager] Index built in ${duration}ms:`, {
      notes: notes.length,
      uniqueTerms: this.contentIndex.size,
      indexSizeMB: `${indexSizeMB} MB`,
      avgTermsPerNote: Math.round(this.contentIndex.size / Math.max(1, notes.length))
    });
  }

  /**
   * Update index for a single note (incremental)
   */
  async updateIndex(note: Note): Promise<void> {
    // Remove old index entries if note exists
    this.removeNoteFromIndex(note.id);

    // Add new index entries
    await this.indexNote(note);

    // Update statistics
    this.stats.lastUpdate = new Date();
    this.stats.indexSize = this.estimateIndexSize();

    // Invalidate cache (note changed, results may be different)
    this.searchCache.clear();
  }

  /**
   * Remove note from all indexes
   */
  async removeFromIndex(noteId: string): Promise<void> {
    this.removeNoteFromIndex(noteId);

    // Update statistics
    this.stats.totalNotes = this.dateIndex.size;
    this.stats.lastUpdate = new Date();
    this.stats.indexSize = this.estimateIndexSize();

    // Invalidate cache
    this.searchCache.clear();
  }

  /**
   * Rebuild entire index (useful for recovery)
   */
  async rebuildIndex(notes: Note[]): Promise<void> {
    await this.buildIndex(notes);
  }

  /**
   * Search notes with query
   */
  async search(query: SearchQuery, allNotes: Note[]): Promise<SearchResult[]> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.getCacheKey(query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[SearchManager] Cache hit (${duration}ms):`, {
        query: query.text || query.regex?.source || 'filters',
        resultCount: cached.results.length
      });
      return cached.results;
    }

    // Start with all notes
    let candidates = new Set<string>(this.dateIndex.keys());

    // Apply text search filter
    if (query.text || query.regex) {
      const textMatches = query.regex
        ? await this.searchRegex(query.regex, allNotes)
        : await this.searchFullText(query.text!, query.caseSensitive);

      candidates = new Set(textMatches.map(n => n.id));
    }

    // Apply author filter
    if (query.authors && query.authors.length > 0) {
      const authorMatches = await this.filterByAuthor(query.authors);
      candidates = this.intersectSets(candidates, new Set(authorMatches.map(n => n.id)));
    }

    // Apply date range filter
    if (query.dateRange) {
      const dateMatches = await this.filterByDateRange(
        query.dateRange.start,
        query.dateRange.end,
        query.dateRange.field
      );
      candidates = this.intersectSets(candidates, new Set(dateMatches.map(n => n.id)));
    }

    // Apply file pattern filter
    if (query.filePattern) {
      const fileMatches = await this.filterByFilePath(query.filePattern);
      candidates = this.intersectSets(candidates, new Set(fileMatches.map(n => n.id)));
    }

    // Apply tag filter
    if (query.tags && query.tags.length > 0) {
      const tagMatches = await this.filterByTags(query.tags, query.tagFilterMode || 'any');
      candidates = this.intersectSets(candidates, new Set(tagMatches.map(n => n.id)));
    }

    // Convert candidate IDs to notes
    const matchedNotes = Array.from(candidates)
      .map(id => this.dateIndex.get(id))
      .filter(note => note !== undefined) as Note[];

    // Calculate relevance scores and create results
    const results: SearchResult[] = [];
    for (const note of matchedNotes) {
      const result = await this.createSearchResult(note, query);
      results.push(result);
    }

    // Sort by relevance score (descending)
    results.sort((a, b) => b.score - a.score);

    // Apply max results limit
    const maxResults = query.maxResults || 100;
    const limitedResults = results.slice(0, maxResults);

    // Cache results
    this.addToCache(cacheKey, limitedResults);

    // Update timing statistics
    const duration = Date.now() - startTime;
    this.recordSearchTime(duration);

    // Log performance metrics
    const performanceInfo = {
      duration: `${duration}ms`,
      resultCount: limitedResults.length,
      candidateCount: candidates.size,
      cacheHit: false,
      query: query.text || query.regex?.source || 'filters only'
    };
    console.log(`[SearchManager] Search completed:`, performanceInfo);

    // Warn if search is slow
    if (duration > 500) {
      console.warn(`[SearchManager] Slow search detected (${duration}ms). Consider optimizing query or reducing result set.`);
    }

    return limitedResults;
  }

  /**
   * Full-text search using inverted index
   */
  async searchFullText(text: string, caseSensitive: boolean = false): Promise<Note[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Tokenize search text
    const terms = this.tokenize(text, caseSensitive);
    if (terms.length === 0) {
      return [];
    }

    // Find notes containing all terms (AND logic)
    let matchingNoteIds: Set<string> | null = null;

    for (const term of terms) {
      const entry = this.contentIndex.get(term);
      const noteIds = entry ? entry.noteIds : new Set<string>();

      if (matchingNoteIds === null) {
        matchingNoteIds = new Set(noteIds);
      } else {
        matchingNoteIds = this.intersectSets(matchingNoteIds, noteIds);
      }

      // Short-circuit if no matches
      if (matchingNoteIds.size === 0) {
        break;
      }
    }

    // Convert to notes
    const notes = Array.from(matchingNoteIds || [])
      .map(id => this.dateIndex.get(id))
      .filter(note => note !== undefined) as Note[];

    return notes;
  }

  /**
   * Regex pattern search
   */
  async searchRegex(pattern: RegExp, allNotes: Note[]): Promise<Note[]> {
    const matches: Note[] = [];

    for (const note of allNotes) {
      if (pattern.test(note.content)) {
        matches.push(note);
      }
    }

    return matches;
  }

  /**
   * Filter notes by author
   */
  async filterByAuthor(authors: string[]): Promise<Note[]> {
    const matchingNoteIds = new Set<string>();

    for (const author of authors) {
      const noteIds = this.authorIndex.get(author);
      if (noteIds) {
        noteIds.forEach(id => matchingNoteIds.add(id));
      }
    }

    const notes = Array.from(matchingNoteIds)
      .map(id => this.dateIndex.get(id))
      .filter(note => note !== undefined) as Note[];

    return notes;
  }

  /**
   * Filter notes by date range
   */
  async filterByDateRange(
    start?: Date,
    end?: Date,
    field: 'created' | 'updated' = 'created'
  ): Promise<Note[]> {
    const matches: Note[] = [];

    for (const note of this.dateIndex.values()) {
      const dateToCheck = field === 'created' ? note.createdAt : note.updatedAt;
      const noteDate = new Date(dateToCheck);

      let inRange = true;
      if (start && noteDate < start) {
        inRange = false;
      }
      if (end && noteDate > end) {
        inRange = false;
      }

      if (inRange) {
        matches.push(note);
      }
    }

    return matches;
  }

  /**
   * Filter notes by file path pattern
   */
  async filterByFilePath(pattern: string): Promise<Note[]> {
    const regex = this.globToRegex(pattern);
    const matchingNoteIds = new Set<string>();

    for (const [filePath, noteIds] of this.fileIndex.entries()) {
      if (regex.test(filePath)) {
        noteIds.forEach(id => matchingNoteIds.add(id));
      }
    }

    const notes = Array.from(matchingNoteIds)
      .map(id => this.dateIndex.get(id))
      .filter(note => note !== undefined) as Note[];

    return notes;
  }

  /**
   * Filter notes by tags
   * @param tags Tags to filter by
   * @param mode 'any' (OR logic) or 'all' (AND logic)
   */
  async filterByTags(tags: string[], mode: 'any' | 'all' = 'any'): Promise<Note[]> {
    if (tags.length === 0) {
      return [];
    }

    if (mode === 'any') {
      // OR logic: note must have at least one of the specified tags
      const matchingNoteIds = new Set<string>();

      for (const tag of tags) {
        const noteIds = this.tagIndex.get(tag);
        if (noteIds) {
          noteIds.forEach(id => matchingNoteIds.add(id));
        }
      }

      const notes = Array.from(matchingNoteIds)
        .map(id => this.dateIndex.get(id))
        .filter(note => note !== undefined) as Note[];

      return notes;
    } else {
      // AND logic: note must have all of the specified tags
      // Start with notes that have the first tag
      const firstTag = tags[0];
      let matchingNoteIds = this.tagIndex.get(firstTag);

      if (!matchingNoteIds || matchingNoteIds.size === 0) {
        return [];
      }

      // Copy the set so we don't modify the original
      matchingNoteIds = new Set(matchingNoteIds);

      // Intersect with notes that have each subsequent tag
      for (let i = 1; i < tags.length; i++) {
        const tagNoteIds = this.tagIndex.get(tags[i]);
        if (!tagNoteIds) {
          return []; // If any tag doesn't exist, no notes can match
        }

        // Keep only notes that are in both sets
        matchingNoteIds = this.intersectSets(matchingNoteIds, tagNoteIds);

        if (matchingNoteIds.size === 0) {
          return []; // Early exit if no matches
        }
      }

      const notes = Array.from(matchingNoteIds)
        .map(id => this.dateIndex.get(id))
        .filter(note => note !== undefined) as Note[];

      return notes;
    }
  }

  /**
   * Get all unique authors
   */
  async getAuthors(): Promise<string[]> {
    return Array.from(this.authorIndex.keys()).sort();
  }

  /**
   * Get search history
   */
  async getSearchHistory(): Promise<SearchHistoryEntry[]> {
    return [...this.searchHistory];
  }

  /**
   * Save search to history
   */
  async saveSearch(query: SearchQuery, resultCount: number): Promise<void> {
    const entry: SearchHistoryEntry = {
      id: uuidv4(),
      query,
      timestamp: new Date(),
      resultCount,
      label: this.createSearchLabel(query)
    };

    // Add to beginning
    this.searchHistory.unshift(entry);

    // Trim to max size
    if (this.searchHistory.length > this.MAX_HISTORY_SIZE) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY_SIZE);
    }

    // Persist to storage
    await this.persistSearchHistory();
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    this.searchHistory = [];
    await this.persistSearchHistory();
  }

  /**
   * Get search statistics
   */
  getStats(): SearchStats {
    return { ...this.stats };
  }

  // ========== Private Methods ==========

  /**
   * Index a single note
   */
  private async indexNote(note: Note): Promise<void> {
    // Index content (inverted index)
    const terms = this.tokenize(note.content, false);
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      let entry = this.contentIndex.get(term);

      if (!entry) {
        entry = {
          term,
          noteIds: new Set(),
          frequencies: new Map(),
          positions: new Map()
        };
        this.contentIndex.set(term, entry);
      }

      entry.noteIds.add(note.id);

      // Update frequency
      const currentFreq = entry.frequencies.get(note.id) || 0;
      entry.frequencies.set(note.id, currentFreq + 1);

      // Update positions
      const positions = entry.positions.get(note.id) || [];
      positions.push(i);
      entry.positions.set(note.id, positions);
    }

    // Index author
    if (!this.authorIndex.has(note.author)) {
      this.authorIndex.set(note.author, new Set());
    }
    this.authorIndex.get(note.author)!.add(note.id);

    // Index dates
    this.dateIndex.set(note.id, note);

    // Index file path
    if (!this.fileIndex.has(note.filePath)) {
      this.fileIndex.set(note.filePath, new Set());
    }
    this.fileIndex.get(note.filePath)!.add(note.id);

    // Index tags
    if (note.tags && note.tags.length > 0) {
      for (const tag of note.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(note.id);
      }
    }
  }

  /**
   * Remove note from all indexes
   */
  private removeNoteFromIndex(noteId: string): void {
    // Remove from content index
    for (const entry of this.contentIndex.values()) {
      entry.noteIds.delete(noteId);
      entry.frequencies.delete(noteId);
      entry.positions.delete(noteId);

      // Clean up empty entries
      if (entry.noteIds.size === 0) {
        this.contentIndex.delete(entry.term);
      }
    }

    // Remove from author index
    const note = this.dateIndex.get(noteId);
    if (note) {
      const authorNotes = this.authorIndex.get(note.author);
      if (authorNotes) {
        authorNotes.delete(noteId);
        if (authorNotes.size === 0) {
          this.authorIndex.delete(note.author);
        }
      }

      // Remove from file index
      const fileNotes = this.fileIndex.get(note.filePath);
      if (fileNotes) {
        fileNotes.delete(noteId);
        if (fileNotes.size === 0) {
          this.fileIndex.delete(note.filePath);
        }
      }

      // Remove from tag index
      if (note.tags && note.tags.length > 0) {
        for (const tag of note.tags) {
          const tagNotes = this.tagIndex.get(tag);
          if (tagNotes) {
            tagNotes.delete(noteId);
            if (tagNotes.size === 0) {
              this.tagIndex.delete(tag);
            }
          }
        }
      }
    }

    // Remove from date index
    this.dateIndex.delete(noteId);
  }

  /**
   * Tokenize text into searchable terms
   */
  private tokenize(text: string, caseSensitive: boolean): string[] {
    // Normalize text
    let normalized = text;
    if (!caseSensitive) {
      normalized = text.toLowerCase();
    }

    // Split on whitespace and punctuation
    const tokens = normalized
      .split(/[\s\.,;:!?\(\)\[\]\{\}<>'"\/\\]+/)
      .filter(token => token.length > 0)
      .filter(token => token.length > 1) // Ignore single-char tokens
      .filter(token => !this.STOP_WORDS.has(token)); // Skip stop words for better performance

    return tokens;
  }

  /**
   * Create search result with scoring
   */
  private async createSearchResult(note: Note, query: SearchQuery): Promise<SearchResult> {
    const score = await this.calculateRelevanceScore(note, query);
    const matches = await this.findMatches(note, query);
    const context = this.extractContext(note.content, matches);

    return {
      note,
      score,
      matches,
      context
    };
  }

  /**
   * Calculate relevance score for a note
   */
  private async calculateRelevanceScore(note: Note, query: SearchQuery): Promise<number> {
    let score = 0;

    // Text match scoring
    if (query.text) {
      const terms = this.tokenize(query.text, query.caseSensitive || false);
      let matchCount = 0;
      let totalFrequency = 0;

      for (const term of terms) {
        const entry = this.contentIndex.get(term);
        if (entry && entry.noteIds.has(note.id)) {
          matchCount++;
          totalFrequency += entry.frequencies.get(note.id) || 0;
        }
      }

      // Score based on:
      // 1. Percentage of terms matched
      const termCoverage = terms.length > 0 ? matchCount / terms.length : 0;
      // 2. Frequency of terms (TF component)
      const frequency = totalFrequency / Math.max(1, terms.length);

      score += termCoverage * 0.6 + Math.min(frequency / 10, 1) * 0.4;
    }

    // Regex match scoring
    if (query.regex) {
      const matches = note.content.match(query.regex);
      if (matches) {
        score = Math.max(score, 0.8 + matches.length * 0.02);
      }
    }

    // Boost recent notes slightly
    const ageInDays = (Date.now() - new Date(note.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1 - ageInDays / 365) * 0.1; // Max 10% boost
    score += recencyBoost;

    // Normalize to 0-1 range
    return Math.min(1, Math.max(0, score));
  }

  /**
   * Find all matches in note content
   */
  private async findMatches(note: Note, query: SearchQuery): Promise<SearchMatch[]> {
    const matches: SearchMatch[] = [];

    if (query.regex) {
      // Regex matching
      let match;
      const regex = new RegExp(query.regex.source, query.regex.flags + 'g');
      while ((match = regex.exec(note.content)) !== null) {
        matches.push({
          text: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    } else if (query.text) {
      // Text matching
      const searchText = query.caseSensitive ? query.text : query.text.toLowerCase();
      const content = query.caseSensitive ? note.content : note.content.toLowerCase();

      let index = content.indexOf(searchText);
      while (index !== -1) {
        matches.push({
          text: note.content.substring(index, index + searchText.length),
          startIndex: index,
          endIndex: index + searchText.length
        });
        index = content.indexOf(searchText, index + 1);
      }
    }

    return matches;
  }

  /**
   * Extract context around matches
   */
  private extractContext(content: string, matches: SearchMatch[], contextLength: number = 100): string {
    if (matches.length === 0) {
      return content.substring(0, Math.min(content.length, contextLength));
    }

    // Use first match for context
    const match = matches[0];
    const start = Math.max(0, match.startIndex - contextLength / 2);
    const end = Math.min(content.length, match.endIndex + contextLength / 2);

    let context = content.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) {
      context = '...' + context;
    }
    if (end < content.length) {
      context = context + '...';
    }

    return context.trim();
  }

  /**
   * Get cache key for query
   */
  private getCacheKey(query: SearchQuery): string {
    return JSON.stringify(query);
  }

  /**
   * Get results from cache
   */
  private getFromCache(key: string): SearchCacheEntry | null {
    const entry = this.searchCache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp.getTime();
    if (age > entry.ttl) {
      this.searchCache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Add results to cache
   */
  private addToCache(key: string, results: SearchResult[]): void {
    const entry: SearchCacheEntry = {
      key,
      results,
      timestamp: new Date(),
      ttl: this.CACHE_TTL
    };

    this.searchCache.set(key, entry);

    // Limit cache size
    if (this.searchCache.size > 50) {
      // Remove oldest entry
      const oldestKey = this.searchCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.searchCache.delete(oldestKey);
      }
    }
  }

  /**
   * Intersect two sets
   */
  private intersectSets<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const item of setA) {
      if (setB.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  /**
   * Convert glob pattern to regex
   */
  private globToRegex(pattern: string): RegExp {
    // Escape special regex characters except * and ?
    let regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regex}$`, 'i');
  }

  /**
   * Create human-readable label for search
   */
  private createSearchLabel(query: SearchQuery): string {
    const parts: string[] = [];

    if (query.text) {
      parts.push(`"${query.text}"`);
    }

    if (query.regex) {
      parts.push(`regex: ${query.regex.source}`);
    }

    if (query.authors && query.authors.length > 0) {
      parts.push(`by ${query.authors.join(', ')}`);
    }

    if (query.dateRange) {
      if (query.dateRange.start && query.dateRange.end) {
        parts.push(`${query.dateRange.field} between ${query.dateRange.start.toLocaleDateString()} and ${query.dateRange.end.toLocaleDateString()}`);
      } else if (query.dateRange.start) {
        parts.push(`${query.dateRange.field} after ${query.dateRange.start.toLocaleDateString()}`);
      } else if (query.dateRange.end) {
        parts.push(`${query.dateRange.field} before ${query.dateRange.end.toLocaleDateString()}`);
      }
    }

    if (query.filePattern) {
      parts.push(`in ${query.filePattern}`);
    }

    return parts.join(' • ') || 'Empty search';
  }

  /**
   * Record search execution time
   */
  private recordSearchTime(duration: number): void {
    this.searchTimes.push(duration);

    // Keep only recent samples
    if (this.searchTimes.length > this.MAX_TIMING_SAMPLES) {
      this.searchTimes.shift();
    }

    // Update average
    const sum = this.searchTimes.reduce((a, b) => a + b, 0);
    this.stats.averageSearchTime = sum / this.searchTimes.length;
  }

  /**
   * Estimate index size in bytes
   */
  private estimateIndexSize(): number {
    let size = 0;

    // Content index
    for (const entry of this.contentIndex.values()) {
      size += entry.term.length * 2; // UTF-16
      size += entry.noteIds.size * 36; // UUID length
      size += entry.frequencies.size * 8; // number
      size += Array.from(entry.positions.values()).reduce((sum, arr) => sum + arr.length * 4, 0);
    }

    // Metadata indexes
    for (const author of this.authorIndex.keys()) {
      size += author.length * 2;
    }

    return size;
  }

  /**
   * Load search history from storage
   */
  private loadSearchHistory(): void {
    try {
      const stored = this.context.globalState.get<SearchHistoryEntry[]>('searchHistory');
      if (stored) {
        this.searchHistory = stored.map(entry => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  /**
   * Persist search history to storage
   */
  private async persistSearchHistory(): Promise<void> {
    try {
      await this.context.globalState.update('searchHistory', this.searchHistory);
    } catch (error) {
      console.error('Failed to persist search history:', error);
    }
  }
}
