import React from 'react';
import { LandingHeader } from './LandingHeader';
import { HeroScanner } from './HeroScanner';
import { BottleneckSection } from './BottleneckSection';
import { ArchitectureSection } from './ArchitectureSection';
import { FourBaysSection } from './FourBaysSection';
import { RoiComparisonSection } from './RoiComparisonSection';
import { LaunchFooter } from './LaunchFooter';

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
    <div className="min-h-screen bg-canvas text-text-pri flex flex-col font-sans selection:bg-acc-orange selection:text-white">
      {/* 1. Sticky Top Hardware Command Bar */}
      <LandingHeader
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
        onLaunchWorkspace={onLaunchWorkspace}
      />

      <main className="flex-1 w-full flex flex-col">
        {/* 2. Section 01: Split-Reticle Hero with Draggable Vernier Scanner */}
        <HeroScanner onLaunchWorkspace={onLaunchWorkspace} />

        {/* 3. Section 02: 3-Column Diagnostic Stress-Test (The Bottleneck) */}
        <BottleneckSection />

        {/* 4. Section 03: 3-Layer Axonometric Exploded Pipeline Explorer */}
        <ArchitectureSection />

        {/* 5. Section 04: Four Interactive Machined Structural Bays */}
        <FourBaysSection />

        {/* 6. Section 05: Interactive ROI Calculator & Competitor Matrix */}
        <RoiComparisonSection />

        {/* 7. Section 06: Full-Width Mechanical Launch Bay */}
        <LaunchFooter onLaunchWorkspace={onLaunchWorkspace} />
      </main>
    </div>
  );
};

