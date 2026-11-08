import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Play,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Calculator,
  Cpu,
  Layers,
  Sparkles,
  Sliders,
  ChevronRight,
  Zap,
  Maximize2,
  GitCompare,
  RotateCw,
  Eye,
  BarChart2,
  Search,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Tablet,
  Monitor,
  Check,
  AlertTriangle,
  FileCode2,
  Terminal,
  Activity,
  Scissors
} from 'lucide-react';
import { AppPage } from '../components/navigation/GlobalNavbar';
import { SpecBalloonLogo } from '../components/brand/SpecBalloonLogo';
import {
  OrthographicBlueprintSvg,
  BLUEPRINT_CALLOUTS,
  BlueprintCalloutItem
} from '../components/home/OrthographicBlueprintSvg';
import { fmt3 } from '../utils/metrologyMath';

interface HomePageProps {
  onNavigate: (page: AppPage, sampleId?: string) => void;
  onStartTour: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onStartTour }) => {
  // ---------------------------------------------------------------------------
  // SECTION 1: Product Theatre States
  // ---------------------------------------------------------------------------
  const [theatreMode, setTheatreMode] = useState<'scan' | 'xray' | 'diff'>('scan');
  const [activeCalloutId, setActiveCalloutId] = useState<string>('tag-01');
  const [scanBeamPct, setScanBeamPct] = useState<number>(35);
  const [isHoveringLoupe, setIsHoveringLoupe] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState({ x: 260, y: 240 });

  // Auto-scan beam animation timer
  useEffect(() => {
    if (theatreMode !== 'scan') return;

    const interval = setInterval(() => {
      setScanBeamPct((prev) => {
        const next = prev >= 95 ? 10 : prev + 0.75;
        // Find closest callout to beam
        const matching = BLUEPRINT_CALLOUTS.find((c) => Math.abs(c.xPct - next) < 8);
        if (matching && matching.id !== activeCalloutId) {
          setActiveCalloutId(matching.id);
        }
        return next;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [theatreMode, activeCalloutId]);

  const activeCallout =
    BLUEPRINT_CALLOUTS.find((c) => c.id === activeCalloutId) || BLUEPRINT_CALLOUTS[0];

  // ---------------------------------------------------------------------------
  // SECTION 3: Neuro-Symbolic Calculator State
  // ---------------------------------------------------------------------------
  const [selectedCalcSample, setSelectedCalcSample] = useState<
    'H7' | 'g6' | 'thread' | 'gdt'
  >('gdt');

  // ---------------------------------------------------------------------------
  // SECTION 4: Bento Grid Interactive Micro-App States
  // ---------------------------------------------------------------------------
  // Bento 01: Rev Diff
  const [revBentoState, setRevBentoState] = useState<'RevB' | 'RevC'>('RevC');

  // Bento 02: Dynamic MMC Datum Shift Slider
  const [datumBValue, setDatumBValue] = useState<number>(30.012);
  const datumBShift = Math.max(0, Number((datumBValue - 30.000).toFixed(4)));
  const effectiveUsl = Number((0.050 + 0.008 + datumBShift).toFixed(4));
  const measuredTruePos = 0.058;
  const isMmcPassed = measuredTruePos <= effectiveUsl;

  // Bento 03: SPC Caliper Pulse
  const [caliperBurstReading, setCaliperBurstReading] = useState<number>(30.012);
  const [spcSamples, setSpcSamples] = useState<number[]>([
    30.012, 30.014, 30.011, 30.015, 30.010, 30.013
  ]);

  const handlePulseCaliper = () => {
    const nextVal = Number((30.010 + Math.random() * 0.006).toFixed(3));
    setCaliperBurstReading(nextVal);
    setSpcSamples((prev) => [...prev.slice(1), nextVal]);
  };

  // Bento 04: Cavity & Thread Expansion
  const [isCavityExpanded, setIsCavityExpanded] = useState<boolean>(true);
  const [isThreadSplit, setIsThreadSplit] = useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // SECTION 5: Platform Switcher & ROI Calculator States
  // ---------------------------------------------------------------------------
  const [activePlatform, setActivePlatform] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [roiCurrency, setRoiCurrency] = useState<'USD' | 'INR'>('USD');
  const [roiDrawings, setRoiDrawings] = useState<number>(45);
  const [roiDims, setRoiDims] = useState<number>(65);

  const hourlyRate = roiCurrency === 'USD' ? 55 : 850;
  // Manual time: 5.0 mins per dim total (balloon + data entry)
  const manualHoursPerMo = (roiDrawings * roiDims * 5.0) / 60;
  // SpecBalloon time: 4 mins total per drawing automated
  const specBalloonHoursPerMo = (roiDrawings * 4.0) / 60;
  const hoursSavedPerMo = Math.max(1, Math.round(manualHoursPerMo - specBalloonHoursPerMo));
  const directLaborSavedPerMo = Math.round(hoursSavedPerMo * hourlyRate);
  const annualSavings = directLaborSavedPerMo * 12;

  return (
    <div className="w-full bg-[var(--bg-page)] text-[var(--text-primary)] font-sans selection:bg-[var(--text-primary)] selection:text-[var(--bg-page)]">
      {/* =========================================================================
          SECTION 1: CENTERED EDITORIAL HERO + INTERACTIVE PRODUCT THEATRE
          ========================================================================= */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-hairline)] overflow-hidden">
        {/* Subtle Engineering Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--border-hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--border-hairline) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* Top Centered Editorial Stack */}
        <div className="max-w-4xl mx-auto text-center relative z-10 mb-12">
          {/* Engineering Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] font-mono text-xs mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[var(--text-primary)]">AS9102 REV C · AIAG PPAP</span>
            <span className="text-[var(--text-muted)]">|</span>
            <span>ISO 286 DETERMINISTIC ENGINE</span>
          </div>

          {/* Monumental Headline */}
          <h1 className="font-display font-medium text-4xl sm:text-5xl lg:text-[62px] tracking-[-0.035em] leading-[1.06] text-[var(--text-primary)] mb-6">
            Precision First Article Inspection.{' '}
            <span className="text-[var(--text-muted)] block sm:inline">
              Built for the speed of thought.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
            Drop any 2D aerospace or automotive CAD drawing. SpecBalloon auto-balloons every dimension, computes ISO 286 & GD&T datum bonuses with zero hallucination, and exports audit-ready AS9102 Form 1–2–3 workbooks in seconds.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('studio')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              <span>Launch Studio IDE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onStartTour}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch 45s Tour</span>
            </button>

            <button
              onClick={() => onNavigate('studio')}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Drop CAD PDF</span>
            </button>
          </div>
        </div>

        {/* Full-Width Interactive Hero Product Frame */}
        <div className="max-w-6xl mx-auto rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden relative z-10 select-none">
          {/* Window Header Bar (36px) */}
          <div className="h-9 px-4 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] flex items-center justify-between text-xs font-mono">
            {/* macOS Window Controls + Document Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="h-3.5 w-px bg-[var(--border-hairline)] hidden sm:block" />
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                <span className="font-bold text-[var(--text-primary)]">AS-4092-C_Hydraulic_Actuator_RevC.pdf</span>
                <span className="hidden md:inline text-[var(--text-muted)]">— SpecBalloon IDE</span>
              </div>
            </div>

            {/* Interactive Mode Toggle */}
            <div className="inline-flex p-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[10px]">
              <button
                onClick={() => setTheatreMode('scan')}
                className={`px-2.5 py-0.5 rounded transition-colors ${
                  theatreMode === 'scan'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Auto-Scan Loop
              </button>
              <button
                onClick={() => setTheatreMode('xray')}
                className={`px-2.5 py-0.5 rounded transition-colors ${
                  theatreMode === 'xray'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Interactive Loupe
              </button>
              <button
                onClick={() => setTheatreMode('diff')}
                className={`px-2.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                  theatreMode === 'diff'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <GitCompare className="w-2.5 h-2.5" />
                <span>Rev Diff</span>
              </button>
            </div>
          </div>

          {/* Main Split Stage (460px height) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 h-[460px]">
            {/* Left 68% (8 Cols): 2D Orthographic SVG CAD Blueprint with Laser & Optical Loupe */}
            <div
              onMouseMove={(e) => {
                if (theatreMode === 'xray') {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setLoupePos({
                    x: Math.max(60, Math.min(rect.width - 120, e.clientX - rect.left)),
                    y: Math.max(60, Math.min(rect.height - 120, e.clientY - rect.top))
                  });
                }
              }}
              onMouseEnter={() => setIsHoveringLoupe(true)}
              onMouseLeave={() => setIsHoveringLoupe(false)}
              className="lg:col-span-8 p-3 bg-[var(--bg-subtle)]/50 relative border-b lg:border-b-0 lg:border-r border-[var(--border-hairline)] overflow-hidden flex items-center justify-center"
            >
              {/* Ultra-Detailed 2D Orthographic Vector Blueprint */}
              <OrthographicBlueprintSvg
                activeTagId={activeCalloutId}
                onSelectTag={(tagId) => setActiveCalloutId(tagId)}
                scanBeamPct={scanBeamPct}
                showLaser={theatreMode === 'scan'}
              />

              {/* 2X Optical Magnifier Loupe (Visible on X-Ray mode, clamped safely inside bounds) */}
              {theatreMode === 'xray' && isHoveringLoupe && (
                <div
                  style={{
                    left: `${loupePos.x}px`,
                    top: `${loupePos.y}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className="absolute pointer-events-none z-30 w-36 h-36 rounded-full border-2 border-[#0284C7] bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col items-center justify-center p-3 text-center"
                >
                  <div className="text-[10px] font-mono text-[#0284C7] font-bold">2× OPTICAL LOUPE</div>
                  <div className="text-xs font-mono font-bold text-[var(--text-primary)] mt-1">
                    {activeCallout.callout}
                  </div>
                  <div className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                    {activeCallout.feature}
                  </div>
                  <div className="mt-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ACTUAL: {activeCallout.measured.toFixed(3)}
                  </div>
                </div>
              )}
            </div>

            {/* Right 32% (4 Cols): Live Synced Single-Item Metrology Inspector */}
            <div className="lg:col-span-4 p-5 flex flex-col justify-between font-mono text-xs bg-[var(--bg-surface)]">
              <div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] border-b border-[var(--border-hairline)] pb-2.5 mb-4">
                  <span className="font-semibold">ACTIVE CALLOUT INSPECTOR</span>
                  <span className="px-2 py-0.5 rounded font-bold bg-[#0284C7] text-white text-[10px]">
                    TAG #{activeCallout.tag}
                  </span>
                </div>

                {/* Vector GD&T Preview Box */}
                <div className="p-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] mb-4">
                  <div className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    VECTOR DECOMPOSED CALLOUT
                  </div>
                  <div className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                    {activeCallout.callout}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    {activeCallout.feature}
                  </div>
                </div>

                {/* Nominal & Limits Breakdown */}
                <div className="space-y-2 text-[11px] pb-3 border-b border-[var(--border-hairline)]">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Nominal Dimension:</span>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums">
                      {activeCallout.nominal.toFixed(3)} mm
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Tolerance Limits:</span>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums">
                      {activeCallout.lsl.toFixed(3)} .. {activeCallout.usl.toFixed(3)} mm
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Shop-Floor Measured:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {activeCallout.measured.toFixed(3)} mm
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Assigned Gage:</span>
                    <span className="text-[10px] text-[var(--text-secondary)] truncate max-w-[150px]">
                      {activeCallout.instrument}
                    </span>
                  </div>
                </div>

                {/* 10-Piece Mini SPC Sparkline */}
                <div className="pt-3">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-2 font-semibold">
                    <span>10-PIECE LOT DISTRIBUTION</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Cpk = 1.74 (PASS)</span>
                  </div>
                  <div className="h-9 w-full flex items-end gap-1.5 px-1 py-1 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                    {[18, 24, 22, 28, 20, 26, 24, 30, 22, 25].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}px` }}
                        className="flex-1 bg-emerald-500 rounded-xs opacity-85 hover:opacity-100 transition-opacity"
                        title={`Sample #${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('studio')}
                className="w-full py-2.5 rounded-md bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Open in Studio IDE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Synced AS9102 Form 3 Strip (130px height, Explicit non-clipping padding) */}
          <div className="h-[130px] w-full border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-4 py-2 overflow-x-auto text-xs font-mono">
            {/* Table Header: explicit py-2.5 leading-normal overflow-visible so headers are never clipped */}
            <div className="grid grid-cols-12 gap-3 py-2 leading-normal overflow-visible text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-hairline)] select-none">
              <span className="col-span-1">TAG</span>
              <span className="col-span-1">ZONE</span>
              <span className="col-span-4">CALLOUT / GD&T FRAME</span>
              <span className="col-span-2">LIMITS [LSL .. USL]</span>
              <span className="col-span-2">MEASURED</span>
              <span className="col-span-1">SPC Cpk</span>
              <span className="col-span-1 text-right">STATUS</span>
            </div>

            {/* Table Rows (Active row highlights in sync with scan beam) */}
            <div className="divide-y divide-[var(--border-hairline)]/60 text-[11px]">
              {BLUEPRINT_CALLOUTS.slice(0, 3).map((item) => {
                const isActive = item.id === activeCalloutId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveCalloutId(item.id)}
                    className={`grid grid-cols-12 gap-3 py-1.5 px-1 rounded cursor-pointer transition-colors items-center ${
                      isActive
                        ? 'bg-[#0284C7]/10 text-[var(--text-primary)] font-bold'
                        : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="col-span-1 font-bold text-[#0284C7]">#{item.tag}</span>
                    <span className="col-span-1 text-[var(--text-muted)]">{item.zone}</span>
                    <span className="col-span-4 truncate text-[var(--text-primary)]">{item.callout}</span>
                    <span className="col-span-2 text-[var(--text-muted)] tabular-nums">
                      {item.lsl.toFixed(3)} .. {item.usl.toFixed(3)}
                    </span>
                    <span className="col-span-2 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                      {item.measured.toFixed(3)}
                    </span>
                    <span className="col-span-1 text-[var(--text-muted)] tabular-nums">1.74</span>
                    <span className="col-span-1 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      PASS
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: 4-COLUMN ARCHITECTURAL METRIC GRID
          ========================================================================= */}
      <section className="py-14 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] select-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-1">
            <div className="font-display font-medium text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
              11.4s
            </div>
            <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
              150-Dim CAD PDF to AS9102
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              vs. 5.5 hours manually in Excel
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-display font-medium text-3xl sm:text-4xl text-emerald-600 dark:text-emerald-400 tracking-tight">
              0.000 mm
            </div>
            <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
              Math Hallucination Rate
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              100% deterministic ISO & ASME math
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-display font-medium text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
              99.4%
            </div>
            <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
              Rotated GD&T Recall
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Gemini 2.5 Flash spatial patch vision
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-display font-medium text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
              Forms 1–3
            </div>
            <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
              Complete AS9102 Rev C Suite
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Plus 10-piece SPC run chart export
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: FULL-BLEED DARK CONTRAST SECTION — "THE NEURO-SYMBOLIC ENGINE"
          ========================================================================= */}
      <section className="bg-[#09090B] text-white py-24 px-4 sm:px-6 lg:px-8 border-b border-[#27272A] select-none">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="max-w-2xl mb-16">
            <div className="font-mono text-xs text-[#38BDF8] tracking-widest uppercase font-semibold mb-2">
              01 // ARCHITECTURAL BREAKTHROUGH
            </div>
            <h2 className="font-display font-medium text-3xl sm:text-4xl tracking-tight leading-tight mb-4">
              Why Pure LLMs Fail at Metrology. And How We Solved It.
            </h2>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              Large language models suffer from token arithmetic rounding errors and spatial hallucination when reading technical blueprints. SpecBalloon separates vision from mathematics through a 3-stage Neuro-Symbolic pipeline.
            </p>
          </div>

          {/* Interactive 3-Stage Pipeline Diagram */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stage 01: PyMuPDF + Gemini 2.5 Flash Vision */}
            <div className="p-6 rounded-xl border border-[#27272A] bg-[#121215] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[#38BDF8] mb-4">
                  <span>STAGE 01 // SPATIAL VISION</span>
                  <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[#FAFAFA]">
                  PyMuPDF + Gemini 2.5 Flash
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed mb-6">
                  Extracts vector stroke streams at 300 DPI, crops 45° angled callouts, and computes rotation angle θ = atan2(b, a) to eliminate skew.
                </p>

                {/* Micro-Sample Box */}
                <div className="p-3 rounded-lg bg-[#18181C] border border-[#27272A] font-mono text-xs space-y-1.5">
                  <div className="text-[10px] text-[#71717A]">EXTRACTED AFFINE BOX</div>
                  <div className="font-bold text-white">[ymin: 240, xmin: 185, ymax: 275, xmax: 320]</div>
                  <div className="text-[10px] text-[#38BDF8]">ANGLE: 0.00° (DESKEWED)</div>
                </div>
              </div>

              <div className="pt-6 text-[10px] font-mono text-[#71717A] border-t border-[#27272A] mt-6">
                Zero hallucination on coordinates
              </div>
            </div>

            {/* Stage 02: Deterministic ISO 286 / ASME Y14.5 Math Guardrail */}
            <div className="p-6 rounded-xl border-2 border-emerald-500/60 bg-[#121215] flex flex-col justify-between shadow-lg relative">
              <div className="absolute -top-3 left-6 px-2.5 py-0.5 rounded bg-emerald-500 text-black text-[10px] font-mono font-bold uppercase tracking-wider">
                Deterministic Guardrail
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-4">
                  <span>STAGE 02 // PURE MATH</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[#FAFAFA]">
                  ISO 286 & ASME Y14.5 Solver
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                  Pure mathematical formulas compute tolerance units i = 0.45 ∛D + 0.001 D and dynamic Datum Shift bonuses to 0.001mm precision.
                </p>

                {/* Interactive Math Demo Buttons */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setSelectedCalcSample('gdt')}
                      className={`p-1.5 rounded border text-[11px] text-left transition-colors ${
                        selectedCalcSample === 'gdt'
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold'
                          : 'border-[#27272A] bg-[#18181C] text-[#A1A1AA]'
                      }`}
                    >
                      |⌖|Ø0.05(M)|A|B(M)|
                    </button>
                    <button
                      onClick={() => setSelectedCalcSample('H7')}
                      className={`p-1.5 rounded border text-[11px] text-left transition-colors ${
                        selectedCalcSample === 'H7'
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold'
                          : 'border-[#27272A] bg-[#18181C] text-[#A1A1AA]'
                      }`}
                    >
                      Ø30.00 H7
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-[#18181C] border border-[#27272A] space-y-1">
                    {selectedCalcSample === 'gdt' ? (
                      <>
                        <div className="text-[10px] text-[#71717A]">DATUM MMC RESCUE RESULT</div>
                        <div className="font-bold text-emerald-400">Effective USL: 0.070 mm</div>
                        <div className="text-[10px] text-[#A1A1AA]">+0.008 Hole + 0.012 Datum B Shift</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[10px] text-[#71717A]">ISO 286-2 GRADE 7 FIT</div>
                        <div className="font-bold text-emerald-400">+0.021 / -0.000 mm</div>
                        <div className="text-[10px] text-[#A1A1AA]">Limits: 30.000 .. 30.021 mm</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 text-[10px] font-mono text-emerald-400 font-bold border-t border-[#27272A] mt-6">
                100% legal compliance in audits
              </div>
            </div>

            {/* Stage 03: AS9102 & SPC Live Ingestion */}
            <div className="p-6 rounded-xl border border-[#27272A] bg-[#121215] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-4">
                  <span>STAGE 03 // AUDIT OUTPUT</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[#FAFAFA]">
                  AS9102 Rev C & 10-Pc SPC
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed mb-6">
                  Direct output into 4-sheet formatted AS9102 Rev C Excel workbooks, 2-page print-ready QR traveler decks, and ZEISS CMM inspection logs.
                </p>

                {/* Micro-Sample Box */}
                <div className="p-3 rounded-lg bg-[#18181C] border border-[#27272A] font-mono text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#71717A]">AS9102 FORM 3</span>
                    <span className="text-emerald-400 font-bold text-[10px]">PASS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#71717A]">ZEISS CALYPSO IMPORT</span>
                    <span className="text-white font-bold text-[10px]">SYNCED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#71717A]">21 CFR PART 11 HASH</span>
                    <span className="text-white font-bold text-[10px]">SHA-256</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 text-[10px] font-mono text-[#71717A] border-t border-[#27272A] mt-6">
                Ready for Net-Inspect upload
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: THE 4 BREAKTHROUGHS BENTO GRID
          ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto select-none">
        <div className="max-w-2xl mb-16">
          <div className="font-mono text-xs text-[var(--text-muted)] tracking-widest uppercase font-semibold mb-2">
            02 // INDUSTRY FIRSTS
          </div>
          <h2 className="font-display font-medium text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
            Four Metrology Problems DISCUS & Capvidia Cannot Solve
          </h2>
        </div>

        {/* 2x2 Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bento 01: Delta-Revision Lock */}
          <div className="p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  BREAKTHROUGH 01
                </span>
                {/* Interactive Toggle */}
                <div className="inline-flex p-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[10px] font-mono">
                  <button
                    onClick={() => setRevBentoState('RevB')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      revBentoState === 'RevB' ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-bold' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Rev B Baseline
                  </button>
                  <button
                    onClick={() => setRevBentoState('RevC')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      revBentoState === 'RevC' ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-bold' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Rev C ECO
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">Delta-Revision Lock Engine</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
                When engineering releases an ECO, legacy tools renumber all balloons and break existing CMM programs. SpecBalloon preserves Tag IDs #01..#14 while highlighting delta changes.
              </p>

              <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Tag #01 (Datum B Bore):</span>
                  <span className={`font-bold ${revBentoState === 'RevC' ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--text-primary)]'}`}>
                    {revBentoState === 'RevC' ? 'Ø30.00 H7 (Tightened)' : 'Ø30.00 ±0.05 (Rev B)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Tag #15 (New ECO Callout):</span>
                  <span className={`font-bold ${revBentoState === 'RevC' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                    {revBentoState === 'RevC' ? 'ADDED (APPENDED)' : 'DOES NOT EXIST'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 text-[11px] font-mono text-[var(--text-muted)] border-t border-[var(--border-hairline)] mt-6">
              Shop-floor ZEISS CMM programs never require re-programming.
            </div>
          </div>

          {/* Bento 02: Cross-Row Dynamic MMC + Datum Shift Rescue */}
          <div className="p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
            <div>
              <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-4">
                BREAKTHROUGH 02
              </div>
              <h3 className="text-xl font-semibold mb-2">Cross-Row Dynamic MMC Rescue</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                ASME Y14.5 allows expanding position tolerance by the amount a datum feature departs from MMC. Drag the slider to observe automated scrap recovery.
              </p>

              {/* Interactive Slider */}
              <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">DATUM B BORE (#01):</span>
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">{datumBValue.toFixed(3)} mm</span>
                </div>
                <input
                  type="range"
                  min="30.000"
                  max="30.021"
                  step="0.001"
                  value={datumBValue}
                  onChange={(e) => setDatumBValue(parseFloat(e.target.value))}
                  className="w-full accent-[var(--text-primary)] h-1.5 bg-[var(--bg-surface)] rounded-lg appearance-none cursor-pointer"
                />

                <div className="pt-2 border-t border-[var(--border-hairline)] flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Effective USL for Tag #02:</span>
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">{effectiveUsl.toFixed(3)} mm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Position Verdict (0.058 mm):</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    isMmcPassed
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}>
                    {isMmcPassed ? 'PASS VIA MMC BONUS' : 'FALSE SCRAP (OUT OF SPEC)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 text-[11px] font-mono text-[var(--text-muted)] border-t border-[var(--border-hairline)] mt-6">
              Empirically saves $42,000/year in unnecessary aerospace scrap.
            </div>
          </div>

          {/* Bento 03: 10-Sample SPC Heatmap & Control Chart */}
          <div className="p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                  BREAKTHROUGH 03
                </span>
                <button
                  onClick={handlePulseCaliper}
                  className="px-2.5 py-1 rounded bg-[var(--text-primary)] text-[var(--bg-page)] text-[10px] font-mono font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>Pulse Caliper</span>
                </button>
              </div>

              <h3 className="text-xl font-semibold mb-2">10-Sample SPC Heatmap & DRO</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                Stream live readings from physical Mitutoyo USB / Bluetooth calipers directly into moving range X-bar and R control charts.
              </p>

              {/* 6-Sample Micro Heatmap Strip */}
              <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>LIVE MOVING SAMPLES</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">LATEST: {caliperBurstReading.toFixed(3)} mm</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {spcSamples.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shadow-xs"
                    >
                      {s.toFixed(3)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 text-[11px] font-mono text-[var(--text-muted)] border-t border-[var(--border-hairline)] mt-6">
              Instant moving range UCL / AVG / LCL without exporting to Minitab.
            </div>
          </div>

          {/* Bento 04: Multi-Feature Cavity & Thread Decomposition */}
          <div className="p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                  BREAKTHROUGH 04
                </span>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <button
                    onClick={() => setIsCavityExpanded(!isCavityExpanded)}
                    className="px-2 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)]"
                  >
                    {isCavityExpanded ? 'Collapse 4X' : 'Expand 4X'}
                  </button>
                  <button
                    onClick={() => setIsThreadSplit(!isThreadSplit)}
                    className="px-2 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)]"
                  >
                    {isThreadSplit ? 'Merge M10' : 'Split M10'}
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">Multi-Feature & Thread Decomposition</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                Complex engineering callouts like <code className="bg-[var(--bg-subtle)] px-1 py-0.5 rounded font-mono">4X Ø8.530</code> or <code className="bg-[var(--bg-subtle)] px-1 py-0.5 rounded font-mono">M10×1.5 - 6H</code> automatically decompose into individual measurable inspection rows.
              </p>

              <div className="space-y-1.5 font-mono text-xs">
                {isCavityExpanded ? (
                  <>
                    <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex justify-between items-center text-[11px]">
                      <span>#04.1 Bolt Hole Cavity 1:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">8.528 mm (PASS)</span>
                    </div>
                    <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex justify-between items-center text-[11px]">
                      <span>#04.2 Bolt Hole Cavity 2:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">8.532 mm (PASS)</span>
                    </div>
                  </>
                ) : (
                  <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex justify-between items-center text-[11px]">
                    <span>4X Ø8.530 ±0.035:</span>
                    <span className="font-bold text-[var(--text-primary)]">Collapsed Parent</span>
                  </div>
                )}

                {isThreadSplit && (
                  <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex justify-between items-center text-[11px]">
                    <span>#16 M10×1.5 Pitch Dia:</span>
                    <span className="font-bold text-[var(--text-primary)]">9.026 .. 9.206 mm</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 text-[11px] font-mono text-[var(--text-muted)] border-t border-[var(--border-hairline)] mt-6">
              1-click compliance with AS9102 Rev C Form 3 column 5 requirements.
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: MULTI-PLATFORM ECOSYSTEM & INTERACTIVE ROI CALCULATOR
          ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] select-none">
        <div className="max-w-6xl mx-auto space-y-20">
          {/* Top Half: Device Ecosystem Switcher */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <div className="font-mono text-xs text-[var(--text-muted)] tracking-widest uppercase font-semibold mb-2">
                  03 // CROSS-PLATFORM ARCHITECTURE
                </div>
                <h2 className="font-display font-medium text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
                  One Unified Metrology Engine. Any Device.
                </h2>
              </div>

              {/* Tabs */}
              <div className="inline-flex p-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] font-mono text-xs">
                <button
                  onClick={() => setActivePlatform('desktop')}
                  className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                    activePlatform === 'desktop'
                      ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop IDE</span>
                </button>
                <button
                  onClick={() => setActivePlatform('tablet')}
                  className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                    activePlatform === 'tablet'
                      ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span>Tablet Workbench</span>
                </button>
                <button
                  onClick={() => setActivePlatform('mobile')}
                  className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                    activePlatform === 'mobile'
                      ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile Floor DRO</span>
                </button>
              </div>
            </div>

            {/* Platform Feature Display */}
            <div className="p-8 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-page)] grid grid-cols-1 md:grid-cols-3 gap-6">
              {activePlatform === 'desktop' && (
                <>
                  <div className="space-y-2">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">4-PANE METROLOGY IDE</div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Optimized for multi-monitor inspection labs with simultaneous 2D CAD canvas, docked AS9102 spreadsheet, and single-item inspector.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">ZEISS & HEXAGON CMM SYNC</div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Instant auto-import of .csv/.txt coordinate runs with Euclidean true position math calculated in sub-seconds.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">BINARY EXPORT SUITE</div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Exports 4-sheet formatted AS9102 Rev C Excel workbooks and print-ready 2-page traveler decks with QR codes.
                    </p>
                  </div>
                </>
              )}

              {activePlatform === 'tablet' && (
                <>
                  <div className="space-y-2">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">SURFACE-PLATE WORKBENCH</div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Touch-optimized interface for granite surface plate inspection with large caliper touch targets and tap-to-verify buttons.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">DIGITAL SIGNATURE PAD</div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      21 CFR Part 11 compliant digital pen sign-offs embedded directly into the traveler PDF with cryptographic SHA-256 timestamps.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">WEBHID USB CALIPER DOCK</div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Plugs directly into Mitutoyo USB input tools without installing third-party driver software.
                    </p>
                  </div>
                </>
              )}

              {activePlatform === 'mobile' && (
                <>
                  <div className="space-y-2">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">SHOP-FLOOR QR TRAVELER</div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Scan traveler QR code from printed job packets to instantly pull up active part characteristics on your phone.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">BLE CALIPER STREAMING</div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Connects directly to Fowler Ultra-Cal VI or Sylvac Bluetooth calipers via Web Bluetooth GATT service at 10 Hz.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">OFFLINE PWA ENGINE</div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Works completely offline in air-gapped machine shop environments with zero active internet connection.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Half: 2-Slider ROI & Inspection Quoting Calculator */}
          <div className="p-8 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-page)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-medium text-2xl text-[var(--text-primary)] tracking-tight">
                  Calculate Quality Lab Labor Savings
                </h3>
                {/* Currency Toggle */}
                <div className="inline-flex p-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[10px] font-mono">
                  <button
                    onClick={() => setRoiCurrency('USD')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      roiCurrency === 'USD' ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-bold' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    onClick={() => setRoiCurrency('INR')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      roiCurrency === 'INR' ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-bold' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    INR (₹)
                  </button>
                </div>
              </div>

              <div className="space-y-5 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[var(--text-secondary)]">BLUEPRINTS / MONTH:</span>
                    <span className="font-bold text-[var(--text-primary)]">{roiDrawings} drawings</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={roiDrawings}
                    onChange={(e) => setRoiDrawings(parseInt(e.target.value))}
                    className="w-full accent-[var(--text-primary)] h-1.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                    <span>10/mo</span>
                    <span>100/mo</span>
                    <span>200/mo</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[var(--text-secondary)]">AVERAGE DIMENSIONS PER DRAWING:</span>
                    <span className="font-bold text-[var(--text-primary)]">{roiDims} callouts</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="5"
                    value={roiDims}
                    onChange={(e) => setRoiDims(parseInt(e.target.value))}
                    className="w-full accent-[var(--text-primary)] h-1.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                    <span>20 dims</span>
                    <span>110 dims</span>
                    <span>200 dims</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[var(--text-muted)] font-mono">
                Formula: Manual baseline = 5.0 min/dim (ballooning + logging). SpecBalloon = 4.0 min total per drawing automated.
              </div>
            </div>

            {/* Savings Output Box */}
            <div className="lg:col-span-5 p-6 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-4 font-mono">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                ANNUAL DIRECT LABOR RECOVERY
              </div>
              <div className="text-4xl font-display font-medium text-emerald-600 dark:text-emerald-400">
                {roiCurrency === 'USD' ? `$${annualSavings.toLocaleString()}` : `₹${annualSavings.toLocaleString('en-IN')}`}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {hoursSavedPerMo} engineering hours recovered per month. Payback period: &lt; 5 days.
              </div>

              <button
                onClick={() => onNavigate('pricing')}
                className="w-full py-2.5 rounded bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View Transparent Pricing Plans</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: HIGH-CONTRAST LAUNCH CTA & ARCHITECTURAL FOOTER
          ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] text-center select-none relative overflow-hidden">
        {/* Giant Architectural Watermark Monogram */}
        <div className="absolute left-1/2 -bottom-24 -translate-x-1/2 opacity-[0.03] pointer-events-none text-[var(--text-primary)]">
          <SpecBalloonLogo size={520} dotPulse={false} />
        </div>

        <div className="max-w-2xl mx-auto relative z-10 space-y-4">
          <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[var(--text-primary)]">
            Start Inspecting in Seconds.
          </h2>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            Zero installation required. Drop your aerospace or automotive CAD PDF directly into our air-gapped local browser engine.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('studio')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              <span>Launch SpecBalloon Studio IDE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('security')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Read ITAR & Security Specs</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
