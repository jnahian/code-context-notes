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
import { AnimatedSection } from "@/components/AnimatedSection";

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
    <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700">
      <div className="container py-24">
        <AnimatedSection animation="fade-up" className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Why Choose Code Context Notes?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for developers who need reliable, intelligent code annotation
            that scales with their projects.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <AnimatedSection
              key={index}
              animation="fade-up"
              delay={index * 100}
              duration={600}
            >
              <Card className="shadow-brand-drop hover:shadow-brand-glow transition-all duration-300 hover:-translate-y-1 h-full">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-brand-orange mb-2" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}