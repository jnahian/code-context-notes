import { Note } from './types.js';

/**
 * Search query parameters
 */
export interface SearchQuery {
  /** Full-text search term */
  text?: string;

  /** Regex pattern for advanced search */
  regex?: RegExp;

  /** Filter by one or more authors */
  authors?: string[];

  /** Date range filter */
  dateRange?: {
    start?: Date;
    end?: Date;
    field: 'created' | 'updated';
  };

  /** File path glob pattern */
  filePattern?: string;

  /** Filter by tags */
  tags?: string[];

  /** Tag filter mode - 'any' means OR logic, 'all' means AND logic */
  tagFilterMode?: 'any' | 'all';

  /** Case-sensitive search */
  caseSensitive?: boolean;

  /** Enable fuzzy matching */
  fuzzy?: boolean;

  /** Maximum number of results */
  maxResults?: number;
}

/**
 * Search result with relevance scoring
 */
export interface SearchResult {
  /** The note that matched */
  note: Note;

  /** Relevance score (0-1, higher is more relevant) */
  score: number;

  /** Matched text segments */
  matches: SearchMatch[];

  /** Context around matches */
  context: string;

  /** Highlight positions for UI */
  highlights?: SearchHighlight[];
}

/**
 * A specific text match within a note
 */
export interface SearchMatch {
  /** Matched text */
  text: string;

  /** Start index in content */
  startIndex: number;

  /** End index in content */
  endIndex: number;

  /** Line number where match occurs */
  lineNumber?: number;
}

/**
 * Highlight information for UI rendering
 */
export interface SearchHighlight {
  /** Start position */
  start: number;

  /** End position */
  end: number;

  /** Highlight type */
  type: 'exact' | 'fuzzy' | 'regex';
}

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  /** Unique ID */
  id: string;

  /** Search query */
  query: SearchQuery;

  /** Timestamp */
  timestamp: Date;

  /** Number of results */
  resultCount: number;

  /** Display label */
  label: string;
}

/**
 * Search statistics
 */
export interface SearchStats {
  /** Total notes indexed */
  totalNotes: number;

  /** Total unique terms */
  totalTerms: number;

  /** Index size in bytes */
  indexSize: number;

  /** Last index update time */
  lastUpdate: Date;

  /** Average search time (ms) */
  averageSearchTime: number;
}

/**
 * Inverted index entry
 */
export interface InvertedIndexEntry {
  /** Term (word) */
  term: string;

  /** Note IDs containing this term */
  noteIds: Set<string>;

  /** Term frequency per note */
  frequencies: Map<string, number>;

  /** Positions within each note */
  positions: Map<string, number[]>;
}

/**
 * Search cache entry
 */
export interface SearchCacheEntry {
  /** Cache key (stringified query) */
  key: string;

  /** Cached results */
  results: SearchResult[];

  /** Timestamp */
  timestamp: Date;

  /** Time to live (ms) */
  ttl: number;
}
