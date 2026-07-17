import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { AuditLog, hashNoteContent } from '../src/auditLog.js';
import { LockManager } from '../src/lockManager.js';
import type { AuditEntry } from '../src/types.js';

const entry = (noteId: string, op: AuditEntry['op'] = 'create'): AuditEntry => ({
  ts: '2026-07-17T00:00:00.000Z',
  op,
  noteId,
  agent: 'claude-code',
  file: 'src/app.ts',
});

describe('AuditLog', () => {
  let tempDir: string;
  let logPath: string;
  let log: AuditLog;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-log-test-'));
    logPath = path.join(tempDir, '_audit.log');
    log = new AuditLog(logPath, { lockManager: new LockManager(path.join(tempDir, '.locks'), 'test') });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns an empty list when the log does not exist yet', async () => {
    expect(await log.read()).toEqual([]);
  });

  it('appends entries as one JSON line each and reads them back newest-first', async () => {
    await log.append(entry('note-1'));
    await log.append(entry('note-2', 'edit'));

    const raw = await fs.readFile(logPath, 'utf-8');
    expect(raw.trimEnd().split('\n')).toHaveLength(2);

    const entries = await log.read();
    expect(entries.map(e => e.noteId)).toEqual(['note-2', 'note-1']);
    expect(entries[0].op).toBe('edit');
  });

  it('does not interleave lines when many appends race', async () => {
    await Promise.all(Array.from({ length: 50 }, (_, i) => log.append(entry(`note-${i}`))));

    const entries = await log.read();
    expect(entries).toHaveLength(50);
    // Every line parsed => no torn writes.
    expect(new Set(entries.map(e => e.noteId)).size).toBe(50);
  });

  it('skips unparseable lines instead of throwing, warning once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await log.append(entry('note-1'));
    await fs.appendFile(logPath, 'this is not json\n');
    await log.append(entry('note-2'));

    const entries = await log.read();
    expect(entries.map(e => e.noteId)).toEqual(['note-2', 'note-1']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('1');
  });

  it('rolls the whole log to _audit.log.1 past retention, losing nothing', async () => {
    const small = new AuditLog(logPath, {
      lockManager: new LockManager(path.join(tempDir, '.locks'), 'test'),
      retention: 3,
    });
    for (let i = 0; i < 5; i++) await small.append(entry(`note-${i}`));

    const live = (await fs.readFile(logPath, 'utf-8')).split('\n').filter(l => l.trim());
    expect(live.length).toBeLessThanOrEqual(3);
    expect(await fs.readFile(`${logPath}.1`, 'utf-8')).toContain('note-0');
    expect((await small.read()).map(e => e.noteId).sort()).toEqual(
      ['note-0', 'note-1', 'note-2', 'note-3', 'note-4'],
    );
  }, 20_000);

  it('loses no entry when appends race a rotation across processes', async () => {
    // Two AuditLog instances = two processes on one log. Retention is tiny so
    // rotation fires constantly, maximising the window a rewrite-style
    // rotation would have used to clobber a concurrent append. The rename is
    // atomic, so every line must survive in one generation or the other —
    // and unlike the old lock-on-append design, this holds under load rather
    // than only on a quiet machine.
    const locksDir = path.join(tempDir, '.locks');
    const mk = () => new AuditLog(logPath, {
      lockManager: new LockManager(locksDir, 'test'),
      retention: 2,
    });
    const a = mk();
    const b = mk();

    const total = 40;
    await Promise.all(
      Array.from({ length: total }, (_, i) => (i % 2 ? a : b).append(entry(`note-${i}`))),
    );

    const ids = new Set((await a.read()).map(e => e.noteId));
    expect(ids.size).toBe(total);
  }, 20_000);

  it('is not blocked by a held rotation lock', async () => {
    // Appends are lock-free on purpose: an agent's note write must never wait
    // on (or fail over) the audit lock. Nothing can clobber the line because
    // rotation renames rather than rewrites.
    const locks = new LockManager(path.join(tempDir, '.locks'), 'rotator', { retryMs: 5_000 });
    await locks.acquire('_audit');
    try {
      await log.append(entry('note-during-lock'));
      expect((await log.read()).map(e => e.noteId)).toEqual(['note-during-lock']);
    } finally {
      await locks.release('_audit');
    }
  }, 20_000);

  it('truncate empties the log', async () => {
    await log.append(entry('note-1'));
    await log.truncate();
    expect(await log.read()).toEqual([]);
  });

  it('hashNoteContent is stable and content-sensitive', () => {
    expect(hashNoteContent('hello')).toBe(hashNoteContent('hello'));
    expect(hashNoteContent('hello')).not.toBe(hashNoteContent('world'));
  });
});
