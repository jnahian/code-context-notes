import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  StorageManager, NoteManager, LockManager, ContentHashTracker, AuthorProvider,
  AuditLog, ProposalStore, PendingWriteError, readWorkspaceConfig,
} from '@jnahian/code-notes-core';
import { getNoteToolDef, getNoteInput, getNote } from './tools/get_note.js';
import { getNotesForFileToolDef, getNotesForFileInput, getNotesForFile } from './tools/get_notes_for_file.js';
import { listInstructionsToolDef, listInstructionsInput, listInstructions } from './tools/list_instructions.js';
import { getHandoffsToolDef, getHandoffsInput, getHandoffs } from './tools/get_handoffs.js';
import { searchNotesToolDef, searchNotesInput, searchNotes } from './tools/search_notes.js';
import { getNotesForChangesToolDef, getNotesForChanges } from './tools/get_notes_for_changes.js';
import { createNoteToolDef, createNoteInput, createNote } from './tools/create_note.js';
import { editNoteToolDef, editNoteInput, editNote } from './tools/edit_note.js';
import { deleteNoteToolDef, deleteNoteInput, deleteNote } from './tools/delete_note.js';
import { addHandoffToolDef, addHandoffInput, addHandoff } from './tools/add_handoff.js';
import { addDecisionToolDef, addDecisionInput, addDecision } from './tools/add_decision.js';
import { errorResult, pendingResult } from './tools/errors.js';
import { digestResourceDef, readDigest } from './resources/digest.js';
import { indexResourceDef, readIndex } from './resources/indexResource.js';
import { FILE_RESOURCE_URI_PREFIX, readFileResource } from './resources/file.js';

const READ_TOOLS = [
  getNoteToolDef,
  getNotesForFileToolDef,
  listInstructionsToolDef,
  getHandoffsToolDef,
  searchNotesToolDef,
  getNotesForChangesToolDef,
];

const WRITE_TOOLS = [
  createNoteToolDef,
  editNoteToolDef,
  deleteNoteToolDef,
  addHandoffToolDef,
  addDecisionToolDef,
];

const WRITE_TOOL_NAMES = new Set(WRITE_TOOLS.map(t => t.name));

/** Exported for testing: the tool list depends only on readOnly, no live transport needed. */
export function buildToolList(readOnly: boolean) {
  return readOnly ? READ_TOOLS : [...READ_TOOLS, ...WRITE_TOOLS];
}

/**
 * Validate args against a tool's zod schema without throwing: bad arguments
 * are a normal tool failure (invalid_arguments), not a protocol-level error.
 */
function parseOrError<T>(
  schema: z.ZodType<T>,
  args: unknown,
): { ok: true; data: T } | { ok: false; response: ReturnType<typeof errorResult> } {
  const result = schema.safeParse(args);
  if (!result.success) {
    const detail = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { ok: false, response: errorResult('invalid_arguments', { detail }) };
  }
  return { ok: true, data: result.data };
}

/** Exported for testing: dispatch a tool call without a live transport. */
export async function handleToolCall(
  name: string,
  args: unknown,
  deps: { noteManager: NoteManager; workspace: string; readOnly: boolean },
) {
  if (deps.readOnly && WRITE_TOOL_NAMES.has(name)) {
    return errorResult('read_only_mode', { detail: 'start the server with --agent <name> to enable writes' });
  }

  // ponytail: drop every cache before each call. NoteManager's caches assume a
  // single-process editor with a file watcher to invalidate them; this server is
  // long-lived, has no watcher, and the extension writes the same files behind
  // its back — so a warm cache is always a stale-read risk. Re-reading per call
  // is fine at MCP call volume; revisit only if a workspace gets big enough for
  // it to hurt (then a watcher, not a longer-lived cache).
  deps.noteManager.clearAllCache();

  try {
    return await dispatchToolCall(name, args, deps);
  } catch (e) {
    // Queue mode diverted the write to a proposal — the expected outcome in
    // that mode, not a failure.
    if (e instanceof PendingWriteError) return pendingResult(e.proposalId);
    // Last-resort guard: anything a tool still throws (e.g. an unexpected
    // failure after a note was already created) becomes an in-band error, so
    // tool failures are never surfaced as JSON-RPC protocol errors.
    return errorResult('internal_error', { detail: e instanceof Error ? e.message : String(e) });
  }
}

async function dispatchToolCall(
  name: string,
  args: unknown,
  deps: { noteManager: NoteManager; workspace: string; readOnly: boolean },
) {
  switch (name) {
    case 'get_note': {
      const p = parseOrError(getNoteInput, args);
      return p.ok ? getNote(p.data, { noteManager: deps.noteManager }) : p.response;
    }
    case 'get_notes_for_file': {
      const p = parseOrError(getNotesForFileInput, args);
      return p.ok ? getNotesForFile(p.data, { noteManager: deps.noteManager, workspace: deps.workspace }) : p.response;
    }
    case 'list_instructions': {
      const p = parseOrError(listInstructionsInput, args);
      return p.ok ? listInstructions(p.data, { noteManager: deps.noteManager }) : p.response;
    }
    case 'get_handoffs': {
      const p = parseOrError(getHandoffsInput, args);
      return p.ok ? getHandoffs(p.data, { noteManager: deps.noteManager }) : p.response;
    }
    case 'search_notes': {
      const p = parseOrError(searchNotesInput, args);
      return p.ok ? searchNotes(p.data, { noteManager: deps.noteManager, workspace: deps.workspace }) : p.response;
    }
    // get_notes_for_changes validates its own raw args internally (safeParse)
    // so that a missing files/diff produces an in-band error, not a thrown one.
    case 'get_notes_for_changes': return getNotesForChanges(args, { noteManager: deps.noteManager, workspace: deps.workspace });
    case 'create_note': {
      const p = parseOrError(createNoteInput, args);
      return p.ok ? createNote(p.data, { noteManager: deps.noteManager, workspace: deps.workspace }) : p.response;
    }
    case 'edit_note': {
      const p = parseOrError(editNoteInput, args);
      return p.ok ? editNote(p.data, { noteManager: deps.noteManager }) : p.response;
    }
    case 'delete_note': {
      const p = parseOrError(deleteNoteInput, args);
      return p.ok ? deleteNote(p.data, { noteManager: deps.noteManager }) : p.response;
    }
    case 'add_handoff': {
      const p = parseOrError(addHandoffInput, args);
      return p.ok ? addHandoff(p.data, { noteManager: deps.noteManager, workspace: deps.workspace }) : p.response;
    }
    case 'add_decision': {
      const p = parseOrError(addDecisionInput, args);
      return p.ok ? addDecision(p.data, { noteManager: deps.noteManager, workspace: deps.workspace }) : p.response;
    }
    default: return errorResult('invalid_arguments', { detail: `unknown tool: ${name}` });
  }
}

export interface StartArgs {
  workspace: string;
  agent?: string;
  requireExisting?: boolean;
  storageDir?: string;
}

export async function startServer(args: StartArgs): Promise<void> {
  // Resolve and validate workspace
  const workspace = path.resolve(args.workspace);
  const storageDir = args.storageDir ?? '.code-notes';
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
  const storagePath = path.join(workspace, storageDir);
  const auditLog = new AuditLog(path.join(storagePath, '_audit.log'), {
    lockManager,
    retention: (await readWorkspaceConfig(storagePath)).auditLogRetention,
  });
  const proposalStore = new ProposalStore(path.join(storagePath, '_pending'));
  const noteManager = new NoteManager(storage, hashTracker, authorProvider, {
    lockManager,
    auditLog,
    proposalStore,
    // Re-read per call, never captured: a human can change the mode while this
    // long-lived server runs, and a cached policy is a policy that lies.
    agentWriteMode: async () => (await readWorkspaceConfig(storagePath)).agentWriteMode,
    agentName: args.agent ?? 'unknown-agent',
    // This server is the agent: every write it makes is an agent write,
    // whatever note it targets.
    agentWriter: true,
  });

  const readOnly = !args.agent;
  const server = new Server(
    { name: 'code-notes', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: buildToolList(readOnly),
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [digestResourceDef, indexResourceDef],
    // code-notes://file/{path} is dynamic (per-file) and intentionally not enumerated.
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    // Same reason as handleToolCall: no watcher, and the extension writes these
    // notes behind our back — a warm cache would serve a stale resource.
    noteManager.clearAllCache();
    const uri = request.params.uri;
    try {
      if (uri === digestResourceDef.uri) return await readDigest({ workspace, storageDir, noteManager });
      if (uri === indexResourceDef.uri) return await readIndex({ workspace, storageDir, noteManager });
      if (uri.startsWith(FILE_RESOURCE_URI_PREFIX)) return await readFileResource(uri, { workspace, noteManager });
    } catch (e) {
      // Same contract as handleToolCall: a failed read of a known resource
      // (malformed URI, I/O error) returns in-band error text, never a
      // JSON-RPC protocol error.
      return { contents: [{ uri, mimeType: 'text/plain', text: `Error: ${e instanceof Error ? e.message : String(e)}` }] };
    }
    // Genuinely unknown URI — a real "resource not found", distinct from a read
    // that failed mid-flight; surface it as a protocol error.
    throw new Error(`unknown resource: ${uri}`);
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request.params.name, request.params.arguments, { noteManager, workspace, readOnly });
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[code-notes-mcp] ready (workspace=${workspace}, mode=${readOnly ? 'read-only' : 'read-write'}, agent=${args.agent ?? 'none'})`);
}
