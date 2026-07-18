import * as fs from 'fs/promises';
import * as path from 'path';
import type { AgentWriteMode, WorkspaceConfig } from './types.js';

const CONFIG_FILE = 'config.json';
const MODES: AgentWriteMode[] = ['direct', 'audit', 'queue'];

/** Safe by default: agent writes are logged and reviewable unless a workspace opts out. */
export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  agentWriteMode: 'audit',
  agentAllowList: [],
  auditLogRetention: 1000,
};

export function getConfigPath(storagePath: string): string {
  return path.join(storagePath, CONFIG_FILE);
}

/**
 * Read the workspace config, falling back to defaults field-by-field. A
 * malformed or partial config must never break note-taking: the worst case
 * is that the workspace runs in the default (audit) mode.
 */
export async function readWorkspaceConfig(storagePath: string): Promise<WorkspaceConfig> {
  let raw: string;
  try {
    raw = await fs.readFile(getConfigPath(storagePath), 'utf-8');
  } catch {
    return { ...DEFAULT_WORKSPACE_CONFIG };
  }

  let parsed: Partial<WorkspaceConfig>;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn(`[code-notes-core] ignoring malformed ${CONFIG_FILE}: ${(e as Error).message}`);
    return { ...DEFAULT_WORKSPACE_CONFIG };
  }

  const mode = parsed.agentWriteMode;
  if (mode !== undefined && !MODES.includes(mode)) {
    console.warn(`[code-notes-core] unknown agentWriteMode "${mode}" — using "${DEFAULT_WORKSPACE_CONFIG.agentWriteMode}"`);
  }

  // This file is hand-edited and travels in the repo, so treat it as untrusted
  // input: a value that merely has the right typeof still has to make sense.
  const allowList = parsed.agentAllowList;
  const retention = parsed.auditLogRetention;

  return {
    agentWriteMode: mode !== undefined && MODES.includes(mode) ? mode : DEFAULT_WORKSPACE_CONFIG.agentWriteMode,
    agentAllowList: Array.isArray(allowList) && allowList.every(a => typeof a === 'string')
      ? allowList
      : DEFAULT_WORKSPACE_CONFIG.agentAllowList,
    // <= 0 would rotate the whole log on every append. Number.isFinite is
    // belt-and-braces for programmatic callers — NaN/Infinity can't survive
    // JSON.parse, so a config file can't get them here.
    auditLogRetention: typeof retention === 'number' && Number.isFinite(retention) && retention > 0
      ? retention
      : DEFAULT_WORKSPACE_CONFIG.auditLogRetention,
  };
}

export async function writeWorkspaceConfig(storagePath: string, config: WorkspaceConfig): Promise<void> {
  await fs.mkdir(storagePath, { recursive: true });
  await fs.writeFile(getConfigPath(storagePath), `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
}
