import { lazy } from "react";
import { HeroSection } from "@/components/landing";
import { PageTransition } from "@/components/PageTransition";
import { LazySection } from "@/components/LazySection";

// Lazy load sections that are below the fold
const FeaturesSection = lazy(() =>
  import("@/components/landing").then((module) => ({
    default: module.FeaturesSection,
  }))
);
const QuickStartSection = lazy(() =>
  import("@/components/landing").then((module) => ({
    default: module.QuickStartSection,
  }))
);
const StatsSection = lazy(() =>
  import("@/components/landing").then((module) => ({
    default: module.StatsSection,
  }))
);
const CTASection = lazy(() =>
  import("@/components/landing").then((module) => ({
    default: module.CTASection,
  }))
);

export function LandingPage() {
  return (
    <PageTransition>
      <div className="flex flex-col">
        <HeroSection />

        <LazySection>
          <FeaturesSection />
        </LazySection>

        <LazySection>
          <QuickStartSection />
        </LazySection>

        <LazySection>
          <StatsSection />
        </LazySection>

        <LazySection>
          <CTASection />
        </LazySection>
      </div>
    </PageTransition>
  );
}
