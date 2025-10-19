import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Check, AlertCircle, Lightbulb } from "lucide-react";
import { AnimatedSection } from "@/components/AnimatedSection";

export function ProblemSolutionSection() {
  const problems = [
    {
      category: "Code Comments",
      issues: [
        "Clutter your source files with non-code content",
        "Get committed to version control, polluting git history",
        "Mix documentation with implementation",
        "No version history for the comments themselves",
        "Can't be easily filtered or searched separately",
      ],
    },
    {
      category: "External Documentation",
      issues: [
        "Quickly becomes outdated as code changes",
        "Disconnected from the actual code location",
        "Requires context switching between editor and docs",
        "Hard to maintain alignment with code",
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
    {
      title: "Native integration",
      description: "Uses VSCode's comment UI for a familiar, seamless experience",
    },
    {
      title: "Zero performance impact",
      description: "Efficient caching and content hash tracking",
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
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 border-y border-slate-200 dark:border-slate-700">
      <div className="container py-24">
        {/* Problem Section */}
        <AnimatedSection animation="fade-up" className="text-center space-y-4 mb-16">
          <Badge variant="destructive" className="mb-4">
            <AlertCircle className="h-3 w-3 mr-1" />
            The Problem
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold">
            The Developer's Documentation Dilemma
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Working on complex codebases, developers face a common challenge: where to keep important context?
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {problems.map((problem, index) => (
            <AnimatedSection
              key={index}
              animation="fade-up"
              delay={index * 100}
              duration={600}
            >
              <Card className="h-full border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                    <X className="h-5 w-5" />
                    <span>{problem.category}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {problem.issues.map((issue, i) => (
                      <li key={i} className="flex items-start space-x-2 text-sm text-muted-foreground">
                        <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection animation="fade-up" className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-orange text-white mb-4">
            <Lightbulb className="h-8 w-8" />
          </div>
          <p className="text-2xl font-semibold text-muted-foreground">
            The result? Important context gets lost, technical debt goes undocumented,
            <br />
            and new team members struggle to understand the codebase.
          </p>
        </AnimatedSection>

        {/* Solution Section */}
        <AnimatedSection animation="fade-up" className="text-center space-y-4 mb-16 mt-24">
          <Badge className="mb-4 bg-green-600 hover:bg-green-700">
            <Check className="h-3 w-3 mr-1" />
            The Solution
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold">
            A Third Way: <span className="text-brand-orange">Contextual Annotations</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Code Context Notes provides annotations that live alongside your code without being part of it.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {solutions.map((solution, index) => (
            <AnimatedSection
              key={index}
              animation="fade-up"
              delay={index * 100}
              duration={600}
            >
              <Card className="h-full border-green-200 dark:border-green-900 shadow-brand-drop hover:shadow-brand-glow transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <Check className="h-5 w-5" />
                    <span>{solution.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{solution.description}</p>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        {/* Use Cases */}
        <AnimatedSection animation="fade-up" className="mt-16">
          <Card className="bg-white dark:bg-slate-800 shadow-brand-drop">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Perfect For</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {useCases.map((useCase, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900"
                  >
                    <Check className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">{useCase}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </section>
  );
}
