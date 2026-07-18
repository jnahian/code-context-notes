import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { digestResourceDef, readDigest } from '../src/resources/digest.js';

describe('digest resource', () => {
  let tempDir: string;
  const storageDir = '.test-notes';

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'digest-resource-test-'));
    await fs.mkdir(path.join(tempDir, storageDir), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('exposes the expected resource descriptor', () => {
    expect(digestResourceDef).toEqual({
      uri: 'code-notes://digest',
      name: 'AGENTS.md digest',
      mimeType: 'text/markdown',
    });
  });

  it('returns AGENTS.md content when present', async () => {
    await fs.writeFile(path.join(tempDir, storageDir, 'AGENTS.md'), '# Digest\n\nsome content', 'utf-8');

    const result = await readDigest({ workspace: tempDir, storageDir, noteManager: undefined as any });

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe('code-notes://digest');
    expect(result.contents[0].mimeType).toBe('text/markdown');
    expect(result.contents[0].text).toBe('# Digest\n\nsome content');
  });

  it('falls back to empty string when AGENTS.md is absent', async () => {
    const result = await readDigest({ workspace: tempDir, storageDir, noteManager: undefined as any });

    expect(result.contents[0].text).toBe('');
  });
});
