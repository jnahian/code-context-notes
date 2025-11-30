import { Button } from "@/components/ui/button";
import { Download, Github } from "lucide-react";
import { motion } from "framer-motion";

export function CTASection() {
  return (
    <section className="relative py-24 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] pointer-events-none" />

      {/* Gradient Blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <div className="text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Ready to Enhance Your <span className="text-transparent bg-clip-text bg-gradient-brand">Code</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join developers who are already using Code Context Notes to document
              and track their code more effectively.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg shadow-brand-orange/20" asChild>
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

            <Button variant="outline" size="lg" className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800" asChild>
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

            <Button variant="outline" size="lg" className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800" asChild>
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}