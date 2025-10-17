import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Github,
  FileText,
  History,
  GitBranch,
  Zap,
  CheckCircle,
  Code,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="Code Context Notes Logo"
              className="h-24 w-24 md:h-32 md:w-32 shadow-brand-glow rounded-2xl"
            />
          </div>

          <Badge
            variant="secondary"
            className="px-4 py-2 bg-brand-orange text-white border-brand-orange"
          >
            VS Code Extension
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl">
            Smart Code Annotations with{" "}
            <span className="text-brand-orange">Full History</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl">
            Add contextual notes to your code that stay with your code even when
            line numbers change. Complete version history and intelligent
            tracking included.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild>
              <a
                href="https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span>Install Extension</span>
              </a>
            </Button>

            <Button variant="outline" size="lg" asChild>
              <Link to="/docs" className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>View Documentation</span>
              </Link>
            </Button>
          </div>

          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-brand-orange" />
              <span>Free & Open Source</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-brand-orange" />
              <span>Works with All Languages</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-brand-orange" />
              <span>88% Test Coverage</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24 bg-brand-warm/50">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Why Choose Code Context Notes?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for developers who need reliable, intelligent code annotation
            that scales with their projects.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <Zap className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Intelligent Tracking</CardTitle>
              <CardDescription>
                Notes follow your code even when line numbers change using
                content hash tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <History className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Complete History</CardTitle>
              <CardDescription>
                Full audit trail of all note modifications with timestamps and
                authors
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <Code className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Native Integration</CardTitle>
              <CardDescription>
                Uses VS Code's native comment UI with CodeLens indicators and
                markdown support
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <GitBranch className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Git Integration</CardTitle>
              <CardDescription>
                Automatic author detection and seamless version control
                integration
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <FileText className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Human-Readable Storage</CardTitle>
              <CardDescription>
                Notes stored as markdown files that are easy to read, search,
                and version control
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <Users className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Share notes with your team by committing them to your repository
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="container py-24">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-3xl md:text-4xl font-bold">
            Get Started in Seconds
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to start annotating your code with intelligent
            tracking and full history
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines for Desktop */}
          <div className="hidden lg:block absolute top-16 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
            <div className="flex justify-between items-center px-32">
              <div className="w-24 h-0.5 bg-gradient-to-r from-brand-orange to-brand-orange/50"></div>
              <div className="w-24 h-0.5 bg-gradient-to-r from-brand-orange/50 to-brand-orange"></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
            {/* Step 1 */}
            <Card className="relative shadow-brand-drop hover:shadow-brand-glow transition-all duration-300 border-2 border-transparent hover:border-brand-orange/20">
              <CardHeader className="text-center pb-6">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full bg-brand-orange text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-brand-glow relative z-10">
                    1
                  </div>
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-brand-orange/20 mx-auto animate-pulse"></div>
                </div>
                <CardTitle className="text-xl mb-3">Select Your Code</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Highlight the lines of code you want to annotate. Works with
                  any programming language and file type.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-brand-navy/5 rounded-lg p-4 border border-brand-navy/10">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-brand-orange"></div>
                    <span className="text-brand-navy font-mono">
                      function calculateTotal() {"{"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm mt-1">
                    <div className="w-2 h-2 rounded-full bg-brand-orange"></div>
                    <span className="text-brand-navy font-mono">
                      {" "}
                      return items.reduce...
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="relative shadow-brand-drop hover:shadow-brand-glow transition-all duration-300 border-2 border-transparent hover:border-brand-orange/20">
              <CardHeader className="text-center pb-6">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full bg-brand-orange text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-brand-glow relative z-10">
                    2
                  </div>
                  <div
                    className="absolute inset-0 w-16 h-16 rounded-full bg-brand-orange/20 mx-auto animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                </div>
                <CardTitle className="text-xl mb-3">
                  Press the Shortcut
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Use the keyboard shortcut to instantly open the note editor
                  right where you need it.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <kbd className="px-3 py-2 bg-brand-navy text-brand-warm rounded-lg font-mono text-sm shadow-sm">
                      Ctrl
                    </kbd>
                    <span className="text-brand-orange font-bold">+</span>
                    <kbd className="px-3 py-2 bg-brand-navy text-brand-warm rounded-lg font-mono text-sm shadow-sm">
                      Alt
                    </kbd>
                    <span className="text-brand-orange font-bold">+</span>
                    <kbd className="px-3 py-2 bg-brand-navy text-brand-warm rounded-lg font-mono text-sm shadow-sm">
                      N
                    </kbd>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    (Cmd+Alt+N on Mac)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="relative shadow-brand-drop hover:shadow-brand-glow transition-all duration-300 border-2 border-transparent hover:border-brand-orange/20">
              <CardHeader className="text-center pb-6">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full bg-brand-orange text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-brand-glow relative z-10">
                    3
                  </div>
                  <div
                    className="absolute inset-0 w-16 h-16 rounded-full bg-brand-orange/20 mx-auto animate-pulse"
                    style={{ animationDelay: "1s" }}
                  ></div>
                </div>
                <CardTitle className="text-xl mb-3">Write & Save</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Type your note with full markdown support, then save. Your
                  note is now tracked with complete history.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-brand-warm/50 rounded-lg p-4 border border-brand-orange/20">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-orange"></div>
                      <span className="text-sm text-brand-navy">
                        **TODO:** Optimize this function
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-orange"></div>
                      <span className="text-sm text-brand-navy">
                        Consider using `Map` for O(1) lookup
                      </span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-brand-orange/20">
                      <Button
                        size="sm"
                        className="w-full bg-brand-orange hover:bg-brand-orange/90"
                      >
                        Save Note
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center space-x-2 bg-brand-orange/10 px-6 py-3 rounded-full border border-brand-orange/20">
              <CheckCircle className="h-5 w-5 text-brand-orange" />
              <span className="text-brand-navy font-medium">
                That's it! Your code is now annotated with intelligent tracking.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-24 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy/90 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border border-brand-orange rounded-full"></div>
          <div className="absolute top-32 right-20 w-24 h-24 border border-brand-orange rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 border border-brand-orange rounded-full"></div>
          <div className="absolute bottom-32 right-1/3 w-20 h-20 border border-brand-orange rounded-full"></div>
        </div>

        <div className="container relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-navy mb-4">
              Trusted by Developers Worldwide
            </h2>
            <p className="text-xl text-brand-warm max-w-2xl mx-auto opacity-90">
              Built with quality, tested thoroughly, and designed for
              reliability
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Test Coverage */}
            <Card className="bg-brand-warm/15 backdrop-blur-sm border-brand-orange/30 hover:bg-brand-warm/20 transition-all duration-300 group shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto bg-brand-orange/20 rounded-full flex items-center justify-center group-hover:bg-brand-orange/30 transition-colors">
                    <CheckCircle className="h-8 w-8 text-brand-orange" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-brand-navy mb-2">
                  88%
                </div>
                <div className="text-brand-warm font-medium opacity-90">
                  Test Coverage
                </div>
                <div className="text-sm text-brand-warm mt-2 opacity-75">
                  Thoroughly tested codebase
                </div>
              </CardContent>
            </Card>

            {/* Total Tests */}
            <Card className="bg-brand-warm/15 backdrop-blur-sm border-brand-orange/30 hover:bg-brand-warm/20 transition-all duration-300 group shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto bg-brand-orange/20 rounded-full flex items-center justify-center group-hover:bg-brand-orange/30 transition-colors">
                    <Zap className="h-8 w-8 text-brand-orange" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-brand-navy mb-2">
                  100+
                </div>
                <div className="text-brand-warm font-medium opacity-90">
                  Total Tests
                </div>
                <div className="text-sm text-brand-warm mt-2 opacity-75">
                  Comprehensive test suite
                </div>
              </CardContent>
            </Card>

            {/* Languages Supported */}
            <Card className="bg-brand-warm/15 backdrop-blur-sm border-brand-orange/30 hover:bg-brand-warm/20 transition-all duration-300 group shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto bg-brand-orange/20 rounded-full flex items-center justify-center group-hover:bg-brand-orange/30 transition-colors">
                    <Code className="h-8 w-8 text-brand-orange" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-brand-navy mb-2">
                  All
                </div>
                <div className="text-brand-warm font-medium opacity-90">
                  Languages
                </div>
                <div className="text-sm text-brand-warm mt-2 opacity-75">
                  Universal compatibility
                </div>
              </CardContent>
            </Card>

            {/* Open Source */}
            <Card className="bg-brand-warm/15 backdrop-blur-sm border-brand-orange/30 hover:bg-brand-warm/20 transition-all duration-300 group shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto bg-brand-orange/20 rounded-full flex items-center justify-center group-hover:bg-brand-orange/30 transition-colors">
                    <Github className="h-8 w-8 text-brand-orange" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-brand-navy mb-2">
                  MIT
                </div>
                <div className="text-brand-warm font-medium opacity-90">
                  Open Source
                </div>
                <div className="text-sm text-brand-warm mt-2 opacity-75">
                  Free forever
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Trust Indicators */}
          <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-brand-orange/20 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-brand-orange" />
              </div>
              <div>
                <div className="text-2xl font-bold text-brand-navy">
                  Active Community
                </div>
                <div className="text-brand-warm opacity-80">
                  Growing user base
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-brand-orange/20 rounded-full flex items-center justify-center">
                <History className="h-6 w-6 text-brand-orange" />
              </div>
              <div>
                <div className="text-2xl font-bold text-brand-navy">
                  Regular Updates
                </div>
                <div className="text-brand-warm opacity-80">
                  Continuous improvement
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-brand-orange/20 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-brand-orange" />
              </div>
              <div>
                <div className="text-2xl font-bold text-brand-navy">
                  Full Documentation
                </div>
                <div className="text-brand-warm opacity-80">
                  Complete guides & examples
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Enhance Your Code?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join developers who are already using Code Context Notes to document
            and track their code more effectively.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a
                href="https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span>Install from VS Code Marketplace</span>
              </a>
            </Button>

            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/jnahian/code-context-notes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2"
              >
                <Github className="h-5 w-5" />
                <span>View on GitHub</span>
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-brand-navy">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <img
                src="/icon.png"
                alt="Code Context Notes"
                className="h-6 w-6 rounded"
              />
              <span className="font-semibold text-brand-warm">
                Code Context Notes
              </span>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <a
                href="https://github.com/jnahian/code-context-notes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-warm-muted hover:text-brand-orange transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-warm-muted hover:text-brand-orange transition-colors"
              >
                VS Code Marketplace
              </a>
              <Link
                to="/docs"
                className="text-brand-warm-muted hover:text-brand-orange transition-colors"
              >
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
