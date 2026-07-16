import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ExportWriter } from '../../exportWriter.js';
import { Note } from '../../types.js';

async function tmpdir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'cn-export-'));
}

const sampleNote = (id: string, ws: string): Note => ({
  id,
  content: `note ${id}`,
  author: 'alice',
  filePath: path.join(ws, 'src/foo.ts'),
  lineRange: { start: 0, end: 0 },
  contentHash: 'sha256:x',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  history: [],
});

suite('ExportWriter', () => {
  test('writes INDEX.json and AGENTS.md atomically', async () => {
    const ws = await tmpdir();
    await fs.mkdir(path.join(ws, '.code-notes'), { recursive: true });
    const writer = new ExportWriter(ws, '.code-notes', { debounceMs: 0 });
    await writer.regenerate([sampleNote('a', ws)]);
    const idxRaw = await fs.readFile(path.join(ws, '.code-notes', 'INDEX.json'), 'utf-8');
    const idx = JSON.parse(idxRaw);
    assert.strictEqual(idx.version, 1);
    assert.strictEqual(idx.notes[0].id, 'a');
    const digest = await fs.readFile(path.join(ws, '.code-notes', 'AGENTS.md'), 'utf-8');
    assert.ok(digest.startsWith('# Code Notes Digest'));
  });

  test('debounces rapid scheduleRegenerate calls', async () => {
    const ws = await tmpdir();
    await fs.mkdir(path.join(ws, '.code-notes'), { recursive: true });
    const writer = new ExportWriter(ws, '.code-notes', { debounceMs: 50 });
    let callCount = 0;
    const getNotes = async () => { callCount++; return [sampleNote(`n${callCount}`, ws)]; };
    writer.scheduleRegenerate(getNotes);
    writer.scheduleRegenerate(getNotes);
    writer.scheduleRegenerate(getNotes);
    await new Promise(r => setTimeout(r, 100));
    assert.strictEqual(callCount, 1, 'getNotes should be called once after debounce');
  });

  test('regeneration failure surfaces via onError without throwing', async () => {
    const ws = '/this/path/does/not/exist/anywhere';
    const writer = new ExportWriter(ws, '.code-notes', { debounceMs: 0 });
    let captured: Error | undefined;
    writer.onError = (e) => { captured = e; };
    await writer.regenerate([]);
    assert.ok(captured, 'onError should have been called');
  });
});
