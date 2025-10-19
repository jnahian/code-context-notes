import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container py-24 md:py-32">
        <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in-0 duration-700">
          <div className="flex items-center justify-center mb-4 animate-in zoom-in-50 duration-500 delay-200">
            <img
              src="/logo.png"
              alt="Code Context Notes Logo"
              className="h-24 w-24 md:h-32 md:w-32 shadow-brand-glow rounded-2xl hover:scale-105 transition-transform duration-300 animate-float"
            />
          </div>

          <Badge
            variant="secondary"
            className="px-4 py-2 bg-brand-orange text-white border-brand-orange animate-in slide-in-from-top-4 duration-500 delay-300"
          >
            VS Code Extension
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl animate-in slide-in-from-bottom-6 duration-700 delay-400">
            Code Annotations Without the{" "}
            <span className="text-brand-orange">Code Pollution</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl animate-in fade-in-0 duration-700 delay-500">
            Stop cluttering your source files with comments. Add contextual notes that live alongside your code, 
            track automatically through refactoring, and maintain complete version history.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-600">
            <Button size="lg" asChild>
              <a
                href="https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span>Install from VS Code</span>
              </a>
            </Button>

            <Button variant="outline" size="lg" asChild>
              <a
                href="https://open-vsx.org/extension/jnahian/code-context-notes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span>Install from Open VSX</span>
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
      </div>
    </section>
  );
}