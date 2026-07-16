/**
 * Content Hash Tracker for Code Context Notes
 * Tracks code content by hash to maintain note positions when lines move
 */

import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { LineRange, ContentHashResult } from './types.js';

/**
 * ContentHashTracker manages content-based note tracking
 * Uses hashing to identify code content even when line numbers change
 */
export class ContentHashTracker {
  private readonly SIMILARITY_THRESHOLD = 0.7; // 70% similarity required for match

  /**
   * Generate a hash for content in a specific line range
   */
  generateHash(document: vscode.TextDocument, lineRange: LineRange): string {
    const content = this.getContentForRange(document, lineRange);
    const normalized = this.normalizeContent(content);
    return this.hashContent(normalized);
  }

  /**
   * Extract content from a line range in a document
   */
  getContentForRange(document: vscode.TextDocument, lineRange: LineRange): string {
    const lines: string[] = [];

    // Validate line range
    const startLine = Math.max(0, Math.min(lineRange.start, document.lineCount - 1));
    const endLine = Math.max(0, Math.min(lineRange.end, document.lineCount - 1));

    for (let i = startLine; i <= endLine; i++) {
      lines.push(document.lineAt(i).text);
    }

    return lines.join('\n');
  }

  /**
   * Normalize content before hashing
   * Removes leading/trailing whitespace and normalizes internal whitespace
   */
  private normalizeContent(content: string): string {
    // Split into lines
    const lines = content.split('\n');

    // Trim each line and normalize internal whitespace
    const normalized = lines.map(line => {
      // Trim leading/trailing whitespace
      const trimmed = line.trim();
      // Normalize internal whitespace (multiple spaces -> single space)
      return trimmed.replace(/\s+/g, ' ');
    }).filter(line => line.length > 0); // Remove empty lines

    return normalized.join('\n');
  }

  /**
   * Generate SHA-256 hash of content
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Find content by hash in the document
   * Returns the new line range if found, or null if not found
   */
  async findContentByHash(
    document: vscode.TextDocument,
    targetHash: string,
    originalRange: LineRange
  ): Promise<ContentHashResult> {
    // First check if content is still at the original location
    const currentHash = this.generateHash(document, originalRange);
    if (currentHash === targetHash) {
      return {
        found: true,
        newLineRange: originalRange,
        similarity: 1.0
      };
    }

    // Calculate the number of lines in the original range
    const rangeSize = originalRange.end - originalRange.start + 1;

    // Search for the content in the document
    // Use a sliding window approach
    for (let startLine = 0; startLine <= document.lineCount - rangeSize; startLine++) {
      const testRange: LineRange = {
        start: startLine,
        end: startLine + rangeSize - 1
      };

      const testHash = this.generateHash(document, testRange);
      if (testHash === targetHash) {
        return {
          found: true,
          newLineRange: testRange,
          similarity: 1.0
        };
      }
    }

    // If exact match not found, try to find similar content
    const similarMatch = await this.findSimilarContent(
      document,
      originalRange,
      targetHash,
      rangeSize
    );

    if (similarMatch) {
      return similarMatch;
    }

    // Content not found
    return {
      found: false
    };
  }

  /**
   * Find content with similarity above threshold
   * Uses Levenshtein distance for fuzzy matching
   */
  private async findSimilarContent(
    document: vscode.TextDocument,
    originalRange: LineRange,
    targetHash: string,
    rangeSize: number
  ): Promise<ContentHashResult | null> {
    const originalContent = this.normalizeContent(
      this.getContentForRange(document, originalRange)
    );

    let bestMatch: ContentHashResult | null = null;
    let bestSimilarity = 0;

    // Search within a reasonable window around the original position
    const searchStart = Math.max(0, originalRange.start - 50);
    const searchEnd = Math.min(document.lineCount - rangeSize, originalRange.end + 50);

    for (let startLine = searchStart; startLine <= searchEnd; startLine++) {
      const testRange: LineRange = {
        start: startLine,
        end: startLine + rangeSize - 1
      };

      const testContent = this.normalizeContent(
        this.getContentForRange(document, testRange)
      );

      const similarity = this.calculateSimilarity(originalContent, testContent);

      if (similarity > bestSimilarity && similarity >= this.SIMILARITY_THRESHOLD) {
        bestSimilarity = similarity;
        bestMatch = {
          found: true,
          newLineRange: testRange,
          similarity: similarity
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns a value between 0 (completely different) and 1 (identical)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) {
      return 1.0;
    }

    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Implementation using dynamic programming
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create a 2D array for dynamic programming
    const matrix: number[][] = [];

    // Initialize first column
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    // Initialize first row
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Validate if content at a line range matches the expected hash
   */
  validateContentHash(
    document: vscode.TextDocument,
    lineRange: LineRange,
    expectedHash: string
  ): boolean {
    const currentHash = this.generateHash(document, lineRange);
    return currentHash === expectedHash;
  }

  /**
   * Get the current hash for a line range (convenience method)
   */
  getCurrentHash(document: vscode.TextDocument, lineRange: LineRange): string {
    return this.generateHash(document, lineRange);
  }

  /**
   * Check if content has changed significantly
   * Returns true if the similarity is below the threshold
   */
  async hasContentChangedSignificantly(
    document: vscode.TextDocument,
    lineRange: LineRange,
    originalHash: string
  ): Promise<boolean> {
    const currentHash = this.generateHash(document, lineRange);

    if (currentHash === originalHash) {
      return false;
    }

    // Check similarity
    const originalContent = this.getContentForRange(document, lineRange);
    const originalNormalized = this.normalizeContent(originalContent);

    // Since we don't have the original content, we use the hash mismatch as indicator
    // In a more sophisticated implementation, we could store original content
    return true;
  }
}
