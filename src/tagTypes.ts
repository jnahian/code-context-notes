/**
 * Tag and category types for Code Context Notes extension
 */

/**
 * Predefined note categories with specific meanings and visual styling
 */
export enum NoteCategory {
  TODO = 'TODO',
  FIXME = 'FIXME',
  QUESTION = 'QUESTION',
  NOTE = 'NOTE',
  BUG = 'BUG',
  IMPROVEMENT = 'IMPROVEMENT',
  REVIEW = 'REVIEW',
}

/**
 * Visual styling configuration for a tag
 */
export interface TagStyle {
  /** Color for the tag (hex or theme color) */
  color: string;
  /** Optional icon ID from VSCode's codicon library */
  icon?: string;
  /** Description of what this tag represents */
  description: string;
}

/**
 * Mapping of predefined categories to their visual styles
 */
export const CATEGORY_STYLES: Record<NoteCategory, TagStyle> = {
  [NoteCategory.TODO]: {
    color: '#007ACC', // Blue
    icon: 'check',
    description: 'Tasks that need to be completed',
  },
  [NoteCategory.FIXME]: {
    color: '#F14C4C', // Red
    icon: 'tools',
    description: 'Code that needs fixing',
  },
  [NoteCategory.QUESTION]: {
    color: '#FFC600', // Yellow
    icon: 'question',
    description: 'Questions that need answers',
  },
  [NoteCategory.NOTE]: {
    color: '#858585', // Gray
    icon: 'note',
    description: 'General notes and observations',
  },
  [NoteCategory.BUG]: {
    color: '#FF8C00', // Orange
    icon: 'bug',
    description: 'Known bugs to track',
  },
  [NoteCategory.IMPROVEMENT]: {
    color: '#89D185', // Green
    icon: 'lightbulb',
    description: 'Enhancement ideas',
  },
  [NoteCategory.REVIEW]: {
    color: '#C586C0', // Purple
    icon: 'eye',
    description: 'Code that needs review',
  },
};

/**
 * Default color for custom tags
 */
export const DEFAULT_TAG_COLOR = '#858585';

/**
 * Parameters for filtering notes by tags
 */
export interface TagFilterParams {
  /** Tags to include (OR logic - note must have at least one) */
  includeTags?: string[];
  /** Tags to exclude (note must not have any of these) */
  excludeTags?: string[];
  /** If true, note must have ALL includeTags (AND logic) */
  requireAllTags?: boolean;
}

/**
 * Result of tag validation
 */
export interface TagValidationResult {
  /** Whether the tag is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Normalized version of the tag */
  normalizedTag?: string;
}

/**
 * Statistics about tag usage across all notes
 */
export interface TagStatistics {
  /** Total number of unique tags */
  totalUniqueTags: number;
  /** Map of tag to number of times it's used */
  tagCounts: Map<string, number>;
  /** Most frequently used tags */
  topTags: Array<{ tag: string; count: number }>;
}
