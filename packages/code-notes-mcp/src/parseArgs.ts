export interface ParsedArgs {
  workspace: string;
  agent?: string;
  requireExisting: boolean;
  storageDir: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: { workspace?: string; agent?: string; requireExisting: boolean; storageDir: string } =
    { requireExisting: false, storageDir: '.code-notes' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--workspace') out.workspace = argv[++i];
    else if (a === '--agent') out.agent = argv[++i];
    // Must match the extension's codeContextNotes.storageDirectory setting;
    // a mismatch means the server reads a different directory and takes its
    // locks elsewhere, so writes from the two sides stop being serialized.
    else if (a === '--storage-dir') out.storageDir = argv[++i];
    else if (a === '--require-existing') out.requireExisting = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: code-notes-mcp --workspace <path> [--agent <name>] [--storage-dir <name>] [--require-existing]');
      process.exit(0);
    }
  }
  if (!out.workspace) {
    console.error('error: --workspace <path> is required');
    process.exit(2);
  }
  return out as ParsedArgs;
}
