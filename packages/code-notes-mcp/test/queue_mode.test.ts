import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  StorageManager, NoteManager, ContentHashTracker, ProposalStore, writeWorkspaceConfig,
} from '@jnahian/code-notes-core';
import { handleToolCall } from '../src/server.js';

describe('queue mode via the MCP dispatch', () => {
  let tempDir: string;
  let noteManager: NoteManager;
  let store: ProposalStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'queue-mode-test-'));
    const storagePath = path.join(tempDir, '.code-notes');
    await writeWorkspaceConfig(storagePath, {
      agentWriteMode: 'queue',
      agentAllowList: [],
      auditLogRetention: 1000,
    });
    store = new ProposalStore(path.join(storagePath, '_pending'));
    noteManager = new NoteManager(
      new StorageManager(tempDir, '.code-notes'),
      new ContentHashTracker(),
      { getAuthorName: async () => 'claude-code', updateConfigOverride: () => {} },
      {
        proposalStore: store,
        agentWriteMode: async () => 'queue',
        agentName: 'claude-code',
      },
    );
    await fs.writeFile(path.join(tempDir, 'app.ts'), 'line0\n');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns the pending shape instead of a note, and writes a proposal', async () => {
    const r = await handleToolCall(
      'create_note',
      { file: 'app.ts', lineRange: { start: 0, end: 0 }, content: 'proposed' },
      { noteManager, workspace: tempDir, readOnly: false },
    );
    const parsed = JSON.parse(r.content[0].text);

    expect(parsed.status).toBe('pending');
    expect(parsed.proposalId).toMatch(/^prop-/);
    expect(parsed.message).toContain('approval');
    // Not an error — agents must not treat this as retryable.
    expect(parsed.error).toBeUndefined();

    expect(await store.list()).toHaveLength(1);
    expect(await noteManager.getAllNotes()).toHaveLength(0);
  });

  it('reports pending for add_handoff too, which funnels through create', async () => {
    const r = await handleToolCall(
      'add_handoff',
      { file: 'app.ts', lineRange: { start: 0, end: 0 }, content: 'pick up here' },
      { noteManager, workspace: tempDir, readOnly: false },
    );
    const parsed = JSON.parse(r.content[0].text);

    expect(parsed.status).toBe('pending');
    expect(await noteManager.getAllNotes()).toHaveLength(0);
  });
});
