import {
  HeroSection,
  FeaturesSection,
  QuickStartSection,
  StatsSection,
  CTASection,
} from "@/components/landing";
import { PageTransition } from "@/components/PageTransition";

export function LandingPage() {
  return (
    <PageTransition>
      <div className="flex flex-col">
        <HeroSection />
        <FeaturesSection />
        <QuickStartSection />
        <StatsSection />
        <CTASection />
      </div>
    </PageTransition>
  );
}
