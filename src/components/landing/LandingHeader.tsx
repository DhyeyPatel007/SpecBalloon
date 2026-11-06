import React, { useState, useEffect } from 'react';
import { Crosshair, ArrowRight, Sun, Moon, Activity } from 'lucide-react';

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
  const [latency, setLatency] = useState(14.2);

  // Live fluctuating telemetry ticker for realistic engine latency
  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(Number((13.8 + Math.random() * 0.9).toFixed(1)));
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 h-12 w-full border-b border-border-str bg-surface-1/95 backdrop-blur-none px-4 flex items-center justify-between text-xs font-mono">
      {/* Left: Reticle Logo + System Identifier */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => onLaunchWorkspace()}>
          <div className="w-6 h-6 border border-acc-orange flex items-center justify-center bg-surface-2 text-acc-orange">
            <Crosshair className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-tight text-text-pri">
              SPECBALLOON
            </span>
            <span className="text-text-mut text-[11px] hidden sm:inline">
              // DATUM STUDIO
            </span>
          </div>
        </div>
        <span className="border border-border-str px-1.5 py-0.5 text-[10px] text-acc-orange bg-surface-2">
          v2.4-AS9102
        </span>
      </div>

      {/* Center: Nav Anchors */}
      <nav className="hidden md:flex items-center gap-6 text-text-sec text-[11px]">
        <a href="#bottleneck" className="hover:text-text-pri transition-colors">
          [01. THE BOTTLENECK]
        </a>
        <a href="#architecture" className="hover:text-text-pri transition-colors">
          [02. ARCHITECTURE]
        </a>
        <a href="#telemetry-bays" className="hover:text-text-pri transition-colors">
          [03. LIVE BAYS]
        </a>
        <a href="#roi" className="hover:text-text-pri transition-colors">
          [04. ROI & ECONOMICS]
        </a>
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Latency Ticker */}
        <div className="hidden lg:flex items-center gap-1.5 border border-border-str px-2 py-1 bg-surface-2 text-[10px] text-text-sec">
          <Activity className="w-3 h-3 text-st-pass animate-pulse" />
          <span>ENGINE:</span>
          <span className="text-text-pri font-bold">{latency}ms</span>
          <span className="text-text-mut">/ VEC+VLM</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="machined-btn border border-border-str px-2 py-1 bg-surface-2 hover:bg-surface-3 text-text-pri flex items-center gap-1.5 text-[11px]"
          title="Toggle Anodized Stone / Oxide Graphite"
        >
          {darkMode ? (
            <>
              <Moon className="w-3 h-3 text-acc-orange" />
              <span className="hidden sm:inline">GRAPHITE</span>
            </>
          ) : (
            <>
              <Sun className="w-3 h-3 text-acc-orange" />
              <span className="hidden sm:inline">STONE</span>
            </>
          )}
        </button>

        {/* Primary CTA */}
        <button
          onClick={() => onLaunchWorkspace()}
          className="machined-btn bg-acc-orange hover:bg-orange-600 active:bg-orange-700 text-white font-bold px-3 py-1 flex items-center gap-1.5 text-xs shadow-sm"
        >
          <span>LAUNCH DATUM STUDIO</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
