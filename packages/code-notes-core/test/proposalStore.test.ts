import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ProposalStore } from '../src/proposalStore.js';
import type { Proposal } from '../src/types.js';

const proposal = (id: string): Proposal => ({
  proposalId: id,
  op: 'create',
  file: 'src/app.ts',
  lineRange: { start: 1, end: 2 },
  agent: 'claude-code',
  proposedAt: '2026-07-17T00:00:00.000Z',
  content: 'proposed note body',
});

describe('ProposalStore', () => {
  let tempDir: string;
  let store: ProposalStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'proposal-test-'));
    store = new ProposalStore(path.join(tempDir, '_pending'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns an empty list before anything is proposed', async () => {
    expect(await store.list()).toEqual([]);
  });

  it('round-trips a proposal through disk', async () => {
    await store.save(proposal('prop-1'));
    const loaded = await store.load('prop-1');
    expect(loaded).toMatchObject({
      proposalId: 'prop-1',
      op: 'create',
      file: 'src/app.ts',
      agent: 'claude-code',
      content: 'proposed note body',
    });
    expect(loaded!.lineRange).toEqual({ start: 1, end: 2 });
  });

  it('lists proposals oldest-first', async () => {
    await store.save({ ...proposal('prop-1'), proposedAt: '2026-07-17T00:00:01.000Z' });
    await store.save({ ...proposal('prop-2'), proposedAt: '2026-07-17T00:00:00.000Z' });
    expect((await store.list()).map(p => p.proposalId)).toEqual(['prop-2', 'prop-1']);
  });

  it('reject moves the file to .rejected/ rather than deleting it', async () => {
    await store.save(proposal('prop-1'));
    await store.reject('prop-1');

    expect(await store.load('prop-1')).toBeNull();
    expect(await store.list()).toEqual([]);
    const rejected = await fs.readFile(path.join(tempDir, '_pending', '.rejected', 'prop-1.md'), 'utf-8');
    expect(rejected).toContain('proposed note body');
  });

  it('keeps rejected proposals out of the live queue even with others pending', async () => {
    await store.save(proposal('prop-1'));
    await store.save(proposal('prop-2'));
    await store.reject('prop-1');

    // The .rejected/ dir lives inside _pending/; a rejected proposal must
    // never come back through list().
    expect((await store.list()).map(p => p.proposalId)).toEqual(['prop-2']);
  });

  it('remove deletes an applied proposal', async () => {
    await store.save(proposal('prop-1'));
    await store.remove('prop-1');
    expect(await store.load('prop-1')).toBeNull();
  });

  it('skips an unparseable proposal file instead of failing the whole list', async () => {
    await store.save(proposal('prop-1'));
    await fs.writeFile(path.join(tempDir, '_pending', 'garbage.md'), 'no frontmatter here');
    expect((await store.list()).map(p => p.proposalId)).toEqual(['prop-1']);
  });
});
