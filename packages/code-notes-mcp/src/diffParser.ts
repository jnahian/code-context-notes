import { parsePatch } from 'diff';

export interface ParsedFile {
  file: string;
  oldFile: string | null;
  changedLines: number[];
}

export type ParseDiffResult = { files: ParsedFile[] } | { error: 'diff_parse_failed'; detail: string };

// Strips the standard git a/ b/ prefix (and maps /dev/null to null for add/delete cases).
function normalizeFileName(name: string | null | undefined): string | null {
  if (!name || name === '/dev/null') return null;
  return name.replace(/^[ab]\//, '');
}

export function parseUnifiedDiff(diff: string): ParseDiffResult {
  try {
    const patches = parsePatch(diff);

    // `diff`'s parsePatch is lenient: it never throws. Malformed/non-diff text
    // (including '' and arbitrary garbage) comes back as [{ hunks: [] }] — one
    // patch object with no file names and no hunks, observed directly against
    // the installed `diff` package. A patch only counts as "usable" if it has
    // at least one hunk or a captured file name; if none of the parsed patches
    // are usable, treat the input as unparseable.
    const usable = patches.filter(p => p.hunks.length > 0 || p.oldFileName || p.newFileName);
    if (usable.length === 0) {
      return { error: 'diff_parse_failed', detail: 'no usable hunks or file headers found in input' };
    }

    const files: ParsedFile[] = usable.map(p => {
      const changedLines: number[] = [];
      for (const hunk of p.hunks) {
        let line = hunk.newStart;
        for (const l of hunk.lines) {
          if (l.startsWith('+')) {
            changedLines.push(line);
            line++;
          } else if (l.startsWith('-')) {
            // removed line — not part of the post-image, skip.
          } else if (l.startsWith('\\')) {
            // "\ No newline at end of file" — a marker, not a real line; must
            // not advance the counter or every following +line shifts by one.
          } else {
            line++;
          }
        }
      }
      const newFile = normalizeFileName(p.newFileName);
      const oldFile = normalizeFileName(p.oldFileName);
      return { file: newFile ?? oldFile ?? '<unknown>', oldFile, changedLines };
    });

    return { files };
  } catch (e: any) {
    return { error: 'diff_parse_failed', detail: e?.message ?? String(e) };
  }
}
