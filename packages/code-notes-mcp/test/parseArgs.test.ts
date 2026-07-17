import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseArgs } from '../src/parseArgs.js';

describe('parseArgs', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('parses --workspace, --agent, and --require-existing', () => {
		const args = parseArgs(['--workspace', '/tmp/ws', '--agent', 'claude-code', '--require-existing']);
		expect(args).toEqual({ workspace: '/tmp/ws', agent: 'claude-code', requireExisting: true, storageDir: '.code-notes' });
	});

	it('leaves agent undefined and requireExisting false when omitted', () => {
		const args = parseArgs(['--workspace', '/tmp/ws']);
		expect(args).toEqual({ workspace: '/tmp/ws', agent: undefined, requireExisting: false, storageDir: '.code-notes' });
	});

	it('parses --storage-dir, overriding the .code-notes default', () => {
		const args = parseArgs(['--workspace', '/tmp/ws', '--storage-dir', '.my-notes']);
		expect(args.storageDir).toBe('.my-notes');
	});

	it('exits with code 2 when --workspace is missing', () => {
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		parseArgs(['--agent', 'claude-code']);
		expect(exitSpy).toHaveBeenCalledWith(2);
	});

	it('prints usage and exits 0 on --help', () => {
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		parseArgs(['--help']);
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: code-notes-mcp'));
		expect(exitSpy).toHaveBeenCalledWith(0);
	});
});
