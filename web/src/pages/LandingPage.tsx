import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Github, 
  FileText, 
  History, 
  GitBranch, 
  Zap,
  CheckCircle,
  Code,
  Users
} from 'lucide-react'
import { Link } from 'react-router-dom'

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
          
          <Badge variant="secondary" className="px-4 py-2 bg-brand-orange text-white border-brand-orange">
            VS Code Extension
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl">
            Smart Code Annotations with{' '}
            <span className="text-brand-orange">Full History</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl">
            Add contextual notes to your code that stay with your code even when line numbers change. 
            Complete version history and intelligent tracking included.
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
          <h2 className="text-3xl md:text-4xl font-bold">Why Choose Code Context Notes?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for developers who need reliable, intelligent code annotation that scales with their projects.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <Zap className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Intelligent Tracking</CardTitle>
              <CardDescription>
                Notes follow your code even when line numbers change using content hash tracking
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <History className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Complete History</CardTitle>
              <CardDescription>
                Full audit trail of all note modifications with timestamps and authors
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <Code className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Native Integration</CardTitle>
              <CardDescription>
                Uses VS Code's native comment UI with CodeLens indicators and markdown support
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <GitBranch className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Git Integration</CardTitle>
              <CardDescription>
                Automatic author detection and seamless version control integration
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="shadow-brand-drop hover:shadow-brand-glow transition-shadow duration-300">
            <CardHeader>
              <FileText className="h-10 w-10 text-brand-orange mb-2" />
              <CardTitle>Human-Readable Storage</CardTitle>
              <CardDescription>
                Notes stored as markdown files that are easy to read, search, and version control
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
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">Get Started in Seconds</h2>
          <p className="text-xl text-muted-foreground">
            Three simple steps to start annotating your code
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-orange text-white flex items-center justify-center text-xl font-bold mx-auto shadow-brand-glow">
              1
            </div>
            <h3 className="text-xl font-semibold">Select Code</h3>
            <p className="text-muted-foreground">
              Highlight the lines of code you want to annotate
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-orange text-white flex items-center justify-center text-xl font-bold mx-auto shadow-brand-glow">
              2
            </div>
            <h3 className="text-xl font-semibold">Press Shortcut</h3>
            <p className="text-muted-foreground">
              Use <code className="bg-brand-navy text-brand-warm px-2 py-1 rounded">Ctrl+Alt+N</code> (or <code className="bg-brand-navy text-brand-warm px-2 py-1 rounded">Cmd+Alt+N</code> on Mac)
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-orange text-white flex items-center justify-center text-xl font-bold mx-auto shadow-brand-glow">
              3
            </div>
            <h3 className="text-xl font-semibold">Add Note</h3>
            <p className="text-muted-foreground">
              Type your note with markdown formatting and save
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container py-24 bg-brand-warm/50">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-brand-orange">88%</div>
            <div className="text-sm text-muted-foreground">Test Coverage</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-brand-orange">100+</div>
            <div className="text-sm text-muted-foreground">Total Tests</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-brand-orange">All</div>
            <div className="text-sm text-muted-foreground">Languages Supported</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-brand-orange">MIT</div>
            <div className="text-sm text-muted-foreground">Open Source License</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Enhance Your Code?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join developers who are already using Code Context Notes to document and track their code more effectively.
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
              <span className="font-semibold text-brand-warm">Code Context Notes</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <a href="https://github.com/jnahian/code-context-notes" target="_blank" rel="noopener noreferrer" className="text-brand-warm-muted hover:text-brand-orange transition-colors">
                GitHub
              </a>
              <a href="https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes" target="_blank" rel="noopener noreferrer" className="text-brand-warm-muted hover:text-brand-orange transition-colors">
                VS Code Marketplace
              </a>
              <Link to="/docs" className="text-brand-warm-muted hover:text-brand-orange transition-colors">
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}