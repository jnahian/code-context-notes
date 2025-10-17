import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export function QuickStartSection() {
  const steps = [
    {
      number: 1,
      title: "Select Your Code",
      description:
        "Highlight the lines of code you want to annotate. Works with any programming language and file type.",
      content: (
        <div className="bg-brand-navy/5 rounded-lg p-4 border border-brand-navy/10">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-brand-orange"></div>
            <span className="text-brand-navy font-mono">
              function calculateTotal() {"{"}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm mt-1">
            <div className="w-2 h-2 rounded-full bg-brand-orange"></div>
            <span className="text-brand-navy font-mono">
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
            <kbd className="px-3 py-2 bg-brand-navy text-brand-warm rounded-lg font-mono text-sm shadow-sm">
              Ctrl
            </kbd>
            <span className="text-brand-orange font-bold">+</span>
            <kbd className="px-3 py-2 bg-brand-navy text-brand-warm rounded-lg font-mono text-sm shadow-sm">
              Alt
            </kbd>
            <span className="text-brand-orange font-bold">+</span>
            <kbd className="px-3 py-2 bg-brand-navy text-brand-warm rounded-lg font-mono text-sm shadow-sm">
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
        <div className="bg-brand-warm/50 rounded-lg p-4 border border-brand-orange/20">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-orange"></div>
              <span className="text-sm text-brand-navy">
                **TODO:** Optimize this function
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-orange"></div>
              <span className="text-sm text-brand-navy">
                Consider using `Map` for O(1) lookup
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-brand-orange/20">
              <Button
                size="sm"
                className="w-full bg-brand-orange hover:bg-brand-orange/90"
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
    <section className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
      <div className="container py-24">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-3xl md:text-4xl font-bold">
            Get Started in Seconds
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to start annotating your code with intelligent
            tracking and full history
          </p>
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
              <Card
                key={step.number}
                className="relative shadow-brand-drop hover:shadow-brand-glow transition-all duration-300 border-2 border-transparent hover:border-brand-orange/20"
              >
                <CardHeader className="text-center pb-6">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full bg-brand-orange text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-brand-glow relative z-10">
                      {step.number}
                    </div>
                    <div
                      className="absolute inset-0 w-16 h-16 rounded-full bg-brand-orange/20 mx-auto animate-pulse"
                      style={{ animationDelay: `${index * 0.5}s` }}
                    ></div>
                  </div>
                  <CardTitle className="text-xl mb-3">{step.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">{step.content}</CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center space-x-2 bg-brand-orange/10 px-6 py-3 rounded-full border border-brand-orange/20">
              <CheckCircle className="h-5 w-5 text-brand-orange" />
              <span className="text-brand-navy font-medium">
                That's it! Your code is now annotated with intelligent tracking.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}