import { motion } from "framer-motion";
import { ArrowRight, Check, Command, FileText, MousePointer2 } from "lucide-react";

export function QuickStartSection() {
  const steps = [
    {
      number: "01",
      title: "Select Code",
      description: "Highlight any snippet in your editor. We support all languages and file types out of the box.",
      icon: <MousePointer2 className="w-6 h-6 text-white" />,
      content: (
        <div className="relative rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-2xl w-full max-w-[280px]">
          {/* Mock IDE Header */}
          <div className="flex items-center px-4 py-2 bg-[#252526] border-b border-white/5">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <div className="ml-4 text-xs text-white/40 font-mono">utils.ts</div>
          </div>
          {/* Mock Code */}
          <div className="p-4 font-mono text-xs leading-relaxed text-left">
            <div className="flex">
              <span className="text-white/20 w-6 select-none">1</span>
              <span className="text-[#c586c0]">export</span>{" "}
              <span className="text-[#569cd6]">function</span>{" "}
              <span className="text-[#dcdcaa]">calc</span>() {"{"}
            </div>
            <div className="flex relative group cursor-text">
              <div className="absolute inset-0 bg-brand-orange/20 -mx-4 px-4 border-l-2 border-brand-orange" />
              <span className="text-white/20 w-6 select-none relative z-10">2</span>
              <span className="text-[#569cd6] ml-4 relative z-10">return</span>{" "}
              <span className="text-[#9cdcfe] relative z-10">items</span>.
              <span className="text-[#dcdcaa] relative z-10">map</span>
            </div>
            <div className="flex">
              <span className="text-white/20 w-6 select-none">3</span>
              <span className="text-[#9cdcfe] ml-8">i</span> ={">"} <span className="text-[#9cdcfe]">i</span> * 2
            </div>
            <div className="flex">
              <span className="text-white/20 w-6 select-none">4</span>
              {"}"}
            </div>
          </div>
        </div>
      ),
    },
    {
      number: "02",
      title: "Trigger Shortcut",
      description: "Hit the magic key combo. The note editor appears instantly, right where your focus is.",
      icon: <Command className="w-6 h-6 text-white" />,
      content: (
        <div className="h-full flex flex-col items-center justify-center py-4 w-full">
          <div className="flex items-center gap-2">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-b from-brand-orange to-orange-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200" />
              <div className="relative h-12 min-w-[3rem] px-2 bg-gradient-to-b from-[#333] to-[#111] rounded-lg border-t border-white/20 border-b-4 border-black shadow-xl flex items-center justify-center transform active:translate-y-1 active:border-b-0 transition-all">
                <span className="font-sans font-bold text-white text-sm">Ctrl</span>
              </div>
            </div>
            <span className="text-brand-orange/50 font-bold text-lg">+</span>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-b from-brand-orange to-orange-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200" />
              <div className="relative h-12 min-w-[3rem] px-2 bg-gradient-to-b from-[#333] to-[#111] rounded-lg border-t border-white/20 border-b-4 border-black shadow-xl flex items-center justify-center transform active:translate-y-1 active:border-b-0 transition-all">
                <span className="font-sans font-bold text-white text-sm">Alt</span>
              </div>
            </div>
            <span className="text-brand-orange/50 font-bold text-lg">+</span>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-b from-brand-orange to-orange-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200" />
              <div className="relative h-12 min-w-[3rem] px-2 bg-gradient-to-b from-[#333] to-[#111] rounded-lg border-t border-white/20 border-b-4 border-black shadow-xl flex items-center justify-center transform active:translate-y-1 active:border-b-0 transition-all">
                <span className="font-sans font-bold text-white text-sm">N</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-muted-foreground font-medium bg-brand-navy/5 dark:bg-white/5 px-2 py-1 rounded-full border border-brand-navy/10 dark:border-white/10">
            Cmd + Alt + N on macOS
          </p>
        </div>
      ),
    },
    {
      number: "03",
      title: "Annotate & Save",
      description: "Write your thoughts in Markdown. Your context is saved automatically with the code.",
      icon: <FileText className="w-6 h-6 text-white" />,
      content: (
        <div className="relative w-full max-w-[260px]">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-brand-orange/20 rounded-full blur-2xl" />
          <div className="relative bg-[#F4F1E9] dark:bg-[#1e1e1e] rounded-xl p-4 shadow-xl border border-black/5 dark:border-white/10 rotate-1 hover:rotate-0 transition-transform duration-300">
            <div className="flex items-center justify-between mb-3 border-b border-black/5 dark:border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-orange" />
                <span className="text-[10px] font-semibold text-brand-navy/60 dark:text-white/60 uppercase tracking-wider">
                  New Note
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Just now</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-3/4 bg-black/5 dark:bg-white/10 rounded-full" />
              <div className="h-2 w-full bg-black/5 dark:bg-white/10 rounded-full" />
              <div className="h-2 w-5/6 bg-black/5 dark:bg-white/10 rounded-full" />
            </div>
            <div className="mt-4 flex justify-end">
              <div className="bg-brand-orange text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-brand-orange/20 flex items-center gap-1">
                Save Note <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden bg-brand-warm dark:bg-brand-navy transition-colors duration-500">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.05]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-brand-orange/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-brand-navy dark:text-white mb-6">
              From Code to Context in <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-orange-600">
                Three Simple Steps
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Stop context switching. Capture your thoughts exactly where they belong—right next to your code.
            </p>
          </motion.div>
        </div>

        {/* Steps Grid */}
        <div className="grid lg:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-brand-orange/20 to-transparent" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative"
            >
              <div className="group relative h-full">
                {/* Card Background with Glass Effect */}
                <div className="absolute inset-0 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/10 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-1" />

                <div className="relative p-8 flex flex-col h-full items-center">
                  {/* Step Number & Icon */}
                  <div className="flex items-center justify-between w-full mb-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-brand-orange blur-lg opacity-20" />
                      <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                        {step.icon}
                      </div>
                    </div>
                    <span className="text-4xl font-bold text-brand-navy/5 dark:text-white/5 font-mono">
                      {step.number}
                    </span>
                  </div>

                  {/* Content Preview */}
                  <div className="mb-8 flex-grow flex items-center justify-center w-full min-h-[180px]">
                    {step.content}
                  </div>

                  {/* Text Content */}
                  <div className="text-center w-full">
                    <h3 className="text-xl font-bold text-brand-navy dark:text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange font-medium text-sm">
            <Check className="w-4 h-4" />
            <span>Ready to start? No credit card required.</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
