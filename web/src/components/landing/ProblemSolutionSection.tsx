import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Check, AlertCircle, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { ProblemVisual } from "./ProblemVisual";
import { SolutionVisual } from "./SolutionVisual";

export function ProblemSolutionSection() {
  const problems = [
    {
      category: "Code Comments",
      issues: [
        "Clutter your source files with non-code content",
        "Get committed to version control, polluting git history",
        "Mix documentation with implementation",
      ],
    },
    {
      category: "External Documentation",
      issues: [
        "Quickly becomes outdated as code changes",
        "Disconnected from the actual code location",
        "Requires context switching between editor and docs",
      ],
    },
  ];

  const solutions = [
    {
      title: "Non-invasive",
      description: "Notes stored separately in .code-notes/ directory, never touching your source files",
    },
    {
      title: "Intelligent tracking",
      description: "Notes follow your code even when you move, rename, or refactor it",
    },
    {
      title: "Complete history",
      description: "Every edit preserved with timestamps and authors",
    },
    {
      title: "Team collaboration",
      description: "Share notes by committing .code-notes/ or keep them local with .gitignore",
    },
  ];

  const useCases = [
    "Documenting technical debt and TODOs",
    "Onboarding new developers with contextual explanations",
    "Recording implementation decisions and trade-offs",
    "Leaving breadcrumbs for future refactoring",
    "Team knowledge sharing without code pollution",
  ];

  return (
    <section className="relative py-24 overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.3] pointer-events-none" />

      <div className="container relative z-10">

        {/* PROBLEM SECTION */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
          {/* Left: Text & Cards */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="destructive" className="mb-4 px-4 py-1 text-sm">
                <AlertCircle className="h-3 w-3 mr-2" />
                The Problem
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                The Developer's Documentation Dilemma
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Working on complex codebases, developers face a common challenge: where to keep important context? Inline comments clutter code, while external docs get outdated.
              </p>
            </motion.div>

            <div className="space-y-4">
              {problems.map((problem, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="border-red-100 dark:border-red-900/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="py-4">
                      <CardTitle className="flex items-center space-x-3 text-red-600 dark:text-red-400 text-base">
                        <X className="h-4 w-4" />
                        <span>{problem.category}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                      <ul className="space-y-2">
                        {problem.issues.map((issue, i) => (
                          <li key={i} className="flex items-start space-x-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Visual */}
          <div className="flex justify-center lg:justify-end">
            <ProblemVisual />
          </div>
        </div>

        {/* TRANSITION */}
        <motion.div
          className="text-center mb-32"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-brand text-white mb-6 shadow-brand-glow">
            <Lightbulb className="h-10 w-10" />
          </div>
          <p className="text-2xl font-medium text-slate-700 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The result? Important context gets lost, technical debt goes undocumented, and new team members struggle.
          </p>
        </motion.div>

        {/* SOLUTION SECTION */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          {/* Left: Visual (Desktop) */}
          <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
            <SolutionVisual />
          </div>

          {/* Right: Text & Cards */}
          <div className="order-1 lg:order-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 px-4 py-1 text-sm bg-green-600 hover:bg-green-700">
                <Check className="h-3 w-3 mr-2" />
                The Solution
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                A Third Way: <span className="text-transparent bg-clip-text bg-gradient-brand">Contextual Annotations</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Code Context Notes provides annotations that live alongside your code without being part of it. Keep your source clean while maintaining rich documentation.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4">
              {solutions.map((solution, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full border-green-100 dark:border-green-900/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-brand-glow hover:-translate-y-1 transition-all duration-300">
                    <CardHeader className="p-4">
                      <CardTitle className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
                        <Check className="h-4 w-4" />
                        <span>{solution.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-xs text-muted-foreground leading-relaxed">{solution.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Perfect For</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {useCases.map((useCase, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm"
                  >
                    <Check className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{useCase}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
