/**
 * Debounced atomic writer for INDEX.json and AGENTS.md.
 *
 * Owns the debounce timer and the temp-file-and-rename logic. Failures
 * are surfaced via the onError callback — never thrown — because export
 * regeneration is best-effort and must never block a note write.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Note } from './types.js';
import { buildIndex, buildDigest } from './exportGenerator.js';

export interface ExportWriterOptions {
  debounceMs?: number;
  getConfig?: () => { enabled: boolean; indexJson: boolean; agentsMarkdown: boolean };
}

export class ExportWriter {
  private workspaceRoot: string;
  private storageDir: string;
  private debounceMs: number;
  private pendingTimer: NodeJS.Timeout | undefined;
  private pendingGetNotes: (() => Promise<Note[]>) | undefined;
  private getConfig: () => { enabled: boolean; indexJson: boolean; agentsMarkdown: boolean };
  onError: (e: Error) => void = (e) => console.error('[code-notes] export failed:', e);

  constructor(workspaceRoot: string, storageDir: string, opts: ExportWriterOptions = {}) {
    this.workspaceRoot = workspaceRoot;
    this.storageDir = storageDir;
    this.debounceMs = opts.debounceMs ?? 200;
    this.getConfig = opts.getConfig ?? (() => ({ enabled: true, indexJson: true, agentsMarkdown: true }));
  }

  /**
   * Schedule a regeneration. Subsequent calls within the debounce window
   * coalesce — only the latest getNotes is used.
   */
  scheduleRegenerate(getNotes: () => Promise<Note[]>): void {
    this.pendingGetNotes = getNotes;
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
    }
    this.pendingTimer = setTimeout(() => {
      const fn = this.pendingGetNotes;
      this.pendingTimer = undefined;
      this.pendingGetNotes = undefined;
      if (fn) {
        fn().then(notes => this.regenerate(notes)).catch(e => this.onError(e));
      }
    }, this.debounceMs);
  }

  /**
   * Force an immediate (non-debounced) regeneration. Used at startup,
   * by the manual command, and by tests.
   */
  async regenerate(notes: Note[]): Promise<void> {
    try {
      const cfg = this.getConfig();
      if (!cfg.enabled) return;

      const dir = path.join(this.workspaceRoot, this.storageDir);
      await fs.mkdir(dir, { recursive: true });
      if (cfg.indexJson) {
        const idx = buildIndex(notes, this.workspaceRoot);
        await this.atomicWrite(path.join(dir, 'INDEX.json'), JSON.stringify(idx, null, 2));
      }
      if (cfg.agentsMarkdown) {
        const digest = buildDigest(notes, this.workspaceRoot);
        await this.atomicWrite(path.join(dir, 'AGENTS.md'), digest);
      }
    } catch (e: unknown) {
      this.onError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private async atomicWrite(targetPath: string, content: string): Promise<void> {
    const tmpPath = `${targetPath}.tmp`;
    await fs.writeFile(tmpPath, content, 'utf-8');
    await fs.rename(tmpPath, targetPath);
  }

  /**
   * Cancel any pending debounced regeneration. Call from extension deactivate.
   */
  dispose(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = undefined;
    }
  }
}
