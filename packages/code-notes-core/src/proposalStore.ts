import * as fs from 'fs/promises';
import * as path from 'path';
import type { Proposal } from './types.js';

/**
 * Thrown by NoteManager when queue mode diverts an agent write. Not an
 * error condition for the human — it is the expected outcome in queue mode,
 * and the MCP layer turns it into a `{ status: 'pending' }` result.
 */
export class PendingWriteError extends Error {
  constructor(readonly proposalId: string) {
    super(`pending_approval: ${proposalId}`);
    this.name = 'PendingWriteError';
  }
}

const REJECTED_DIR = '.rejected';

/**
 * ponytail: proposals are markdown-with-frontmatter, hand-serialized like
 * notes are, rather than pulling in a YAML dependency for six scalar fields.
 * If the shape grows past scalars + one body, switch to the same serializer
 * StorageManager uses.
 */
export class ProposalStore {
  constructor(private pendingDir: string) {}

  private filePath(proposalId: string): string {
    return path.join(this.pendingDir, `${proposalId}.md`);
  }

  async save(p: Proposal): Promise<void> {
    await fs.mkdir(this.pendingDir, { recursive: true });
    const lines = [
      '---',
      `proposalId: ${p.proposalId}`,
      `op: ${p.op}`,
      ...(p.targetNoteId ? [`targetNoteId: ${p.targetNoteId}`] : []),
      `file: ${p.file}`,
      ...(p.lineRange ? [`lineRange: [${p.lineRange.start}, ${p.lineRange.end}]`] : []),
      `agent: ${p.agent}`,
      `proposedAt: ${p.proposedAt}`,
      ...(p.targetContentHash ? [`targetContentHash: ${p.targetContentHash}`] : []),
      '---',
      p.content,
    ];
    await fs.writeFile(this.filePath(p.proposalId), `${lines.join('\n')}\n`, 'utf-8');
  }

  async load(proposalId: string): Promise<Proposal | null> {
    try {
      return this.parse(await fs.readFile(this.filePath(proposalId), 'utf-8'));
    } catch {
      return null;
    }
  }

  /** Oldest-first: the review queue reads like a queue. */
  async list(): Promise<Proposal[]> {
    let files: string[];
    try {
      // Non-recursive, and the .md filter is what drops the `.rejected`
      // directory entry — that is the only thing keeping rejected proposals
      // out of the live queue. Make this recursive and every rejection
      // silently comes back.
      files = (await fs.readdir(this.pendingDir)).filter(f => f.endsWith('.md'));
    } catch {
      return [];
    }

    const proposals: Proposal[] = [];
    for (const f of files) {
      try {
        const parsed = this.parse(await fs.readFile(path.join(this.pendingDir, f), 'utf-8'));
        if (parsed) proposals.push(parsed);
      } catch {
        // One bad file must not hide the rest of the queue.
      }
    }
    proposals.sort((a, b) => a.proposedAt.localeCompare(b.proposedAt));
    return proposals;
  }

  /** Keep rejected proposals for audit rather than deleting them. */
  async reject(proposalId: string): Promise<void> {
    const rejectedDir = path.join(this.pendingDir, REJECTED_DIR);
    await fs.mkdir(rejectedDir, { recursive: true });
    await fs.rename(this.filePath(proposalId), path.join(rejectedDir, `${proposalId}.md`));
  }

  async remove(proposalId: string): Promise<void> {
    await fs.unlink(this.filePath(proposalId)).catch(() => undefined);
  }

  private parse(raw: string): Proposal | null {
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    if (!match) return null;

    const fields: Record<string, string> = {};
    for (const line of match[1].split('\n')) {
      const idx = line.indexOf(': ');
      if (idx > 0) fields[line.slice(0, idx)] = line.slice(idx + 2).trim();
    }
    if (!fields.proposalId || !fields.op) return null;

    const range = /\[(\d+),\s*(\d+)\]/.exec(fields.lineRange ?? '');
    return {
      proposalId: fields.proposalId,
      op: fields.op as Proposal['op'],
      ...(fields.targetNoteId && { targetNoteId: fields.targetNoteId }),
      file: fields.file ?? '',
      ...(range && { lineRange: { start: Number(range[1]), end: Number(range[2]) } }),
      agent: fields.agent ?? 'unknown-agent',
      proposedAt: fields.proposedAt ?? '',
      ...(fields.targetContentHash && { targetContentHash: fields.targetContentHash }),
      content: match[2].replace(/\n$/, ''),
    };
  }
}
