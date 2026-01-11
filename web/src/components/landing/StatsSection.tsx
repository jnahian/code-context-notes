import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  Zap,
  Code,
  Github,
  Users,
  History,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";

export function StatsSection() {
  const stats = [
    {
      icon: CheckCircle,
      value: "88%",
      label: "Test Coverage",
      description: "Thoroughly tested codebase",
    },
    {
      icon: Zap,
      value: "100+",
      label: "Total Tests",
      description: "Comprehensive test suite",
    },
    {
      icon: Code,
      value: "All",
      label: "Languages",
      description: "Universal compatibility",
    },
    {
      icon: Github,
      value: "MIT",
      label: "Open Source",
      description: "Free forever",
    },
  ];

  const trustIndicators = [
    {
      icon: Users,
      title: "Available on Both Marketplaces",
      description: "VS Code Marketplace & Open VSX",
    },
    {
      icon: History,
      title: "Regular Updates",
      description: "Continuous improvement",
    },
    {
      icon: FileText,
      title: "Full Documentation",
      description: "Complete guides & examples",
    },
  ];

  return (
    <section className="relative py-24 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.1] pointer-events-none" />

      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Trusted by Developers Worldwide
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto opacity-90">
            Built with quality, tested thoroughly, and designed for reliability
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 group shadow-lg hover:-translate-y-1 h-full">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto bg-brand-orange/20 rounded-2xl flex items-center justify-center group-hover:bg-brand-orange/30 transition-colors">
                      <stat.icon className="h-8 w-8 text-brand-orange" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-slate-200 font-medium opacity-90">
                    {stat.label}
                  </div>
                  <div className="text-sm text-slate-400 mt-2 opacity-75">
                    {stat.description}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Additional Trust Indicators */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {trustIndicators.map((indicator, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group hover:border-brand-orange/30 shadow-lg h-full">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-brand-orange rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-brand-glow">
                      <indicator.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {indicator.title}
                    </h3>
                    <p className="text-slate-300 opacity-90 text-sm">
                      {indicator.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
