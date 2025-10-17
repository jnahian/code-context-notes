import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { PageTransition } from "@/components/PageTransition";
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
} from "lucide-react";

export function DocsPage() {
  return (
    <PageTransition>
    <div className="container py-12 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Table of Contents - Left Sidebar */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <TableOfContents />
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
                  <h4 className="font-semibold mb-2">From Command Line</h4>
                  <code className="block bg-brand-navy text-brand-warm p-3 rounded text-sm">
                    code --install-extension jnahian.code-context-notes
                  </code>
                </div>

                <Button asChild>
                  <a
                    href="https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Install from Marketplace
                  </a>
                </Button>
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
                        Press{" "}
                        <code className="bg-brand-navy text-brand-warm px-1 rounded">
                          Ctrl+Alt+N
                        </code>{" "}
                        (or{" "}
                        <code className="bg-brand-navy text-brand-warm px-1 rounded">
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
                        <div className="flex justify-between">
                          <span>Add Note</span>
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
                        <code className="bg-brand-navy text-brand-warm px-1 rounded">
                          .code-notes/
                        </code>{" "}
                        directory
                      </p>
                    </div>
                  </div>
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
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded text-sm">
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
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded text-sm">
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
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded text-sm">
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
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded text-sm whitespace-pre">
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
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded text-sm">
                      [link text](https://example.com)
                    </code>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <List className="h-4 w-4" />
                      <span className="font-semibold">Lists</span>
                    </div>
                    <code className="block bg-brand-navy text-brand-warm p-2 rounded text-sm whitespace-pre">
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
                <div>
                  <h4 className="font-semibold mb-2">Storage Directory</h4>
                  <code className="block bg-brand-navy text-brand-warm p-3 rounded text-sm mb-2">
                    "codeContextNotes.storageDirectory": ".code-notes"
                  </code>
                  <p className="text-sm text-muted-foreground">
                    Directory where notes are stored (relative to workspace
                    root). Default:{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded">
                      .code-notes
                    </code>
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Author Name</h4>
                  <code className="block bg-brand-navy text-brand-warm p-3 rounded text-sm mb-2">
                    "codeContextNotes.authorName": "Your Name"
                  </code>
                  <p className="text-sm text-muted-foreground">
                    Override automatic username detection. Default: git username
                    or system username
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Show CodeLens</h4>
                  <code className="block bg-brand-navy text-brand-warm p-3 rounded text-sm mb-2">
                    "codeContextNotes.showCodeLens": true
                  </code>
                  <p className="text-sm text-muted-foreground">
                    Enable/disable CodeLens indicators above code with notes.
                    Default:{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded">
                      true
                    </code>
                  </p>
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
                    <code className="bg-brand-navy text-brand-warm px-1 rounded">
                      .code-notes/
                    </code>{" "}
                    directory. You can choose to commit them (to share with
                    team) or add to{" "}
                    <code className="bg-brand-navy text-brand-warm px-1 rounded">
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
                    <code className="bg-brand-navy text-brand-warm px-1 rounded">
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
