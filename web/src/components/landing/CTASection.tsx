import { Button } from "@/components/ui/button";
import { Download, Github } from "lucide-react";

export function CTASection() {
  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container py-24">
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
      </div>
    </section>
  );
}