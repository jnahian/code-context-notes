import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  MousePointerClick
} from "lucide-react";

export function ChangelogPage() {
  return (
    <PageTransition>
      <div className="container py-12 max-w-5xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Changelog</h1>
            <p className="text-xl text-muted-foreground">
              Track all updates, improvements, and new features
            </p>
          </div>

          {/* Version 0.2.1 */}
          <Card id="v0.2.1" className="shadow-brand-drop bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-brand-orange">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center space-x-3">
                  <span>Version 0.2.1</span>
                  <Badge className="bg-brand-orange">Latest</Badge>
                </CardTitle>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">November 12, 2025</span>
                </div>
              </div>
              <CardDescription className="text-base">
                Patch release with context menu integration and UX improvements
              </CardDescription>
            </CardHeader>
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

          {/* Version 0.2.0 */}
          <Card id="v0.2.0" className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Version 0.2.0</CardTitle>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">October 27, 2025</span>
                </div>
              </div>
              <CardDescription className="text-base">
                Major feature update with sidebar view and workspace-wide note browsing
              </CardDescription>
            </CardHeader>
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

          {/* Version 0.1.8 */}
          <Card id="v0.1.8" className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Version 0.1.8</CardTitle>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">October 23, 2025</span>
                </div>
              </div>
              <CardDescription className="text-base">
                Multiple notes per line feature with conditional navigation
              </CardDescription>
            </CardHeader>
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

          {/* Version 0.1.7 */}
          <Card id="v0.1.7" className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Version 0.1.7</CardTitle>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">October 19, 2025</span>
                </div>
              </div>
              <CardDescription className="text-base">
                UX improvements to prevent unwanted scrolling and reduce interruptions
              </CardDescription>
            </CardHeader>
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

          {/* Version 0.1.6 */}
          <Card id="v0.1.6" className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Version 0.1.6</CardTitle>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">October 19, 2025</span>
                </div>
              </div>
              <CardDescription className="text-base">
                Input focus improvements and unified note creation
              </CardDescription>
            </CardHeader>
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

          {/* Version 0.1.5 */}
          <Card id="v0.1.5" className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Version 0.1.5</CardTitle>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">October 19, 2025</span>
                </div>
              </div>
              <CardDescription className="text-base">
                Focus mode and keyboard shortcut improvements
              </CardDescription>
            </CardHeader>
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

          {/* Version 0.1.4 */}
          <Card id="v0.1.4" className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Version 0.1.4</CardTitle>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">October 17, 2025</span>
                </div>
              </div>
              <CardDescription className="text-base">
                ES Module migration for modern package compatibility
              </CardDescription>
            </CardHeader>
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

          {/* Version 0.1.1 */}
          <Card id="v0.1.1" className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Version 0.1.1</CardTitle>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">October 17, 2025</span>
                </div>
              </div>
              <CardDescription className="text-base">
                Activation and workspace handling improvements
              </CardDescription>
            </CardHeader>
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

          {/* Version 0.1.0 - Initial Release */}
          <Card id="v0.1.0" className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-2 border-green-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center space-x-3">
                  <span>Version 0.1.0</span>
                  <Badge className="bg-green-600">Initial Release</Badge>
                </CardTitle>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">October 17, 2025</span>
                </div>
              </div>
              <CardDescription className="text-base">
                🎉 First public release - Published to VS Code Marketplace and Open VSX Registry!
              </CardDescription>
            </CardHeader>
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

          {/* Future Versions Note */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-2 border-purple-300">
            <CardHeader>
              <CardTitle className="text-xl flex items-center space-x-2">
                <Search className="h-5 w-5 text-purple-600" />
                <span>Coming in v0.3.0</span>
              </CardTitle>
              <CardDescription>
                What's next for Code Context Notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>
                    <strong>Search and Filter Notes</strong> - Full-text search across all note content with filters by author, date range, and file path
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>
                    <strong>Regex Pattern Matching</strong> - Advanced search capabilities for power users
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>
                    <strong>Background Indexing</strong> - Instant search results with automatic index updates
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
