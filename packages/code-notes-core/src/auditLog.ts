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
    // Lock-free by design. One line, one O_APPEND write, which the OS keeps
    // atomic for small writes on a local filesystem — concurrent appenders
    // never interleave, and rotation (below) never rewrites this file, so
    // nothing can clobber the line either. An earlier version took the
    // rotation lock here; under load the 500ms budget was exhausted on
    // ~90% of appends, so it protected almost nothing while risking an
    // agent's write on a busy lock.
    await fs.appendFile(this.logPath, `${JSON.stringify(entry)}\n`, 'utf-8');
    await this.rotateIfNeeded();
  }

  /** Newest-first. Tolerant: unparseable lines are skipped, not fatal. */
  async read(limit?: number): Promise<AuditEntry[]> {
    // Span both generations, oldest first. Rotation renames the whole log, so
    // immediately afterwards the live file is nearly empty and the recent
    // history is in `.1` — reading only the live file would blank the Agent
    // activity view at every rollover.
    const rotated = await fs.readFile(`${this.logPath}.1`, 'utf-8').catch(() => '');
    const live = await fs.readFile(this.logPath, 'utf-8').catch(() => '');
    const raw = rotated + live;
    if (!raw.trim()) return [];

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

  /** Clears both generations — "clear the log" must not leave `.1` behind. */
  async truncate(): Promise<void> {
    await fs.writeFile(this.logPath, '', 'utf-8');
    await fs.unlink(`${this.logPath}.1`).catch(() => undefined);
  }

  /**
   * Roll the log over to `<log>.1` once it exceeds the retention cap.
   *
   * The rename is the point: it's atomic, so an append racing it lands in
   * whichever inode it opened — the rotated file or the fresh log — and is
   * readable either way. The previous version read the log and wrote back a
   * trimmed copy, which silently dropped any append that arrived in between.
   *
   * The lock only orders rotation against rotation (a second renamer could
   * move a nearly-empty log over a full `.1`). It re-reads the count inside
   * the lock, so a queued rotation sees the fresh log and stands down.
   */
  private async rotateIfNeeded(): Promise<void> {
    // Unlocked pre-check. Almost no append rotates — taking the lock merely to
    // read the count made every concurrent append queue on it and exhaust the
    // retry budget, so the log spewed timeout warnings while doing nothing.
    if (!(await this.exceedsRetention())) return;

    const run = async () => {
      // Re-check under the lock: a queued rotation would otherwise move an
      // already-rotated, nearly-empty log over a full `.1`.
      if (!(await this.exceedsRetention())) return;
      await fs.rename(this.logPath, `${this.logPath}.1`);
    };

    try {
      await (this.opts.lockManager ? this.opts.lockManager.withLock(ROTATE_LOCK_ID, run) : run());
    } catch (e) {
      // A skipped rotation is a log that grows past its cap; failing here
      // would fail the agent's note write. A long log is the lesser evil.
      console.warn(`[code-notes-core] audit log rotation skipped: ${(e as Error).message}`);
    }
  }

  private async exceedsRetention(): Promise<boolean> {
    try {
      const raw = await fs.readFile(this.logPath, 'utf-8');
      return raw.split('\n').filter(l => l.trim()).length > this.retention;
    } catch {
      return false;
    }
  }
}
