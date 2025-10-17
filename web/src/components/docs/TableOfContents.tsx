import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TOCItem {
  id: string;
  title: string;
  level: number;
}

export function TableOfContents() {
  const [activeId, setActiveId] = useState<string>("");
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);

  const sections = [
    { id: "installation", title: "Installation", level: 1 },
    { id: "quick-start", title: "Quick Start", level: 1 },
    { id: "keyboard-shortcuts", title: "Keyboard Shortcuts", level: 1 },
    { id: "key-features", title: "Key Features", level: 1 },
    { id: "usage-guide", title: "Usage Guide", level: 1 },
    { id: "editing-notes", title: "Editing Notes", level: 2 },
    { id: "viewing-history", title: "Viewing History", level: 2 },
    { id: "deleting-notes", title: "Deleting Notes", level: 2 },
    { id: "markdown-formatting", title: "Markdown Formatting", level: 1 },
    { id: "configuration", title: "Configuration", level: 1 },
    { id: "faq", title: "FAQ", level: 1 },
    { id: "support", title: "Support & Contributing", level: 1 },
  ];

  useEffect(() => {
    setTocItems(sections);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0% -35% 0%",
        threshold: 0,
      }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="sticky top-24 h-fit">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          On This Page
        </h3>
        <nav className="space-y-1">
          {tocItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={cn(
                "block w-full text-left text-sm py-1 px-2 rounded transition-colors hover:bg-brand-orange/10 hover:text-brand-orange",
                item.level === 2 && "ml-4 text-xs",
                activeId === item.id
                  ? "text-brand-orange font-medium bg-brand-orange/10"
                  : "text-muted-foreground"
              )}
            >
              {item.title}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}