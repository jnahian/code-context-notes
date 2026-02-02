/**
 * Tag Manager for Code Context Notes
 * Handles tag validation, normalization, and tag-related operations
 */

import {
  NoteCategory,
  TagStyle,
  CATEGORY_STYLES,
  DEFAULT_TAG_COLOR,
  TagFilterParams,
  TagValidationResult,
  TagStatistics,
} from './tagTypes.js';
import { Note } from './types.js';

/**
 * TagManager provides utilities for working with tags
 */
export class TagManager {
  /**
   * Get all predefined categories
   */
  static getPredefinedCategories(): string[] {
    return Object.values(NoteCategory);
  }

  /**
   * Check if a tag is a predefined category
   */
  static isPredefinedCategory(tag: string): boolean {
    return Object.values(NoteCategory).includes(tag as NoteCategory);
  }

  /**
   * Get the style for a tag (color, icon, description)
   */
  static getTagStyle(tag: string): TagStyle {
    if (this.isPredefinedCategory(tag)) {
      return CATEGORY_STYLES[tag as NoteCategory];
    }
    return {
      color: DEFAULT_TAG_COLOR,
      description: 'Custom tag',
    };
  }

  /**
   * Validate a tag
   * Tags must:
   * - Not be empty
   * - Not contain commas (used as delimiter)
   * - Not contain special characters that could break parsing
   */
  static validateTag(tag: string): TagValidationResult {
    if (!tag || tag.trim().length === 0) {
      return {
        isValid: false,
        error: 'Tag cannot be empty',
      };
    }

    const trimmed = tag.trim();

    if (trimmed.includes(',')) {
      return {
        isValid: false,
        error: 'Tag cannot contain commas',
      };
    }

    // Check for other problematic characters
    if (trimmed.includes('\n') || trimmed.includes('\r')) {
      return {
        isValid: false,
        error: 'Tag cannot contain newlines',
      };
    }

    if (trimmed.length > 50) {
      return {
        isValid: false,
        error: 'Tag cannot exceed 50 characters',
      };
    }

    return {
      isValid: true,
      normalizedTag: trimmed,
    };
  }

  /**
   * Normalize a tag (trim whitespace, ensure consistent casing for predefined categories)
   */
  static normalizeTag(tag: string): string {
    const trimmed = tag.trim();

    // For predefined categories, ensure uppercase
    const upperTag = trimmed.toUpperCase();
    if (this.isPredefinedCategory(upperTag)) {
      return upperTag;
    }

    // For custom tags, preserve original casing but trim
    return trimmed;
  }

  /**
   * Validate and normalize multiple tags
   */
  static validateAndNormalizeTags(tags: string[]): {
    valid: string[];
    invalid: Array<{ tag: string; error: string }>;
  } {
    const valid: string[] = [];
    const invalid: Array<{ tag: string; error: string }> = [];

    for (const tag of tags) {
      const result = this.validateTag(tag);
      if (result.isValid && result.normalizedTag) {
        const normalized = this.normalizeTag(result.normalizedTag);
        // Avoid duplicates
        if (!valid.includes(normalized)) {
          valid.push(normalized);
        }
      } else {
        invalid.push({ tag, error: result.error || 'Invalid tag' });
      }
    }

    return { valid, invalid };
  }

  /**
   * Filter notes by tags
   */
  static filterNotesByTags(notes: Note[], params: TagFilterParams): Note[] {
    return notes.filter(note => {
      const noteTags = note.tags || [];

      // Exclude notes with excluded tags
      if (params.excludeTags && params.excludeTags.length > 0) {
        const hasExcludedTag = params.excludeTags.some(tag =>
          noteTags.includes(tag)
        );
        if (hasExcludedTag) {
          return false;
        }
      }

      // Include notes with included tags
      if (params.includeTags && params.includeTags.length > 0) {
        if (params.requireAllTags) {
          // Note must have ALL included tags
          return params.includeTags.every(tag => noteTags.includes(tag));
        } else {
          // Note must have at least ONE included tag
          return params.includeTags.some(tag => noteTags.includes(tag));
        }
      }

      // If no include/exclude filters, return all notes
      return true;
    });
  }

  /**
   * Get all unique tags from a collection of notes
   */
  static getAllTags(notes: Note[]): string[] {
    const tagSet = new Set<string>();

    for (const note of notes) {
      if (note.tags) {
        for (const tag of note.tags) {
          tagSet.add(tag);
        }
      }
    }

    return Array.from(tagSet).sort();
  }

  /**
   * Get tag usage statistics
   */
  static getTagStatistics(notes: Note[]): TagStatistics {
    const tagCounts = new Map<string, number>();

    for (const note of notes) {
      if (note.tags) {
        for (const tag of note.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    // Sort tags by count (descending)
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalUniqueTags: tagCounts.size,
      tagCounts,
      topTags,
    };
  }

  /**
   * Parse tags from a comma-separated string
   */
  static parseTagsFromString(tagsString: string): string[] {
    if (!tagsString || tagsString.trim().length === 0) {
      return [];
    }

    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const { valid } = this.validateAndNormalizeTags(tags);
    return valid;
  }

  /**
   * Format tags for display
   */
  static formatTagsForDisplay(tags: string[]): string {
    if (!tags || tags.length === 0) {
      return '';
    }
    return tags.map(tag => `[${tag}]`).join(' ');
  }

  /**
   * Get suggested tags based on existing notes
   * Returns tags sorted by frequency of use
   */
  static getSuggestedTags(notes: Note[], limit: number = 10): string[] {
    const stats = this.getTagStatistics(notes);
    return stats.topTags.slice(0, limit).map(item => item.tag);
  }

  /**
   * Add tags to a note (avoiding duplicates)
   */
  static addTagsToNote(note: Note, newTags: string[]): void {
    if (!note.tags) {
      note.tags = [];
    }

    const { valid } = this.validateAndNormalizeTags(newTags);

    for (const tag of valid) {
      if (!note.tags.includes(tag)) {
        note.tags.push(tag);
      }
    }
  }

  /**
   * Remove tags from a note
   */
  static removeTagsFromNote(note: Note, tagsToRemove: string[]): void {
    if (!note.tags || note.tags.length === 0) {
      return;
    }

    note.tags = note.tags.filter(tag => !tagsToRemove.includes(tag));
  }

  /**
   * Replace all tags on a note
   */
  static setNoteTags(note: Note, tags: string[]): void {
    const { valid } = this.validateAndNormalizeTags(tags);
    note.tags = valid;
  }
}
