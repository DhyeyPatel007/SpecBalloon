import React from 'react';
import { ArrowRight, ShieldCheck, Terminal, Heart } from 'lucide-react';
import { AppPage } from './GlobalNavbar';
import { SpecBalloonLogo } from '../brand/SpecBalloonLogo';

interface GlobalFooterProps {
  onNavigate: (page: AppPage) => void;
}

export const GlobalFooter: React.FC<GlobalFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full border-t border-border-hairline bg-surface text-xs font-sans select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand & Mission Column */}
          <div className="col-span-2 space-y-4">
            <div
              onClick={() => onNavigate('overview')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="text-text-primary transition-transform group-hover:scale-105">
                <SpecBalloonLogo size={24} />
              </div>
              <span className="font-display font-semibold text-base text-text-primary tracking-tight">
                SpecBalloon
              </span>
              <span className="px-1.5 py-0.5 rounded bg-subtle border border-border-hairline text-[10px] font-mono text-text-muted">
                v2.5
              </span>
            </div>

            <p className="text-text-secondary text-xs leading-relaxed max-w-sm">
              The autonomous 2D CAD auto-ballooning and First Article Inspection (FAI) platform for precision CNC, automotive, and aerospace metrology teams.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-subtle border border-border-hairline text-[11px] font-mono text-text-muted">
                <span className="w-2 h-2 rounded-full bg-status-pass" />
                <span>All Systems Operational · v2.5.0</span>
              </div>
            </div>
          </div>

          {/* Column 1: Platform & Workflows */}
          <div className="space-y-3">
            <h4 className="font-semibold text-text-primary text-xs uppercase tracking-wider font-mono">
              Platform
            </h4>
            <ul className="space-y-2 text-text-secondary">
              <li>
                <button
                  onClick={() => onNavigate('studio')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  4-Pane Metrology IDE
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('product')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  Revision Diff & Delta-Lock
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('product')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  ZEISS CMM Auto-Import
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('product')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  USB-HID Caliper Bridge
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('product')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  Mobile QR Shop Traveler
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Metrology & Engine */}
          <div className="space-y-3">
            <h4 className="font-semibold text-text-primary text-xs uppercase tracking-wider font-mono">
              Engine & Math
            </h4>
            <ul className="space-y-2 text-text-secondary">
              <li>
                <button
                  onClick={() => onNavigate('engine')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  ISO 286 Fit Solver
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('engine')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  ASME Y14.5 MMC Bonus
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('engine')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  ISO 68-1 Thread Decomposer
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('engine')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  Euclidean True Position 2√(ΔX²+ΔY²)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('engine')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  Moving Range SPC (Cp / Cpk)
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Compliance & Security */}
          <div className="space-y-3">
            <h4 className="font-semibold text-text-primary text-xs uppercase tracking-wider font-mono">
              Compliance
            </h4>
            <ul className="space-y-2 text-text-secondary">
              <li>
                <button
                  onClick={() => onNavigate('security')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  AS9102 Rev C Forms 1, 2, 3
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('security')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  AIAG PPAP 4th Edition
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('security')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  21 CFR Part 11 Audit Trail
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('security')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  Air-Gapped & On-Premises
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('security')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  ITAR / Zero-Cloud Data
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-text-muted font-mono">
          <div>
            © 2026 SpecBalloon Metrology Inc. All rights reserved.
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('docs')}
              className="hover:text-text-secondary transition-colors"
            >
              Documentation
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate('pricing')}
              className="hover:text-text-secondary transition-colors"
            >
              Pricing & ROI
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate('security')}
              className="hover:text-text-secondary transition-colors"
            >
              Security Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

