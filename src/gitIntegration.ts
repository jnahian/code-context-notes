/**
 * Git Integration for Code Context Notes
 * Handles retrieval of git username with fallbacks
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * GitIntegration class handles author name detection
 * Tries git config first, then falls back to system username
 */
export class GitIntegration {
  private cachedUsername: string | null = null;
  private workspaceRoot: string;
  private configOverride: string | undefined;

  constructor(workspaceRoot: string, configOverride?: string) {
    this.workspaceRoot = workspaceRoot;
    this.configOverride = configOverride;
  }

  /**
   * Get the author name to use for notes
   * Order of precedence:
   * 1. Configuration override
   * 2. Cached username
   * 3. Git config user.name
   * 4. System username
   */
  async getAuthorName(): Promise<string> {
    // Check configuration override first
    if (this.configOverride && this.configOverride.trim()) {
      return this.configOverride.trim();
    }

    // Return cached username if available
    if (this.cachedUsername) {
      return this.cachedUsername;
    }

    // Try to get git username
    const gitUsername = await this.getGitUsername();
    if (gitUsername) {
      this.cachedUsername = gitUsername;
      return gitUsername;
    }

    // Fallback to system username
    const systemUsername = this.getSystemUsername();
    this.cachedUsername = systemUsername;
    return systemUsername;
  }

  /**
   * Get username from git config
   * Returns null if git is not available or not configured
   */
  private async getGitUsername(): Promise<string | null> {
    try {
      // Try to get user.name from git config
      const { stdout, stderr } = await execAsync('git config user.name', {
        cwd: this.workspaceRoot,
        timeout: 5000 // 5 second timeout
      });

      if (stderr) {
        return null;
      }

      const username = stdout.trim();
      if (username) {
        return username;
      }

      return null;
    } catch (error: any) {
      // Git not installed, not in a repo, or config not set
      // These are all expected scenarios, not errors
      return null;
    }
  }

  /**
   * Get system username as fallback
   */
  private getSystemUsername(): string {
    try {
      const userInfo = os.userInfo();
      return userInfo.username || 'Unknown User';
    } catch (error) {
      return 'Unknown User';
    }
  }

  /**
   * Update the configuration override
   * Clears the cache to force re-evaluation
   */
  updateConfigOverride(newOverride?: string): void {
    this.configOverride = newOverride;
    // Clear cache to force re-evaluation on next call
    this.cachedUsername = null;
  }

  /**
   * Clear the cached username
   * Useful when switching workspaces or updating git config
   */
  clearCache(): void {
    this.cachedUsername = null;
  }

  /**
   * Check if git is available in the system
   */
  async isGitAvailable(): Promise<boolean> {
    try {
      await execAsync('git --version', {
        timeout: 5000
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if the current directory is in a git repository
   */
  async isInGitRepository(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', {
        cwd: this.workspaceRoot,
        timeout: 5000
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}
