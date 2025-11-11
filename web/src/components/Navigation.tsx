import { Link, useLocation } from 'react-router-dom'
import { Button } from './ui/button'
import { Github, Download } from 'lucide-react'

export function Navigation() {
  const location = useLocation()

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="/icon.png" 
              alt="Code Context Notes" 
              className="h-8 w-8 rounded-2xl"
            />
            <span className="font-bold text-xl">Code Context Notes</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Home
            </Link>
            <Link
              to="/docs"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/docs' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Documentation
            </Link>
            <Link
              to="/changelog"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/changelog' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Changelog
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <a 
              href="https://github.com/jnahian/code-context-notes" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </Button>
          
          <Button size="sm" asChild>
            <a 
              href="https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Install</span>
            </a>
          </Button>
        </div>
      </div>
    </nav>
  )
}