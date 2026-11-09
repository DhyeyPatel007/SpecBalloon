import React, { useState } from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Cpu, Layers } from 'lucide-react';
import { SafeImage } from '../../utils/assetLoader';
import { fmt3 } from '../../utils/metrologyMath';

interface HeroSectionProps {
  onLaunchWorkspace: (sampleId?: string) => void;
}

interface Hotspot {
  id: number;
  label: string;
  xPct: number;
  yPct: number;
  callout: string;
  feature: string;
  nominal: number;
  plus: number;
  minus: number;
  lsl: number;
  usl: number;
  instrument: string;
  status: 'in_spec' | 'out_of_spec' | 'needs_review';
}

const HERO_HOTSPOTS: Hotspot[] = [
  {
    id: 1,
    label: '01',
    xPct: 36,
    yPct: 38,
    callout: 'Ø30.00 H7 (+0.021 / -0.000)',
    feature: 'Main Piston Cylinder Bore',
    nominal: 30.000,
    plus: 0.021,
    minus: 0.000,
    lsl: 30.000,
    usl: 30.021,
    instrument: 'Mahr Air Plug Gauge (Ø30)',
    status: 'in_spec'
  },
  {
    id: 2,
    label: '02',
    xPct: 36,
    yPct: 48,
    callout: '|⌖|Ø0.05(M)|A|B|',
    feature: 'Bore True Position to Datums A & B',
    nominal: 0.000,
    plus: 0.050,
    minus: 0.000,
    lsl: 0.000,
    usl: 0.050,
    instrument: 'Zeiss Prismo CMM Probe',
    status: 'in_spec'
  },
  {
    id: 3,
    label: '03',
    xPct: 56,
    yPct: 24,
    callout: '120.0 ±0.15',
    feature: 'Overall Housing Length',
    nominal: 120.000,
    plus: 0.150,
    minus: 0.150,
    lsl: 119.850,
    usl: 120.150,
    instrument: 'Mitutoyo Digital Caliper 0-150mm',
    status: 'in_spec'
  },
  {
    id: 4,
    label: '04',
    xPct: 22,
    yPct: 58,
    callout: '4x Ø8.50 +0.10/-0.00',
    feature: 'Flange Bolt Thru Holes',
    nominal: 8.500,
    plus: 0.100,
    minus: 0.000,
    lsl: 8.500,
    usl: 8.600,
    instrument: 'Meyer Pin Gauge Set (+8.50/+8.60)',
    status: 'in_spec'
  }
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onLaunchWorkspace }) => {
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(HERO_HOTSPOTS[0]);
  const [activeLayer, setActiveLayer] = useState<'all' | 'balloons' | 'gdt'>('all');

  return (
    <section className="relative w-full pt-16 pb-20 overflow-hidden bg-page">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#0047AB]/5 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 1. Header Typography */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          {/* Chip Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-hairline shadow-apple-sm text-xs font-mono font-medium text-text-sec mb-6">
            <span className="w-2 h-2 rounded-full bg-status-pass" />
            <span className="text-text-pri font-semibold">AS9102 REV C // AIAG PPAP READY</span>
            <span className="text-text-mut">—</span>
            <span>ISO 286 ENGINE</span>
          </div>

          {/* Monumental Headline */}
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-text-pri tracking-tight leading-[1.08] mb-6">
            Autonomous 2D CAD Auto-Ballooning & AS9102 Metrology.
          </h1>

          {/* Editorial Subtitle */}
          <p className="text-lg sm:text-xl text-text-sec leading-relaxed max-w-3xl mx-auto font-sans font-normal mb-8">
            Zero manual data entry. Ingest engineering drawings, compute exact ISO 286 and ASME limits with deterministic metrology math, resolve non-overlapping balloons with 60fps physics, and export ready-to-submit AS9102 Form 3 inspection sheets in seconds.
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onLaunchWorkspace('AS-4092-C')}
              className="apple-btn-primary px-7 py-3.5 text-base flex items-center gap-2.5 shadow-apple-md"
            >
              <span>Launch Workspace Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('architecture');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="apple-btn-secondary px-6 py-3.5 text-base font-semibold shadow-apple-sm"
            >
              Explore Architecture
            </button>
          </div>

          {/* Key capability pills */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs font-mono text-text-mut">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-status-pass" />
              <span className="text-text-sec font-medium">&lt; 1.2s Detection</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-status-pass" />
              <span className="text-text-sec font-medium">100% Deterministic Math</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-status-pass" />
              <span className="text-text-sec font-medium">Zero Manual Transcriptions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-status-pass" />
              <span className="text-text-sec font-medium">60fps Collision-Free Physics</span>
            </div>
          </div>
        </div>

        {/* 2. Monumental Interactive Product Showcase Frame */}
        <div className="relative max-w-5xl mx-auto rounded-2xl border border-border-hairline bg-surface shadow-apple-lg overflow-hidden">
          {/* Frame Top Header Strip */}
          <div className="h-11 px-4 border-b border-border-hairline bg-subtle/50 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-text-mut ml-2 font-mono text-[11px]">
                AS-4092-C.DWG — SpecBalloon Studio Showcase
              </span>
            </div>

            {/* Interactive Layer Filter Switcher */}
            <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5 border border-border-hairline text-[11px] font-medium">
              <button
                onClick={() => setActiveLayer('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeLayer === 'all'
                    ? 'bg-accent-primary text-white font-semibold'
                    : 'text-text-sec hover:text-text-pri'
                }`}
              >
                All Layers
              </button>
              <button
                onClick={() => setActiveLayer('balloons')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeLayer === 'balloons'
                    ? 'bg-accent-primary text-white font-semibold'
                    : 'text-text-sec hover:text-text-pri'
                }`}
              >
                Balloons Only
              </button>
              <button
                onClick={() => setActiveLayer('gdt')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeLayer === 'gdt'
                    ? 'bg-accent-primary text-white font-semibold'
                    : 'text-text-sec hover:text-text-pri'
                }`}
              >
                GD&amp;T Datums
              </button>
            </div>
          </div>

          {/* Frame Body with Product Image & Interactive Hotspots */}
          <div className="relative w-full aspect-[16/10] bg-page overflow-hidden">
            <SafeImage
              src="/assets/hero-studio-showcase.png"
              alt="SpecBalloon Studio CAD Showcase"
              className="w-full h-full object-cover select-none pointer-events-none"
            />

            {/* Interactive Hotspot Reticles */}
            {HERO_HOTSPOTS.map((spot) => {
              const isSelected = activeHotspot?.id === spot.id;
              if (activeLayer === 'gdt' && spot.id !== 2) return null;

              return (
                <div
                  key={spot.id}
                  style={{ left: `${spot.xPct}%`, top: `${spot.yPct}%` }}
                  onClick={() => setActiveHotspot(spot)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                >
                  {/* Outer Pulsing Ring */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-125 ${
                      isSelected
                        ? 'bg-accent-primary text-white shadow-apple-md ring-4 ring-accent-primary/25'
                        : 'bg-accent-balloon text-white shadow-apple-sm ring-2 ring-white'
                    }`}
                  >
                    <span className="font-mono font-bold text-[10px]">{spot.label}</span>
                  </div>

                  {/* Hotspot Hover Label */}
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap bg-text-pri text-white px-2 py-0.5 rounded text-[10px] font-mono shadow-md">
                    {spot.callout}
                  </div>
                </div>
              );
            })}

            {/* Floating Apple Inspection Card for Active Hotspot */}
            {activeHotspot && (
              <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-surface/95 backdrop-blur-md rounded-xl border border-border-hairline shadow-apple-lg p-3.5 z-30 transition-all font-sans">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent-primary text-white font-mono font-bold text-[10px] flex items-center justify-center">
                      {activeHotspot.label}
                    </span>
                    <span className="font-mono font-bold text-xs text-text-pri truncate max-w-[190px]">
                      {activeHotspot.callout}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 font-mono font-semibold text-[10px] text-status-pass">
                    IN-SPEC
                  </span>
                </div>

                <div className="text-[11px] text-text-sec mb-2">
                  {activeHotspot.feature}
                </div>

                {/* Limit Grid */}
                <div className="grid grid-cols-4 gap-1 py-1.5 px-2 bg-subtle rounded-lg border border-border-hairline font-mono text-center text-[10px] mb-2.5">
                  <div>
                    <span className="text-text-mut block">NOM</span>
                    <span className="font-semibold text-text-pri">{fmt3(activeHotspot.nominal)}</span>
                  </div>
                  <div>
                    <span className="text-text-mut block">&plusmn;TOL</span>
                    <span className="font-semibold text-text-pri">+{fmt3(activeHotspot.plus)}</span>
                  </div>
                  <div>
                    <span className="text-text-mut block">LSL</span>
                    <span className="font-semibold text-status-pass">{fmt3(activeHotspot.lsl)}</span>
                  </div>
                  <div>
                    <span className="text-text-mut block">USL</span>
                    <span className="font-semibold text-accent-primary">{fmt3(activeHotspot.usl)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-text-mut">
                  <span>GAUGE: {activeHotspot.instrument}</span>
                  <button
                    onClick={() => onLaunchWorkspace('AS-4092-C')}
                    className="text-accent-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
