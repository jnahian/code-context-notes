import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff } from '../src/diffParser.js';

describe('parseUnifiedDiff', () => {
  it('parses a single-file diff (3 added, 2 removed) with exact changedLines', () => {
    const diff = `--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,6 @@
 line1
-line2
+lineA
+lineB
 line3
-line4
+lineC
 line5
`;
    const result = parseUnifiedDiff(diff);
    expect('files' in result).toBe(true);
    if (!('files' in result)) throw new Error('expected files');
    expect(result.files).toHaveLength(1);
    expect(result.files[0].file).toBe('file.ts');
    expect(result.files[0].oldFile).toBe('file.ts');
    expect(result.files[0].changedLines).toEqual([2, 3, 5]);
  });

  it('parses a multi-file diff', () => {
    const diff = `--- a/one.ts
+++ b/one.ts
@@ -1,2 +1,3 @@
 a
+b
 c
--- a/two.ts
+++ b/two.ts
@@ -1,2 +1,2 @@
-x
+y
 z
`;
    const result = parseUnifiedDiff(diff);
    if (!('files' in result)) throw new Error('expected files');
    expect(result.files).toHaveLength(2);
    expect(result.files[0].file).toBe('one.ts');
    expect(result.files[0].changedLines).toEqual([2]);
    expect(result.files[1].file).toBe('two.ts');
    expect(result.files[1].changedLines).toEqual([1]);
  });

  it('parses a rename diff with both old and new file names populated (a/ b/ prefixes stripped)', () => {
    const diff = `--- a/old-name.ts
+++ b/new-name.ts
@@ -1,3 +1,3 @@
 line1
-line2
+line2changed
 line3
`;
    const result = parseUnifiedDiff(diff);
    if (!('files' in result)) throw new Error('expected files');
    expect(result.files).toHaveLength(1);
    expect(result.files[0].file).toBe('new-name.ts');
    expect(result.files[0].oldFile).toBe('old-name.ts');
    expect(result.files[0].changedLines).toEqual([2]);
  });

  it('returns an error shape for malformed (non-diff) input', () => {
    const result = parseUnifiedDiff('not a diff at all');
    expect('error' in result).toBe(true);
    if (!('error' in result)) throw new Error('expected error');
    expect(result.error).toBe('diff_parse_failed');
    expect(typeof result.detail).toBe('string');
  });

  it('returns an error shape for empty-string input', () => {
    const result = parseUnifiedDiff('');
    expect('error' in result).toBe(true);
    if (!('error' in result)) throw new Error('expected error');
    expect(result.error).toBe('diff_parse_failed');
  });

  it('does not let a mid-hunk "\\ No newline" marker shift added line numbers', () => {
    // Old file lacks a trailing newline, so the marker sits between the removed
    // and added blocks. The added line is at line 2; without the marker skip it
    // would be recorded as line 3.
    const diff = `--- a/f.ts\n+++ b/f.ts\n@@ -1,2 +1,2 @@\n line1\n-line2\n\\ No newline at end of file\n+line2changed\n`;
    const result = parseUnifiedDiff(diff);
    if (!('files' in result)) throw new Error('expected files');
    expect(result.files[0].changedLines).toEqual([2]);
  });
});
