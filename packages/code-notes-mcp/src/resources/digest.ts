import * as fs from 'fs/promises';
import * as path from 'path';
import type { NoteManager } from '@jnahian/code-notes-core';

export const digestResourceDef = {
  uri: 'code-notes://digest',
  name: 'AGENTS.md digest',
  mimeType: 'text/markdown',
};

export interface DigestResourceDeps {
  workspace: string;
  storageDir: string;
  // ponytail: unused here, kept for a uniform deps shape across resources/*.ts
  noteManager: NoteManager;
}

export async function readDigest(deps: DigestResourceDeps) {
  const content = await fs
    .readFile(path.join(deps.workspace, deps.storageDir, 'AGENTS.md'), 'utf-8')
    .catch(() => '');
  return { contents: [{ uri: digestResourceDef.uri, mimeType: digestResourceDef.mimeType, text: content }] };
}
