# Storage System - Code Reference

## Initialization Flow

### On Extension Activation (extension.ts)

```typescript
// Line 24-98: activate() function

// Step 1: Register all commands (even without workspace)
registerAllCommands(context);  // Line 32

// Step 2: Check for workspace
const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
if (!workspaceFolder) {
  return;  // Partial activation, continue
}

// Step 3: Get workspace root
const workspaceRoot = workspaceFolder.uri.fsPath;

// Step 4: Load configuration
const config = vscode.workspace.getConfiguration('codeContextNotes');
const storageDirectory = config.get<string>('storageDirectory', '.code-notes');
const authorName = config.get<string>('authorName', '');

// Step 5: Initialize storage components
const storage = new StorageManager(workspaceRoot, storageDirectory);
const hashTracker = new ContentHashTracker();
const gitIntegration = new GitIntegration(workspaceRoot, authorName);

// Step 6: Create storage directory
await storage.createStorage();  // Creates .code-notes directory

// Step 7: Initialize managers
noteManager = new NoteManager(storage, hashTracker, gitIntegration);
commentController = new CommentController(noteManager, context);

// Step 8: Load existing notes
for (const document of vscode.window.visibleTextEditors) {
  await commentController.loadCommentsForDocument(document);
}
```

## Storage Manager - Core Operations

### Class: StorageManager (storageManager.ts)

#### Constructor
```typescript
constructor(workspaceRoot: string, storageDirectory: string = '.code-notes') {
  this.workspaceRoot = workspaceRoot;
  this.storageDirectory = storageDirectory;
}
```

#### Get Storage Path
```typescript
private getStoragePath(): string {
  return path.join(this.workspaceRoot, this.storageDirectory);
  // Example: /Users/dev/myproject/.code-notes
}
```

#### Get Note File Path
```typescript
getNoteFilePath(noteId: string): string {
  const noteFileName = `${noteId}.md`;
  return path.join(this.getStoragePath(), noteFileName);
  // Example: /Users/dev/myproject/.code-notes/550e8400-e29b-41d4-a716-446655440000.md
}
```

#### Create Storage Directory
```typescript
async createStorage(): Promise<void> {
  const storagePath = this.getStoragePath();
  try {
    await fs.mkdir(storagePath, { recursive: true });
    // Creates .code-notes directory if it doesn't exist
  } catch (error) {
    throw new Error(`Failed to create storage directory: ${error}`);
  }
}
```

#### Save Note (Write to Disk)
```typescript
async saveNote(note: Note): Promise<void> {
  // Step 1: Get file path
  const noteFilePath = this.getNoteFilePath(note.id);
  
  // Step 2: Ensure storage directory exists
  await this.createStorage();
  
  // Step 3: Convert note to markdown
  const markdown = this.noteToMarkdown(note);
  
  // Step 4: Write to file
  await fs.writeFile(noteFilePath, markdown, 'utf-8');
}

// Conversion to markdown
private noteToMarkdown(note: Note): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`# Code Context Note`);
  lines.push('');
  lines.push(`**File:** ${note.filePath}`);
  lines.push(`**Lines:** ${note.lineRange.start + 1}-${note.lineRange.end + 1}`);
  lines.push(`**Content Hash:** ${note.contentHash}`);
  lines.push('');
  
  // Metadata
  lines.push(`## Note: ${note.id}`);
  lines.push(`**Author:** ${note.author}`);
  lines.push(`**Created:** ${note.createdAt}`);
  lines.push(`**Updated:** ${note.updatedAt}`);
  if (note.isDeleted) {
    lines.push(`**Status:** DELETED`);
  }
  lines.push('');
  
  // Content
  lines.push('## Current Content');
  lines.push('');
  lines.push(note.content);
  lines.push('');
  
  // History
  if (note.history.length > 0) {
    lines.push('## Edit History');
    lines.push('');
    for (const entry of note.history) {
      lines.push(`### ${entry.timestamp} - ${entry.author} - ${entry.action}`);
      lines.push('');
      lines.push('```');
      lines.push(entry.content);
      lines.push('```');
      lines.push('');
    }
  }
  
  return lines.join('\n');
}
```

#### Load Note by ID (Read from Disk)
```typescript
async loadNoteById(noteId: string): Promise<Note | null> {
  const noteFilePath = this.getNoteFilePath(noteId);
  
  try {
    // Step 1: Read markdown file
    const content = await fs.readFile(noteFilePath, 'utf-8');
    
    // Step 2: Parse markdown to Note object
    return this.markdownToNote(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;  // File not found
    }
    throw new Error(`Failed to load note: ${error}`);
  }
}

// Parsing markdown to Note
private markdownToNote(markdown: string): Note | null {
  const lines = markdown.split('\n');
  const note: Partial<Note> = { history: [] };
  
  // Parse each section
  let inContent = false;
  let inHistory = false;
  let contentLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse metadata
    if (line.startsWith('**File:**')) {
      note.filePath = line.substring(9).trim();
    }
    else if (line.startsWith('**Lines:**')) {
      const range = line.substring(10).trim().split('-');
      note.lineRange = {
        start: parseInt(range[0]) - 1,  // Convert to 0-based
        end: parseInt(range[1]) - 1
      };
    }
    else if (line.startsWith('**Content Hash:**')) {
      note.contentHash = line.substring(17).trim();
    }
    else if (line.startsWith('## Note: ')) {
      note.id = line.substring(9).trim();
    }
    
    // Parse section markers
    else if (line === '## Current Content') {
      inContent = true;
      inHistory = false;
    }
    else if (line === '## Edit History') {
      inContent = false;
      inHistory = true;
    }
    
    // Capture content
    else if (inContent && !line.startsWith('##')) {
      contentLines.push(line);
    }
  }
  
  note.content = contentLines.join('\n').trim();
  
  // Validate note has all required fields
  return this.isValidNote(note) ? (note as Note) : null;
}
```

#### Load All Notes for File
```typescript
async loadNotes(filePath: string): Promise<Note[]> {
  // Step 1: Get all notes (including deleted)
  const allNotes = await this.loadAllNotes(filePath);
  
  // Step 2: Filter out deleted notes
  return allNotes.filter(n => !n.isDeleted);
}

async loadAllNotes(filePath: string): Promise<Note[]> {
  // Step 1: Get all note files in storage directory
  const allNoteFiles = await this.getAllNoteFiles();
  
  // Step 2: Load each file and parse
  const notes: Note[] = [];
  for (const noteFile of allNoteFiles) {
    try {
      const content = await fs.readFile(noteFile, 'utf-8');
      const note = this.markdownToNote(content);
      
      // Step 3: Filter for this file
      if (note && note.filePath === filePath) {
        notes.push(note);
      }
    } catch (error) {
      console.error(`Failed to load note from ${noteFile}:`, error);
    }
  }
  
  return notes;
}
```

#### Delete Note (Soft Delete)
```typescript
async deleteNote(noteId: string, filePath: string): Promise<void> {
  // Step 1: Load the note
  const notes = await this.loadNotes(filePath);
  const note = notes.find(n => n.id === noteId);
  
  if (!note) {
    throw new Error(`Note with id ${noteId} not found`);
  }
  
  // Step 2: Mark as deleted
  note.isDeleted = true;
  note.updatedAt = new Date().toISOString();
  
  // Step 3: Add to history
  note.history.push({
    content: note.content,
    author: note.author,
    timestamp: note.updatedAt,
    action: 'deleted'
  });
  
  // Step 4: Save updated note
  await this.saveNote(note);  // Overwrites file with deleted flag
}
```

## Note Manager - Business Logic

### Class: NoteManager (noteManager.ts)

#### Create Note
```typescript
async createNote(params: CreateNoteParams, document: vscode.TextDocument): Promise<Note> {
  // Step 1: Generate content hash
  const contentHash = this.hashTracker.generateHash(document, params.lineRange);
  
  // Step 2: Get author (git config > system username)
  const author = params.author || await this.gitIntegration.getAuthorName();
  
  // Step 3: Create note object
  const now = new Date().toISOString();
  const note: Note = {
    id: uuidv4(),  // Generate new UUID
    content: params.content.trim(),
    author,
    filePath: params.filePath,
    lineRange: params.lineRange,
    contentHash,
    createdAt: now,
    updatedAt: now,
    history: [{
      content: params.content.trim(),
      author,
      timestamp: now,
      action: 'created'
    }],
    isDeleted: false
  };
  
  // Step 4: Save to storage
  await this.storage.saveNote(note);
  
  // Step 5: Update cache
  this.addNoteToCache(note);
  
  return note;
}
```

#### Update Note
```typescript
async updateNote(params: UpdateNoteParams, document: vscode.TextDocument): Promise<Note> {
  // Step 1: Load existing note
  const filePath = document.uri.fsPath;
  const notes = await this.getAllNotesForFile(filePath);
  const note = notes.find(n => n.id === params.id);
  
  if (!note) throw new Error(`Note ${params.id} not found`);
  if (note.isDeleted) throw new Error(`Cannot update deleted note`);
  
  // Step 2: Update fields
  const now = new Date().toISOString();
  const author = params.author || await this.gitIntegration.getAuthorName();
  
  note.content = params.content.trim();
  note.author = author;
  note.updatedAt = now;
  
  // Step 3: Add to history
  note.history.push({
    content: params.content.trim(),
    author,
    timestamp: now,
    action: 'edited'
  });
  
  // Step 4: Recalculate content hash
  note.contentHash = this.hashTracker.generateHash(document, note.lineRange);
  
  // Step 5: Save to storage
  await this.storage.saveNote(note);
  
  // Step 6: Update cache
  this.updateNoteInCache(note);
  
  return note;
}
```

#### Get Notes for File
```typescript
async getNotesForFile(filePath: string): Promise<Note[]> {
  // Step 1: Check cache first
  if (this.noteCache.has(filePath)) {
    const cached = this.noteCache.get(filePath)!;
    return cached.filter(n => !n.isDeleted);
  }
  
  // Step 2: Load from storage
  const notes = await this.storage.loadNotes(filePath);
  
  // Step 3: Update cache
  this.noteCache.set(filePath, notes);
  
  return notes;
}
```

## Content Hash Tracker

### Class: ContentHashTracker (contentHashTracker.ts)

#### Generate Hash
```typescript
generateHash(document: vscode.TextDocument, lineRange: LineRange): string {
  // Step 1: Extract content from line range
  const content = this.getContentForRange(document, lineRange);
  
  // Step 2: Normalize content
  const normalized = this.normalizeContent(content);
  
  // Step 3: Calculate SHA-256
  return this.hashContent(normalized);
}

private normalizeContent(content: string): string {
  // Remove whitespace differences
  const lines = content.split('\n');
  const normalized = lines.map(line => {
    const trimmed = line.trim();
    return trimmed.replace(/\s+/g, ' ');  // Normalize spaces
  }).filter(line => line.length > 0);  // Remove empty lines
  
  return normalized.join('\n');
}

private hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

#### Find Content by Hash
```typescript
async findContentByHash(
  document: vscode.TextDocument,
  targetHash: string,
  originalRange: LineRange
): Promise<ContentHashResult> {
  // Step 1: Check if still at original location
  const currentHash = this.generateHash(document, originalRange);
  if (currentHash === targetHash) {
    return { found: true, newLineRange: originalRange, similarity: 1.0 };
  }
  
  // Step 2: Search using sliding window
  const rangeSize = originalRange.end - originalRange.start + 1;
  for (let startLine = 0; startLine <= document.lineCount - rangeSize; startLine++) {
    const testRange: LineRange = {
      start: startLine,
      end: startLine + rangeSize - 1
    };
    
    const testHash = this.generateHash(document, testRange);
    if (testHash === targetHash) {
      return { found: true, newLineRange: testRange, similarity: 1.0 };
    }
  }
  
  // Step 3: Fuzzy match if exact not found
  return await this.findSimilarContent(document, originalRange, targetHash, rangeSize);
}
```

## Comment Controller - UI Integration

### Load Comments for Document
```typescript
// commentController.ts: loadCommentsForDocument()

async loadCommentsForDocument(document: vscode.TextDocument): Promise<void> {
  const filePath = document.uri.fsPath;
  
  // Step 1: Get all notes for this file
  const notes = await this.noteManager.getNotesForFile(filePath);
  
  // Step 2: Create comment threads for each note
  for (const note of notes) {
    this.createCommentThread(document, note);
  }
}

private createCommentThread(
  document: vscode.TextDocument,
  note: Note
): vscode.CommentThread {
  // Step 1: Create VSCode range from note lineRange
  const range = new vscode.Range(
    note.lineRange.start,
    0,
    note.lineRange.end,
    document.lineAt(note.lineRange.end).text.length
  );
  
  // Step 2: Create comment thread
  const thread = this.commentController.createCommentThread(
    document.uri,
    range,
    []
  );
  
  // Step 3: Create comment (converts note to VSCode comment)
  const comment = this.createComment(note);
  thread.comments = [comment];
  
  // Step 4: Store thread reference
  this.commentThreads.set(note.id, thread);
  
  return thread;
}
```

## Configuration Flow

### Load Configuration
```typescript
// extension.ts: Line 50-54

const config = vscode.workspace.getConfiguration('codeContextNotes');

// Get storageDirectory (defaults to '.code-notes')
const storageDirectory = config.get<string>('storageDirectory', '.code-notes');

// Get authorName (defaults to '')
const authorName = config.get<string>('authorName', '');

// Pass to StorageManager
const storage = new StorageManager(workspaceRoot, storageDirectory);
```

### Listen for Configuration Changes
```typescript
// extension.ts: Lines 647-663

vscode.workspace.onDidChangeConfiguration((event) => {
  if (event.affectsConfiguration('codeContextNotes')) {
    const config = vscode.workspace.getConfiguration('codeContextNotes');
    const authorName = config.get<string>('authorName', '');
    
    // Update author name (new notes will use this)
    noteManager.updateConfiguration(authorName);
    
    // NOTE: storageDirectory changes only affect NEW notes
    // Existing notes remain in original directory
  }
});
```

---

## Data Flow Diagram

```
User Creates Note
        ↓
CommentController.handleSaveNewNote()
        ↓
NoteManager.createNote()
        ├── ContentHashTracker.generateHash()  (SHA-256)
        ├── GitIntegration.getAuthorName()
        └── StorageManager.saveNote()
                ├── Create .code-notes directory
                ├── noteToMarkdown()  (Convert Note → Markdown)
                └── fs.writeFile()  ({noteId}.md)

User Opens File
        ↓
CommentController.loadCommentsForDocument()
        ↓
NoteManager.getNotesForFile()
        ├── Check cache first
        └── StorageManager.loadNotes()
                ├── getAllNoteFiles()  (List .code-notes/*.md)
                └── For each file:
                    ├── fs.readFile()
                    ├── markdownToNote()  (Parse Markdown → Note)
                    └── Filter by filePath & !isDeleted

Note Updated
        ↓
NoteManager.updateNote()
        ├── ContentHashTracker.generateHash()  (Recalculate)
        ├── StorageManager.saveNote()  (Overwrites same {noteId}.md)
        └── Update cache

Note Deleted
        ↓
NoteManager.deleteNote()
        ├── Mark note.isDeleted = true
        ├── Add to history
        └── StorageManager.saveNote()  (Overwrites with deleted flag)
```

---

For quick reference, see: `docs/STORAGE-QUICK-REFERENCE.md`
For detailed analysis, see: `docs/STORAGE-ANALYSIS.md`
