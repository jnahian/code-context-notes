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
import { AnimatedSection } from "@/components/AnimatedSection";

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
      title: "Active Community",
      description: "Growing user base",
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
    <section className="relative py-24 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy/90 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 border border-brand-orange rounded-full"></div>
        <div className="absolute top-32 right-20 w-24 h-24 border border-brand-orange rounded-full"></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 border border-brand-orange rounded-full"></div>
        <div className="absolute bottom-32 right-1/3 w-20 h-20 border border-brand-orange rounded-full"></div>
      </div>

      <div className="container relative z-10">
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-navy mb-4">
            Trusted by Developers Worldwide
          </h2>
          <p className="text-xl text-brand-warm max-w-2xl mx-auto opacity-90">
            Built with quality, tested thoroughly, and designed for reliability
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <AnimatedSection
              key={index}
              animation="fade-up"
              delay={index * 150 + 200}
              duration={600}
            >
              <Card className="bg-white backdrop-blur-sm border-brand-orange/30 hover:bg-brand-warm/20 transition-all duration-300 group shadow-lg hover:-translate-y-1 h-full">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto bg-brand-orange/20 rounded-2xl flex items-center justify-center group-hover:bg-brand-orange/30 transition-colors">
                      <stat.icon className="h-8 w-8 text-brand-orange" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-brand-navy mb-2">
                    {stat.value}
                  </div>
                  <div className="text-brand-navy font-medium opacity-90">
                    {stat.label}
                  </div>
                  <div className="text-sm text-brand-navy mt-2 opacity-75">
                    {stat.description}
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        {/* Additional Trust Indicators */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {trustIndicators.map((indicator, index) => (
            <AnimatedSection
              key={index}
              animation="fade-up"
              delay={800 + index * 200}
              duration={600}
            >
              <div className="bg-white backdrop-blur-sm border border-brand-orange/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 group hover:border-brand-orange/40 shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-brand-orange rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <indicator.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-brand-navy mb-1">
                      {indicator.title}
                    </h3>
                    <p className="text-brand-navy opacity-90 text-sm">
                      {indicator.description}
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
