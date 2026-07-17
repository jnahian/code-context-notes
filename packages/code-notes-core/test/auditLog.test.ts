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

  it('rotates to _audit.log.1 once retention is exceeded', async () => {
    const small = new AuditLog(logPath, {
      lockManager: new LockManager(path.join(tempDir, '.locks'), 'test'),
      retention: 3,
    });
    for (let i = 0; i < 5; i++) await small.append(entry(`note-${i}`));

    const kept = await small.read();
    expect(kept.length).toBeLessThanOrEqual(3);
    // Nothing is lost — rotated lines are still on disk.
    const rotated = await fs.readFile(`${logPath}.1`, 'utf-8');
    expect(rotated).toContain('note-0');
  });

  it('loses no entry when appends race a rotation across processes', async () => {
    // Two AuditLog instances = two processes sharing one log and one lock dir.
    // Retention is tiny so rotation fires constantly, maximizing the window
    // where a read-modify-write rotation could clobber a concurrent append.
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

    // Every line must survive somewhere — the live log or the rotated file.
    const live = await fs.readFile(logPath, 'utf-8');
    const rotated = await fs.readFile(`${logPath}.1`, 'utf-8').catch(() => '');
    const ids = new Set(
      `${rotated}\n${live}`
        .split('\n')
        .filter(l => l.trim())
        .map(l => JSON.parse(l).noteId),
    );
    expect(ids.size).toBe(total);
  }, 20_000);

  it('waits for the rotation lock instead of appending around it', async () => {
    // The bug this guards: if append() writes without taking the lock, a
    // rotation in another process can read, have this line land, then write
    // its truncated copy back over it — silently losing the entry.
    const locks = new LockManager(path.join(tempDir, '.locks'), 'rotator', { retryMs: 5_000 });
    const writer = new AuditLog(logPath, {
      lockManager: new LockManager(path.join(tempDir, '.locks'), 'writer', { retryMs: 5_000 }),
      retention: 1000,
    });

    await locks.acquire('_audit');
    const pending = writer.append(entry('note-serialized'));

    // Give a lock-free implementation every chance to write anyway.
    await new Promise(r => setTimeout(r, 200));
    expect(await log.read()).toEqual([]);

    await locks.release('_audit');
    await pending;
    expect((await log.read()).map(e => e.noteId)).toEqual(['note-serialized']);
  }, 20_000);

  it('still records the entry rather than failing the write when the lock never frees', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const locks = new LockManager(path.join(tempDir, '.locks'), 'stuck', { retryMs: 50 });
    const held = new AuditLog(logPath, {
      lockManager: new LockManager(path.join(tempDir, '.locks'), 'writer', { retryMs: 50 }),
      retention: 1000,
    });

    // A jammed audit lock must never cost an agent its note write.
    await locks.acquire('_audit');
    try {
      await held.append(entry('note-under-contention'));
    } finally {
      await locks.release('_audit');
    }

    expect((await held.read()).map(e => e.noteId)).toEqual(['note-under-contention']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('lock-free'));
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
