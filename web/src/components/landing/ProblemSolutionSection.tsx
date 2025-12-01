import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, GitBranch, MessageSquare, Search } from "lucide-react";
import { motion } from "framer-motion";
import { ComparisonVisual } from "./ComparisonVisual";

export function ProblemSolutionSection() {
  const benefits = [
    {
      icon: GitBranch,
      title: "Clean Source Control",
      description: "Your code stays pure. Notes live in separate files, keeping your git history focused on logic changes, not comments.",
    },
    {
      icon: MessageSquare,
      title: "Rich Context",
      description: "Write full markdown documentation, add links, and have discussions without worrying about cluttering the file.",
    },
    {
      icon: Search,
      title: "Discoverable Knowledge",
      description: "Notes are indexed and searchable. Find why a decision was made without hunting through git blame.",
    },
  ];

  return (
    <section className="relative py-24 overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.3] pointer-events-none" />

      <div className="container relative z-10">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-4 px-4 py-1 text-sm border-brand-orange/20 text-brand-orange bg-brand-orange/5">
              <AlertCircle className="h-3 w-3 mr-2" />
              The Documentation Dilemma
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Stop Polluting Your Codebase
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Inline comments are messy, hard to track, and get outdated. <br className="hidden md:block" />
              See how <span className="text-brand-orange font-semibold">Code Context Notes</span> cleans up your workflow.
            </p>
          </motion.div>
        </div>

        {/* Interactive Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-24"
        >
          <ComparisonVisual />
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 + (index * 0.1) }}
            >
              <Card className="h-full border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:border-brand-orange/30 transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-brand-orange/10 flex items-center justify-center mb-4 text-brand-orange">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
