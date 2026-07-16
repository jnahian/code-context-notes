import { describe, it, expect } from 'vitest';
import { buildToolList, handleToolCall } from '../src/server.js';

describe('server read-only gating', () => {
  it('ListTools omits write tools when readOnly', () => {
    const tools = buildToolList(true).map(t => t.name);
    expect(tools).toEqual(expect.arrayContaining(['get_note', 'search_notes']));
    expect(tools).not.toEqual(expect.arrayContaining(['create_note', 'edit_note', 'delete_note', 'add_handoff', 'add_decision']));
  });

  it('ListTools includes write tools when not readOnly', () => {
    const tools = buildToolList(false).map(t => t.name);
    expect(tools).toEqual(expect.arrayContaining(['create_note', 'edit_note', 'delete_note', 'add_handoff', 'add_decision']));
  });

  it('CallTool returns read_only_mode in-band for a write tool when readOnly, instead of dispatching', async () => {
    // noteManager is never touched because the gate short-circuits before dispatch.
    const fakeNoteManager: any = { createNote: () => { throw new Error('should not be called'); } };
    const r = await handleToolCall(
      'create_note',
      { file: 'x.ts', lineRange: { start: 0, end: 0 }, content: 'hi' },
      { noteManager: fakeNoteManager, workspace: '/tmp', readOnly: true },
    );
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.error).toBe('read_only_mode');
  });

  it('CallTool still dispatches read tools when readOnly', async () => {
    const fakeNoteManager: any = { getNoteByIdGlobal: async () => ({ id: 'a', content: 'hi' }) };
    const r = await handleToolCall('get_note', { id: 'a' }, { noteManager: fakeNoteManager, workspace: '/tmp', readOnly: true });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.id).toBe('a');
  });
});
