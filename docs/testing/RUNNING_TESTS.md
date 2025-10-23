# Running Tests - Complete Guide

This guide explains how to run all tests in the Code Context Notes extension.

---

## Quick Start

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests (fast, no VSCode required)
npm run test:unit

# Run tests with coverage report
npm run test:coverage
```

---

## Test Commands

### 1. Run All Tests
```bash
npm test
```

**What it does:**
- Compiles TypeScript to JavaScript
- Launches VSCode Extension Host
- Runs all 230+ tests (unit + integration)
- Takes ~60-90 seconds

**Output:**
- All 7 test files executed
- Pass/fail status for each test
- Total test count and results

**When to use:**
- Before committing code
- To verify all functionality works
- For comprehensive testing

---

### 2. Run Unit Tests Only
```bash
npm run test:unit
```

**What it does:**
- Compiles TypeScript to JavaScript
- Runs only pure unit tests (41 tests)
- No VSCode Extension Host required
- Takes ~30 seconds

**Tests included:**
- ✅ StorageManager (22 tests)
- ✅ GitIntegration (19 tests)

**When to use:**
- Quick feedback during development
- CI/CD pipelines
- When VSCode test environment unavailable

---

### 3. Run Tests with Coverage
```bash
npm run test:coverage
```

**What it does:**
- Compiles TypeScript to JavaScript
- Runs unit tests with NYC coverage tracking
- Generates HTML and text coverage reports
- Takes ~30 seconds

**Output locations:**
- HTML report: `coverage/index.html`
- Text report: Terminal output

**When to use:**
- To check code coverage
- Before releasing new versions
- To identify untested code paths

---

## Test Files Overview

### Unit Tests (41 tests)
**Files:**
1. `src/test/suite/storageManager.test.ts` (22 tests)
2. `src/test/suite/gitIntegration.test.ts` (19 tests)

**Characteristics:**
- ✅ Fast execution (~30 seconds)
- ✅ No VSCode dependency
- ✅ Pure logic testing
- ✅ Suitable for CI/CD

---

### Integration Tests (189+ tests)
**Files:**
1. `src/test/suite/contentHashTracker.test.ts` (21 tests)
2. `src/test/suite/noteManager.test.ts` (39 tests)
3. `src/test/suite/commentController.test.ts` (40+ tests)
4. `src/test/suite/codeLensProvider.test.ts` (50+ tests)
5. `src/test/suite/extension.test.ts` (40+ tests)

**Characteristics:**
- ⚠️ Slower execution (~60-90 seconds)
- ⚠️ Requires VSCode Extension Host
- ✅ Full feature testing
- ✅ Real environment testing

---

## Test Execution Details

### What Happens During `npm test`

1. **Pre-test Steps:**
   ```bash
   npm run pretest
   ```
   - Compiles TypeScript to JavaScript (`out/` directory)
   - Runs ESLint for code quality checks

2. **Test Execution:**
   ```bash
   node ./out/test/runTest.js
   ```
   - Downloads/uses VSCode test instance
   - Loads extension in test mode
   - Runs all `*.test.js` files in `out/test/suite/`
   - Reports results

3. **Test Discovery:**
   - Automatically finds all `**/**.test.js` files
   - Runs them in alphabetical order
   - Collects pass/fail results

---

## Viewing Test Results

### Console Output

```
Code Context Notes extension is activating...
Code Context Notes: Registering all commands...
Code Context Notes: All commands registered successfully!

  StorageManager Test Suite
    ✓ getNoteFilePath should return correct file path
    ✓ storageExists should return false when storage does not exist
    ✓ createStorage should create storage directory
    ... (19 more tests)

  GitIntegration Test Suite
    ✓ should get git username when available
    ✓ should cache username for performance
    ... (17 more tests)

  CommentController Test Suite
    Thread Creation
      ✓ should create comment thread for a note
      ✓ should not create duplicate threads for same note
      ✓ should create proper comment with markdown body
    ... (37 more tests)

  ... (4 more test suites)

  230 passing (45s)
```

### Coverage Report

After `npm run test:coverage`:

```
================ Coverage summary ================
Statements   : 88.5% ( 442/500 )
Branches     : 78.2% ( 156/200 )
Functions    : 85.7% ( 120/140 )
Lines        : 89.1% ( 410/460 )
==================================================
```

Open `coverage/index.html` in browser for detailed line-by-line coverage.

---

## Test Configuration

### Mocha Configuration

Located in `src/test/suite/index.ts`:

```typescript
const mocha = new Mocha({
  ui: 'tdd',           // Test-Driven Development style
  color: true,         // Colored output
  timeout: 10000       // 10 second timeout per test
});
```

### NYC Configuration

Located in `.nycrc`:

```json
{
  "all": true,
  "include": ["out/**/*.js"],
  "exclude": ["out/test/**"],
  "reporter": ["text", "html"],
  "check-coverage": true,
  "lines": 80,
  "statements": 80,
  "functions": 80,
  "branches": 80
}
```

---

## Troubleshooting

### Tests Fail to Compile

**Problem:** TypeScript compilation errors

**Solution:**
```bash
# Check TypeScript errors
npm run compile:tsc

# Fix any compilation errors before running tests
```

### Tests Time Out

**Problem:** Tests exceed 10 second timeout

**Solution:**
- Increase timeout in `src/test/suite/index.ts`
- Or run specific slow test file individually

### VSCode Test Instance Won't Start

**Problem:** Extension Host fails to launch

**Solution:**
```bash
# Clear VSCode test cache
rm -rf .vscode-test/

# Re-run tests (will download fresh VSCode)
npm test
```

### Coverage Report Not Generated

**Problem:** `coverage/` directory empty

**Solution:**
```bash
# Ensure NYC is installed
npm install --save-dev nyc

# Re-run with coverage
npm run test:coverage
```

---

## Running Individual Test Files

### Option 1: Using Mocha Directly

```bash
# Compile first
npm run compile:tsc

# Run specific test file (unit tests only)
npx mocha out/test/suite/storageManager.test.js
```

### Option 2: Using Grep Pattern

Modify `src/test/suite/index.ts` temporarily:

```typescript
const mocha = new Mocha({
  ui: 'tdd',
  color: true,
  timeout: 10000,
  grep: 'CommentController'  // Add this line
});
```

Then run:
```bash
npm test
```

This will only run tests matching "CommentController".

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Run unit tests
      run: npm run test:unit

    # Note: Integration tests require display server
    # Use xvfb for headless testing
    - name: Run integration tests
      run: xvfb-run -a npm test
      if: runner.os == 'Linux'
```

---

## Test Maintenance

### Adding New Tests

1. Create test file: `src/test/suite/myFeature.test.ts`
2. Write tests using TDD style:
   ```typescript
   import * as assert from 'assert';

   suite('My Feature Test Suite', () => {
     test('should do something', () => {
       assert.strictEqual(1 + 1, 2);
     });
   });
   ```
3. Run tests: `npm test`

### Updating Existing Tests

1. Locate test file in `src/test/suite/`
2. Make changes
3. Compile: `npm run compile:tsc`
4. Run tests: `npm test`
5. Verify all tests pass

---

## Best Practices

### Before Committing

```bash
# 1. Run linter
npm run lint

# 2. Run all tests
npm test

# 3. Check coverage
npm run test:coverage

# 4. Verify no errors
echo $?  # Should output 0
```

### During Development

```bash
# Use unit tests for quick feedback
npm run test:unit

# Watch mode for continuous testing
npm run watch:tsc

# In another terminal
npx mocha --watch out/test/suite/myFeature.test.js
```

### Before Release

```bash
# Full test suite with coverage
npm run test:coverage

# Verify coverage meets threshold (80%)
# Check coverage/index.html

# Run integration tests multiple times
npm test
npm test
npm test
```

---

## Summary

| Command | Tests | Time | VSCode | Coverage | Use Case |
|---------|-------|------|--------|----------|----------|
| `npm test` | All (230+) | ~90s | ✅ Required | ❌ No | Comprehensive testing |
| `npm run test:unit` | Unit (41) | ~30s | ❌ Not required | ❌ No | Quick feedback |
| `npm run test:coverage` | Unit (41) | ~30s | ❌ Not required | ✅ Yes | Coverage check |

**Total Tests**: 230+ tests across 7 test files
**Total Lines**: 2,899 lines of test code
**Coverage**: Comprehensive across all components

All tests are configured and ready to run!
