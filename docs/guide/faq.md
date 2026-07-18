# FAQ

### Do notes stay with my code when I refactor?

Yes. Notes track their code by a content hash, so they follow it when line numbers change or the code moves within a file.

### What happens if I significantly modify the annotated code?

If the content changes enough that the hash no longer matches, the note may become **stale**, but it's never deleted. You can update or delete it manually.

### Can I use notes with any language?

Yes — notes work with every file type VS Code supports. They're stored separately and never touch your source.

### Are notes stored in my repository?

They live in `.code-notes/`. Commit it to share notes with your team, or add it to `.gitignore` to keep them local. See [Storage format](../reference/storage-format.md) for which sub-paths to ignore.

### How do I share notes with my team?

Commit the `.code-notes/` directory. Teammates with the extension installed will see every note.

### Can AI agents read and write my notes?

Yes — through the standalone [MCP server](agents-and-mcp.md). What agents are allowed to do is governed by the [trust model](trust-model.md): by default (`audit`) their writes land but are logged and revertible; `queue` mode holds them for your approval; `direct` applies them immediately.

### An agent wrote a note I don't want — can I undo it?

In `audit` mode, open the **Agent activity** view and click **Revert**. In `queue` mode the write never landed — reject the proposal.

### The MCP server returns `{ "status": "pending" }` instead of a note. Is that an error?

No. The workspace is in `queue` mode and the write became a proposal awaiting your approval. Retrying won't change it — approve or reject it in the **Pending agent proposals** view.

### Can I export my notes?

Notes are plain markdown, readable with any tool. The extension also auto-generates `INDEX.json` and `AGENTS.md` in `.code-notes/` for machine and agent consumption ([Agents & MCP](agents-and-mcp.md)).

### What's the performance impact?

Minimal — the extension uses caching and content-hash tracking. Very large files (10,000+ lines) may see slight overhead.

### Where do I report a bug or request a feature?

[GitHub Issues](https://github.com/jnahian/code-context-notes/issues) and [Discussions](https://github.com/jnahian/code-context-notes/discussions).
