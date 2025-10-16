# Contributing to Code Context Notes

Thanks for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something useful together.

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- VSCode 1.80.0 or higher
- Git
- TypeScript knowledge

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/code-context-notes
   cd code-context-notes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile TypeScript**
   ```bash
   npm run compile
   ```

4. **Run in development mode**
   - Open the project in VSCode
   - Press `F5` to launch Extension Development Host
   - Test your changes in the new window

### Project Structure

```
code-context-notes/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── noteManager.ts          # Core note management logic
│   ├── storageManager.ts       # File I/O and markdown handling
│   ├── commentController.ts    # VSCode comment UI integration
│   ├── codeLensProvider.ts     # CodeLens indicators
│   ├── contentHashTracker.ts   # Content tracking and hashing
│   ├── gitIntegration.ts       # Git username detection
│   ├── types.ts                # TypeScript interfaces
│   └── test/
│       ├── runTest.ts          # Test runner for integration tests
│       ├── runUnitTests.ts     # Test runner for unit tests
│       └── suite/              # Test files
├── docs/                       # Documentation
├── out/                        # Compiled JavaScript (generated)
├── .code-notes/                # Example notes (gitignored)
└── package.json                # Extension manifest
```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add JSDoc comments for public APIs
   - Update tests as needed

3. **Test your changes**
   ```bash
   # Run unit tests
   npm run test:unit
   
   # Run with coverage
   npm run test:coverage
   
   # Run all tests (requires VSCode)
   npm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Test changes
   - `refactor:` - Code refactoring
   - `chore:` - Build/tooling changes

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Testing Guidelines

#### Unit Tests

Unit tests run in pure Node.js without VSCode API:

```typescript
// src/test/suite/storageManager.test.ts
import { expect } from 'chai';
import { StorageManager } from '../../storageManager';

describe('StorageManager', () => {
  it('should save and load notes', async () => {
    const storage = new StorageManager('/tmp/test');
    // ... test implementation
  });
});
```

**Requirements:**
- Test all public methods
- Test edge cases and error conditions
- Use descriptive test names
- Clean up test files in `afterEach`

#### Integration Tests

Integration tests use VSCode API and run in Extension Development Host:

```typescript
// src/test/suite/noteManager.test.ts
import * as vscode from 'vscode';
import { expect } from 'chai';
import { NoteManager } from '../../noteManager';

describe('NoteManager Integration', () => {
  it('should create note in VSCode document', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: 'test content'
    });
    // ... test implementation
  });
});
```

**Requirements:**
- Test VSCode API integration
- Test multi-file scenarios
- Test document change handling
- Clean up resources in `afterEach`

#### Coverage Goals

- Maintain >80% code coverage
- All new features must include tests
- Bug fixes should include regression tests

### Code Style

- Use TypeScript strict mode
- Follow existing formatting (2 spaces, single quotes)
- Use meaningful variable names
- Keep functions focused and small
- Add JSDoc comments for public APIs

Example:

```typescript
/**
 * Creates a new note for the specified code range.
 * 
 * @param filePath - Absolute path to the source file
 * @param lineRange - Start and end line numbers
 * @param content - Note content in markdown format
 * @returns The created note with generated ID and metadata
 */
async createNote(
  filePath: string,
  lineRange: { start: number; end: number },
  content: string
): Promise<Note> {
  // Implementation
}
```

## Architecture Guidelines

### Core Principles

1. **Separation of Concerns**
   - Storage layer handles file I/O
   - Note manager handles business logic
   - Controllers handle UI integration

2. **Dependency Injection**
   - Pass dependencies through constructors
   - Makes testing easier
   - Reduces coupling

3. **Error Handling**
   - Always handle errors gracefully
   - Show user-friendly error messages
   - Log errors for debugging

4. **Performance**
   - Cache data when appropriate
   - Debounce expensive operations
   - Use async/await for I/O

### Adding New Features

When adding a new feature:

1. **Update types** (`src/types.ts`) if needed
2. **Implement core logic** in appropriate manager
3. **Add storage support** if persisting data
4. **Update UI** (comment controller or CodeLens)
5. **Add tests** (unit and integration)
6. **Update documentation** (README, JSDoc)
7. **Add configuration** if user-configurable

### Modifying Existing Features

When modifying existing features:

1. **Check tests** - ensure they still pass
2. **Update tests** - if behavior changed
3. **Check dependencies** - what else might break?
4. **Update docs** - if user-facing changes
5. **Test manually** - in Extension Development Host

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm run test:unit`)
- [ ] Code coverage maintained or improved
- [ ] No TypeScript errors (`npm run compile`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### PR Description

Include in your PR description:

1. **What** - What does this PR do?
2. **Why** - Why is this change needed?
3. **How** - How does it work?
4. **Testing** - How did you test it?
5. **Screenshots** - If UI changes

Example:

```markdown
## What
Adds support for note templates

## Why
Users requested ability to create notes from templates for common patterns

## How
- Added template configuration in settings
- Added template picker in comment UI
- Templates stored in `.code-notes/templates/`

## Testing
- Added unit tests for template loading
- Added integration tests for template picker
- Manually tested with 5 different templates

## Screenshots
[Screenshot of template picker]
```

### Review Process

1. Maintainer reviews your PR
2. Address any feedback or requested changes
3. Once approved, maintainer will merge

## Reporting Issues

### Bug Reports

Include:

- VSCode version
- Extension version
- Operating system
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Error messages from Developer Console

### Feature Requests

Include:

- Use case - what problem does it solve?
- Proposed solution - how should it work?
- Alternatives considered
- Examples from other tools

## Questions?

- Open a [GitHub Discussion](https://github.com/your-username/code-context-notes/discussions)
- Check existing [Issues](https://github.com/your-username/code-context-notes/issues)
- Read the [documentation](docs/)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
