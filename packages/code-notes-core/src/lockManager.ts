import * as fs from 'fs/promises';
import * as path from 'path';

export interface LockManagerOptions {
  /** Total time acquire() will spin before giving up with lock_timeout (not a per-retry interval). */
  timeoutMs?: number;
  staleAfterMs?: number;
}

interface LockFile { pid: number; ts: string; holder: string; }

/**
 * Per-note advisory file lock (spec §7.1). Lock file lives at
 * <locksDir>/<noteId>.lock and holds JSON { pid, ts, holder }.
 *
 * ponytail: advisory locks for a single-machine tool — acquiring is a
 * create-exclusive loop, not a real distributed lock. Breaking a stale
 * lock (unlink then retry) can race with another process breaking the
 * same lock; both would then attempt to create the file and one loses,
 * simply retrying. Acceptable here; revisit only if this moves multi-host.
 *
 * Note: staleAfterMs (60s) is much larger than the default timeoutMs (500ms),
 * so a crashed holder's lock is only reclaimed once a later acquire() happens
 * to run past the 60s mark — writers hitting the lock before then fast-fail
 * with lock_timeout (retryable). Fine for a single-editor + agent workload;
 * shorten staleAfterMs if crash recovery needs to be quicker.
 */
export class LockManager {
  constructor(
    private locksDir: string,
    private holder: string,
    private opts: LockManagerOptions = {},
  ) {}

  async acquire(noteId: string): Promise<void> {
    const timeoutMs = this.opts.timeoutMs ?? 500;
    const staleAfterMs = this.opts.staleAfterMs ?? 60_000;
    const lockPath = path.join(this.locksDir, `${noteId}.lock`);
    await fs.mkdir(this.locksDir, { recursive: true });
    const deadline = Date.now() + timeoutMs;

    while (true) {
      // Try to create exclusively
      try {
        const fd = await fs.open(lockPath, 'wx');
        await fd.writeFile(JSON.stringify({ pid: process.pid, ts: new Date().toISOString(), holder: this.holder }));
        await fd.close();
        return;
      } catch (e: any) {
        if (e.code !== 'EEXIST') throw e;
      }
      // Read the existing lock to check staleness
      try {
        const raw = await fs.readFile(lockPath, 'utf-8');
        const lock: LockFile = JSON.parse(raw);
        const age = Date.now() - new Date(lock.ts).getTime();
        if (age > staleAfterMs) {
          console.warn(`[code-notes-core] breaking stale lock ${noteId} held by ${lock.holder} (${age}ms old)`);
          await fs.unlink(lockPath).catch(() => undefined);
          continue;
        }
      } catch { /* ignore — race */ }

      if (Date.now() >= deadline) {
        throw new Error(`lock_timeout: ${noteId}`);
      }
      await new Promise(r => setTimeout(r, 25));
    }
  }

  async release(noteId: string): Promise<void> {
    const lockPath = path.join(this.locksDir, `${noteId}.lock`);
    await fs.unlink(lockPath).catch(() => undefined);
  }

  async withLock<T>(noteId: string, fn: () => Promise<T>): Promise<T> {
    await this.acquire(noteId);
    try { return await fn(); } finally { await this.release(noteId); }
  }
}
