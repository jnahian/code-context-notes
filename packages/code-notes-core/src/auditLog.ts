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
    const line = `${JSON.stringify(entry)}\n`;
    const lock = this.opts.lockManager;

    // The append must share the rotation's critical section. A lock only
    // orders writers that take it: a lock-free append landing between
    // rotation's read and its truncating write is silently dropped.
    let appended = false;
    const writeThenRotate = async () => {
      await fs.appendFile(this.logPath, line, 'utf-8');
      appended = true;
      try {
        await this.rotate();
      } catch (e) {
        // A missed rotation is a log that grows; failing here would fail the
        // agent's note write. A long log is the lesser evil.
        console.warn(`[code-notes-core] audit log rotation skipped: ${(e as Error).message}`);
      }
    };

    if (!lock) return writeThenRotate();

    try {
      await lock.withLock(ROTATE_LOCK_ID, writeThenRotate);
    } catch (e) {
      if (appended) throw e;
      // Couldn't get the lock (or it broke). Never cost an agent its write
      // over the audit lock: append lock-free. O_APPEND is atomic, so the
      // line lands; only a rotation racing this exact moment could miss it.
      console.warn(`[code-notes-core] audit append fell back to lock-free: ${(e as Error).message}`);
      await fs.appendFile(this.logPath, line, 'utf-8');
    }
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
   * Trim the log to the retention cap, moving the overflow to `<log>.1`.
   *
   * Read-modify-write, and deliberately NOT self-locking: append() calls this
   * inside the lock it already holds, and LockManager is not reentrant —
   * taking it again here would deadlock until lock_timeout. Never call this
   * outside that critical section.
   */
  private async rotate(): Promise<void> {
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
  }
}
