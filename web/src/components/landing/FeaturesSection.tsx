import {
  History,
  GitBranch,
  Zap,
  Code,
  FileText,
  Users,
  Layers,
  Search,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";

export function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: "Intelligent Tracking",
      description:
        "Notes follow your code even when line numbers change using content hash tracking.",
    },
    {
      icon: Layers,
      title: "Multiple Notes Per Line",
      description:
        "Add unlimited annotations to the same code location with smart navigation.",
    },
    {
      icon: History,
      title: "Complete History",
      description:
        "Full audit trail of all note modifications with timestamps and authors.",
    },
    {
      icon: GitBranch,
      title: "Git Integration",
      description:
        "Automatic author detection and seamless version control integration.",
    },
    {
      icon: Code,
      title: "Native Integration",
      description:
        "Uses VS Code's native comment UI with CodeLens indicators.",
    },
    {
      icon: FileText,
      title: "Human-Readable Storage",
      description:
        "Notes stored as markdown files that are easy to read and search.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Share notes with your team by committing them to your repository.",
    },
    {
      icon: Search,
      title: "Context-Aware Search",
      description:
        "Instantly find any note across your entire codebase with powerful search and filtering capabilities.",
    },
    {
      icon: Download,
      title: "Export Options",
      description:
        "Export your notes to Markdown, PDF, or HTML for easy sharing and documentation generation.",
    },
  ];

  return (
    <section className="relative py-32 bg-muted/30 overflow-hidden">
      {/* Geometric Background Shapes - Enhanced Visibility */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.2]" />

        {/* Large Circle Top Right */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-orange/20 blur-3xl mix-blend-multiply dark:mix-blend-screen" />

        {/* Triangle/Polygon Bottom Left */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/20 blur-3xl rounded-tr-[100px] mix-blend-multiply dark:mix-blend-screen" />

        {/* Floating Shapes - More Opaque */}
        <motion.div
          className="absolute top-40 left-10 lg:left-40 w-16 h-16 border-4 border-brand-orange/40 rounded-full"
          animate={{ y: [0, -30, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-40 right-10 lg:right-40 w-24 h-24 border-4 border-blue-500/40 rotate-45"
          animate={{ y: [0, 30, 0], rotate: [45, 225, 45] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-8 h-8 bg-brand-orange/30 rounded-lg"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="container relative z-10">
        <div className="text-center space-y-4 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Everything You Need to <br />
              <span className="text-transparent bg-clip-text bg-gradient-brand">Master Your Codebase</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you understand, document, and maintain complex projects.
            </p>
          </motion.div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={`feat-${index}`}
              className={`group relative p-8 rounded-3xl bg-card/30 backdrop-blur-md border border-primary/10 hover:border-brand-orange/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-orange/10 overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-orange/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative z-10 h-full flex flex-col">
                <div className="mb-6 inline-flex p-4 w-fit rounded-2xl bg-background/80 border border-primary/10 shadow-sm group-hover:scale-110 group-hover:border-brand-orange/50 transition-all duration-500">
                  <feature.icon className="h-6 w-6 text-foreground group-hover:text-brand-orange transition-colors duration-500" />
                </div>

                <h3 className="text-xl font-bold mb-3 tracking-tight group-hover:text-brand-orange transition-colors duration-500">
                  {feature.title}
                </h3>

                <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-500 flex-grow">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}