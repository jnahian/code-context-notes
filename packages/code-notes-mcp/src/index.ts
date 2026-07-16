#!/usr/bin/env node
import { startServer } from './server.js';
import { parseArgs } from './parseArgs.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await startServer(args);
}

main().catch(e => { console.error(e); process.exit(1); });
