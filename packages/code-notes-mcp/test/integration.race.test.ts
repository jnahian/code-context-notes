import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { StorageManager, NoteManager, ContentHashTracker, LockManager, type AuthorProvider } from '@jnahian/code-notes-core';
import { buildDocumentFromFile } from '../src/fileDocument.js';

// spec §8.3 "Extension + MCP racing": the extension (in-process NoteManager) and
// the MCP server (a spawned subprocess) write concurrently to the same workspace.
// Both share the filesystem-based advisory locks under <ws>/.code-notes/.locks, so
// this exercises real cross-process serialization, not a mock.
//
// The brief's "audit/lock files reflect both holders" bullet is intentionally not
// implemented: lock files are deleted on release and there is no audit trail yet —
// audit mode ships with the v0.5 trust model. The lock-serialization property is
// instead verified deterministically by the held-lock contention test below.

const distIndex = fileURLToPath(new URL('../dist/index.js', import.meta.url));

/** Minimal newline-delimited JSON-RPC client over the server's stdio. */
class RpcClient {
  private buf = '';
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  constructor(private child: ChildProcessWithoutNullStreams) {
    child.stdout.on('data', (d) => this.onData(d));
  }

  private onData(chunk: Buffer): void {
    // A stdout chunk may carry zero, one, or several complete lines plus a
    // partial; keep the remainder in the buffer and match responses by id.
    this.buf += chunk.toString('utf-8');
    let nl: number;
    while ((nl = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, nl).trim();
      this.buf = this.buf.slice(nl + 1);
      if (!line) continue;
      let msg: any;
      try { msg = JSON.parse(line); } catch { continue; }
      const waiter = msg.id != null ? this.pending.get(msg.id) : undefined;
      if (!waiter) continue;
      this.pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(`rpc error: ${JSON.stringify(msg.error)}`));
      else waiter.resolve(msg.result);
    }
  }

  request(method: string, params: unknown): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`rpc timeout: ${method}`));
      }, 10_000);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  notify(method: string, params: unknown): void {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }
}

/** MCP tool result → the parsed in-band JSON object (note or { error }). */
async function callTool(rpc: RpcClient, name: string, args: unknown): Promise<any> {
  const result = await rpc.request('tools/call', { name, arguments: args });
  return JSON.parse(result.content[0].text);
}

/** Build the extension-side stack pointed at the same storage + locks as the server. */
function buildInProcessStack(tempDir: string) {
  const storage = new StorageManager(tempDir, '.code-notes');
  const authorProvider: AuthorProvider = {
    getAuthorName: async () => 'extension-user',
    updateConfigOverride: () => {},
  };
  const lockManager = new LockManager(path.join(tempDir, '.code-notes', '.locks'), 'extension');
  const noteManager = new NoteManager(storage, new ContentHashTracker(), authorProvider, { lockManager });
  return { storage, noteManager };
}

function isLockTimeout(e: unknown): boolean {
  return e instanceof Error && e.message.includes('lock_timeout');
}

describe('extension + MCP cross-process race (spec §8.3)', () => {
  let tempDir: string;
  let child: ChildProcessWithoutNullStreams;
  let rpc: RpcClient;
  let stderr = '';

  beforeAll(() => {
    if (!existsSync(distIndex)) {
      throw new Error(`built server not found at ${distIndex} — run \`npm run build -w @jnahian/code-notes-mcp\` first`);
    }
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'race-test-'));
    child = spawn('node', [distIndex, '--workspace', tempDir, '--agent', 'mcp-agent'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    rpc = new RpcClient(child);
    child.on('exit', (code) => {
      if (code) console.error(`server exited early (code ${code}). stderr:\n${stderr}`);
    });

    await rpc.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'race-test', version: '0.0.0' },
    });
    rpc.notify('notifications/initialized', {});
  });

  afterEach(async () => {
    child.kill('SIGKILL');
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('concurrent create of two notes on the same file persists both, uncorrupted', async () => {
    const rel = path.join('src', 'app.ts');
    const absFile = path.join(tempDir, rel);
    await fs.mkdir(path.dirname(absFile), { recursive: true });
    await fs.writeFile(absFile, 'line0\nline1\nline2\n');

    const { noteManager } = buildInProcessStack(tempDir);
    const doc = await buildDocumentFromFile(absFile);

    const [mcpNote, extNote] = await Promise.all([
      callTool(rpc, 'create_note', { file: rel, lineRange: { start: 0, end: 1 }, content: 'from MCP' }),
      noteManager.createNote({ filePath: absFile, lineRange: { start: 1, end: 2 }, content: 'from extension' }, doc),
    ]);

    expect(mcpNote.error).toBeUndefined();
    expect(mcpNote.content).toBe('from MCP');
    expect(extNote.content).toBe('from extension');
    expect(mcpNote.id).not.toBe(extNote.id);

    // Read from disk truth via a fresh stack (no shared in-memory cache).
    const fresh = buildInProcessStack(tempDir);
    const all = await fresh.noteManager.getAllNotes();
    expect(all).toHaveLength(2);
    expect(new Set(all.map((n) => n.content))).toEqual(new Set(['from MCP', 'from extension']));
  }, 20_000);

  it('concurrent edit of the same note leaves valid, non-interleaved content', async () => {
    const rel = 'shared.ts';
    const absFile = path.join(tempDir, rel);
    await fs.writeFile(absFile, 'alpha\nbeta\ngamma\n');

    const { noteManager } = buildInProcessStack(tempDir);
    const doc = await buildDocumentFromFile(absFile);
    const created = await noteManager.createNote(
      { filePath: absFile, lineRange: { start: 0, end: 0 }, content: 'original' },
      doc,
    );

    // ponytail: the in-process write finishes before the MCP round-trip lands, so
    // lock_timeout essentially never fires here — this test only asserts that
    // neither ordering corrupts the note. Deterministic lock contention is
    // forced by the held-lock test below.
    const [mcpOut, extOut] = await Promise.allSettled([
      callTool(rpc, 'edit_note', { id: created.id, content: 'MCP edit' }),
      noteManager.updateNote({ id: created.id, content: 'extension edit' }, doc),
    ]);

    // Each side must either succeed or fail only with a retryable lock_timeout.
    if (mcpOut.status === 'fulfilled' && mcpOut.value.error) {
      expect(mcpOut.value).toEqual({ error: 'lock_timeout', retryable: true });
    }
    if (extOut.status === 'rejected') {
      expect(isLockTimeout(extOut.reason)).toBe(true);
    }

    // Final on-disk note parses cleanly and holds exactly one of the two writes.
    const fresh = buildInProcessStack(tempDir);
    const final = await fresh.noteManager.getNoteByIdGlobal(created.id);
    expect(final).toBeDefined();
    expect(['MCP edit', 'extension edit']).toContain(final!.content);
    expect(Array.isArray(final!.history)).toBe(true);

    // Whichever write landed second must have built on the first, not erased
    // it: when both succeed, both edits survive in history.
    const bothSucceeded = extOut.status === 'fulfilled'
      && mcpOut.status === 'fulfilled' && !mcpOut.value.error;
    if (bothSucceeded) {
      expect(final!.history.map((h: { content: string }) => h.content)).toEqual(
        expect.arrayContaining(['MCP edit', 'extension edit']),
      );
    }
  }, 20_000);

  it('does not erase an external edit made after the server warmed its cache', async () => {
    const rel = 'warm.ts';
    const absFile = path.join(tempDir, rel);
    await fs.writeFile(absFile, 'one\ntwo\n');

    const { noteManager } = buildInProcessStack(tempDir);
    const doc = await buildDocumentFromFile(absFile);
    const created = await noteManager.createNote(
      { filePath: absFile, lineRange: { start: 0, end: 0 }, content: 'original' },
      doc,
    );

    // 1. Agent reads the file's notes — the server's caches are now warm.
    const warmed = await callTool(rpc, 'get_notes_for_file', { file: rel });
    expect(warmed.direct[0].content).toBe('original');

    // 2. The user edits the same note in VS Code (a different process).
    await noteManager.updateNote({ id: created.id, content: 'user edit' }, doc);

    // 3. The agent re-reads: it must see the user's edit, not its warm cache.
    const reread = await callTool(rpc, 'get_notes_for_file', { file: rel });
    expect(reread.direct[0].content).toBe('user edit');

    // 4. The agent edits. The user's edit must survive in history — a cached
    //    read-modify-write here would silently drop it.
    const edited = await callTool(rpc, 'edit_note', { id: created.id, content: 'agent edit' });
    expect(edited.error).toBeUndefined();

    const fresh = buildInProcessStack(tempDir);
    const final = await fresh.noteManager.getNoteByIdGlobal(created.id);
    expect(final!.content).toBe('agent edit');
    expect(final!.history.map((h: { content: string }) => h.content)).toEqual([
      'original',
      'user edit',
      'agent edit',
    ]);
  }, 20_000);

  it('returns retryable lock_timeout while another process holds the note lock, then succeeds on retry', async () => {
    const absFile = path.join(tempDir, 'locked.ts');
    await fs.writeFile(absFile, 'one\n');

    const { noteManager } = buildInProcessStack(tempDir);
    const doc = await buildDocumentFromFile(absFile);
    const created = await noteManager.createNote(
      { filePath: absFile, lineRange: { start: 0, end: 0 }, content: 'original' },
      doc,
    );

    // Hold the note's lock from this process; the server's default 500ms retry
    // budget must expire into an in-band, retryable lock_timeout. This is the
    // deterministic proof that the server actually honors cross-process locks —
    // it fails if LockManager wiring is removed from the MCP write path.
    const contender = new LockManager(path.join(tempDir, '.code-notes', '.locks'), 'test-contender');
    await contender.acquire(created.id);
    try {
      const denied = await callTool(rpc, 'edit_note', { id: created.id, content: 'MCP edit while locked' });
      expect(denied).toEqual({ error: 'lock_timeout', retryable: true });
    } finally {
      await contender.release(created.id);
    }

    // README's retry-once guidance: after release, the same call succeeds.
    const retried = await callTool(rpc, 'edit_note', { id: created.id, content: 'MCP edit after release' });
    expect(retried.error).toBeUndefined();
    expect(retried.content).toBe('MCP edit after release');

    const fresh = buildInProcessStack(tempDir);
    const final = await fresh.noteManager.getNoteByIdGlobal(created.id);
    expect(final!.content).toBe('MCP edit after release');
  }, 20_000);
});
