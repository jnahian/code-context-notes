export interface ParsedArgs {
  workspace: string;
  agent?: string;
  requireExisting: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: { workspace?: string; agent?: string; requireExisting: boolean } = { requireExisting: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--workspace') out.workspace = argv[++i];
    else if (a === '--agent') out.agent = argv[++i];
    else if (a === '--require-existing') out.requireExisting = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: code-notes-mcp --workspace <path> [--agent <name>] [--require-existing]');
      process.exit(0);
    }
  }
  if (!out.workspace) {
    console.error('error: --workspace <path> is required');
    process.exit(2);
  }
  return out as ParsedArgs;
}
