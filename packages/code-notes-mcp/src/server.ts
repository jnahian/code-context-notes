import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  StorageManager, NoteManager, LockManager, ContentHashTracker, AuthorProvider,
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
import { errorResult } from './tools/errors.js';

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
];

const WRITE_TOOL_NAMES = new Set(WRITE_TOOLS.map(t => t.name));

/** Exported for testing: the tool list depends only on readOnly, no live transport needed. */
export function buildToolList(readOnly: boolean) {
  return readOnly ? READ_TOOLS : [...READ_TOOLS, ...WRITE_TOOLS];
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

  switch (name) {
    case 'get_note': return getNote(getNoteInput.parse(args), { noteManager: deps.noteManager });
    case 'get_notes_for_file': return getNotesForFile(getNotesForFileInput.parse(args), { noteManager: deps.noteManager, workspace: deps.workspace });
    case 'list_instructions': return listInstructions(listInstructionsInput.parse(args), { noteManager: deps.noteManager });
    case 'get_handoffs': return getHandoffs(getHandoffsInput.parse(args), { noteManager: deps.noteManager });
    case 'search_notes': return searchNotes(searchNotesInput.parse(args), { noteManager: deps.noteManager, workspace: deps.workspace });
    // get_notes_for_changes validates its own raw args internally (safeParse)
    // so that a missing files/diff produces an in-band error, not a thrown one.
    case 'get_notes_for_changes': return getNotesForChanges(args, { noteManager: deps.noteManager, workspace: deps.workspace });
    case 'create_note': return createNote(createNoteInput.parse(args), { noteManager: deps.noteManager, workspace: deps.workspace });
    case 'edit_note': return editNote(editNoteInput.parse(args), { noteManager: deps.noteManager });
    case 'delete_note': return deleteNote(deleteNoteInput.parse(args), { noteManager: deps.noteManager });
    default: throw new Error(`unknown tool: ${name}`);
  }
}

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

  // Resources registered in a subsequent task
  // registerResources(server, { workspace, storageDir });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: buildToolList(readOnly),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request.params.name, request.params.arguments, { noteManager, workspace, readOnly });
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[code-notes-mcp] ready (workspace=${workspace}, mode=${readOnly ? 'read-only' : 'read-write'}, agent=${args.agent ?? 'none'})`);
}
