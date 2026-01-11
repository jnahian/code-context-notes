import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HeroVisual } from "./HeroVisual";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50/50 via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-24 pb-32 md:pt-32 md:pb-40">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.4] pointer-events-none" />

      {/* Gradient Blob */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-[500px] h-[500px] bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Column: Content */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="secondary"
                className="px-4 py-2 bg-brand-orange/10 text-brand-orange border-brand-orange/20 hover:bg-brand-orange/20 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-orange"></span>
                  </span>
                  v1.0 is now live
                </span>
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl font-bold tracking-tight max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Code Annotations Without the{" "}
              <span className="text-transparent bg-clip-text bg-gradient-brand">
                Code Pollution
              </span>
            </motion.h1>

            <motion.p
              className="text-xl text-muted-foreground max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Stop cluttering your source files with comments. Add contextual notes that live alongside your code,
              track automatically through refactoring, and maintain complete version history.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg shadow-brand-orange/20" asChild>
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

              <Button variant="outline" size="lg" className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800" asChild>
                <Link to="/docs" className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Documentation</span>
                </Link>
              </Button>
            </motion.div>

            <motion.div
              className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
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
                <span>Git Integration</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Visual */}
          <div className="relative lg:h-[600px] flex items-center justify-center">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}