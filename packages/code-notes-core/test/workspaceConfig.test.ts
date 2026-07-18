import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { readWorkspaceConfig, writeWorkspaceConfig, DEFAULT_WORKSPACE_CONFIG } from '../src/workspaceConfig.js';

describe('workspaceConfig', () => {
  let storagePath: string;

  beforeEach(async () => {
    storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'ws-config-test-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(storagePath, { recursive: true, force: true });
  });

  it('defaults to audit mode when no config file exists', async () => {
    const config = await readWorkspaceConfig(storagePath);
    expect(config).toEqual(DEFAULT_WORKSPACE_CONFIG);
    expect(config.agentWriteMode).toBe('audit');
  });

  it('round-trips a written config', async () => {
    await writeWorkspaceConfig(storagePath, {
      agentWriteMode: 'queue',
      agentAllowList: ['claude-code'],
      auditLogRetention: 500,
    });
    const config = await readWorkspaceConfig(storagePath);
    expect(config.agentWriteMode).toBe('queue');
    expect(config.agentAllowList).toEqual(['claude-code']);
    expect(config.auditLogRetention).toBe(500);
  });

  it('falls back to defaults on malformed JSON rather than throwing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.writeFile(path.join(storagePath, 'config.json'), '{ not json');
    const config = await readWorkspaceConfig(storagePath);
    expect(config).toEqual(DEFAULT_WORKSPACE_CONFIG);
  });

  it('falls back to the default mode for an unrecognized mode value, keeping valid siblings', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.writeFile(
      path.join(storagePath, 'config.json'),
      JSON.stringify({ agentWriteMode: 'yolo', auditLogRetention: 42 }),
    );
    const config = await readWorkspaceConfig(storagePath);
    expect(config.agentWriteMode).toBe('audit');
    expect(config.auditLogRetention).toBe(42);
  });

  it('rejects a non-string allow-list rather than handing on a lying string[]', async () => {
    await fs.writeFile(
      path.join(storagePath, 'config.json'),
      JSON.stringify({ agentAllowList: [1, {}, 'claude-code'] }),
    );
    const config = await readWorkspaceConfig(storagePath);
    expect(config.agentAllowList).toEqual([]);
  });

  // NaN/Infinity aren't JSON literals, so they can't reach the guard through a
  // config file — only these two can.
  it.each([['zero', 0], ['negative', -5]])(
    'falls back to the default retention for %s, which would rotate the log on every append',
    async (_label, value) => {
      await fs.writeFile(
        path.join(storagePath, 'config.json'),
        JSON.stringify({ auditLogRetention: value }),
      );
      const config = await readWorkspaceConfig(storagePath);
      expect(config.auditLogRetention).toBe(DEFAULT_WORKSPACE_CONFIG.auditLogRetention);
    },
  );
});
