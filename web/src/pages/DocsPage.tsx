import { lazy, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";


// Lazy load TableOfContents since it's not immediately visible on mobile
const TableOfContents = lazy(() => import("@/components/docs/TableOfContents").then(module => ({ default: module.TableOfContents })));
import {
  Download,
  Keyboard,
  Settings,
  FileText,
  History,
  Edit,
  Trash2,
  Eye,
  Code,
  Link as LinkIcon,
  List,
  Bold,
  Italic,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  Tag,
  Server,
  Shield,
} from "lucide-react";

export function DocsPage() {
  return (
    <PageTransition>
    <div className="container py-12 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Table of Contents - Left Sidebar */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <Suspense fallback={
            <div className="sticky top-8 space-y-2">
              <div className="h-4 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded-xl animate-pulse w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded-xl animate-pulse w-1/2"></div>
            </div>
          }>
            <TableOfContents />
          </Suspense>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold">Documentation</h1>
              <p className="text-xl text-muted-foreground">
                Complete guide to using Code Context Notes for smart code
                annotations
              </p>
            </div>

            {/* Problem & Solution Overview */}
            <Card id="overview" className="shadow-brand-drop bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-brand-orange">
              <CardHeader>
                <CardTitle className="text-2xl">What Problem Does This Solve?</CardTitle>
                <CardDescription className="text-base">
                  Understanding the core challenge and how Code Context Notes addresses it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">The Problem</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start space-x-2">
                      <span className="text-red-500 font-bold">✗</span>
                      <span className="text-muted-foreground">
                        <strong>Code comments</strong> clutter source files and pollute git history
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-red-500 font-bold">✗</span>
                      <span className="text-muted-foreground">
                        <strong>External documentation</strong> becomes outdated and disconnected from code
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-red-500 font-bold">✗</span>
                      <span className="text-muted-foreground">
                        <strong>Important context</strong> gets lost over time
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">The Solution</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Code Context Notes provides contextual annotations that:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-muted-foreground">
                        Live alongside your code without being part of it
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-muted-foreground">
                        Track code movement and refactoring automatically
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-muted-foreground">
                        Maintain complete version history
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-muted-foreground">
                        Support multiple annotations on the same code location
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-muted-foreground">
                        Integrate natively with VSCode's comment UI
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-brand-orange">
                  <h4 className="font-semibold mb-2 text-brand-orange">Perfect For:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>📝 Technical debt documentation</li>
                    <li>🎓 Onboarding new developers</li>
                    <li>💡 Implementation decisions</li>
                    <li>🤝 Team knowledge sharing</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Installation */}
            <Card id="installation" className="shadow-brand-drop bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5 text-brand-orange" />
                  <span>Installation</span>
                </CardTitle>
                <CardDescription>
                  Get started with Code Context Notes in VS Code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">
                    From VS Code Marketplace
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Open VS Code</li>
                    <li>Go to Extensions (Ctrl+Shift+X)</li>
                    <li>Search for "Code Context Notes"</li>
                    <li>Click Install</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">From Open VSX Registry (VS Codium)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Available for VS Codium and other Open VSX compatible editors
                  </p>
                  <code className="block bg-brand-navy text-brand-warm p-3 rounded-xl text-sm">
                    codium --install-extension jnahian.code-context-notes
                  </code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">From Command Line</h4>
                  <code className="block bg-brand-navy text-brand-warm p-3 rounded-xl text-sm">
                    code --install-extension jnahian.code-context-notes
                  </code>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild>
                    <a
                      href="https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Install from VS Code Marketplace
                    </a>
                  </Button>
                  
                  <Button variant="outline" asChild>
                    <a
                      href="https://open-vsx.org/extension/jnahian/code-context-notes"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Install from Open VSX
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Start */}
            <Card id="quick-start" className="shadow-brand-drop bg-white">
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
                <CardDescription>
                  Add your first note in three simple steps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Select Code</h4>
                      <p className="text-sm text-muted-foreground">
                        Highlight the line(s) of code you want to annotate
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Add Note</h4>
                      <p className="text-sm text-muted-foreground">
                        Right-click and select "Code Notes: Add Note", or press{" "}
                        <code className="bg-brand-navy text-brand-warm px-1 rounded-lg-lg">
                          Ctrl+Alt+N
                        </code>{" "}
                        (or{" "}
                        <code className="bg-brand-navy text-brand-warm px-1 rounded-lg-lg">
                          Cmd+Alt+N
                        </code>{" "}
                        on Mac)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Save</h4>
                      <p className="text-sm text-muted-foreground">
                        Type your note with markdown formatting and click Save
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts */}
            <Card
              id="keyboard-shortcuts"
              className="shadow-brand-drop bg-white"
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Keyboard className="h-5 w-5 text-brand-orange" />
                  <span>Keyboard Shortcuts</span>
                </CardTitle>
                <CardDescription>
                  Speed up your workflow with these shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-3">Main Commands</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <span>Add Note</span>
                            <p className="text-xs text-muted-foreground">Right-click menu or shortcut</p>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-brand-orange text-brand-orange"
                          >
                            Ctrl+Alt+N
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Delete Note</span>
                          <Badge
                            variant="outline"
                            className="border-brand-orange text-brand-orange"
                          >
                            Ctrl+Alt+D
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>View History</span>
                          <Badge
                            variant="outline"
                            className="border-brand-orange text-brand-orange"
                          >
                            Ctrl+Alt+H
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Refresh Notes</span>
                          <Badge
                            variant="outline"
                            className="border-brand-orange text-brand-orange"
                          >
                            Ctrl+Alt+R
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">
                        Markdown Formatting
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Bold</span>
                          <Badge variant="outline">Ctrl+B</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Italic</span>
                          <Badge variant="outline">Ctrl+I</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Inline Code</span>
                          <Badge variant="outline">Ctrl+Shift+C</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Code Block</span>
                          <Badge variant="outline">Ctrl+Shift+K</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Link</span>
                          <Badge variant="outline">Ctrl+K</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    On Mac, use Cmd instead of Ctrl
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card id="key-features" className="bg-white">
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
                <CardDescription>
                  What makes Code Context Notes powerful
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="flex items-start space-x-3">
                    <Eye className="h-5 w-5 text-brand-orange mt-0.5" />
                    <div>
                      <h4 className="font-semibold">
                        Native VS Code Integration
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Uses VS Code's native comment UI with CodeLens
                        indicators and inline editing
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <History className="h-5 w-5 text-brand-orange mt-0.5" />
                    <div>
                      <h4 className="font-semibold">
                        Intelligent Content Tracking
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Notes follow code content even when line numbers change
                        using content hash tracking
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-brand-orange mt-0.5" />
                    <div>
                      <h4 className="font-semibold">
                        Complete Version History
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Full audit trail of all note modifications with
                        timestamps and authors
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Code className="h-5 w-5 text-brand-orange mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Human-Readable Storage</h4>
                      <p className="text-sm text-muted-foreground">
                        Notes stored as markdown files in{" "}
                        <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">
                          .code-notes/
                        </code>{" "}
                        directory
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Note Types & Metadata */}
            <Card id="note-types" className="shadow-brand-drop bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="h-5 w-5 text-brand-orange" />
                  <span>Note Types & Metadata</span>
                  <Badge className="bg-brand-orange">New</Badge>
                </CardTitle>
                <CardDescription>
                  Every note carries structured fields so both humans and AI agents can filter, prioritize, and act on them
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Type</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Describes what a note is for. Default{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">context</code>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["context", "instruction", "warning", "decision", "todo", "handoff", "rationale"].map((t) => (
                      <Badge key={t} variant="outline" className="border-brand-orange text-brand-orange">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Priority</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Default{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">normal</code>.{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">critical</code>{" "}
                    notes sort first in agent digests.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["low", "normal", "high", "critical"].map((p) => (
                      <Badge key={p} variant="outline" className="border-brand-orange text-brand-orange">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Scope</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    What the note applies to. Default{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">line</code>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["line", "function", "class", "file", "directory"].map((s) => (
                      <Badge key={s} variant="outline" className="border-brand-orange text-brand-orange">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <p className="text-sm text-muted-foreground">
                      A free-form list of string labels for grouping and search.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">References</h4>
                    <p className="text-sm text-muted-foreground">
                      Link a note to a{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">pr</code>,{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">issue</code>,{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">commit</code>,{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">test</code>,{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">url</code>, or{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">note</code> — each with a value and an optional label.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Expiry</h4>
                    <p className="text-sm text-muted-foreground">
                      An{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">expiresAt</code>{" "}
                      ISO timestamp. Expired notes are filtered out of agent digests.
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-brand-orange">
                  <h4 className="font-semibold mb-2 text-brand-orange">Setting & Filtering</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      Run{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">Code Notes: Set Note Type / Tags / Priority…</code>{" "}
                      to edit a note's metadata.
                    </li>
                    <li>
                      Use{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">Filter Notes by Type…</code>{" "}
                      to narrow the sidebar, and{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">Toggle Expired Notes</code>{" "}
                      to show or hide expired ones.
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Usage Guide */}
            <Card id="usage-guide" className="bg-white">
              <CardHeader>
                <CardTitle>Usage Guide</CardTitle>
                <CardDescription>
                  Detailed instructions for common tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div id="multiple-notes" className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-xl border-2 border-brand-orange">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Layers className="h-5 w-5 text-brand-orange" />
                    <span className="text-lg">Multiple Notes Per Line</span>
                    <Badge className="bg-brand-orange">New</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add unlimited annotations to the same code location with smart navigation between notes.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <h5 className="font-semibold text-sm mb-2">Adding Multiple Notes</h5>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Click the "➕ Add Note" CodeLens button on a line with existing notes</li>
                        <li>Or click the <Plus className="inline h-3 w-3" /> button in the comment thread</li>
                        <li>Each line can have unlimited notes with unique perspectives</li>
                      </ol>
                    </div>

                    <div>
                      <h5 className="font-semibold text-sm mb-2">Navigating Between Notes</h5>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li className="flex items-center space-x-2">
                          <ChevronLeft className="h-3 w-3" />
                          <span><strong>Previous button:</strong> Navigate to the previous note</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <ChevronRight className="h-3 w-3" />
                          <span><strong>Next button:</strong> Navigate to the next note</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Eye className="h-3 w-3" />
                          <span><strong>Indicator:</strong> Shows "Note X of Y" to track position</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-semibold text-sm mb-2">Button Layout</h5>
                      <div className="space-y-2">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-xs">
                          <strong>Single note:</strong> <code className="bg-brand-navy text-brand-warm px-1 rounded">[+] [Edit] [History] [Delete]</code>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-xs">
                          <strong>Multiple notes:</strong> <code className="bg-brand-navy text-brand-warm px-1 rounded">[&lt;] [&gt;] [+] [Edit] [History] [Delete]</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div id="editing-notes">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Edit className="h-4 w-4" />
                    <span>Editing Notes</span>
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>
                      Click the Edit button (pencil icon) in the comment thread
                    </li>
                    <li>Modify the note content with markdown formatting</li>
                    <li>Click Save to create a new history entry</li>
                    <li>Or click Cancel to discard changes</li>
                  </ol>
                </div>

                <div id="viewing-history">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <History className="h-4 w-4" />
                    <span>Viewing History</span>
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>
                      Click the History button (clock icon) in the comment
                      thread
                    </li>
                    <li>
                      History appears as replies showing action, author, and
                      timestamp
                    </li>
                    <li>View previous content for each edit</li>
                  </ol>
                </div>

                <div id="deleting-notes">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Trash2 className="h-4 w-4" />
                    <span>Deleting Notes</span>
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>
                      Click the Delete button (trash icon) in the comment thread
                    </li>
                    <li>Confirm the deletion</li>
                    <li>
                      Note is marked as deleted in history (not permanently
                      removed)
                    </li>
                    <li>CodeLens indicator disappears</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Agents & MCP Server */}
            <Card id="agents-mcp" className="shadow-brand-drop bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5 text-brand-orange" />
                  <span>AI Agents & MCP Server</span>
                  <Badge className="bg-brand-orange">New</Badge>
                </CardTitle>
                <CardDescription>
                  Give AI coding agents like Claude Code and Cursor read/write access to your workspace notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    The standalone MCP server{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">@jnahian/code-notes-mcp</code>{" "}
                    speaks over stdio and exposes your notes to any MCP-capable agent.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Read Tools</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">search_notes</code></li>
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">get_notes_for_file</code></li>
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">get_notes_for_changes</code> — pre-edit context for a diff</li>
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">list_instructions</code></li>
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">get_handoffs</code></li>
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">get_note</code></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Write Tools</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Only exposed when the server is started with{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">--agent &lt;name&gt;</code>.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">create_note</code></li>
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">edit_note</code></li>
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">delete_note</code></li>
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">add_handoff</code></li>
                      <li><code className="bg-brand-navy text-brand-warm px-1 rounded-lg">add_decision</code></li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Resources</h4>
                  <div className="flex flex-wrap gap-2">
                    {["code-notes://digest", "code-notes://index", "code-notes://file/{path}"].map((r) => (
                      <code key={r} className="bg-brand-navy text-brand-warm px-2 py-1 rounded-lg text-xs">
                        {r}
                      </code>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Auto-Generated Exports</h4>
                  <p className="text-sm text-muted-foreground">
                    The server keeps two files in{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">.code-notes/</code>{" "}
                    up to date — deterministically and debounced:{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">INDEX.json</code>{" "}
                    (a machine-readable index) and{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">AGENTS.md</code>{" "}
                    (a human-readable digest hoisting instructions, warnings, and handoffs).
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-brand-orange">
                  <h4 className="font-semibold mb-2 text-brand-orange">Safe Concurrent Writes</h4>
                  <p className="text-sm text-muted-foreground">
                    Per-note advisory file locks in{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">.code-notes/.locks/</code>{" "}
                    are shared with the extension, so agent and human edits never race.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Agent Trust Model */}
            <Card id="trust-model" className="shadow-brand-drop bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-brand-orange" />
                  <span>Agent Trust Model</span>
                  <Badge className="bg-brand-orange">v0.5</Badge>
                </CardTitle>
                <CardDescription>
                  One setting decides how much you trust agent (MCP) writes to your notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <code className="block bg-brand-navy text-brand-warm p-3 rounded-xl text-sm mb-2">
                    "codeContextNotes.agentWriteMode": "audit"
                  </code>
                  <p className="text-sm text-muted-foreground">
                    The policy lives in{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">.code-notes/config.json</code>,
                    shared by the extension and the MCP server and re-read on every call — no restart needed.
                    There is deliberately no server flag for the mode.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border-l-4 border-brand-orange pl-4">
                    <h4 className="font-semibold mb-1 flex items-center space-x-2">
                      <span>direct</span>
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Writes land immediately, attributed with{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">authorType: agent</code>.
                    </p>
                  </div>

                  <div className="border-l-4 border-brand-orange pl-4">
                    <h4 className="font-semibold mb-1 flex items-center space-x-2">
                      <span>audit</span>
                      <Badge variant="outline" className="border-brand-orange text-brand-orange">Default</Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Writes land <em>and</em> every operation is logged to{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">.code-notes/_audit.log</code>.
                      The <strong>Agent activity</strong> sidebar view lists them with an inline{" "}
                      <strong>Revert</strong> (create → delete, edit → prior content, delete → restore).
                    </p>
                  </div>

                  <div className="border-l-4 border-brand-orange pl-4">
                    <h4 className="font-semibold mb-1">queue</h4>
                    <p className="text-sm text-muted-foreground">
                      Writes never touch live notes; each becomes a proposal in{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">.code-notes/_pending/</code>.
                      The <strong>Pending agent proposals</strong> sidebar view offers{" "}
                      <strong>Approve / Reject / Edit-and-approve</strong>. Write tools return{" "}
                      <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">{`{"status":"pending"}`}</code>{" "}
                      — a success shape, not an error.
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-brand-orange">
                  <h4 className="font-semibold mb-2 text-brand-orange">Three Sidebar Views</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Notes", "Agent activity", "Pending agent proposals"].map((v) => (
                      <Badge key={v} variant="outline" className="border-brand-orange text-brand-orange">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Markdown Support */}
            <Card id="markdown-formatting" className="bg-white">
              <CardHeader>
                <CardTitle>Markdown Formatting</CardTitle>
                <CardDescription>
                  Full markdown support with keyboard shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Bold className="h-4 w-4" />
                      <span className="font-semibold">Bold Text</span>
                      <Badge variant="outline" className="ml-auto">
                        Ctrl+B
                      </Badge>
                    </div>
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded-xl text-sm">
                      **bold text** or __bold text__
                    </code>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Italic className="h-4 w-4" />
                      <span className="font-semibold">Italic Text</span>
                      <Badge variant="outline" className="ml-auto">
                        Ctrl+I
                      </Badge>
                    </div>
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded-xl text-sm">
                      *italic text* or _italic text_
                    </code>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Code className="h-4 w-4" />
                      <span className="font-semibold">Inline Code</span>
                      <Badge variant="outline" className="ml-auto">
                        Ctrl+Shift+C
                      </Badge>
                    </div>
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded-xl text-sm">
                      `inline code`
                    </code>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-semibold">Code Block</span>
                      <Badge variant="outline" className="ml-auto">
                        Ctrl+Shift+K
                      </Badge>
                    </div>
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded-xl text-sm whitespace-pre">
                      ```javascript{"\n"}function example() {"{"}...{"}"}
                      {"\n"}```
                    </code>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4" />
                      <span className="font-semibold">Links</span>
                      <Badge variant="outline" className="ml-auto">
                        Ctrl+K
                      </Badge>
                    </div>
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded-xl text-sm">
                      [link text](https://example.com)
                    </code>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <List className="h-4 w-4" />
                      <span className="font-semibold">Lists</span>
                    </div>
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded-xl text-sm whitespace-pre">
                      - Unordered list{"\n"}1. Ordered list
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card id="configuration" className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Configuration</span>
                </CardTitle>
                <CardDescription>
                  Customize Code Context Notes to your preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  All settings are prefixed with{" "}
                  <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">codeContextNotes.</code>{" "}
                  and can be set in VS Code settings or{" "}
                  <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">settings.json</code>.
                </p>
                <div className="space-y-3">
                  {[
                    { key: "storageDirectory", def: '".code-notes"', desc: "Directory where notes are stored (relative to workspace root)." },
                    { key: "authorName", def: '""', desc: "Override automatic username detection. Falls back to git or system username." },
                    { key: "showCodeLens", def: "true", desc: "Show CodeLens indicators above code that has notes." },
                    { key: "sidebar.sortBy", def: '"file"', desc: "How the Notes sidebar orders entries." },
                    { key: "sidebar.previewLength", def: "50", desc: "Number of characters shown in a note preview." },
                    { key: "sidebar.autoExpand", def: "false", desc: "Automatically expand tree groups in the sidebar." },
                    { key: "agentWriteMode", def: '"audit"', desc: "How agent (MCP) writes are handled: direct, audit, or queue." },
                    { key: "agentAllowList", def: "[]", desc: "Agent names permitted to write. Empty means all agents are allowed." },
                    { key: "auditLogRetention", def: "1000", desc: "Maximum number of entries kept in the agent audit log." },
                    { key: "exports.enabled", def: "true", desc: "Master switch for auto-generated exports in .code-notes/." },
                    { key: "exports.indexJson", def: "true", desc: "Generate the machine-readable INDEX.json export." },
                    { key: "exports.agentsMarkdown", def: "true", desc: "Generate the human-readable AGENTS.md digest." },
                  ].map((s) => (
                    <div key={s.key} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="sm:flex-1">
                        <code className="bg-brand-navy text-brand-warm px-1 rounded-lg text-sm">
                          {s.key}
                        </code>
                        <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                      </div>
                      <Badge variant="outline" className="border-brand-orange text-brand-orange shrink-0 font-mono">
                        {s.def}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card id="faq" className="bg-white">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">
                    Do notes stay with my code when I refactor?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Yes! Notes use content hash tracking to follow code even
                    when line numbers change. If you move code to a different
                    location, the note moves with it.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">
                    Can I use notes with any programming language?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Yes! Notes work with all file types and languages supported
                    by VS Code.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">
                    Are notes stored in my repository?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Notes are stored in{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">
                      .code-notes/
                    </code>{" "}
                    directory. You can choose to commit them (to share with
                    team) or add to{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">
                      .gitignore
                    </code>{" "}
                    (to keep them local).
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">
                    How do I share notes with my team?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Commit the{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded-lg">
                      .code-notes/
                    </code>{" "}
                    directory to your repository. Team members with the
                    extension installed will see all notes.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">
                    What's the performance impact?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Minimal. The extension uses caching and efficient
                    algorithms. Even with 100+ notes, you won't notice any lag.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card id="support" className="bg-white">
              <CardHeader>
                <CardTitle>Support & Contributing</CardTitle>
                <CardDescription>
                  Get help or contribute to the project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <Button variant="outline" asChild>
                    <a
                      href="https://github.com/jnahian/code-context-notes/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Report Issues on GitHub
                    </a>
                  </Button>

                  <Button variant="outline" asChild>
                    <a
                      href="https://github.com/jnahian/code-context-notes/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Join Discussions
                    </a>
                  </Button>

                  <Button variant="outline" asChild>
                    <a
                      href="https://github.com/jnahian/code-context-notes"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contribute on GitHub
                    </a>
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">
                    <strong>Requirements:</strong> VS Code 1.80.0 or higher, Git
                    (optional, for author detection)
                  </p>
                  <p>
                    <strong>License:</strong> MIT - Free and open source
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
