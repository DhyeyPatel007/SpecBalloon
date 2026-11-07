import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface LandingFooterProps {
  onLaunchWorkspace: (sampleId?: string) => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onLaunchWorkspace }) => {
  return (
    <footer id="compliance" className="w-full bg-page border-t border-border-hairline py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Compliance Badges Row */}
        <div className="mb-14 pb-10 border-b border-border-hairline">
          <div className="text-center text-xs font-mono text-text-mut mb-6">
            AUDITED FOR GLOBAL MANUFACTURING METROLOGY STANDARDS
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-mono font-medium text-text-sec">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-hairline shadow-apple-sm">
              <ShieldCheck className="w-4 h-4 text-status-pass" />
              <span>AS9102 REV C CERTIFIED</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-hairline shadow-apple-sm">
              <ShieldCheck className="w-4 h-4 text-status-pass" />
              <span>AIAG PPAP LEVEL 3</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-hairline shadow-apple-sm">
              <ShieldCheck className="w-4 h-4 text-status-pass" />
              <span>ISO 286-1 &amp; ISO 286-2</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-hairline shadow-apple-sm">
              <ShieldCheck className="w-4 h-4 text-status-pass" />
              <span>ASME Y14.5-2018 GD&amp;T</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-hairline shadow-apple-sm">
              <ShieldCheck className="w-4 h-4 text-status-pass" />
              <span>ISO 2768-m TOLERANCING</span>
            </div>
          </div>
        </div>

        {/* Monumental Launch Callout */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h3 className="font-display font-extrabold text-3xl sm:text-4xl text-text-pri tracking-tight mb-4">
            Start Auto-Ballooning Drawings in 30 Seconds.
          </h3>
          <p className="text-sm sm:text-base text-text-sec mb-6">
            No installation, no legacy dongles, no complex training required. Load a sample aerospace blueprint or drop your own CAD drawing to experience autonomous metrology.
          </p>
          <button
            onClick={() => onLaunchWorkspace('AS-4092-C')}
            className="apple-btn-primary px-8 py-3.5 text-base inline-flex items-center gap-2.5 shadow-apple-md"
          >
            <span>Open SpecBalloon Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Credits & Links */}
        <div className="pt-8 border-t border-border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-text-mut">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border border-accent-primary flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
            </div>
            <span className="font-semibold text-text-pri">SpecBalloon</span>
            <span>&copy; {new Date().getFullYear()} SpecBalloon Systems Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#architecture" className="hover:text-text-pri transition-colors">
              Architecture
            </a>
            <a href="#caliper-sync" className="hover:text-text-pri transition-colors">
              Caliper DRO
            </a>
            <a href="#balloon-physics" className="hover:text-text-pri transition-colors">
              Physics Engine
            </a>
            <a href="#roi-calculator" className="hover:text-text-pri transition-colors">
              ROI Calculator
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
