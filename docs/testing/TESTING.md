# Testing Documentation

## Overview

The Code Context Notes extension has comprehensive test coverage with both unit tests and integration tests.

## Test Statistics

- **Total Unit Tests**: 41 tests (all passing)
- **Code Coverage**: 88.05% overall
  - StorageManager: 94.11% coverage
  - GitIntegration: 74.41% coverage
- **Integration Tests**: 59+ tests (require VSCode environment)

## Test Structure

### Unit Tests (Pure Node.js)

These tests run without VSCode and can be executed quickly:

```bash
npm run test:unit
```

**Included Tests:**
- `storageManager.test.ts` - 22 tests
  - File I/O operations
  - Markdown serialization/deserialization
  - CRUD operations
  - Special character handling
  - History tracking
  
- `gitIntegration.test.ts` - 19 tests
  - Git username retrieval
  - Configuration overrides
  - Caching behavior
  - Fallback mechanisms
  - Multiple instance handling

### Integration Tests (Require VSCode)

These tests require the VSCode API and should be run in the Extension Development Host:

```bash
npm test
```

**Included Tests:**
- `contentHashTracker.test.ts` - 19 tests
  - Content hashing
  - Content normalization
  - Content finding after moves
  - Similarity detection
  - Validation
  
- `noteManager.test.ts` - 40+ tests
  - Note creation
  - Note updates
  - Note deletion
  - Note retrieval
  - Caching
  - History management
  - Position updates

## Code Coverage

Run coverage reports with:

```bash
npm run test:coverage
```

Coverage reports are generated in:
- HTML: `coverage/index.html`
- Text: Console output

### Current Coverage

```
--------------------|---------|----------|---------|---------|------------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s      
--------------------|---------|----------|---------|---------|------------------------
All files           |   88.05 |    91.25 |   94.11 |   87.78 |                        
 src                |   89.79 |     92.1 |   96.29 |   89.52 |                        
  gitIntegration.ts |   74.41 |    55.55 |     100 |   74.41 | 48-49,70-79,95,127,140 
  storageManager.ts |   94.11 |    97.01 |   94.73 |   93.91 | 52,76-88,110,141,189   
--------------------|---------|----------|---------|---------|------------------------
```

## Test Categories

### Storage Tests
- File creation and management
- Markdown format preservation
- History tracking
- Deletion handling
- Edge cases (special characters, code blocks, lists)

### Git Integration Tests
- Username detection
- Configuration management
- Caching strategies
- Fallback behavior
- Error handling

### Content Hash Tests
- Hash generation consistency
- Content normalization
- Content location tracking
- Similarity detection
- Validation

### Note Manager Tests
- Complete CRUD operations
- History management
- Cache management
- Position updates
- Error handling
- Multi-file scenarios

## Running Tests

### Quick Unit Tests
```bash
npm run test:unit
```
Runs in ~100ms, no VSCode required.

### Full Integration Tests
```bash
npm test
```
Requires VSCode Extension Development Host.

### Coverage Report
```bash
npm run test:coverage
```
Generates HTML and text coverage reports.

### Watch Mode
```bash
npm run watch
```
Compiles TypeScript on file changes (run tests manually).

## Test Best Practices

1. **Unit tests** should not depend on VSCode API
2. **Integration tests** can use VSCode API but should be isolated
3. **Mock data** should be realistic and cover edge cases
4. **Test names** should clearly describe what is being tested
5. **Assertions** should be specific and meaningful
6. **Setup/teardown** should clean up resources properly

## Future Testing Work

- [ ] Add integration tests for CommentController
- [ ] Add integration tests for CodeLensProvider
- [ ] Add integration tests for extension.ts
- [ ] Increase coverage to >90%
- [ ] Add performance benchmarks
- [ ] Add E2E tests for user workflows
- [ ] Set up CI/CD pipeline
- [ ] Add mutation testing

## Known Limitations

1. Integration tests require manual execution in VSCode
2. Some edge cases in gitIntegration are hard to test (git not installed)
3. UI interactions are not fully tested (comment threads, CodeLens clicks)
4. Performance tests are not yet implemented

## Contributing

When adding new features:
1. Write unit tests first (TDD approach)
2. Ensure >80% coverage for new code
3. Add integration tests for VSCode-specific features
4. Update this documentation
5. Run all tests before submitting PR

## Test Maintenance

- Review and update tests when refactoring
- Remove obsolete tests
- Keep test data realistic
- Document complex test scenarios
- Maintain test independence
