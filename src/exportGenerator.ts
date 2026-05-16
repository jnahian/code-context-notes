/**
 * Pure functions that build the contents of INDEX.json and AGENTS.md
 * from a list of notes. No I/O — call these from exportWriter.
 */

import * as path from 'path';
import { Note, NoteType } from './types.js';
import { applyDefaults, isExpired } from './noteDefaults.js';

export interface IndexNoteEntry {
  id: string;
  filePath: string;
  lineRange: { start: number; end: number };
  type: NoteType;
  scope: string;
  tags: string[];
  priority: string;
  author: string;
  authorType: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  references: { kind: string; value: string; label?: string }[];
  contentPreview: string;
  contentPath: string;
}

export interface IndexFile {
  version: 1;
  generatedAt: string;
  workspaceRoot: string;
  notes: IndexNoteEntry[];
  byFile: Record<string, string[]>;
  byType: Record<string, string[]>;
  byTag: Record<string, string[]>;
  errors: { file: string; message: string }[];
}

const PREVIEW_MAX = 200;

function relativePath(absPath: string, workspaceRoot: string): string {
  return path.relative(workspaceRoot, absPath).split(path.sep).join('/');
}

function preview(content: string): string {
  const single = content.replace(/\s+/g, ' ').trim();
  return single.length <= PREVIEW_MAX ? single : single.slice(0, PREVIEW_MAX) + '…';
}

/**
 * Build the INDEX.json data. `now` is injectable for deterministic tests.
 */
export function buildIndex(rawNotes: Note[], workspaceRoot: string, now: Date = new Date()): IndexFile {
  const notes = rawNotes.map(applyDefaults);

  // Stable sort by id so output is deterministic for the same input set.
  const sorted = [...notes].sort((a, b) => a.id.localeCompare(b.id));

  const entries: IndexNoteEntry[] = sorted.map(n => ({
    id: n.id,
    filePath: relativePath(n.filePath, workspaceRoot),
    lineRange: n.lineRange,
    type: n.type!,
    scope: n.scope!,
    tags: n.tags!,
    priority: n.priority!,
    author: n.author,
    authorType: n.authorType!,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    expiresAt: n.expiresAt ?? null,
    isExpired: isExpired(n, now),
    references: n.references!,
    contentPreview: preview(n.content),
    contentPath: `.code-notes/${n.id}.md`,
  }));

  const byFile: Record<string, string[]> = {};
  const byType: Record<string, string[]> = {};
  const byTag: Record<string, string[]> = {};

  for (const e of entries) {
    (byFile[e.filePath] ??= []).push(e.id);
    (byType[e.type] ??= []).push(e.id);
    for (const t of e.tags) {
      (byTag[t] ??= []).push(e.id);
    }
  }

  return {
    version: 1,
    generatedAt: now.toISOString(),
    workspaceRoot,
    notes: entries,
    byFile,
    byType,
    byTag,
    errors: [],
  };
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };

/**
 * Build the AGENTS.md digest content.
 */
export function buildDigest(rawNotes: Note[], workspaceRoot: string, now: Date = new Date()): string {
  const notes = rawNotes.map(applyDefaults).filter(n => !isExpired(n, now));

  const out: string[] = [];
  out.push('# Code Notes Digest');
  out.push('*Auto-generated. Do not edit. Source: `.code-notes/INDEX.json`*');
  out.push('');

  const critical = notes
    .filter(n => n.type === 'instruction' || n.type === 'warning')
    .sort((a, b) => (PRIORITY_RANK[a.priority!] ?? 99) - (PRIORITY_RANK[b.priority!] ?? 99));
  if (critical.length > 0) {
    out.push('## Critical instructions and warnings');
    for (const n of critical) {
      out.push(`- **\`${relativePath(n.filePath, workspaceRoot)}:${n.lineRange.start + 1}\` — ${n.type} (${n.priority}):** ${preview(n.content)}`);
    }
    out.push('');
  }

  const handoffs = notes.filter(n => n.type === 'handoff');
  if (handoffs.length > 0) {
    out.push('## Open handoffs');
    for (const n of handoffs) {
      const range = n.lineRange.start === n.lineRange.end ? `${n.lineRange.start + 1}` : `${n.lineRange.start + 1}-${n.lineRange.end + 1}`;
      out.push(`- **\`${relativePath(n.filePath, workspaceRoot)}:${range}\`** — handoff from ${n.author}: ${preview(n.content)}`);
    }
    out.push('');
  }

  const decisions = notes.filter(n => n.type === 'decision');
  if (decisions.length > 0) {
    out.push('## Decisions worth knowing');
    for (const n of decisions) {
      out.push(`- **\`${relativePath(n.filePath, workspaceRoot)}:${n.lineRange.start + 1}\`** — decision: ${preview(n.content)}`);
    }
    out.push('');
  }

  // All notes by file, sorted
  out.push('## All notes by file');
  const byFile = new Map<string, Note[]>();
  for (const n of notes) {
    const key = relativePath(n.filePath, workspaceRoot);
    const arr = byFile.get(key) ?? [];
    arr.push(n);
    byFile.set(key, arr);
  }
  const fileKeys = Array.from(byFile.keys()).sort();
  for (const file of fileKeys) {
    out.push(`### \`${file}\``);
    const fileNotes = byFile.get(file)!.sort((a, b) => a.lineRange.start - b.lineRange.start);
    for (const n of fileNotes) {
      const tags = n.tags!.length > 0 ? ` [${n.tags!.join(', ')}]` : '';
      out.push(`- L${n.lineRange.start + 1} — ${n.type} (${n.priority})${tags}: ${preview(n.content)}`);
    }
    out.push('');
  }

  return out.join('\n');
}
