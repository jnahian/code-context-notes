import * as assert from 'assert';
import { buildBlock, upsertManagedBlock, BLOCK_BEGIN, BLOCK_END } from '../../agentsLink.js';

suite('agentsLink', () => {
  const block = buildBlock('.code-notes');

  test('buildBlock references the configured storage dir', () => {
    const custom = buildBlock('.my-notes');
    assert.ok(custom.includes('.my-notes/AGENTS.md'));
    assert.ok(custom.includes('@.my-notes/AGENTS.md'));
    assert.ok(custom.startsWith(BLOCK_BEGIN));
    assert.ok(custom.endsWith(BLOCK_END));
  });

  test('inserts the block into an empty file', () => {
    const out = upsertManagedBlock('', block);
    assert.strictEqual(out, block + '\n');
  });

  test('appends without touching existing user content', () => {
    const existing = '# My Project\n\nHand-written guidance.\n';
    const out = upsertManagedBlock(existing, block);
    assert.ok(out.startsWith('# My Project\n\nHand-written guidance.'));
    assert.ok(out.includes(block));
    // one blank line of separation, user content intact
    assert.ok(out.includes('Hand-written guidance.\n\n' + BLOCK_BEGIN));
  });

  test('replaces only the managed block, preserving surrounding content', () => {
    const existing = `# Top\n\n${buildBlock('.old-notes')}\n\n## Footer\n`;
    const out = upsertManagedBlock(existing, block);
    assert.ok(out.startsWith('# Top'));
    assert.ok(out.includes('## Footer'));
    assert.ok(out.includes('.code-notes/AGENTS.md'));
    assert.ok(!out.includes('.old-notes'));
    // exactly one managed block remains
    assert.strictEqual(out.split(BLOCK_BEGIN).length - 1, 1);
  });

  test('is idempotent', () => {
    const once = upsertManagedBlock('# Doc\n\nstuff\n', block);
    const twice = upsertManagedBlock(once, block);
    assert.strictEqual(once, twice);
  });
});
