import React from 'react';
import { ArrowRight, Crosshair, Terminal, Shield } from 'lucide-react';

interface LaunchFooterProps {
  onLaunchWorkspace: (sampleId?: string) => void;
}

export const LaunchFooter: React.FC<LaunchFooterProps> = ({ onLaunchWorkspace }) => {
  return (
    <footer className="w-full bg-surface-1 border-t border-border-str py-20 px-4 sm:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Giant Mechanical Launch Bay */}
        <div className="structural-bay p-8 sm:p-14 border-2 border-border-str relative overflow-hidden bg-surface-2">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 border border-acc-orange px-3 py-1 bg-surface-1 font-mono text-xs text-acc-orange mb-6">
              <Crosshair className="w-3.5 h-3.5" />
              <span>TERMINAL READY // SYSTEM INITIALIZATION</span>
            </div>

            <h2 className="font-display font-bold text-3xl sm:text-5xl text-text-pri tracking-tight mb-6">
              DEPLOY ZERO-ERROR AUTO-BALLOONING TO YOUR SHOP FLOOR.
            </h2>

            <p className="text-text-sec text-sm sm:text-base mb-8 font-sans max-w-xl">
              Stop bleeding 6 hours of high-precision engineering labor on manual spreadsheet typing. 
              Launch the live DATUM STUDIO workspace instantly in your browser.
            </p>

            <button
              onClick={() => onLaunchWorkspace()}
              className="machined-btn bg-acc-orange hover:bg-orange-600 text-white font-mono font-bold text-base sm:text-lg py-4 px-8 flex items-center gap-3 shadow-lg group"
            >
              <span>INITIALIZE SPECBALLOON DATUM STUDIO WORKSPACE</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Hardware Diagnostic Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 w-full pt-8 border-t border-border-str font-mono text-[11px] text-text-sec">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 bg-st-pass"></span>
                <span>ISO 286 ENGINE: READY</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 bg-st-pass"></span>
                <span>AS9102 REV C: ACTIVE</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 bg-st-pass"></span>
                <span>USB-HID CALIPER: READY</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 bg-st-pass"></span>
                <span>ZERO CLOUD STORAGE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Industrial Bottom Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-text-mut gap-4">
          <div>
            SPECBALLOON // DATUM STUDIO &copy; 2026. AUTONOMOUS METROLOGY & FIRST ARTICLE INSPECTION PLATFORM.
          </div>
          <div className="flex items-center gap-4">
            <span>IATF 16949 PPAP</span>
            <span>AS9102 REV C</span>
            <span>ISO 2768-M/F</span>
            <span>ASME Y14.5M</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
