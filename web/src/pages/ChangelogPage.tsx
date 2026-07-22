import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/PageTransition";
import {
  Calendar,
  Plus,
  Settings,
  Wrench,
  FileText,
  Layers,
  Search,
  MousePointerClick,
  Shield
} from "lucide-react";

export function ChangelogPage() {
  return (
    <PageTransition>
      <div className="container py-12 max-w-6xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold">Changelog</h1>
            <p className="text-xl text-muted-foreground">
              Track all updates, improvements, and new features
            </p>
          </div>

          {/* Timeline Container */}
          <div className="relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-0 md:left-[30%] top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-orange via-blue-400 to-green-400"></div>

          {/* Timeline Items */}
          <div className="space-y-16">

          {/* Version 0.5.1 */}
          <div id="v0.5.1" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-brand-orange border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <div className="flex md:flex-col md:items-end items-start gap-2">
                <h3 className="text-2xl font-bold flex items-center gap-2 md:flex-row-reverse">
                  <span>Version 0.5.1</span>
                  <Badge className="bg-brand-orange">Latest</Badge>
                </h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>July 22, 2026</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A small privacy default: a new notes directory now comes with its own <code className="bg-brand-navy text-brand-warm px-1 rounded">.gitignore</code>, so your notes stay local until you decide to share them.
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
              <Card className="shadow-brand-drop bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-brand-orange">
                <CardContent className="space-y-6">
                  {/* Added */}
                  <div>
                    <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Added</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <Shield className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-sm">Self-ignoring <code className="bg-brand-navy text-brand-warm px-1 rounded">.code-notes/.gitignore</code></h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Written once, when the storage directory is first created.
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                            <li>• Ignores everything in the folder, including itself</li>
                            <li>• Carries a two-line comment telling you to delete the file if you'd rather commit your notes and share them with your team</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Changed */}
                  <div>
                    <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Changed</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <span className="text-blue-500 font-bold">•</span>
                        <span className="text-muted-foreground">
                          <strong>Notes are untracked by default</strong> in new workspaces. Existing workspaces are untouched — the file is only written when the storage directory is created, so deleting it keeps it deleted.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technical */}
                  <div>
                    <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400 flex items-center space-x-2">
                      <Wrench className="h-4 w-4" />
                      <span>Technical</span>
                    </h4>
                    <div className="space-y-1 text-sm text-muted-foreground bg-white dark:bg-slate-800 p-3 rounded-xl">
                      <p>• <code className="bg-brand-navy text-brand-warm px-1 rounded">createStorage()</code> keys off the return value of a recursive <code className="bg-brand-navy text-brand-warm px-1 rounded">mkdir</code>, so the write is genuinely first-run-only rather than an exists-check race</p>
                      <p>• Storage manager tests cover both halves: written on first creation, not recreated after deletion</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Version 0.5.0 */}
          <div id="v0.5.0" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <div className="flex md:flex-col md:items-end items-start gap-2">
                <h3 className="text-2xl font-bold">Version 0.5.0</h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>July 17, 2026</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Take control of agent-authored notes: a workspace setting picks whether agent writes land immediately, get logged, or wait for your approval, with sidebar views to review and undo them.
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
              <Card className="bg-white shadow-brand-drop">
                <CardContent className="space-y-6">
                  {/* Added */}
                  <div>
                    <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Added</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <Settings className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-sm">Agent Write Modes</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            One setting picks how MCP-agent writes are handled, stored in <code className="bg-brand-navy text-brand-warm px-1 rounded">.code-notes/config.json</code> so the standalone server reads the same policy.
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                            <li>• <strong>direct</strong> — writes land immediately</li>
                            <li>• <strong>audit</strong> (default) — writes land and are logged</li>
                            <li>• <strong>queue</strong> — writes wait for your approval</li>
                            <li>• No server flag for the mode: an agent can't pick its own rails, and a change takes effect with no restart</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <FileText className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-sm">Agent Activity View + Revert</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            In audit mode, every agent op is logged to <code className="bg-brand-navy text-brand-warm px-1 rounded">.code-notes/_audit.log</code> and shown in a sidebar view.
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                            <li>• Inline <strong>Revert</strong>: a create reverses to a delete, an edit/delete restores from history</li>
                            <li>• Refreshes when an agent in another process writes; the log rotates atomically with no entry lost</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <MousePointerClick className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-sm">Pending Agent Proposals View</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            In queue mode, agent writes become proposals in <code className="bg-brand-navy text-brand-warm px-1 rounded">.code-notes/_pending/</code> instead of touching live notes.
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                            <li>• <strong>Approve / Reject / Edit-and-approve</strong>; approve records who approved it, reject keeps the file for audit</li>
                            <li>• Simple-pick when a note changed since the proposal; orphaned proposals (target gone) can only be rejected</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fixed */}
                  <div>
                    <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                      <Wrench className="h-4 w-4" />
                      <span>Fixed</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>Note repositioning now locks and re-reads, so following an editor's changes can't overwrite a note edited concurrently by another process</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>Reverting an agent's delete restores the note; empty-content notes survive reload; approved edits record who approved them; a restore is logged as its own action</span>
                      </div>
                    </div>
                  </div>

                  {/* Security */}
                  <div>
                    <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400 flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Security</span>
                    </h4>
                    <div className="space-y-1 text-sm text-muted-foreground bg-white dark:bg-slate-800 p-3 rounded-xl">
                      <p>• Agent-write identity comes from the writer, not the note — an agent can no longer edit or delete a human's note without approval in queue mode</p>
                      <p>• Note content can't forge note structure: storage is now a length-delimited format, so a note body can't delete itself or fake its history on reload</p>
                      <p>• The audit log never drops an entry under load — rotation is atomic and appends are lock-free</p>
                      <p>• A proposal's file value can't split its frontmatter — the free-text fields are JSON-encoded, the last spot the "content can't forge structure" invariant wasn't mirrored</p>
                    </div>
                  </div>

                  {/* Compatibility */}
                  <div className="bg-blue-50 dark:bg-slate-800 border-l-4 border-brand-orange p-3 rounded-r-xl">
                    <p className="text-sm text-muted-foreground">
                      <strong>Heads up:</strong> <code className="bg-brand-navy text-brand-warm px-1 rounded">audit</code> is the new default — a workspace with notes gains a <code className="bg-brand-navy text-brand-warm px-1 rounded">config.json</code> and starts logging agent writes unless you set the mode to <code className="bg-brand-navy text-brand-warm px-1 rounded">direct</code>. Notes migrate to a new on-disk format on next save; upgrade the MCP server alongside the extension.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Version 0.4.0 */}
          <div id="v0.4.0" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <div className="flex md:flex-col md:items-end items-start gap-2">
                <h3 className="text-2xl font-bold">Version 0.4.0</h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>July 17, 2026</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Standalone MCP server gives any MCP-capable agent (Claude Code, Cursor) read/write access to workspace notes. Extension internals extracted into a shared core package; behavior unchanged.
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
              <Card className="bg-white shadow-brand-drop">
                <CardContent className="space-y-6">
                  {/* Added */}
                  <div>
                    <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Added</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <Layers className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-sm">Standalone MCP Server — <code className="bg-brand-navy text-brand-warm px-1 rounded">@jnahian/code-notes-mcp</code></h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Run <code className="bg-brand-navy text-brand-warm px-1 rounded">npx -y @jnahian/code-notes-mcp --workspace . --agent claude-code</code> and any MCP client can read and write the same notes the extension manages.
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                            <li>• <strong>Read tools:</strong> search_notes, get_notes_for_file, get_notes_for_changes (pre-edit context), list_instructions, get_handoffs, get_note</li>
                            <li>• <strong>Write tools</strong> (require <code className="bg-brand-navy text-brand-warm px-1 rounded">--agent &lt;name&gt;</code>): create_note, edit_note, delete_note, add_handoff, add_decision</li>
                            <li>• <strong>Resources:</strong> <code className="bg-brand-navy text-brand-warm px-1 rounded">code-notes://digest</code>, <code className="bg-brand-navy text-brand-warm px-1 rounded">code-notes://index</code>, <code className="bg-brand-navy text-brand-warm px-1 rounded">code-notes://file/{`{path}`}</code></li>
                            <li>• Directory-scope resolution surfaces parent-folder notes for any file</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <Shield className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-sm">Safe Concurrent Writes</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            The extension and MCP agents can write at the same time without corrupting notes.
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                            <li>• Per-note advisory file locks (<code className="bg-brand-navy text-brand-warm px-1 rounded">.code-notes/.locks</code>) serialize writers across processes — writers re-read inside the lock, so your edit is never overwritten by an agent's</li>
                            <li>• In-band JSON error convention for all tool failures (invalid_arguments, retryable lock_timeout, path_escapes_workspace, …)</li>
                            <li>• Workspace-wide loader reports unparseable note files in <code className="bg-brand-navy text-brand-warm px-1 rounded">INDEX.json</code> errors</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fixed */}
                  <div>
                    <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                      <Wrench className="h-4 w-4" />
                      <span>Fixed</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>Sidebar now shows notes created by agents — externally-written notes previously stayed hidden until your next edit</span>
                      </div>
                    </div>
                  </div>

                  {/* Changed */}
                  <div>
                    <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Changed</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <span className="text-blue-500 font-bold">•</span>
                        <span className="text-muted-foreground">
                          <strong>Repo now uses npm workspaces</strong> — the extension lives at <code className="bg-brand-navy text-brand-warm px-1 rounded">packages/extension/</code>; shared internals extracted into <code className="bg-brand-navy text-brand-warm px-1 rounded">@jnahian/code-notes-core</code></span>
                      </div>
                      <div className="flex items-start space-x-2 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <span className="text-blue-500 font-bold">•</span>
                        <span className="text-muted-foreground">
                          <strong>Fully backwards compatible</strong> — extension behavior unchanged, no new settings, existing workspaces work without modification; the MCP server reads/writes the same <code className="bg-brand-navy text-brand-warm px-1 rounded">.code-notes/</code> directory</span>
                      </div>
                    </div>
                  </div>

                  {/* Technical */}
                  <div>
                    <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400 flex items-center space-x-2">
                      <Wrench className="h-4 w-4" />
                      <span>Technical</span>
                    </h4>
                    <div className="space-y-1 text-sm text-muted-foreground bg-white dark:bg-slate-800 p-3 rounded-xl">
                      <p>• npm workspaces monorepo: <code className="bg-brand-navy text-brand-warm px-1 rounded">packages/extension</code>, <code className="bg-brand-navy text-brand-warm px-1 rounded">packages/code-notes-core</code>, <code className="bg-brand-navy text-brand-warm px-1 rounded">packages/code-notes-mcp</code></p>
                      <p>• MCP server built on <code className="bg-brand-navy text-brand-warm px-1 rounded">@modelcontextprotocol/sdk</code> (stdio transport); all logging on stderr, stdout reserved for JSON-RPC</p>
                      <p>• Advisory lock files: exclusive create, 500ms retry, stale locks broken after 60s</p>
                      <p>• 374 tests across packages, including cross-process extension-vs-MCP race, lock-contention, and stale-cache regression tests</p>
                    </div>
                  </div>

                  {/* Coming Next */}
                  <div className="bg-blue-50 dark:bg-slate-800 border-l-4 border-brand-orange p-3 rounded-r-xl">
                    <p className="text-sm text-muted-foreground">
                      <strong>Coming next:</strong> v0.5 ships the trust model (audit / queue / direct modes) and the agent activity sidebar.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Version 0.3.0 */}
          <div id="v0.3.0" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <div className="flex md:flex-col md:items-end items-start gap-2">
                <h3 className="text-2xl font-bold">Version 0.3.0</h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>May 16, 2026</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Agent integration foundation: structured note schema, auto-generated workspace exports for coding agents, and sidebar enhancements.
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
              <Card className="bg-white shadow-brand-drop">
                <CardContent className="space-y-6">
                  {/* Added */}
                  <div>
                    <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Added</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <Layers className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-sm">Structured Note Schema for Agent Integration</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Optional fields turn free-form notes into machine-readable workspace context for coding agents.
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                            <li>• <strong>Types:</strong> context, instruction, warning, decision, todo, handoff, rationale</li>
                            <li>• <strong>Priority:</strong> low, normal, high, critical</li>
                            <li>• <strong>Scope:</strong> line, function, class, file, directory</li>
                            <li>• Tags, expiry (ISO 8601), authorType (human/agent), references (PR/issue/commit/test/url)</li>
                            <li>• New command <code className="bg-brand-navy text-brand-warm px-1 rounded">Set Note Type / Tags / Priority…</code> to enrich any note</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <FileText className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-sm">Auto-Generated Workspace Exports</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Two files regenerate atomically on every note change so any coding agent can ingest workspace notes as context.
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                            <li>• <code className="bg-brand-navy text-brand-warm px-1 rounded">.code-notes/INDEX.json</code> — machine-readable index with byFile/byType/byTag lookups</li>
                            <li>• <code className="bg-brand-navy text-brand-warm px-1 rounded">.code-notes/AGENTS.md</code> — human-readable digest hoisting instructions, warnings, handoffs, decisions</li>
                            <li>• Debounced (200ms) writes, atomic temp-then-rename, deterministic output</li>
                            <li>• Manual <code className="bg-brand-navy text-brand-warm px-1 rounded">Regenerate Exports</code> command for recovery</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                        <MousePointerClick className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-sm">Sidebar Enhancements</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Type badges, priority indicators, and new title-bar filters.
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                            <li>• Note type shown as <code className="bg-brand-navy text-brand-warm px-1 rounded">· instruction</code> description suffix</li>
                            <li>• High/critical priority shown as tooltip badge</li>
                            <li>• <strong>Filter Notes by Type…</strong> (multi-select Quick Pick) and <strong>Toggle Expired Notes</strong></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technical */}
                  <div>
                    <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400 flex items-center space-x-2">
                      <Wrench className="h-4 w-4" />
                      <span>Technical</span>
                    </h4>
                    <div className="space-y-1 text-sm text-muted-foreground bg-white dark:bg-slate-800 p-3 rounded-xl">
                      <p>• New modules: <code className="bg-brand-navy text-brand-warm px-1 rounded">noteDefaults.ts</code>, <code className="bg-brand-navy text-brand-warm px-1 rounded">exportGenerator.ts</code>, <code className="bg-brand-navy text-brand-warm px-1 rounded">exportWriter.ts</code></p>
                      <p>• <code className="bg-brand-navy text-brand-warm px-1 rounded">NoteManager</code> wraps storage reads with <code className="bg-brand-navy text-brand-warm px-1 rounded">applyDefaults</code> — single boundary for lazy migration of v0.2.x notes</p>
                      <p>• Storage format extended with optional bold-label fields; fields equal to default are omitted so untouched legacy notes remain byte-identical on disk</p>
                      <p>• 58+ unit tests covering schema defaults, storage round-trip, export determinism, and debounced atomic writes</p>
                      <p>• New settings: <code className="bg-brand-navy text-brand-warm px-1 rounded">codeContextNotes.exports.{`{enabled,indexJson,agentsMarkdown}`}</code></p>
                    </div>
                  </div>

                  {/* Coming Next */}
                  <div className="bg-blue-50 dark:bg-slate-800 border-l-4 border-brand-orange p-3 rounded-r-xl">
                    <p className="text-sm text-muted-foreground">
                      <strong>Coming next:</strong> v0.4 ships a standalone MCP server backed by INDEX.json for direct agent integration (Cursor, Claude Code, and other MCP clients).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Version 0.2.1 */}
          <div id="v0.2.1" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <div className="flex md:flex-col md:items-end items-start gap-2">
                <h3 className="text-2xl font-bold">Version 0.2.1</h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>November 12, 2025</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Patch release with context menu integration and UX improvements
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-white shadow-brand-drop">
            <CardContent className="space-y-6">
              {/* Added */}
              <div>
                <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Added</span>
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
                    <MousePointerClick className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-semibold text-sm">Editor Context Menu Integration</h5>
                      <p className="text-sm text-muted-foreground mt-1">
                        "Add Note" option now available in editor right-click context menu for quick note creation without keyboard shortcuts
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Changed */}
              <div>
                <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Changed</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start space-x-2 bg-white dark:bg-slate-800 p-3 rounded-xl">
                    <span className="text-blue-500 font-bold">•</span>
                    <span className="text-muted-foreground">
                      <strong>Selection-based CodeLens disabled</strong> - The "Add Note" CodeLens that appeared when selecting text has been temporarily disabled to reduce visual clutter. The context menu option provides a more intuitive alternative. This may be re-enabled with configuration control in a future release.
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical */}
              <div>
                <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400 flex items-center space-x-2">
                  <Wrench className="h-4 w-4" />
                  <span>Technical</span>
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground bg-white dark:bg-slate-800 p-3 rounded-xl">
                  <p>• Added <code className="bg-brand-navy text-brand-warm px-1 rounded">editor/context</code> menu contribution in package.json</p>
                  <p>• Commented out selection-based CodeLens logic in <code className="bg-brand-navy text-brand-warm px-1 rounded">codeLensProvider.ts:80-108</code> with TODO marker for future re-enablement</p>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Version 0.2.0 */}
          <div id="v0.2.0" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <h3 className="text-2xl font-bold">Version 0.2.0</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>October 27, 2025</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Major feature update with sidebar view and workspace-wide note browsing
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-white shadow-brand-drop">
            <CardContent className="space-y-6">
              {/* Added */}
              <div>
                <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Added</span>
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-3 rounded-xl">
                    <FileText className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-semibold text-sm">Sidebar View for Browsing All Notes</h5>
                      <p className="text-sm text-muted-foreground mt-1">
                        Dedicated Activity Bar icon with tree view showing all notes across workspace
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                        <li>• Notes organized by file with collapsible nodes showing path, note count, and previews</li>
                        <li>• Click notes to navigate directly to location in editor with real-time updates</li>
                        <li>• "+" button for quick note creation without text selection</li>
                        <li>• Context menus for note items (Go to, Edit, Delete, View History) and file items (Open File)</li>
                        <li>• Configurable sorting by file path, date, or author with customizable preview length (20-200 chars)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Changed */}
              <div>
                <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Changed</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span className="text-muted-foreground">
                      <strong>Add Note command now works without text selection</strong> - creates note for current cursor line when no text is selected
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span className="text-muted-foreground">
                      Keyboard shortcut (Ctrl+Alt+N / Cmd+Alt+N) no longer requires selection for more convenient note-taking
                    </span>
                  </div>
                </div>
              </div>

              {/* Testing */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                  <Wrench className="h-4 w-4" />
                  <span>Testing</span>
                </h4>
                <div className="text-sm text-muted-foreground">
                  <p>78 comprehensive unit tests for sidebar components (NoteTreeItem: 59 tests, NotesSidebarProvider: 19 tests)</p>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Version 0.1.8 */}
          <div id="v0.1.8" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-orange-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <h3 className="text-2xl font-bold">Version 0.1.8</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>October 23, 2025</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Multiple notes per line feature with conditional navigation
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-white shadow-brand-drop">
            <CardContent className="space-y-6">
              {/* Fixed */}
              <div>
                <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <Wrench className="h-4 w-4" />
                  <span>Fixed</span>
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 p-3 rounded-xl">
                    <Layers className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-semibold text-sm">Multiple Note Creation and Navigation (Issue #6)</h5>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fixed thread lookup methods that were breaking multi-note functionality
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                        <li>• Fixed thread lookup to use proper thread keys instead of note IDs</li>
                        <li>• Added "➕ Add Note" CodeLens button even when notes already exist</li>
                        <li>• All multi-note features (viewing, editing, navigating) now work correctly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Changed */}
              <div>
                <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Changed</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span className="text-muted-foreground">
                      <strong>Conditional navigation buttons</strong> - Previous/Next buttons now only appear when there are multiple notes on the same line
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span className="text-muted-foreground">
                      <strong>Icon-only UI</strong> - Moved actions to native VS Code icon buttons for cleaner display
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Version 0.1.7 */}
          <div id="v0.1.7" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-purple-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <h3 className="text-2xl font-bold">Version 0.1.7</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>October 19, 2025</span>
              </div>
              <p className="text-sm text-muted-foreground">
                UX improvements to prevent unwanted scrolling and reduce interruptions
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-white shadow-brand-drop">
            <CardContent className="space-y-6">
              {/* Fixed */}
              <div>
                <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <Wrench className="h-4 w-4" />
                  <span>Fixed</span>
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>
                      <strong>Prevented unwanted scrolling</strong> when adding notes via CodeLens - viewport now stays exactly where it was
                    </span>
                  </div>
                </div>
              </div>

              {/* Changed */}
              <div>
                <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Changed</span>
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Removed automatic focus/scroll behavior when viewing notes for less disruptive experience</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Removed cancel notification to reduce noise</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Version 0.1.6 */}
          <div id="v0.1.6" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-pink-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <h3 className="text-2xl font-bold">Version 0.1.6</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>October 19, 2025</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Input focus improvements and unified note creation
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-white shadow-brand-drop">
            <CardContent className="space-y-6">
              {/* Fixed */}
              <div>
                <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <Wrench className="h-4 w-4" />
                  <span>Fixed</span>
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>CodeLens "Add Note" action now properly focuses input field for immediate typing</span>
                  </div>
                </div>
              </div>

              {/* Changed */}
              <div>
                <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Changed</span>
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Unified note creation to use consistent method - removed + icon from editor gutter</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Version 0.1.5 */}
          <div id="v0.1.5" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <h3 className="text-2xl font-bold">Version 0.1.5</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>October 19, 2025</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Focus mode and keyboard shortcut improvements
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-white shadow-brand-drop">
            <CardContent className="space-y-6">
              {/* Added */}
              <div>
                <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Added</span>
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>
                      <strong>Auto-collapse all other notes</strong> when working on one - only one note visible at a time for better focus
                    </span>
                  </div>
                </div>
              </div>

              {/* Fixed */}
              <div>
                <h4 className="font-semibold mb-3 text-orange-600 dark:text-orange-400 flex items-center space-x-2">
                  <Wrench className="h-4 w-4" />
                  <span>Fixed</span>
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-500 font-bold">✓</span>
                    <span>Keyboard shortcuts now use modern comment UI (Issues #9, #10)</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-500 font-bold">✓</span>
                    <span>+ icon comment editor now saves notes properly</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-500 font-bold">✓</span>
                    <span>Test coverage configuration (Issue #8)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Version 0.1.4 */}
          <div id="v0.1.4" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-teal-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <h3 className="text-2xl font-bold">Version 0.1.4</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>October 17, 2025</span>
              </div>
              <p className="text-sm text-muted-foreground">
                ES Module migration for modern package compatibility
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-white shadow-brand-drop">
            <CardContent className="space-y-6">
              {/* Changed */}
              <div>
                <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Changed</span>
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>
                      <strong>Migrated to ES Modules (ESM)</strong> from CommonJS for better compatibility with modern npm packages
                    </span>
                  </div>
                </div>
              </div>

              {/* Fixed */}
              <div>
                <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <Wrench className="h-4 w-4" />
                  <span>Fixed</span>
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Fixed "Cannot find module 'uuid'" error by migrating to ES modules</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Version 0.1.1 */}
          <div id="v0.1.1" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-cyan-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <h3 className="text-2xl font-bold">Version 0.1.1</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>October 17, 2025</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Activation and workspace handling improvements
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-white shadow-brand-drop">
            <CardContent className="space-y-6">
              {/* Fixed */}
              <div>
                <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <Wrench className="h-4 w-4" />
                  <span>Fixed</span>
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Extension now activates properly when no workspace is initially open</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Added graceful handling for commands when no workspace is available</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Version 0.1.0 - Initial Release */}
          <div id="v0.1.0" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node - Special for initial release */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-6 h-6 rounded-full bg-green-500 border-4 border-white dark:border-slate-900 shadow-lg flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <div className="flex md:flex-col md:items-end items-start gap-2">
                <h3 className="text-2xl font-bold flex items-center gap-2 md:flex-row-reverse">
                  <span>Version 0.1.0</span>
                  <Badge className="bg-green-600">Initial Release</Badge>
                </h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Calendar className="h-4 w-4" />
                <span>October 17, 2025</span>
              </div>
              <p className="text-sm text-muted-foreground">
                🎉 First public release - Published to VS Code Marketplace and Open VSX Registry!
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-2 border-green-400 shadow-brand-drop">
            <CardContent className="space-y-6">
              {/* Core Features */}
              <div>
                <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Core Features</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Add notes using VSCode's native comment UI</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Markdown formatting with keyboard shortcuts</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>CodeLens indicators above code with notes</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Intelligent content tracking</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Complete version history</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Git integration for author detection</span>
                  </div>
                </div>
              </div>

              {/* Testing & Quality */}
              <div>
                <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400 flex items-center space-x-2">
                  <Wrench className="h-4 w-4" />
                  <span>Testing & Quality</span>
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• 100 total tests (41 unit + 59 integration)</p>
                  <p>• 88% code coverage</p>
                  <p>• Package size: 77KB (highly optimized)</p>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Future Versions Note */}
          <div className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
            {/* Timeline Node - Future */}
            <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
              <div className="w-4 h-4 rounded-full bg-purple-500 border-4 border-white dark:border-slate-900 shadow-lg animate-pulse"></div>
            </div>

            {/* Left Column - Version Info */}
            <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
              <h3 className="text-2xl font-bold text-purple-600">Coming Next</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
                <Search className="h-4 w-4" />
                <span>Future Release</span>
              </div>
              <p className="text-sm text-muted-foreground">
                What's next for Code Context Notes
              </p>
            </div>

            {/* Right Column - Changes */}
            <div className="pl-8 md:pl-12">
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-2 border-purple-300 shadow-brand-drop">
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>
                    <strong>MCP Server (v0.4)</strong> - Standalone <code>@jnahian/code-notes-mcp</code> server so any MCP-capable agent can read and write notes
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>
                    <strong>Search and Filter Notes</strong> - Full-text search across all note content with filters by author, date range, and file path
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>

          </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
