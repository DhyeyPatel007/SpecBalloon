import React from 'react';
import { LandingHeader } from './LandingHeader';
import { HeroSection } from './HeroSection';
import { ProblemSection } from './ProblemSection';
import { BentoGridSection } from './BentoGridSection';
import { RoiSection } from './RoiSection';
import { LandingFooter } from './LandingFooter';

interface LandingPageProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onLaunchWorkspace: (sampleId?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  darkMode,
  onToggleTheme,
  onLaunchWorkspace,
}) => {
  return (
    <div className="min-h-screen bg-page text-text-pri flex flex-col font-sans selection:bg-accent-primary selection:text-white">
      {/* 1. Sticky Apple Glass Top Navigation */}
      <LandingHeader
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
        onLaunchWorkspace={onLaunchWorkspace}
      />

      <main className="flex-1 w-full flex flex-col">
        {/* 2. Hero Section with Interactive Blueprint Product Frame */}
        <HeroSection onLaunchWorkspace={onLaunchWorkspace} />

        {/* 3. Problem Section: The $4.2B Bottleneck (Chaos vs Order) */}
        <ProblemSection />

        {/* 4. Apple 4-Card Bento Grid */}
        <BentoGridSection />

        {/* 5. Interactive ROI & Competitor Benchmark */}
        <RoiSection />

        {/* 6. Minimalist Compliance Footer & Final Launch CTA */}
        <LandingFooter onLaunchWorkspace={onLaunchWorkspace} />
      </main>
    </div>
  );
};
