# Testing Quick Start Guide

## Running Tests

### Unit Tests (Fast - ~50ms)
```bash
npm run test:unit
```
Runs 41 pure Node.js tests without VSCode.

### Coverage Report
```bash
npm run test:coverage
```
Generates HTML report at `coverage/index.html`.

### Integration Tests (Requires VSCode)
```bash
npm test
```
Runs all tests including VSCode-dependent tests.

## Test Files

### Unit Tests (No VSCode Required)
- `src/test/suite/storageManager.test.ts` - 22 tests
- `src/test/suite/gitIntegration.test.ts` - 19 tests

### Integration Tests (Require VSCode)
- `src/test/suite/contentHashTracker.test.ts` - 19 tests
- `src/test/suite/noteManager.test.ts` - 40+ tests

## Adding New Tests

### 1. Create Test File
```typescript
// src/test/suite/myFeature.test.ts
import * as assert from 'assert';

suite('My Feature Test Suite', () => {
  test('should do something', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

### 2. Run Tests
```bash
npm run test:unit  # For unit tests
npm test           # For integration tests
```

### 3. Check Coverage
```bash
npm run test:coverage
open coverage/index.html
```

## Test Structure

```
src/test/
├── runTest.ts              # VSCode integration test runner
├── runUnitTests.ts         # Standalone unit test runner
└── suite/
    ├── index.ts            # Test suite index
    ├── storageManager.test.ts
    ├── gitIntegration.test.ts
    ├── contentHashTracker.test.ts
    └── noteManager.test.ts
```

## Coverage Targets

- Overall: >80% ✅ (Currently 88%)
- Statements: >80% ✅
- Branches: >80% ✅
- Functions: >80% ✅
- Lines: >80% ✅

## Best Practices

1. **Write tests first** (TDD approach)
2. **Keep tests isolated** (no shared state)
3. **Use descriptive names** (what is being tested)
4. **Test edge cases** (empty, null, invalid input)
5. **Clean up resources** (use setup/teardown)
6. **Mock external dependencies** (file system, git)
7. **Run tests before commit** (ensure nothing breaks)

## Common Patterns

### Setup/Teardown
```typescript
suite('My Suite', () => {
  let resource: MyResource;

  setup(() => {
    resource = new MyResource();
  });

  teardown(() => {
    resource.cleanup();
  });

  test('should work', () => {
    assert.ok(resource);
  });
});
```

### Async Tests
```typescript
test('should handle async', async () => {
  const result = await myAsyncFunction();
  assert.strictEqual(result, 'expected');
});
```

### Error Testing
```typescript
test('should throw error', async () => {
  await assert.rejects(
    async () => await myFunction(),
    /Expected error message/
  );
});
```

## Debugging Tests

### VSCode Launch Configuration
```json
{
  "type": "extensionHost",
  "request": "launch",
  "name": "Extension Tests",
  "runtimeExecutable": "${execPath}",
  "args": [
    "--extensionDevelopmentPath=${workspaceFolder}",
    "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
  ]
}
```

### Debug Single Test
1. Set breakpoint in test file
2. Run "Extension Tests" launch configuration
3. Test will pause at breakpoint

## Continuous Integration

### GitHub Actions (Future)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:coverage
```

## Troubleshooting

### Tests Not Found
```bash
npm run compile  # Compile TypeScript first
```

### Coverage Not Generated
```bash
npm install --save-dev nyc  # Install coverage tool
```

### VSCode Tests Fail
```bash
# Make sure VSCode is installed
# Run from VSCode Extension Development Host
```

## Resources

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)
- [VSCode Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Istanbul Coverage](https://istanbul.js.org/)

## Quick Commands

```bash
# Compile TypeScript
npm run compile

# Run unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run integration tests
npm test

# Watch mode (compile on change)
npm run watch

# Lint code
npm run lint
```

## Test Statistics

- **Total Tests**: 100
- **Unit Tests**: 41 (pure Node.js)
- **Integration Tests**: 59+ (require VSCode)
- **Coverage**: 88% overall
- **Execution Time**: ~50ms (unit tests)
- **Pass Rate**: 100%

## Next Steps

1. Run `npm run test:unit` to verify setup
2. Run `npm run test:coverage` to see coverage
3. Open `coverage/index.html` in browser
4. Add tests for new features
5. Maintain >80% coverage
