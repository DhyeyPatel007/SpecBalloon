import React from 'react';
import { ArrowRight, Sun, Moon } from 'lucide-react';

interface LandingHeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onLaunchWorkspace: (sampleId?: string) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  darkMode,
  onToggleTheme,
  onLaunchWorkspace,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md border-b border-border-hairline transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Reticle Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-7 h-7 rounded-full border-2 border-accent-primary flex items-center justify-center relative transition-transform group-hover:scale-105">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-primary" />
            <div className="absolute inset-0 rounded-full border border-accent-primary/30 animate-ping opacity-25" />
          </div>
          <span className="font-display font-bold text-lg text-text-pri tracking-tight">
            SpecBalloon
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-subtle border border-border-hairline text-[11px] font-mono text-text-sec font-medium">
            AS9102 Rev C
          </span>
        </div>

        {/* Apple Pill Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-subtle/80 px-2 py-1 rounded-full border border-border-hairline text-xs font-medium text-text-sec">
          <a
            href="#architecture"
            className="px-3 py-1.5 rounded-full hover:text-text-pri hover:bg-surface transition-all"
          >
            Architecture
          </a>
          <a
            href="#caliper-sync"
            className="px-3 py-1.5 rounded-full hover:text-text-pri hover:bg-surface transition-all"
          >
            Caliper Sync
          </a>
          <a
            href="#balloon-physics"
            className="px-3 py-1.5 rounded-full hover:text-text-pri hover:bg-surface transition-all"
          >
            Physics Engine
          </a>
          <a
            href="#roi-calculator"
            className="px-3 py-1.5 rounded-full hover:text-text-pri hover:bg-surface transition-all"
          >
            ROI Calculator
          </a>
          <a
            href="#compliance"
            className="px-3 py-1.5 rounded-full hover:text-text-pri hover:bg-surface transition-all"
          >
            Compliance
          </a>
        </nav>

        {/* Actions: Theme Toggle & Launch Workspace */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-full border border-border-hairline bg-surface text-text-sec hover:text-text-pri hover:bg-subtle flex items-center justify-center transition-all shadow-apple-sm"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onLaunchWorkspace('AS-4092-C')}
            className="apple-btn-primary px-4 sm:px-5 py-2 text-xs sm:text-sm flex items-center gap-2"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
