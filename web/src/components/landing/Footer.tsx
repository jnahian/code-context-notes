import { Link } from "react-router-dom";

export function Footer() {
  return (
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
  );
}