import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  History,
  GitBranch,
  Zap,
  Code,
  FileText,
  Users,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";

export function FeaturesSection() {
  const features = [
    {
      icon: Layers,
      title: "Multiple Notes Per Line",
      description:
        "Add unlimited annotations to the same code location with smart navigation between notes",
    },
    {
      icon: Zap,
      title: "Intelligent Tracking",
      description:
        "Notes follow your code even when line numbers change using content hash tracking",
    },
    {
      icon: History,
      title: "Complete History",
      description:
        "Full audit trail of all note modifications with timestamps and authors",
    },
    {
      icon: Code,
      title: "Native Integration",
      description:
        "Uses VS Code's native comment UI with CodeLens indicators and markdown support",
    },
    {
      icon: GitBranch,
      title: "Git Integration",
      description:
        "Automatic author detection and seamless version control integration",
    },
    {
      icon: FileText,
      title: "Human-Readable Storage",
      description:
        "Notes stored as markdown files that are easy to read, search, and version control",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Share notes with your team by committing them to your repository",
    },
  ];

  return (
    <section className="relative py-24 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.2] pointer-events-none" />

      <div className="container relative z-10">
        <div className="text-center space-y-4 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Why Choose <span className="text-transparent bg-clip-text bg-gradient-brand">Code Context Notes</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mt-4">
              Built for developers who need reliable, intelligent code annotation
              that scales with their projects.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:border-brand-orange/50 dark:hover:border-brand-orange/50 shadow-sm hover:shadow-brand-glow transition-all duration-300 hover:-translate-y-1 group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-brand-orange/10 flex items-center justify-center mb-4 group-hover:bg-brand-orange/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-brand-orange" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}