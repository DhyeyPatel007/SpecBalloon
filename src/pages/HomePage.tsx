import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  Upload,
  Sparkles,
  CheckCircle2,
  GitCompare,
  Calculator,
  BarChart3,
  Layers,
  ShieldCheck,
  Cpu,
  FileSpreadsheet
} from 'lucide-react';
import { AppPage } from '../components/navigation/GlobalNavbar';
import { fmt3 } from '../utils/metrologyMath';
import { SafeImage, BLUEPRINT_ASSET_MAP } from '../utils/assetLoader';

interface HomePageProps {
  onNavigate: (page: AppPage, sampleId?: string) => void;
  onStartTour: () => void;
}

interface Hotspot {
  id: number;
  tag: string;
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
  measured: number;
  status: 'in_spec' | 'out_of_spec';
  bonusNote?: string;
  samples: number[];
}

const HERO_CALLOUTS: Hotspot[] = [
  {
    id: 1,
    tag: '01',
    xPct: 36,
    yPct: 38,
    callout: 'Ø30.00 H7 (+0.021 / -0.000)',
    feature: 'Main Piston Cylinder Bore (Datum B)',
    nominal: 30.000,
    plus: 0.021,
    minus: 0.000,
    lsl: 30.000,
    usl: 30.021,
    instrument: 'Air Plug Gauge / Bore Gauge',
    measured: 30.012,
    status: 'in_spec',
    bonusNote: 'ISO 286-2 Grade 7 hole fit resolved',
    samples: [30.012, 30.014, 30.011, 30.015, 30.010, 30.013, 30.012, 30.016, 30.011, 30.014],
  },
  {
    id: 2,
    tag: '02',
    xPct: 36,
    yPct: 48,
    callout: '|⌖|Ø0.05(M)|A|B(M)|',
    feature: 'Bore True Position to Datums A & B',
    nominal: 0.000,
    plus: 0.050,
    minus: 0.000,
    lsl: 0.000,
    usl: 0.050,
    instrument: 'ZEISS PRISMO CMM Probe',
    measured: 0.058,
    status: 'in_spec',
    bonusNote: 'Effective USL expanded to 0.070 mm via MMC bonus (+0.008) & Datum B shift (+0.012). SAVED FROM SCRAP!',
    samples: [0.058, 0.054, 0.056, 0.059, 0.052, 0.057, 0.055, 0.058, 0.053, 0.056],
  },
  {
    id: 3,
    tag: '03',
    xPct: 56,
    yPct: 24,
    callout: '120.0 ±0.15',
    feature: 'Overall Housing Length (Datum C)',
    nominal: 120.000,
    plus: 0.150,
    minus: 0.150,
    lsl: 119.850,
    usl: 120.150,
    instrument: 'Mitutoyo Digital Caliper 0-150mm',
    measured: 120.040,
    status: 'in_spec',
    bonusNote: 'Tightened 40% from Rev B (±0.25 -> ±0.15)',
    samples: [120.040, 120.045, 120.038, 120.050, 120.042, 120.039, 120.044, 120.048, 120.041, 120.043],
  },
  {
    id: 4,
    tag: '04',
    xPct: 22,
    yPct: 58,
    callout: '4X Ø8.530 ±0.035',
    feature: 'Flange Bolt Pattern Cavities (#04.1..#04.4)',
    nominal: 8.530,
    plus: 0.035,
    minus: 0.035,
    lsl: 8.495,
    usl: 8.565,
    instrument: 'Meyer Pin Gage Set Class X',
    measured: 8.528,
    status: 'in_spec',
    bonusNote: 'Nx Expander: 4 individual cavities monitored independently',
    samples: [8.528, 8.532, 8.525, 8.534, 8.530, 8.527, 8.531, 8.535, 8.529, 8.533],
  },
  {
    id: 5,
    tag: '16',
    xPct: 68,
    yPct: 62,
    callout: 'M10×1.5 - 6H ↧ 18.0',
    feature: 'Internal Metric Thread & Tap Depth',
    nominal: 10.000,
    plus: 0.206,
    minus: 0.000,
    lsl: 9.026,
    usl: 9.206,
    instrument: 'Thread Plug Gauge M10x1.5-6H',
    measured: 9.112,
    status: 'in_spec',
    bonusNote: 'ISO 68-1 / 965: Pitch Dia 9.026 - 9.206 mm. Functional GO plug gauge PASS',
    samples: [9.112, 9.115, 9.110, 9.118, 9.114, 9.111, 9.116, 9.113, 9.117, 9.112],
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onStartTour }) => {
  const [selectedCallout, setSelectedCallout] = useState<Hotspot>(HERO_CALLOUTS[0]);

  return (
    <div className="w-full bg-page text-text-primary flex flex-col font-sans selection:bg-accent-primary selection:text-white">
      {/* 1. Hero Section */}
      <section className="pt-16 pb-14 border-b border-border-hairline bg-surface/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Subtle announcement pill */}
          <div
            onClick={() => onNavigate('docs')}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-subtle border border-border-hairline text-xs font-mono text-text-secondary hover:text-text-primary hover:border-border-strong transition-all cursor-pointer mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-status-pass" />
            <span>New in v2.5 — Delta Revision Diff & ZEISS CMM Auto-Import</span>
            <ArrowRight className="w-3 h-3 text-text-muted" />
          </div>

          {/* Monumental Headline */}
          <h1 className="font-display font-semibold text-4xl sm:text-5xl lg:text-6xl text-text-primary tracking-tight leading-[1.08] max-w-4xl mx-auto mb-6">
            Precision First Article Inspection. At the speed of thought.
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto mb-9 font-normal">
            SpecBalloon reads 2D CAD blueprints, resolves ISO 286 fits and ASME Y14.5 GD&T frames with deterministic math, and generates audit-ready AS9102 & PPAP packages in seconds.
          </p>

          {/* Primary Action Row */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('studio')}
              className="bg-[#09090B] dark:bg-white text-white dark:text-[#09090B] hover:opacity-90 px-6 py-2.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all shadow-apple-sm cursor-pointer"
            >
              <span>Open Studio IDE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onStartTour}
              className="bg-surface hover:bg-subtle border border-border-hairline text-text-secondary hover:text-text-primary px-5 py-2.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch 45s Interactive Tour</span>
            </button>

            <button
              onClick={() => onNavigate('studio')}
              className="bg-surface hover:bg-subtle border border-border-hairline text-text-muted hover:text-text-secondary px-4 py-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer hidden sm:flex"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CAD PDF</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Interactive Hero Showcase Frame (X-Ray Blueprint Loupe) */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="border border-border-hairline rounded-xl bg-surface shadow-apple-md overflow-hidden flex flex-col">
          {/* Top Frame Control Header */}
          <div className="px-4 py-3 border-b border-border-hairline bg-subtle/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
              <span className="font-mono font-bold text-text-primary text-[11px]">
                LIVE INTERACTIVE CAD STAGE · AS-4092-C REV C
              </span>
            </div>

            <div className="flex items-center gap-1 font-mono text-[11px] text-text-muted">
              <span>Click any callout below to test live metrology response:</span>
            </div>
          </div>

          {/* Interactive Stage: Blueprint Viewer with Hotspots & Live Docked Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
            {/* Left 8 Cols: Blueprint Canvas Area with Hotspot Badges */}
            <div className="lg:col-span-8 p-6 bg-subtle/30 flex items-center justify-center relative border-b lg:border-b-0 lg:border-r border-border-hairline select-none overflow-hidden">
              <div className="relative w-full max-w-[580px] aspect-[4/3] bg-surface rounded-lg border border-border-hairline shadow-sm overflow-hidden flex items-center justify-center">
                <SafeImage
                  src={BLUEPRINT_ASSET_MAP['AS-4092-C']}
                  alt="Precision Flange Blueprint"
                  className="w-full h-full object-contain p-2"
                />

                {/* Translucent Highlight Hotspots */}
                {HERO_CALLOUTS.map((hotspot) => {
                  const isSelected = selectedCallout.id === hotspot.id;
                  return (
                    <button
                      key={hotspot.id}
                      onClick={() => setSelectedCallout(hotspot)}
                      style={{
                        left: `${hotspot.xPct}%`,
                        top: `${hotspot.yPct}%`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer shadow-xs ${
                        isSelected
                          ? 'bg-[#0284C7] text-white ring-2 ring-[#0284C7]/40 scale-110 z-20'
                          : 'bg-surface/90 hover:bg-surface text-text-primary border border-border-strong hover:scale-105 z-10'
                      }`}
                      title={hotspot.callout}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-status-pass" />
                      <span>#{hotspot.tag}</span>
                    </button>
                  );
                })}
              </div>

              {/* Blueprint Hint Overlay */}
              <div className="absolute bottom-3 left-4 px-2 py-1 rounded bg-surface/90 backdrop-blur-xs border border-border-hairline text-[10px] font-mono text-text-muted">
                Selected Tag #{selectedCallout.tag}: {selectedCallout.callout}
              </div>
            </div>

            {/* Right 4 Cols: Docked Live Inspector & 10-Sample SPC Matrix */}
            <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-surface space-y-4 text-xs font-sans">
              <div className="space-y-4">
                {/* Header of selected characteristic */}
                <div className="border-b border-border-hairline pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-accent-primary text-xs">
                      TAG #{selectedCallout.tag}
                    </span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-status-pass border border-emerald-200 dark:border-emerald-800">
                      IN SPEC
                    </span>
                  </div>
                  <h3 className="font-mono font-bold text-sm text-text-primary">
                    {selectedCallout.callout}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {selectedCallout.feature}
                  </p>
                </div>

                {/* Limits Grid */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded border border-border-hairline bg-subtle/50">
                    <div className="text-[10px] text-text-muted">LOWER LIMIT (LSL)</div>
                    <div className="font-bold text-text-primary mt-0.5">
                      {fmt3(selectedCallout.lsl)} mm
                    </div>
                  </div>
                  <div className="p-2 rounded border border-border-hairline bg-subtle/50">
                    <div className="text-[10px] text-text-muted">UPPER LIMIT (USL)</div>
                    <div className="font-bold text-text-primary mt-0.5">
                      {fmt3(selectedCallout.usl)} mm
                    </div>
                  </div>
                </div>

                {/* Measurement & Instrument */}
                <div className="p-3 rounded-lg border border-border-hairline bg-subtle/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-text-muted">Measured Value:</span>
                    <span className="font-mono font-bold text-status-pass text-xs">
                      {fmt3(selectedCallout.measured)} mm
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted">
                    <span>Gage Instrument:</span>
                    <span className="font-mono text-text-secondary truncate max-w-[150px]">
                      {selectedCallout.instrument}
                    </span>
                  </div>
                </div>

                {/* Metrology Note */}
                {selectedCallout.bonusNote && (
                  <div className="p-2.5 rounded border border-border-hairline bg-subtle/40 text-[11px] text-text-secondary font-mono leading-relaxed">
                    <strong className="text-text-primary">Mathematical Note:</strong>{' '}
                    {selectedCallout.bonusNote}
                  </div>
                )}

                {/* Mini 10-Sample SPC Strip */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted uppercase">
                    <span>10-Sample Lot Matrix</span>
                    <span className="text-status-pass font-bold">Cpk = 1.48 (Pass)</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 font-mono text-[10px]">
                    {selectedCallout.samples.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-1 rounded bg-subtle border border-border-hairline text-center text-text-secondary"
                      >
                        {fmt3(s).slice(-3)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onNavigate('studio')}
                className="w-full h-8 rounded-md bg-[#09090B] dark:bg-white text-white dark:text-[#09090B] hover:opacity-90 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>Open in 4-Pane Studio IDE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Minimalist Telemetry Strip (4 Architectural Metrics) */}
      <section className="py-12 border-y border-border-hairline bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="font-mono font-bold text-3xl text-text-primary tracking-tight">
                11.4 sec
              </div>
              <div className="text-xs text-text-secondary font-medium">
                Avg. 150-Dim Blueprint Parse
              </div>
              <p className="text-[11px] text-text-muted">
                Sub-second OCR & auto-ballooning
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-mono font-bold text-3xl text-text-primary tracking-tight">
                100%
              </div>
              <div className="text-xs text-text-secondary font-medium">
                Deterministic Math
              </div>
              <p className="text-[11px] text-text-muted">
                ISO 286, ISO 2768-m, ASME Y14.5
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-mono font-bold text-3xl text-text-primary tracking-tight">
                AS9102 Rev C
              </div>
              <div className="text-xs text-text-secondary font-medium">
                Forms 1, 2 & 3 Native
              </div>
              <p className="text-[11px] text-text-muted">
                Automotive PPAP & aerospace export
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-mono font-bold text-3xl text-status-pass tracking-tight">
                0.000 mm
              </div>
              <div className="text-xs text-text-secondary font-medium">
                Arithmetic Hallucination Rate
              </div>
              <p className="text-[11px] text-text-muted">
                Verified against engineering standards
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. The "Three Shifts" Bento Section */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center max-w-xl mx-auto">
          <h2 className="font-display font-semibold text-2xl text-text-primary tracking-tight mb-2">
            Three Architectural Shifts in Metrology
          </h2>
          <p className="text-xs text-text-secondary">
            Built from first principles to eliminate manual transcription and false scrap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Shift 1: Translucent Callout Highlighting */}
          <div className="p-5 rounded-xl border border-border-hairline bg-surface shadow-apple-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-subtle border border-border-hairline flex items-center justify-center text-text-primary">
                <Layers className="w-4 h-4 stroke-[1.5]" />
              </div>
              <h3 className="font-semibold text-sm text-text-primary">
                Translucent Highlighting vs. Legacy Clutter
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Legacy ballooning tools clutter blueprints with opaque circles and criss-crossing pointer lines. SpecBalloon uses Capvidia-style translucent highlight bounding boxes with high-contrast corner pills directly over the drawing text.
              </p>
            </div>
            <div className="p-2.5 rounded bg-subtle border border-border-hairline font-mono text-[11px] text-text-muted">
              Zero obstructed dimensional leaders
            </div>
          </div>

          {/* Shift 2: Dynamic MMC Bonus */}
          <div className="p-5 rounded-xl border border-border-hairline bg-surface shadow-apple-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-subtle border border-border-hairline flex items-center justify-center text-text-primary">
                <Calculator className="w-4 h-4 stroke-[1.5]" />
              </div>
              <h3 className="font-semibold text-sm text-text-primary">
                Cross-Row MMC Bonus Saves Parts from Scrap
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Hand caliper checks flag Tag #02 at 0.058 mm as non-conforming against a 0.050 mm limit. Our dynamic solver computes +0.008 mm feature MMC departure and +0.012 mm Datum B shift, expanding allowed boundary to 0.070 mm.
              </p>
            </div>
            <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-mono text-[11px] text-status-pass font-bold">
              Effective USL 0.070 mm: SAVED FROM SCRAP
            </div>
          </div>

          {/* Shift 3: Live 10-Sample SPC */}
          <div className="p-5 rounded-xl border border-border-hairline bg-surface shadow-apple-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-subtle border border-border-hairline flex items-center justify-center text-text-primary">
                <BarChart3 className="w-4 h-4 stroke-[1.5]" />
              </div>
              <h3 className="font-semibold text-sm text-text-primary">
                10-Sample Moving Range SPC Control
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Rather than post-hoc batch SPC after parts have shipped, SpecBalloon computes instantaneous Mean (X̄), Sigma (σ), and Capability Indices (Cp/Cpk &ge; 1.33) directly as parts are measured at the bench.
              </p>
            </div>
            <div className="p-2.5 rounded bg-subtle border border-border-hairline font-mono text-[11px] text-text-muted">
              Live UCL / LCL control limits on Form 3
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
