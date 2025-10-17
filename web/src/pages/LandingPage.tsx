import {
  HeroSection,
  FeaturesSection,
  QuickStartSection,
  StatsSection,
  CTASection,
} from "@/components/landing";

export function LandingPage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <FeaturesSection />
      <QuickStartSection />
      <StatsSection />
      <CTASection />
    </div>
  );
}
