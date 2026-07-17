import * as fs from 'fs/promises';
import { createHash } from 'crypto';
import * as path from 'path';
import type { LockManager } from './lockManager.js';
import type { AuditEntry } from './types.js';

/** Lock id for rotation. Not a note id — no note can collide with it. */
const ROTATE_LOCK_ID = '_audit';

/** sha256 of a note's content. Named to contrast with Note.contentHash (code hash). */
export function hashNoteContent(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/**
 * Append-only JSONL log of agent operations.
 *
 * ponytail: appends are a bare fs.appendFile — one line, one O_APPEND write,
 * which the OS keeps atomic for small writes on a local filesystem. That is
 * why entries must stay short and single-line. Rotation is a read-modify-write
 * and takes the lock; if this ever moves to a network filesystem, neither
 * guarantee holds and this needs a real append service.
 */
export class AuditLog {
  private retention: number;

  constructor(
    private logPath: string,
    private opts: { lockManager?: LockManager; retention?: number } = {},
  ) {
    this.retention = opts.retention ?? 1000;
  }

  async append(entry: AuditEntry): Promise<void> {
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    await fs.appendFile(this.logPath, `${JSON.stringify(entry)}\n`, 'utf-8');
    await this.rotateIfNeeded();
  }

  /** Newest-first. Tolerant: unparseable lines are skipped, not fatal. */
  async read(limit?: number): Promise<AuditEntry[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.logPath, 'utf-8');
    } catch {
      return [];
    }

    const entries: AuditEntry[] = [];
    let skipped = 0;
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line) as AuditEntry);
      } catch {
        skipped++;
      }
    }
    if (skipped > 0) {
      console.warn(`[code-notes-core] skipped ${skipped} unparseable audit log line(s)`);
    }

    entries.reverse();
    return limit === undefined ? entries : entries.slice(0, limit);
  }

  async truncate(): Promise<void> {
    await fs.writeFile(this.logPath, '', 'utf-8');
  }

  /**
   * Rotation is read-modify-write: another process appending between our read
   * and our rewrite would lose its line. Hold the lock across the whole thing
   * and re-read inside it.
   */
  private async rotateIfNeeded(): Promise<void> {
    const run = async () => {
      let raw: string;
      try {
        raw = await fs.readFile(this.logPath, 'utf-8');
      } catch {
        return;
      }
      const lines = raw.split('\n').filter(l => l.trim());
      if (lines.length <= this.retention) return;

      const overflow = lines.length - this.retention;
      await fs.appendFile(`${this.logPath}.1`, `${lines.slice(0, overflow).join('\n')}\n`, 'utf-8');
      await fs.writeFile(this.logPath, `${lines.slice(overflow).join('\n')}\n`, 'utf-8');
    };

    try {
      await (this.opts.lockManager ? this.opts.lockManager.withLock(ROTATE_LOCK_ID, run) : run());
    } catch (e) {
      // A missed rotation is a log that grows; a thrown error here would fail
      // the agent's write. Losing the write is worse than a long log.
      console.warn(`[code-notes-core] audit log rotation skipped: ${(e as Error).message}`);
    }
  }
}
