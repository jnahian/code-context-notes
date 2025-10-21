# Recommended Skills for Claude Code

This document outlines the recommended skills for Claude Code to maximize productivity and automation for the Code Context Notes project.

## Overview

Based on the comprehensive project analysis, the following skills would enhance development workflow, testing, documentation maintenance, and release management for this VS Code extension and React web application.

---

## Skill Recommendations

### 1. TypeScript Development Skill

**Purpose:** Automate TypeScript compilation, type checking, and refactoring

**Use Cases:**
- Run `tsc --noEmit` for type checking without emitting files
- Perform type-safe refactoring across the codebase
- Generate TypeScript interfaces from JSON schemas
- Handle complex type definitions
- Validate type coverage and identify `any` types
- Auto-fix TypeScript errors where possible

**Relevant Commands:**
```bash
npm run compile:tsc
tsc --noEmit
```

**Integration Points:**
- `src/` - Extension TypeScript code (5,900 lines)
- `web/src/` - React application TypeScript code (2,164 lines)
- Type definitions in `src/types.ts`

---

### 2. VS Code Extension Development Skill

**Purpose:** Specialized workflow for VS Code extension development

**Use Cases:**
- Package extension with `vsce package`
- Publish to VS Code Marketplace and Open VSX Registry
- Test extension in Extension Development Host
- Manage extension manifests and configurations
- Handle VSCode API updates
- Validate `package.json` extension manifest
- Generate VSIX packages with proper versioning

**Relevant Commands:**
```bash
npm run package
npm run package:simple
npm run package:dev
npm run publish
npm run publish:bash
```

**Integration Points:**
- `package.json` - Extension manifest
- `.vscodeignore` - Packaging configuration
- Extension activation and lifecycle management

---

### 3. Testing & Coverage Skill

**Purpose:** Automated test execution and coverage reporting

**Use Cases:**
- Run `npm run test:unit` and `npm run test:coverage`
- Generate HTML coverage reports with nyc
- Identify untested code paths
- Analyze test results and suggest improvements
- Run specific test suites (unit vs integration)
- Validate coverage thresholds (currently 80%+)
- Execute tests in watch mode

**Relevant Commands:**
```bash
npm run test:unit          # Fast unit tests (~50ms)
npm run test:coverage      # With coverage report
npm test                   # Full integration tests
```

**Integration Points:**
- `src/test/suite/` - 7 test suites with 100+ tests
- `.nycrc` - Coverage configuration (88% current coverage)
- Test documentation in `docs/TESTING*.md`

**Current Metrics:**
- 41 unit tests
- 59+ integration tests
- 88% code coverage

---

### 4. React/Vite Development Skill

**Purpose:** Handle the web application development workflow

**Use Cases:**
- Run Vite dev server with Hot Module Replacement (HMR)
- Build for production with Server-Side Rendering (SSR)
- Preview production builds locally
- Optimize bundle size and analyze chunks
- Handle Tailwind CSS configuration
- Manage React Router navigation
- Update shadcn/ui components

**Relevant Commands:**
```bash
npm run web:install        # Install dependencies
npm run web:dev            # Dev server
npm run web:dev:ssr        # Dev with SSR
npm run web:build          # Production build
npm run web:build:vercel   # Vercel-optimized build
npm run web:preview:ssr    # Preview SSR build
```

**Integration Points:**
- `web/src/` - React application source
- `web/vite.config.ts` - Vite configuration
- `web/tailwind.config.js` - Tailwind CSS setup
- Landing page and documentation website

**Tech Stack:**
- React 18.2.0
- Vite 7.1.10
- Tailwind CSS 3.3.5
- Express 4.18.2 (SSR)

---

### 5. Documentation Generator Skill

**Purpose:** Maintain and update project documentation

**Use Cases:**
- Auto-update `docs/TODO.md` from code changes (per CLAUDE.md requirement)
- Update `CHANGELOG.md` from git commits
- Generate API documentation from TypeScript types
- Keep documentation synchronized with code changes
- Update `README.md` with new features
- Generate release notes from version changes
- Validate markdown formatting and links

**Relevant Files:**
- `docs/TODO.md` - Task tracking (must update after changes per CLAUDE.md)
- `CHANGELOG.md` - Version history
- `README.md` - User documentation
- `docs/ARCHITECTURE.md` - Technical design
- 32 documentation files in `docs/` directory

**Project Requirement:**
> "always update the docs/TODO.md after making any changes" - from CLAUDE.md

**Documentation Stats:**
- 32 documentation files
- 26,000+ words of documentation
- Comprehensive coverage of architecture, testing, and usage

---

### 6. Git Workflow Skill

**Purpose:** Streamline git operations and conventional commits

**Use Cases:**
- Create conventional commit messages (feat, fix, docs, etc.)
- Generate changelogs from commit history
- Manage semantic version bumping
- Handle release tagging
- Create pull requests with proper formatting
- Validate commit message format
- Generate release notes

**Relevant Commands:**
```bash
git status
git log --oneline
git tag -a v0.1.7 -m "Release message"
```

**Current Convention:**
- Conventional commits used in project history
- Recent commits: `feat:`, `fix:`, `chore:`, `docs:`
- Current version: v0.1.7

**Integration Points:**
- Commit message validation
- Release tagging for marketplace publishing
- Changelog generation

---

### 7. Code Quality & Linting Skill

**Purpose:** Ensure code quality and consistency

**Use Cases:**
- Run ESLint/Prettier checks across the codebase
- Fix formatting issues automatically
- Analyze code complexity and cyclomatic complexity
- Suggest refactoring opportunities
- Check for unused code and imports
- Validate TypeScript strict mode compliance
- Identify code smells and anti-patterns

**Potential Commands:**
```bash
npm run lint              # If configured
npm run lint:fix          # Auto-fix issues
```

**Integration Points:**
- TypeScript strict mode enabled
- Code organization across 5,900+ lines
- Consistent coding patterns

**Benefits:**
- Maintain code quality across extension and web app
- Ensure consistent style
- Reduce technical debt

---

### 8. Markdown Processing Skill

**Purpose:** Handle the markdown-based note storage system

**Use Cases:**
- Parse and validate markdown files in `.code-notes/`
- Transform markdown content
- Extract metadata from frontmatter-style headers
- Generate documentation from markdown
- Validate markdown syntax and structure
- Process note history entries
- Handle markdown formatting (bold, italic, code, lists)

**Relevant Files:**
- `.code-notes/*.md` - Individual note files
- Note format with metadata headers and history sections
- Markdown shortcuts in extension (Cmd+B, Cmd+I, etc.)

**Integration Points:**
- `src/storageManager.ts` - Markdown serialization/deserialization
- Note file format specification
- Markdown editor in comment UI

**Note Format:**
```markdown
---
id: uuid
file: relative/path/to/file.ts
range: 10-15
contentHash: sha256hash
author: username
created: timestamp
---

Note content here

## History
- timestamp | author | Note content
```

---

## Priority Recommendations

### High Priority (Immediate Value)

#### 1. Documentation Generator Skill
**Why:** Project requirement to "always update docs/TODO.md after making any changes"
- Automates CLAUDE.md compliance
- Maintains comprehensive documentation (32 files, 26K+ words)
- Reduces manual documentation burden

#### 2. Testing & Coverage Skill
**Why:** Comprehensive test suite requiring regular execution
- 100+ tests across 7 suites
- Coverage tracking (88% current)
- Fast feedback during development

#### 3. VS Code Extension Development Skill
**Why:** Core to the project's purpose
- Extension packaging and publishing workflow
- Marketplace management (VS Code + Open VSX)
- Version management and release automation

### Medium Priority (High Value)

#### 4. Git Workflow Skill
**Why:** Maintaining conventional commits and clean release history
- Automated changelog generation
- Semantic versioning support
- Professional commit messages

#### 5. TypeScript Development Skill
**Why:** Type safety across 8,064 lines of TypeScript
- Catch type errors early
- Safe refactoring operations
- Maintain type coverage

#### 6. React/Vite Development Skill
**Why:** Web component requires separate tooling
- Landing page and documentation site
- SSR build optimization
- Development server management

### Nice to Have (Quality of Life)

#### 7. Code Quality & Linting Skill
**Why:** Maintain high code quality standards
- Consistent code style
- Identify refactoring opportunities
- Reduce technical debt

#### 8. Markdown Processing Skill
**Why:** Relevant to `.code-notes` storage format
- Validate note file structure
- Process markdown content
- Handle note serialization

---

## Implementation Recommendations

### Phase 1: Essential Skills (Immediate)
1. **Documentation Generator Skill** - Addresses CLAUDE.md requirement
2. **Testing & Coverage Skill** - Daily development workflow
3. **VS Code Extension Development Skill** - Release management

### Phase 2: Development Efficiency (Week 2)
4. **Git Workflow Skill** - Better commit and release process
5. **TypeScript Development Skill** - Type safety and refactoring

### Phase 3: Full Stack Support (Week 3)
6. **React/Vite Development Skill** - Web development workflow
7. **Code Quality & Linting Skill** - Code quality automation

### Phase 4: Specialized Tools (As Needed)
8. **Markdown Processing Skill** - Note format handling

---

## Skill Configuration Examples

### Example: Documentation Generator Skill

```typescript
// Potential skill configuration
{
  "name": "doc-generator",
  "description": "Maintains project documentation",
  "triggers": ["after_code_change", "manual"],
  "actions": [
    "update_todo_md",
    "update_changelog",
    "validate_docs"
  ],
  "files": [
    "docs/TODO.md",
    "CHANGELOG.md",
    "README.md"
  ]
}
```

### Example: Testing Skill

```typescript
{
  "name": "test-runner",
  "description": "Runs tests and generates coverage",
  "triggers": ["before_commit", "manual"],
  "commands": [
    "npm run test:unit",
    "npm run test:coverage"
  ],
  "thresholds": {
    "coverage": 80
  }
}
```

---

## Benefits Summary

| Skill | Time Saved | Quality Impact | Automation Level |
|-------|------------|----------------|------------------|
| Documentation Generator | High | High | Full |
| Testing & Coverage | High | Critical | Full |
| VS Code Extension Dev | Medium | High | Partial |
| Git Workflow | Medium | Medium | Full |
| TypeScript Development | Medium | High | Partial |
| React/Vite Development | Medium | Medium | Partial |
| Code Quality & Linting | Low | Medium | Full |
| Markdown Processing | Low | Low | Partial |

---

## Next Steps

1. **Review** this document and prioritize skills based on current needs
2. **Create** skill configuration files for selected skills
3. **Test** skills in development environment
4. **Iterate** and refine based on actual usage patterns
5. **Document** custom skill configurations in project documentation

---

## Related Documentation

- `docs/ARCHITECTURE.md` - Technical architecture details
- `docs/TESTING.md` - Testing strategy and setup
- `docs/TODO.md` - Current task tracking (keep updated per CLAUDE.md)
- `CLAUDE.md` - Claude project instructions
- `CONTRIBUTING.md` - Development workflow guidelines

---

**Last Updated:** 2025-10-21
**Project Version:** 0.1.7
**Status:** Production Ready
