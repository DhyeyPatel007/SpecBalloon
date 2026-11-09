import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Play,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Cpu,
  Layers,
  Sliders,
  GitCompare,
  ShieldCheck,
  Zap,
  Activity,
  FileCode2,
  Check
} from 'lucide-react';
import { AppPage } from '@/components/navigation/GlobalNavbar';
import { SpecBalloonLogo } from '@/components/brand/SpecBalloonLogo';
import {
  OrthographicBlueprintSvg,
  BLUEPRINT_CALLOUTS,
} from '@/components/home/OrthographicBlueprintSvg';
import {
  TextGenerateEffect,
  GridBackground,
  BentoGrid,
  BentoGridItem,
  Timeline,
  TimelineEntry,
  InfiniteMovingCards,
  AnimatedStat,
  HoverEffect,
  HoverEffectItem,
} from '@/components/ui';

interface HomePageProps {
  onNavigate: (page: AppPage, sampleId?: string) => void;
  onStartTour: () => void;
}

const STANDARDS_MARQUEE = [
  {
    name: 'SAE AS9102 Rev C',
    title: 'Aerospace First Article Inspection Suite',
    quote: 'Mandatory Forms 1, 2, and 3 verification with 100% feature traceability.',
    badge: 'AEROSPACE',
    metric: 'Forms 1, 2 & 3',
  },
  {
    name: 'AIAG PPAP 4th Edition',
    title: 'Automotive Production Part Approval Process',
    quote: 'Level 3 dimensional report submission with calibrated gage R&R study.',
    badge: 'AUTOMOTIVE',
    metric: 'Cpk > 1.67',
  },
  {
    name: 'ISO 286-1 & 286-2',
    title: 'Geometrical Product Specifications (GPS) — Fits',
    quote: 'Deterministic tolerance unit formula i = 0.45 ∛D + 0.001 D calculation.',
    badge: 'ISO GPS',
    metric: '0.000 mm Err',
  },
  {
    name: 'ASME Y14.5-2018',
    title: 'Dimensioning and Tolerancing (GD&T)',
    quote: 'True position MMC expansion and dynamic datum reference frame shift.',
    badge: 'GD&T',
    metric: 'ASME Y14.5',
  },
  {
    name: 'ZEISS Calypso & PC-DMIS',
    title: 'Coordinate Measuring Machine Integration',
    quote: 'Direct ASCII / CSV point cloud ingestion with Euclidean position formula.',
    badge: 'CMM SYNC',
    metric: '< 200ms',
  },
  {
    name: '21 CFR Part 11',
    title: 'Electronic Records & Signatures Compliance',
    quote: 'Cryptographic SHA-256 document hashing and immutable digital sign-offs.',
    badge: 'AUDIT-READY',
    metric: 'SHA-256',
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onStartTour }) => {
  // Product Theatre States
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

  // Bento 01: Rev Diff state
  const [revBentoState, setRevBentoState] = useState<'RevB' | 'RevC'>('RevC');

  // Bento 02: Dynamic MMC Datum Shift Slider state
  const [datumBValue, setDatumBValue] = useState<number>(30.012);
  const datumBShift = Math.max(0, Number((datumBValue - 30.000).toFixed(4)));
  const effectiveUsl = Number((0.050 + 0.008 + datumBShift).toFixed(4));
  const measuredTruePos = 0.058;
  const isMmcPassed = measuredTruePos <= effectiveUsl;

  // Timeline data for How It Works
  const timelineData: TimelineEntry[] = [
    {
      title: "01 // Upload CAD",
      content: (
        <div className="space-y-3 font-sans">
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Drag and drop any vector engineering drawing (PDF up to 5 pages, 10MB) or high-res blueprint. All processing occurs locally in volatile browser memory without cloud exposure.
          </p>
          <div className="p-3.5 rounded-lg border border-[#0047AB]/20 bg-white dark:bg-neutral-950 font-mono text-xs space-y-1.5 shadow-xs">
            <div className="text-[10px] text-neutral-400 uppercase">Input Verification</div>
            <div className="text-neutral-900 dark:text-neutral-100 font-bold">AS-4092-C_Hydraulic_Actuator_RevC.pdf</div>
            <div className="text-[10px] text-[#0047AB] dark:text-[#38BDF8]">Local Client Parsing · 300 DPI Vector Decomposition</div>
          </div>
        </div>
      ),
    },
    {
      title: "02 // Auto-Balloon",
      content: (
        <div className="space-y-3 font-sans">
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Spatial vision crops and deskews angled callouts, while deterministic ISO 286 and ASME Y14.5 algorithms calculate limits and tolerance bonuses to 0.001mm.
          </p>
          <div className="p-3.5 rounded-lg border border-[#0047AB]/20 bg-white dark:bg-neutral-950 font-mono text-xs space-y-1.5 shadow-xs">
            <div className="text-[10px] text-neutral-400 uppercase">Feature Decomposition</div>
            <div className="text-neutral-900 dark:text-neutral-100 font-bold">|⌖|Ø0.05(M)|A|B(M)| &rarr; Effective USL: 0.070 mm</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Zero Hallucination: Pure Euclidean True Position Math</div>
          </div>
        </div>
      ),
    },
    {
      title: "03 // Studio Review",
      content: (
        <div className="space-y-3 font-sans">
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Inspect characteristics in the 4-Pane Metrology IDE. Stream live micrometer readings from physical Mitutoyo USB / Bluetooth calipers directly into Form 3 rows with sub-millisecond audio feedback.
          </p>
          <div className="p-3.5 rounded-lg border border-[#0047AB]/20 bg-white dark:bg-neutral-950 font-mono text-xs space-y-1.5 shadow-xs">
            <div className="text-[10px] text-neutral-400 uppercase">Hardware Bridge Active</div>
            <div className="text-neutral-900 dark:text-neutral-100 font-bold">WebHID USB Caliper: 30.012 mm &rarr; Tag #01</div>
            <div className="text-[10px] text-[#0047AB] dark:text-[#38BDF8]">Hands-Free Enter Key Confirmation & SPC Logging</div>
          </div>
        </div>
      ),
    },
    {
      title: "04 // AS9102 Export",
      content: (
        <div className="space-y-3 font-sans">
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            One-click generation of formatted 4-sheet AS9102 Rev C Excel workbooks (Forms 1, 2, 3), 2-page print-ready QR traveler decks, and CMM inspection records.
          </p>
          <div className="p-3.5 rounded-lg border border-[#0047AB]/20 bg-white dark:bg-neutral-950 font-mono text-xs space-y-1.5 shadow-xs">
            <div className="text-[10px] text-neutral-400 uppercase">Audit Compliance Package</div>
            <div className="text-neutral-900 dark:text-neutral-100 font-bold">AS9102 Rev C Forms 1–3 + 10-Pc SPC Run Chart</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Net-Inspect Compatible · 21 CFR Part 11 SHA-256 Signed</div>
          </div>
        </div>
      ),
    },
  ];

  // Pricing / Deployment Tiers Data
  const tiersData: HoverEffectItem[] = [
    {
      title: "Quality Lab Starter",
      description: "Single-station browser IDE for small machine shops and job-shop machinists.",
      price: "$0",
      period: "/ forever",
      badge: "FREE",
      features: [
        "4-Pane Metrology IDE Workbench",
        "Unlimited Local Drawing Sessions",
        "Deterministic ISO 286 Fit Solver",
        "AS9102 Form 3 CSV Export",
        "100% Client-Side Processing"
      ],
      ctaText: "Launch Studio Free",
      onAction: () => onNavigate('studio'),
    },
    {
      title: "Machine Shop Pro",
      description: "For aerospace and automotive machine shops requiring AS9102 Rev C compliance.",
      price: "$180",
      period: "/ month per facility",
      badge: "POPULAR",
      popular: true,
      features: [
        "Complete 4-Sheet AS9102 Rev C Excel Suite",
        "Delta-Revision Lock Engine (ECO Diff)",
        "ZEISS Calypso & PC-DMIS CMM Importer",
        "WebHID USB & BLE Caliper Bridge",
        "2-Page Print-Ready QR Traveler Decks"
      ],
      ctaText: "Start 14-Day Free Trial",
      onAction: () => onNavigate('pricing'),
    },
    {
      title: "Air-Gapped Enterprise",
      description: "For defense contractors and multi-plant operations requiring strict ITAR security.",
      price: "Custom",
      period: "/ annual license",
      badge: "ITAR COMPLIANT",
      features: [
        "100% Air-Gapped On-Premises Docker/PWA",
        "Private BYOK Vertex AI / Gemini Endpoints",
        "21 CFR Part 11 Cryptographic Audit Trail",
        "SAP, Epicor, & Plex MES/ERP Sync",
        "Dedicated Metrology Systems Architect"
      ],
      ctaText: "Contact Defense Team",
      onAction: () => onNavigate('security'),
    },
  ];

  return (
    <div className="w-full bg-[var(--bg-page,#FAFAFA)] text-[var(--text-primary,#09090B)] font-sans selection:bg-[#0047AB] selection:text-white">
      {/* =========================================================================
          SECTION 1: HERO WITH ACETERNITY GRID BACKGROUND & TEXT GENERATE EFFECT
          ========================================================================= */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 border-b border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Cobalt Blueprint Grid Background */}
        <GridBackground className="w-full">
          {/* Centered Editorial Stack */}
          <div className="max-w-4xl mx-auto text-center relative z-10 mb-12">
            {/* Engineering Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 font-mono text-xs mb-6 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#0047AB] animate-pulse" />
              <span className="font-semibold text-neutral-900 dark:text-white">AS9102 REV C · AIAG PPAP</span>
              <span className="text-neutral-400">|</span>
              <span>DETERMINISTIC METROLOGY ENGINE</span>
            </div>

            {/* Monumental Headline with Aceternity TextGenerateEffect */}
            <TextGenerateEffect
              words="Autonomous ballooning for 2D CAD drawings."
              className="font-display font-medium text-4xl sm:text-5xl lg:text-[60px] tracking-[-0.035em] text-neutral-950 dark:text-white mb-6"
            />

            {/* Subheadline: Domain Copy */}
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
              Drop any 2D aerospace or automotive CAD drawing. SpecBalloon extracts every dimension, resolves ISO 286 limits and ASME Y14.5 MMC bonuses deterministically, and exports audit-ready AS9102 Form 1, 2, and 3 workbooks.
            </p>

            {/* Action Buttons: Flat Cobalt */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('studio')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0047AB] hover:bg-[#003887] text-white text-xs font-mono font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <span>Launch Studio IDE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onStartTour}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs font-mono font-medium transition-colors cursor-pointer text-neutral-800 dark:text-neutral-200"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch 45s Tour</span>
              </button>

              <button
                onClick={() => onNavigate('studio', 'AS-4092-C')}
                className="hidden sm:inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-white dark:hover:bg-neutral-950 text-xs font-mono text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Sample (AS-4092-C)</span>
              </button>
            </div>
          </div>

          {/* Interactive Hero CAD Blueprint Theatre */}
          <div className="max-w-6xl mx-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl overflow-hidden relative z-10 select-none">
            {/* Window Header Bar */}
            <div className="h-9 px-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="h-3.5 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
                <div className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                  <span className="font-bold text-neutral-900 dark:text-white">AS-4092-C_Hydraulic_Actuator_RevC.pdf</span>
                  <span className="hidden md:inline text-neutral-500">— SpecBalloon IDE</span>
                </div>
              </div>

              {/* Mode Toggles */}
              <div className="inline-flex p-0.5 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-[10px]">
                <button
                  onClick={() => setTheatreMode('scan')}
                  className={`px-2.5 py-0.5 rounded transition-colors ${
                    theatreMode === 'scan'
                      ? 'bg-[#0047AB] text-white font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Auto-Scan
                </button>
                <button
                  onClick={() => setTheatreMode('xray')}
                  className={`px-2.5 py-0.5 rounded transition-colors ${
                    theatreMode === 'xray'
                      ? 'bg-[#0047AB] text-white font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Loupe
                </button>
                <button
                  onClick={() => setTheatreMode('diff')}
                  className={`px-2.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                    theatreMode === 'diff'
                      ? 'bg-[#0047AB] text-white font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <GitCompare className="w-2.5 h-2.5" />
                  <span>Rev Diff</span>
                </button>
              </div>
            </div>

            {/* Split Stage: 2D Blueprint + Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 h-[460px]">
              {/* Left 8 Cols: 2D Orthographic Vector Blueprint */}
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
                className="lg:col-span-8 p-3 bg-neutral-50/50 dark:bg-neutral-900/40 relative border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center"
              >
                <OrthographicBlueprintSvg
                  activeTagId={activeCalloutId}
                  onSelectTag={(tagId) => setActiveCalloutId(tagId)}
                  scanBeamPct={scanBeamPct}
                  showLaser={theatreMode === 'scan'}
                />

                {/* Optical Loupe */}
                {theatreMode === 'xray' && isHoveringLoupe && (
                  <div
                    style={{
                      left: `${loupePos.x}px`,
                      top: `${loupePos.y}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    className="absolute pointer-events-none z-30 w-36 h-36 rounded-full border-2 border-[#0047AB] bg-white dark:bg-neutral-950 shadow-2xl overflow-hidden flex flex-col items-center justify-center p-3 text-center"
                  >
                    <div className="text-[10px] font-mono text-[#0047AB] dark:text-[#38BDF8] font-bold">2× OPTICAL LOUPE</div>
                    <div className="text-xs font-mono font-bold text-neutral-950 dark:text-white mt-1">
                      {activeCallout.callout}
                    </div>
                    <div className="text-[9px] font-mono text-neutral-500 mt-0.5">
                      {activeCallout.feature}
                    </div>
                    <div className="mt-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ACTUAL: {activeCallout.measured.toFixed(3)}
                    </div>
                  </div>
                )}
              </div>

              {/* Right 4 Cols: Active Inspector */}
              <div className="lg:col-span-4 p-5 flex flex-col justify-between font-mono text-xs bg-white dark:bg-neutral-950">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 border-b border-neutral-100 dark:border-neutral-900 pb-2.5 mb-4">
                    <span className="font-semibold">ACTIVE CALLOUT INSPECTOR</span>
                    <span className="px-2 py-0.5 rounded font-bold bg-[#0047AB] text-white text-[10px]">
                      TAG #{activeCallout.tag}
                    </span>
                  </div>

                  {/* Callout Preview */}
                  <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 mb-4">
                    <div className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                      VECTOR DECOMPOSED CALLOUT
                    </div>
                    <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                      {activeCallout.callout}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1">
                      {activeCallout.feature}
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="space-y-2 text-[11px] pb-3 border-b border-neutral-100 dark:border-neutral-900">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Nominal Dimension:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {activeCallout.nominal.toFixed(3)} mm
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Tolerance Limits:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {activeCallout.lsl.toFixed(3)} .. {activeCallout.usl.toFixed(3)} mm
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Shop-Floor Measured:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {activeCallout.measured.toFixed(3)} mm
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Assigned Gage:</span>
                      <span className="text-[10px] text-neutral-600 dark:text-neutral-400 truncate max-w-[150px]">
                        {activeCallout.instrument}
                      </span>
                    </div>
                  </div>

                  {/* 10-Piece Run Chart Sparkline */}
                  <div className="pt-3">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-2 font-semibold">
                      <span>10-PIECE LOT DISTRIBUTION</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Cpk = 1.74 (PASS)</span>
                    </div>
                    <div className="h-9 w-full flex items-end gap-1.5 px-1 py-1 rounded bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                      {[18, 24, 22, 28, 20, 26, 24, 30, 22, 25].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h}px` }}
                          className="flex-1 bg-[#0047AB] rounded-xs opacity-85 hover:opacity-100 transition-opacity"
                          title={`Sample #${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('studio')}
                  className="w-full py-2.5 rounded-md bg-[#0047AB] hover:bg-[#003887] text-white text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Open in Studio IDE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Form 3 Table Strip */}
            <div className="h-[125px] w-full border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-2 overflow-x-auto text-xs font-mono">
              <div className="grid grid-cols-12 gap-3 py-1.5 text-[10px] text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-800 select-none">
                <span className="col-span-1">TAG</span>
                <span className="col-span-1">ZONE</span>
                <span className="col-span-4">CALLOUT / GD&T FRAME</span>
                <span className="col-span-2">LIMITS [LSL .. USL]</span>
                <span className="col-span-2">MEASURED</span>
                <span className="col-span-1">SPC Cpk</span>
                <span className="col-span-1 text-right">STATUS</span>
              </div>

              <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-[11px]">
                {BLUEPRINT_CALLOUTS.slice(0, 3).map((item) => {
                  const isActive = item.id === activeCalloutId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveCalloutId(item.id)}
                      className={`grid grid-cols-12 gap-3 py-1 px-1 rounded cursor-pointer transition-colors items-center ${
                        isActive
                          ? 'bg-[#0047AB]/10 text-neutral-950 dark:text-white font-bold'
                          : 'hover:bg-white dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <span className="col-span-1 font-bold text-[#0047AB]">#{item.tag}</span>
                      <span className="col-span-1 text-neutral-500">{item.zone}</span>
                      <span className="col-span-4 truncate text-neutral-900 dark:text-neutral-100">{item.callout}</span>
                      <span className="col-span-2 text-neutral-500 tabular-nums">
                        {item.lsl.toFixed(3)} .. {item.usl.toFixed(3)}
                      </span>
                      <span className="col-span-2 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                        {item.measured.toFixed(3)}
                      </span>
                      <span className="col-span-1 text-neutral-500 tabular-nums">1.74</span>
                      <span className="col-span-1 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        PASS
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </GridBackground>
      </section>

      {/* =========================================================================
          SECTION 2: VERIFIABLE STATS BAR WITH SKIPER UI ANIMATEDSTAT (skiper37)
          ========================================================================= */}
      <section className="py-12 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 select-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <AnimatedStat
            value={3}
            label="AS9102 Forms Generated"
            sublabel="Forms 1, 2 & 3 complete suite"
          />

          <AnimatedStat
            value={100}
            suffix="%"
            label="Local Browser Rendering"
            sublabel="0 bytes sent to external cloud"
          />

          <AnimatedStat
            value={0}
            label="Manual Re-numbering Steps"
            sublabel="Delta-Lock protects CMM plans"
          />

          <AnimatedStat
            value={0.001}
            suffix=" mm"
            format={{ minimumFractionDigits: 3 }}
            label="Deterministic Resolution"
            sublabel="ISO 286 & ASME Y14.5 precision"
          />
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: NORMATIVE STANDARDS MARQUEE (INFINITE MOVING CARDS)
          ========================================================================= */}
      <section className="py-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 overflow-hidden select-none">
        <div className="max-w-6xl mx-auto px-4 mb-2 flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <span className="uppercase tracking-wider">Normative Metrology Standards & CMM Workflows</span>
          <span className="text-[#0047AB] dark:text-[#38BDF8] font-bold">100% Deterministic Compliance</span>
        </div>
        <InfiniteMovingCards items={STANDARDS_MARQUEE} speed="normal" />
      </section>

      {/* =========================================================================
          SECTION 4: FEATURES BENTO GRID (ACETERNITY BENTO GRID)
          ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto select-none">
        <div className="max-w-2xl mb-12">
          <div className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] tracking-widest uppercase font-semibold mb-2">
            01 // CORE METROLOGY INSTRUMENTS
          </div>
          <h2 className="font-display font-medium text-3xl sm:text-4xl text-neutral-950 dark:text-white tracking-tight">
            Deterministic Precision for High-Reliability Manufacturing
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Eliminate hours of manual snipping, typing, and false scrap calculations with four purpose-built metrology breakthroughs.
          </p>
        </div>

        <BentoGrid className="grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Vector Stroke Decomposition */}
          <BentoGridItem
            title="Vector Decomposition & Auto-Ballooning"
            description="Extracts vector stroke streams at 300 DPI, crops 45° angled callouts, and computes rotation angle θ = atan2(b, a) to eliminate OCR skew."
            icon={<Cpu className="w-4 h-4 text-[#0047AB]" />}
            header={
              <div className="w-full h-36 rounded-lg bg-[#0047AB]/10 dark:bg-[#0047AB]/15 border border-[#0047AB]/20 p-4 font-mono text-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span>VECTOR PARSER</span>
                  <span className="text-[#0047AB] font-bold">300 DPI AFFINE</span>
                </div>
                <div>
                  <div className="text-neutral-900 dark:text-neutral-100 font-bold">[ymin: 240, xmin: 185, ymax: 275, xmax: 320]</div>
                  <div className="text-[10px] text-[#0047AB] dark:text-[#38BDF8] mt-1">ANGLE: 0.00° (DESKEWED)</div>
                </div>
                <div className="text-[10px] text-neutral-400">Zero coordinate hallucination</div>
              </div>
            }
          />

          {/* Card 2: AS9102 Form 1, 2, 3 Excel Suite */}
          <BentoGridItem
            title="AS9102 Rev C Forms 1, 2 & 3 Suite"
            description="Autonomous compilation of complete aerospace FAI packages including Form 1 (Part Accountability), Form 2 (Materials & Processes), and Form 3 (Characteristic Accountability)."
            icon={<FileSpreadsheet className="w-4 h-4 text-[#0047AB]" />}
            header={
              <div className="w-full h-36 rounded-lg bg-[#0047AB]/10 dark:bg-[#0047AB]/15 border border-[#0047AB]/20 p-4 font-mono text-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span>SAE AS9102 SUITE</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">AUDIT READY</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-600 dark:text-neutral-400">Form 1: Part Record</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">Compiled</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-600 dark:text-neutral-400">Form 3: Characteristics</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">100% Mapped</span>
                  </div>
                </div>
                <div className="text-[10px] text-neutral-400">Compatible with Net-Inspect and DISCUS</div>
              </div>
            }
          />

          {/* Card 3: Dynamic MMC & Datum Shift Bonus */}
          <BentoGridItem
            title="ASME Y14.5 MMC & Datum Shift Solver"
            description="ASME Y14.5 allows expanding position tolerance as datum features depart from MMC. Drag the slider to observe automated false scrap recovery."
            icon={<Sliders className="w-4 h-4 text-[#0047AB]" />}
            header={
              <div className="w-full h-36 rounded-lg bg-[#0047AB]/10 dark:bg-[#0047AB]/15 border border-[#0047AB]/20 p-3 font-mono text-xs flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neutral-500">DATUM B BORE (#01):</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{datumBValue.toFixed(3)} mm</span>
                </div>
                <input
                  type="range"
                  min="30.000"
                  max="30.021"
                  step="0.001"
                  value={datumBValue}
                  onChange={(e) => setDatumBValue(parseFloat(e.target.value))}
                  className="w-full accent-[#0047AB] h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded cursor-pointer"
                />
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neutral-500">USL for Tag #02:</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{effectiveUsl.toFixed(3)} mm</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neutral-500">Verdict (0.058 mm):</span>
                  <span className={`font-bold px-1.5 py-0.2 rounded ${isMmcPassed ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600'}`}>
                    {isMmcPassed ? 'PASS VIA MMC' : 'FALSE SCRAP'}
                  </span>
                </div>
              </div>
            }
          />

          {/* Card 4: Delta-Revision Lock Engine */}
          <BentoGridItem
            title="Delta-Revision Lock Engine (ECO Diff)"
            description="When engineering releases an ECO, legacy tools renumber balloons and break CMM routines. SpecBalloon locks Tag IDs #01..#14 while flagging delta modifications."
            icon={<GitCompare className="w-4 h-4 text-[#0047AB]" />}
            header={
              <div className="w-full h-36 rounded-lg bg-[#0047AB]/10 dark:bg-[#0047AB]/15 border border-[#0047AB]/20 p-3 font-mono text-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500">ECO VERSION LOCK</span>
                  <div className="inline-flex p-0.5 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-[9px]">
                    <button
                      onClick={() => setRevBentoState('RevB')}
                      className={`px-1.5 py-0.5 rounded ${revBentoState === 'RevB' ? 'bg-[#0047AB] text-white font-bold' : 'text-neutral-500'}`}
                    >
                      Rev B
                    </button>
                    <button
                      onClick={() => setRevBentoState('RevC')}
                      className={`px-1.5 py-0.5 rounded ${revBentoState === 'RevC' ? 'bg-[#0047AB] text-white font-bold' : 'text-neutral-500'}`}
                    >
                      Rev C
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tag #01 (Datum B):</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      {revBentoState === 'RevC' ? 'Ø30.00 H7 (Tightened)' : 'Ø30.00 ±0.05'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tag #15 (ECO Add):</span>
                    <span className="font-bold text-[#0047AB] dark:text-[#38BDF8]">
                      {revBentoState === 'RevC' ? 'ADDED (APPENDED)' : 'DOES NOT EXIST'}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-neutral-400">ZEISS Calypso programs never require re-teaching</div>
              </div>
            }
          />
        </BentoGrid>
      </section>

      {/* =========================================================================
          SECTION 5: HOW IT WORKS TIMELINE (ACETERNITY TIMELINE)
          ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 select-none">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-8">
            <div className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] tracking-widest uppercase font-semibold mb-2">
              02 // HOW IT WORKS
            </div>
            <h2 className="font-display font-medium text-3xl sm:text-4xl text-neutral-950 dark:text-white tracking-tight">
              From Raw CAD Blueprint to Audit-Ready AS9102 Package
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              Four surgical stages designed for quality engineers and machine shop metrologists.
            </p>
          </div>

          <Timeline data={timelineData} />
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: DEPLOYMENT TIERS (ACETERNITY CARD HOVER EFFECT)
          ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 select-none">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-8">
            <div className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] tracking-widest uppercase font-semibold mb-2">
              03 // TRANSPARENT TIERS
            </div>
            <h2 className="font-display font-medium text-3xl sm:text-4xl text-neutral-950 dark:text-white tracking-tight">
              Predictable Plans for Modern Quality Labs
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              Replace legacy per-seat dongle licenses with modern, transparent metrology software.
            </p>
          </div>

          <HoverEffect items={tiersData} />
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: FINAL CALL-TO-ACTION (GRID BACKGROUND + TEXT GENERATE EFFECT)
          ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-neutral-200 dark:border-neutral-800 bg-transparent text-center select-none relative overflow-hidden">
        <GridBackground className="w-full">
          {/* Subtle Watermark */}
          <div className="absolute left-1/2 -bottom-24 -translate-x-1/2 opacity-[0.03] pointer-events-none text-neutral-900 dark:text-white">
            <SpecBalloonLogo size={520} dotPulse={false} />
          </div>

          <div className="max-w-2xl mx-auto relative z-10 space-y-4">
            <TextGenerateEffect
              words="Start Inspecting in Seconds."
              className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl tracking-tight text-neutral-950 dark:text-white"
            />
            <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Zero installation required. Drop your aerospace or automotive CAD PDF directly into our air-gapped local browser engine.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('studio')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0047AB] hover:bg-[#003887] text-white text-xs font-mono font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <span>Launch SpecBalloon Studio IDE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('security')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs font-mono font-medium transition-colors cursor-pointer text-neutral-800 dark:text-neutral-200"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Read ITAR & Security Specs</span>
              </button>
            </div>

            {/* Skiper UI Mandatory Attribution */}
            <div className="pt-8 text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
              Number animation adapted from{' '}
              <a
                href="https://skiper-ui.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0047AB] underline decoration-dotted transition-colors"
              >
                Skiper UI
              </a>
            </div>
          </div>
        </GridBackground>
      </section>
    </div>
  );
};
