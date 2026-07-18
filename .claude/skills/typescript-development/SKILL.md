---
name: TypeScript Development
description: Automate TypeScript compilation, type checking, and refactoring. Use when checking types, compiling code, finding 'any' types, validating type safety, or fixing TypeScript errors.
allowed-tools: Read, Grep, Glob, Bash
---

# TypeScript Development

Specialized skill for TypeScript development workflows in the Code Context Notes project, handling compilation, type checking, refactoring, and type safety maintenance across 8,000+ lines of TypeScript code.

## Instructions

### When to Use This Skill

Use this skill when you need to:
- Run type checking (`npm run compile:tsc` or `tsc --noEmit`)
- Find and fix TypeScript errors
- Identify `any` types or type assertion overuse
- Validate type coverage and strict mode compliance
- Perform type-safe refactoring
- Generate TypeScript interfaces from JSON
- Check compilation before commits

### Type Checking Workflow

**Step 1: Run Type Check**
```bash
npm run compile:tsc
```
This runs `tsc --noEmit` for fast type checking without emitting files.

**Step 2: Parse and Analyze Errors**
- Group errors by file and severity
- Identify fixable vs manual errors
- Suggest fixes for common error codes (TS2304, TS7006, TS2339, TS2322)

**Step 3: Report Results**
- Show top errors by file
- Provide fix suggestions
- Report compilation time and error count

### Finding Type Issues

**Find explicit `any` types:**
```bash
grep -r ": any" src/
```

**Find type assertions:**
```bash
grep -r " as " src/ | grep -v "// as"
```

**Find implicit any:**
Run `tsc --noEmit` and filter for TS7006 errors.

### Auto-Fix Common Errors

| Error Code | Description | Fix Strategy |
|------------|-------------|--------------|
| TS2304 | Cannot find name | Add missing import |
| TS7006 | Implicit any | Add type annotation |
| TS2307 | Cannot find module | Fix import path |
| TS2339 | Property does not exist | Use optional chaining or type guard |
| TS2322 | Type not assignable | Convert type or change annotation |

### Type-Safe Refactoring Process

1. **Establish baseline**: Run `npm run compile:tsc` before changes
2. **Make changes**: Rename, extract, or refactor code
3. **Verify type safety**: Run `npm run compile:tsc` after changes
4. **Check for regressions**: Ensure no new errors or `any` types
5. **Run tests**: Execute `npm run test:unit` to verify functionality
6. **Commit**: Only commit if type-safe

### Project Context

**Extension Source** (`src/` - 5,900 lines):
- `src/extension.ts` - Main entry point
- `src/types.ts` - Core type definitions
- `src/storageManager.ts` - Note storage logic
- `src/commentController.ts` - Comment UI controller

**Web Application** (`web/src/` - 2,164 lines):
- React components with TypeScript
- `web/vite.config.ts` - Vite configuration

**TypeScript Configuration** (`tsconfig.json`):
- ✅ `strict: true` enabled
- ✅ `forceConsistentCasingInFileNames: true`
- ✅ `esModuleInterop: true`
- ✅ `moduleResolution: "bundler"`

### Commands Reference

```bash
# Fast type check (recommended)
npm run compile:tsc          # ~2-5 seconds

# Full compilation
npm run compile              # ~1-3 seconds (esbuild)

# Watch mode
npm run watch:tsc            # Auto-compile on changes

# Run tests after type fixes
npm run test:unit            # 41 unit tests
```

### Best Practices

1. **Always enable strict mode** in tsconfig.json
2. **Avoid `any` type** - use `unknown` for dynamic types
3. **Use type guards** for runtime validation
4. **Document complex types** with JSDoc comments
5. **Run type check before commits** to catch errors early
6. **Use `--noEmit`** for fast checks during development

## Examples

### Example 1: Pre-Commit Type Check

**Task**: Check for TypeScript errors before committing

**Actions**:
1. Run `npm run compile:tsc`
2. Parse output for errors
3. Report results

**Success Output**:
```
✓ TypeScript compilation successful
  - 0 errors, 0 warnings
  - Compiled 47 files in 3.2s
  - All types are valid
✓ Safe to commit
```

### Example 2: Find and Fix Implicit Any

**Task**: Find all implicit any types

**Actions**:
1. Run `tsc --noEmit` and capture errors
2. Filter for TS7006 errors
3. Suggest type annotations

**Example Output**:
```
Found 3 implicit any types:

1. src/utils.ts:45
   Parameter 'data' has implicit any
   Fix: function processData(data: unknown) { ... }

2. src/storage.ts:89
   Array has implicit any[]
   Fix: const items: NoteItem[] = [];
```

### Example 3: Validate After Refactoring

**Task**: Ensure types are valid after refactoring storage module

**Actions**:
1. Run `npm run compile:tsc`
2. Check for new errors
3. Check for type regressions
4. Run `npm run test:unit`
5. Report findings

**Success Output**:
```
✓ Type check passed - No new errors
✓ Type coverage maintained - 0 new 'any' types
✓ Tests passing - 41/41 unit tests passed
✓ Refactoring is type-safe
```

## Troubleshooting

**TS2304: Cannot find name**
- Add missing import statement

**TS7006: Implicit any**
- Add explicit type annotation or use `unknown`

**TS2339: Property does not exist**
- Use optional chaining (`?.`) or type guard

**TS2322: Type not assignable**
- Convert type or change variable annotation

## Related Skills

- Testing & Coverage Skill - Run tests after type fixes
- Git Workflow Skill - Pre-commit type checking
- VS Code Extension Development Skill - Extension API types

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [VS Code API TypeScript](https://code.visualstudio.com/api/references/vscode-api)
- Project: `tsconfig.json`
- Project: `src/types.ts`
