import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LockManager } from '../src/lockManager.js';

async function tmpdir() { return await fs.mkdtemp(path.join(os.tmpdir(), 'cn-lock-')); }

describe('LockManager', () => {
  it('acquires and releases a lock for a note', async () => {
    const ws = await tmpdir();
    const lm = new LockManager(path.join(ws, '.code-notes', '.locks'), 'test');
    await lm.acquire('note-a');
    await lm.release('note-a');
    const exists = await fs.stat(path.join(ws, '.code-notes', '.locks', 'note-a.lock')).catch(() => null);
    expect(exists).toBeNull();
  });

  it('throws lock_timeout when another holder owns the lock past retry window', async () => {
    const ws = await tmpdir();
    const dir = path.join(ws, '.code-notes', '.locks');
    await fs.mkdir(dir, { recursive: true });
    // Pre-write a fresh lock owned by another process
    await fs.writeFile(path.join(dir, 'note-b.lock'),
      JSON.stringify({ pid: 99999, ts: new Date().toISOString(), holder: 'other' }));
    const lm = new LockManager(dir, 'me', { timeoutMs: 200 });
    await expect(lm.acquire('note-b')).rejects.toThrow(/lock_timeout/);
  });

  it('forcibly breaks stale locks (>60s old)', async () => {
    const ws = await tmpdir();
    const dir = path.join(ws, '.code-notes', '.locks');
    await fs.mkdir(dir, { recursive: true });
    const staleTs = new Date(Date.now() - 90_000).toISOString();
    await fs.writeFile(path.join(dir, 'note-c.lock'),
      JSON.stringify({ pid: 99999, ts: staleTs, holder: 'other' }));
    const lm = new LockManager(dir, 'me');
    await lm.acquire('note-c'); // should succeed by breaking the stale lock
    await lm.release('note-c');
  });
});
