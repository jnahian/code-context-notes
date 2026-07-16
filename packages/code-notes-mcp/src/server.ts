import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  StorageManager, NoteManager, LockManager, ContentHashTracker, AuthorProvider,
} from '@jnahian/code-notes-core';

export interface StartArgs {
  workspace: string;
  agent?: string;
  requireExisting?: boolean;
}

export async function startServer(args: StartArgs): Promise<void> {
  // Resolve and validate workspace
  const workspace = path.resolve(args.workspace);
  const storageDir = '.code-notes';
  const storageExists = await fs.stat(path.join(workspace, storageDir)).then(s => s.isDirectory()).catch(() => false);
  if (args.requireExisting && !storageExists) {
    console.error(`error: no .code-notes/ found at ${workspace}`);
    process.exit(3);
  }
  if (!storageExists) {
    console.error(`[code-notes-mcp] No existing notes at ${workspace}; starting in empty mode.`);
  }

  const storage = new StorageManager(workspace, storageDir);
  const lockManager = new LockManager(path.join(workspace, storageDir, '.locks'), args.agent ?? 'mcp');
  const hashTracker = new ContentHashTracker();
  // ponytail: no real author config to read here (MCP has no git-config concept); the
  // agent name comes from --agent and is fixed for the process lifetime.
  const authorProvider: AuthorProvider = {
    getAuthorName: async () => args.agent ?? 'unknown-agent',
    updateConfigOverride: () => {},
  };
  const noteManager = new NoteManager(storage, hashTracker, authorProvider, { lockManager });

  const readOnly = !args.agent;
  const server = new Server(
    { name: 'code-notes', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  // Tools/resources registered in subsequent tasks
  // registerReadTools(server, { noteManager, workspace, storageDir });
  // if (!readOnly) registerWriteTools(server, { noteManager, agent: args.agent! });
  // registerResources(server, { workspace, storageDir });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[code-notes-mcp] ready (workspace=${workspace}, mode=${readOnly ? 'read-only' : 'read-write'}, agent=${args.agent ?? 'none'})`);
}
