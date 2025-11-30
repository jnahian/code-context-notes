import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export function QuickStartSection() {
  const steps = [
    {
      number: 1,
      title: "Select Your Code",
      description:
        "Highlight the lines of code you want to annotate. Works with any programming language and file type.",
      content: (
        <div className="bg-brand-navy/5 dark:bg-brand-navy/30 rounded-2xl p-4 border border-brand-navy/10 dark:border-brand-navy/50">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-brand-orange"></div>
            <span className="text-brand-navy dark:text-slate-200 font-mono">
              function calculateTotal() {"{"}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm mt-1">
            <div className="w-2 h-2 rounded-full bg-brand-orange"></div>
            <span className="text-brand-navy dark:text-slate-200 font-mono">
              {" "}
              return items.reduce...
            </span>
          </div>
        </div>
      ),
    },
    {
      number: 2,
      title: "Press the Shortcut",
      description:
        "Use the keyboard shortcut to instantly open the note editor right where you need it.",
      content: (
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <kbd className="px-3 py-2 bg-brand-navy text-brand-warm rounded-xl font-mono text-sm shadow-sm">
              Ctrl
            </kbd>
            <span className="text-brand-orange font-bold">+</span>
            <kbd className="px-3 py-2 bg-brand-navy text-brand-warm rounded-xl font-mono text-sm shadow-sm">
              Alt
            </kbd>
            <span className="text-brand-orange font-bold">+</span>
            <kbd className="px-3 py-2 bg-brand-navy text-brand-warm rounded-xl font-mono text-sm shadow-sm">
              N
            </kbd>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            (Cmd+Alt+N on Mac)
          </p>
        </div>
      ),
    },
    {
      number: 3,
      title: "Write & Save",
      description:
        "Type your note with full markdown support, then save. Your note is now tracked with complete history.",
      content: (
        <div className="bg-brand-warm/50 dark:bg-brand-navy/30 rounded-2xl p-4 border border-brand-orange/20">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-orange"></div>
              <span className="text-sm text-brand-navy dark:text-slate-200">
                **TODO:** Optimize this function
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-orange"></div>
              <span className="text-sm text-brand-navy dark:text-slate-200">
                Consider using `Map` for O(1) lookup
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-brand-orange/20">
              <Button
                size="sm"
                className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white"
              >
                Save Note
              </Button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="relative py-24 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] pointer-events-none" />

      <div className="container relative z-10">
        <div className="text-center space-y-4 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Get Started in <span className="text-transparent bg-clip-text bg-gradient-brand">Seconds</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mt-4">
              Three simple steps to start annotating your code with intelligent
              tracking and full history
            </p>
          </motion.div>
        </div>

        <div className="relative">
          {/* Connection Lines for Desktop */}
          <div className="hidden lg:block absolute top-16 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
            <div className="flex justify-between items-center px-32">
              <div className="w-24 h-0.5 bg-gradient-to-r from-brand-orange to-brand-orange/50"></div>
              <div className="w-24 h-0.5 bg-gradient-to-r from-brand-orange/50 to-brand-orange"></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <Card className="relative h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-transparent hover:border-brand-orange/20 shadow-lg hover:shadow-brand-glow transition-all duration-300 hover:-translate-y-2">
                  <CardHeader className="text-center pb-6">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 rounded-full bg-gradient-brand text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-lg relative z-10">
                        {step.number}
                      </div>
                      <div
                        className="absolute inset-0 w-16 h-16 rounded-full bg-brand-orange/20 mx-auto animate-ping opacity-75"
                        style={{ animationDuration: '3s', animationDelay: `${index * 0.5}s` }}
                      ></div>
                    </div>
                    <CardTitle className="text-xl mb-3">{step.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">{step.content}</CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="inline-flex items-center space-x-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-6 py-3 rounded-2xl border border-brand-orange/20 shadow-sm">
              <CheckCircle className="h-5 w-5 text-brand-orange" />
              <span className="text-brand-navy dark:text-slate-200 font-medium">
                That's it! Your code is now annotated with intelligent tracking.
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
