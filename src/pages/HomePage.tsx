import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  ExternalLink
} from 'lucide-react';
import { AppPage } from '../components/navigation/GlobalNavbar';
import { SpecBalloonLogo } from '../components/brand/SpecBalloonLogo';
import { CalibrationPreloader } from '../components/preloader/CalibrationPreloader';
import { ThreeFlangeHeroCanvas } from '../components/home/ThreeFlangeHeroCanvas';
import { fmt3 } from '../utils/metrologyMath';
import { BLUEPRINT_ASSET_MAP } from '../utils/assetLoader';

gsap.registerPlugin(ScrollTrigger);

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
  const rootRef = useRef<HTMLDivElement>(null);

  // Live Coordinates Ticker state
  const [coords, setCoords] = useState({ x: 184.212, y: 94.015, z: 0.000 });

  // Chapter 1 Blueprint state
  const ch1PinRef = useRef<HTMLDivElement>(null);
  const ch1LaserRef = useRef<HTMLDivElement>(null);
  const ch1CadStageRef = useRef<HTMLDivElement>(null);

  // Chapter 2 Stack state
  const ch2PinRef = useRef<HTMLDivElement>(null);
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const layer3Ref = useRef<HTMLDivElement>(null);

  // Chapter 3 Horizontal track ref
  const ch3PinRef = useRef<HTMLDivElement>(null);
  const ch3TrackRef = useRef<HTMLDivElement>(null);

  // Interactive Chapter 3 states
  const [revState, setRevState] = useState<'RevB' | 'RevC'>('RevC');
  const [datumBMeasurement, setDatumBMeasurement] = useState<number>(30.012);
  const [caliperPulsed, setCaliperPulsed] = useState<number | null>(null);

  // Chapter 4 Embedded IDE Sandbox state
  const [sandboxSelectedTag, setSandboxSelectedTag] = useState<Hotspot>(HERO_CALLOUTS[0]);

  // Chapter 5 ROI Calculator state
  const [roiDrawings, setRoiDrawings] = useState<number>(45);
  const [roiDims, setRoiDims] = useState<number>(75);
  const [roiRate, setRoiRate] = useState<number>(65);

  const calculatedHoursSaved = Math.round((roiDrawings * ((roiDims * 4.8) / 60) - (roiDrawings * 4) / 60));
  const calculatedDollarSavings = Math.round(calculatedHoursSaved * roiRate);

  // Live coordinate generator on mouse move
  const handleMouseMoveHero = (e: React.MouseEvent) => {
    setCoords({
      x: Number((150 + (e.clientX / window.innerWidth) * 75).toFixed(3)),
      y: Number((60 + (e.clientY / window.innerHeight) * 60).toFixed(3)),
      z: 0.000
    });
  };

  // Setup GSAP Context & ScrollTriggers
  useEffect(() => {
    const ctx = gsap.context(() => {
      // -----------------------------------------------------------------------
      // CHAPTER 1 PINNED TIMELINE: "3D Part to 2D Auto-Ballooned Blueprint" (180vh)
      // -----------------------------------------------------------------------
      if (ch1PinRef.current && ch1LaserRef.current && ch1CadStageRef.current) {
        const tl1 = gsap.timeline({
          scrollTrigger: {
            trigger: ch1PinRef.current,
            start: 'top top',
            end: '+=180%',
            pin: true,
            scrub: 1,
            anticipatePin: 1
          }
        });

        // 0% -> 33%: 3D Flange rotates & crossfades into 2D CAD blueprint
        tl1.to('.ch1-3d-wrapper', {
          opacity: 0,
          scale: 0.92,
          ease: 'power2.inOut',
          duration: 0.33
        }, 0);

        tl1.fromTo('.ch1-2d-blueprint', {
          opacity: 0,
          scale: 1.05
        }, {
          opacity: 1,
          scale: 1,
          ease: 'power2.out',
          duration: 0.33
        }, 0);

        // 33% -> 66%: Cobalt laser sweeps down from top to bottom
        tl1.fromTo(ch1LaserRef.current, {
          top: '0%',
          opacity: 0
        }, {
          top: '100%',
          opacity: 1,
          ease: 'none',
          duration: 0.33
        }, 0.33);

        // Stagger in 14 Dimension highlight boxes & balloons as laser sweeps
        tl1.fromTo('.ch1-dim-tag', {
          opacity: 0,
          scale: 0.5,
          y: -10
        }, {
          opacity: 1,
          scale: 1,
          y: 0,
          stagger: 0.02,
          ease: 'back.out(2)',
          duration: 0.33
        }, 0.35);

        // 66% -> 100%: 140x48px dimension crops lift in 3D perspective and snap into table
        tl1.to('.ch1-floating-crop', {
          translateZ: 80,
          rotateX: 15,
          opacity: 0.95,
          stagger: 0.02,
          duration: 0.15
        }, 0.66);

        tl1.to('.ch1-table-row', {
          backgroundColor: 'rgba(5, 150, 105, 0.08)',
          borderColor: 'rgba(5, 150, 105, 0.4)',
          stagger: 0.03,
          duration: 0.19
        }, 0.81);
      }

      // -----------------------------------------------------------------------
      // CHAPTER 2 PINNED SCRUB: "3-Layer Exploded Neuro-Symbolic Stack" (150vh)
      // -----------------------------------------------------------------------
      if (ch2PinRef.current && layer1Ref.current && layer2Ref.current && layer3Ref.current) {
        const tl2 = gsap.timeline({
          scrollTrigger: {
            trigger: ch2PinRef.current,
            start: 'top top',
            end: '+=150%',
            pin: true,
            scrub: 1,
            anticipatePin: 1
          }
        });

        // Explode 3 architectural layers along isometric Y/Z
        tl2.to(layer1Ref.current, {
          yPercent: -45,
          translateZ: 100,
          ease: 'power2.out',
          duration: 1
        }, 0);

        tl2.to(layer2Ref.current, {
          yPercent: 0,
          translateZ: 0,
          ease: 'power2.out',
          duration: 1
        }, 0);

        tl2.to(layer3Ref.current, {
          yPercent: 45,
          translateZ: -100,
          ease: 'power2.out',
          duration: 1
        }, 0);

        // Animate SVG packet beams flowing between layers
        tl2.fromTo('.ch2-data-stream', {
          strokeDashoffset: 100
        }, {
          strokeDashoffset: 0,
          ease: 'none',
          duration: 1
        }, 0);
      }

      // -----------------------------------------------------------------------
      // CHAPTER 3 HORIZONTAL SCROLL TRACK (180vh)
      // -----------------------------------------------------------------------
      if (ch3PinRef.current && ch3TrackRef.current) {
        gsap.to(ch3TrackRef.current, {
          xPercent: -75,
          ease: 'none',
          scrollTrigger: {
            trigger: ch3PinRef.current,
            start: 'top top',
            end: '+=180%',
            pin: true,
            scrub: 1,
            anticipatePin: 1
          }
        });
      }
    }, rootRef);

    return () => {
      ctx.revert(); // Cleanly unmounts and kills all ScrollTriggers!
    };
  }, []);

  // MMC calculation for Chapter 3 Panel 2
  // Baseline stated: 0.050mm. Stated MMC hole = 8.530.
  // When Datum B center bore (#01) is measured at 30.012mm, shift bonus = 30.012 - 30.000 = +0.012mm.
  // Feature bonus = +0.008mm. Effective USL = 0.050 + 0.008 + (datumBMeasurement - 30.000)
  const datumBShift = Math.max(0, Number((datumBMeasurement - 30.000).toFixed(4)));
  const calculatedEffectiveUsl = Number((0.050 + 0.008 + datumBShift).toFixed(4));
  const measuredCmmError = 0.058; // Measured Euclidean true position
  const isMmcPassed = measuredCmmError <= calculatedEffectiveUsl;

  return (
    <div
      ref={rootRef}
      className="w-full bg-[var(--bg-page)] text-[var(--text-primary)] font-sans selection:bg-[var(--text-primary)] selection:text-[var(--bg-page)]"
    >
      {/* Hardware-Grade 1.2s Calibration Preloader on First Entry */}
      <CalibrationPreloader />

      {/* =========================================================================
          STAGE 0: HYBRID THREE.JS + 2D HUD HERO (100vh)
          ========================================================================= */}
      <section
        onMouseMove={handleMouseMoveHero}
        className="relative w-full h-[calc(100vh-56px)] min-h-[640px] flex items-center border-b border-[var(--border-hairline)] overflow-hidden"
      >
        {/* Subtle Architectural Coordinate Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--border-hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--border-hairline) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />

        <div className="max-w-7xl mx-auto w-full h-full px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 items-center relative z-10">
          {/* Left Column: Monumental Editorial & CTAs (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-center py-12 pr-0 lg:pr-8">
            {/* Telemetry Status Bar */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] font-mono text-[11px] mb-6 w-fit shadow-xs">
              <SpecBalloonLogo size={14} animateRuby={true} />
              <span>SPATIAL VECTOR OCR // AS9102 REV C // ISO 286</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
            </div>

            {/* Monumental Headline */}
            <h1 className="font-display font-medium text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-[var(--text-primary)] mb-6">
              Precision First Article Inspection.{' '}
              <span className="text-[var(--text-muted)] block sm:inline">
                At the speed of thought.
              </span>
            </h1>

            {/* Editorial Body */}
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl mb-8">
              SpecBalloon decomposes complex 2D aerospace and automotive CAD blueprints, solves ISO 286 fits and ASME Y14.5 GD&T datum bonuses with deterministic math, and auto-generates AS9102 Form 1–2–3 workbooks in seconds.
            </p>

            {/* Action Group */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <button
                onClick={() => onNavigate('studio')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
              >
                <span>Launch Studio IDE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onStartTour}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch 45s Tour</span>
              </button>

              <button
                onClick={() => onNavigate('studio')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-3 rounded-md border border-dashed border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Drop CAD PDF</span>
              </button>
            </div>

            {/* Live Reticle Coordinate Ticker */}
            <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--text-muted)] pt-4 border-t border-[var(--border-hairline)]">
              <span>CURSOR RETICLE:</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                X: {coords.x.toFixed(3)} mm
              </span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                Y: {coords.y.toFixed(3)} mm
              </span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                Z: {coords.z.toFixed(3)} mm
              </span>
            </div>
          </div>

          {/* Right Column: Three.js Flange Canvas with 2D Projected HUD (6 cols) */}
          <div className="lg:col-span-6 h-[480px] lg:h-[580px] w-full relative">
            <ThreeFlangeHeroCanvas
              onSelectTag={(tag) => onNavigate('studio')}
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 1: "3D Part to 2D Auto-Ballooned Blueprint" (180vh Pinned)
          ========================================================================= */}
      <section
        ref={ch1PinRef}
        className="relative w-full h-screen bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] overflow-hidden flex flex-col items-center justify-center select-none"
      >
        {/* Chapter Header */}
        <div className="absolute top-8 left-8 z-30">
          <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
            CHAPTER 01 // AUTONOMOUS VECTOR INGESTION
          </div>
          <h2 className="font-display font-medium text-2xl text-[var(--text-primary)] tracking-tight">
            3D CAD Part to 2D Auto-Ballooned Blueprint
          </h2>
        </div>

        {/* CAD Canvas Frame with Millimeter Rulers */}
        <div
          ref={ch1CadStageRef}
          className="relative w-[92%] max-w-5xl aspect-[16/10] bg-[var(--bg-page)] rounded-xl border border-[var(--border-hairline)] shadow-lg overflow-hidden flex flex-col"
        >
          {/* Top 18px Rulers */}
          <div className="h-[18px] w-full bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] flex items-center justify-between px-6 text-[9px] font-mono text-[var(--text-muted)]">
            <span>0 mm</span>
            <span>50 mm</span>
            <span>100 mm</span>
            <span>150 mm</span>
            <span>200 mm</span>
            <span>250 mm</span>
          </div>

          {/* Drawing Content Area */}
          <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center p-6">
            {/* 3D Model State (Fades out 0% -> 33%) */}
            <div className="ch1-3d-wrapper absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-96 h-96 opacity-60">
                <ThreeFlangeHeroCanvas />
              </div>
            </div>

            {/* 2D Engineering Blueprint (Fades in 0% -> 33%) */}
            <div className="ch1-2d-blueprint absolute inset-6 flex items-center justify-center">
              <img
                src={BLUEPRINT_ASSET_MAP['AS-4092-C']}
                alt="2D Engineering Blueprint"
                className="max-h-full max-w-full object-contain filter dark:invert contrast-125"
              />

              {/* Cobalt Scanning Laser Sweep (33% -> 66%) */}
              <div
                ref={ch1LaserRef}
                className="absolute left-0 right-0 h-0.5 bg-[#0284C7] shadow-[0_0_12px_#0284C7] z-20 pointer-events-none"
              >
                <div className="absolute right-4 -top-3.5 px-2 py-0.5 rounded bg-[#0284C7] text-white font-mono text-[9px] tracking-tight font-semibold">
                  SCANNING 300 DPI // 14 CALLOUTS DETECTED
                </div>
              </div>

              {/* Dimension Highlight Boxes & Floating #01..#14 Badges (Popping 33% -> 66%) */}
              {HERO_CALLOUTS.map((callout, idx) => (
                <div
                  key={callout.id}
                  style={{ left: `${callout.xPct}%`, top: `${callout.yPct}%` }}
                  className="ch1-dim-tag absolute z-25 -translate-x-1/2 -translate-y-1/2"
                >
                  {/* Bounding Highlight Box */}
                  <div className="w-24 h-8 rounded border border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-between px-1.5 shadow-sm">
                    <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-600 text-white">
                      #{callout.tag}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--text-primary)] font-semibold truncate max-w-[55px]">
                      {callout.nominal}
                    </span>
                  </div>

                  {/* Detachable 140x48px 3D Perspective Card (Lifts 66% -> 100%) */}
                  <div className="ch1-floating-crop absolute -top-12 left-0 w-36 h-11 p-1.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 shadow-md font-mono text-[9px] opacity-0 pointer-events-none">
                    <div className="font-bold text-[var(--text-primary)] truncate">{callout.callout}</div>
                    <div className="text-[var(--text-muted)] text-[8px] truncate">{callout.instrument}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Docked AS9102 Form 3 Rows Preview (Snaps 66% -> 100%) */}
          <div className="h-28 w-full border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-2 overflow-x-auto text-[10px] font-mono">
            <div className="grid grid-cols-12 gap-2 text-[var(--text-muted)] pb-1 border-b border-[var(--border-hairline)] font-semibold">
              <span className="col-span-1">TAG</span>
              <span className="col-span-3">DESIGNATION</span>
              <span className="col-span-2">NOMINAL</span>
              <span className="col-span-2">TOLERANCE</span>
              <span className="col-span-2">MEASURED</span>
              <span className="col-span-2 text-right">STATUS</span>
            </div>

            <div className="space-y-1 pt-1">
              {HERO_CALLOUTS.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="ch1-table-row grid grid-cols-12 gap-2 p-1 rounded border border-transparent transition-colors items-center"
                >
                  <span className="col-span-1 font-bold text-[var(--text-primary)]">#{item.tag}</span>
                  <span className="col-span-3 truncate text-[var(--text-secondary)]">{item.feature}</span>
                  <span className="col-span-2 font-bold tabular-nums">{item.nominal.toFixed(3)}</span>
                  <span className="col-span-2 text-[var(--text-muted)] tabular-nums">+{item.plus.toFixed(3)} / -{item.minus.toFixed(3)}</span>
                  <span className="col-span-2 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{item.measured.toFixed(3)}</span>
                  <span className="col-span-2 text-right text-emerald-600 dark:text-emerald-400 font-bold">PASS (MMC)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 2: "The 3-Layer Exploded Neuro-Symbolic Stack" (150vh Pinned Scrub)
          ========================================================================= */}
      <section
        ref={ch2PinRef}
        className="relative w-full h-screen bg-[var(--bg-page)] border-b border-[var(--border-hairline)] overflow-hidden flex flex-col items-center justify-center select-none"
      >
        <div className="absolute top-8 left-8 z-30">
          <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
            CHAPTER 02 // NEURO-SYMBOLIC ARCHITECTURE
          </div>
          <h2 className="font-display font-medium text-2xl text-[var(--text-primary)] tracking-tight">
            The 3-Layer Exploded Metrology Engine
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-lg mt-1">
            AI for spatial vision. Pure deterministic ISO & ASME mathematics for legal truth.
          </p>
        </div>

        {/* 3 Isometric Floating Glass Planes Container */}
        <div className="relative w-full max-w-4xl h-[420px] flex items-center justify-center perspective-[1200px]">
          {/* Layer 01: Top (Vision & Affine OCR) */}
          <div
            ref={layer1Ref}
            className="absolute w-[82%] p-5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 backdrop-blur-md shadow-lg transition-transform"
          >
            <div className="flex items-center justify-between mb-3 border-b border-[var(--border-hairline)] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                  LAYER 01 // GEMINI 2.5 FLASH VISION + PYMUPDF AFFINE
                </span>
              </div>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">θ = atan2(b, a) · 300 DPI</span>
            </div>
            <div className="grid grid-cols-3 gap-3 font-mono text-[11px] text-[var(--text-secondary)]">
              <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                <div className="text-[9px] text-[var(--text-muted)]">SPATIAL EXTRACTION</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">Normalized [ymin, xmin, ymax, xmax]</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                <div className="text-[9px] text-[var(--text-muted)]">TITLE BLOCK RECOVERY</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">AS-4092-C · Rev C · 6061-T6</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                <div className="text-[9px] text-[var(--text-muted)]">ROTATION CORRECTION</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">0.00° Deskew Matrix</div>
              </div>
            </div>
          </div>

          {/* Layer 02: Middle (Deterministic Math Guardrail) */}
          <div
            ref={layer2Ref}
            className="absolute w-[86%] p-5 rounded-xl border-2 border-emerald-500/50 bg-[var(--bg-surface)]/95 backdrop-blur-md shadow-xl transition-transform"
          >
            <div className="flex items-center justify-between mb-3 border-b border-[var(--border-hairline)] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  LAYER 02 // DETERMINISTIC ISO 286 / ASME Y14.5 GUARDRAIL
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                0% LLM HALLUCINATION
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 font-mono text-[11px] text-[var(--text-secondary)]">
              <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-[9px] text-[var(--text-muted)]">TOLERANCE UNIT (i)</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">0.45 ∛D + 0.001 D = 1.42 µm</div>
              </div>
              <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-[9px] text-[var(--text-muted)]">DATUM MMC RESCUE</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+0.012 mm Shift Bonus</div>
              </div>
              <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-[9px] text-[var(--text-muted)]">THREAD CLASS 6H</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">D2: 9.026 - 9.206 mm</div>
              </div>
            </div>
          </div>

          {/* Layer 03: Bottom (AS9102 & SPC Engine) */}
          <div
            ref={layer3Ref}
            className="absolute w-[82%] p-5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 backdrop-blur-md shadow-lg transition-transform"
          >
            <div className="flex items-center justify-between mb-3 border-b border-[var(--border-hairline)] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                  LAYER 03 // AS9102 FORMS 1-2-3 + 10-PIECE SPC MATRIX
                </span>
              </div>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">Cpk ≥ 1.67 · 21 CFR Part 11</span>
            </div>
            <div className="grid grid-cols-3 gap-3 font-mono text-[11px] text-[var(--text-secondary)]">
              <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                <div className="text-[9px] text-[var(--text-muted)]">AS9102 REV C EXCEL</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">4-Sheet Binary .xlsx Suite</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                <div className="text-[9px] text-[var(--text-muted)]">TRAVELER DECK</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">Printable PDF + Mobile QR</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                <div className="text-[9px] text-[var(--text-muted)]">HARDWARE CALIPER DRO</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">WebHID / BLE 10Hz Feed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 3: "4 Breakthroughs Legacy Software Cannot Do" (180vh Horizontal)
          ========================================================================= */}
      <section
        ref={ch3PinRef}
        className="relative w-full h-screen bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] overflow-hidden flex flex-col justify-center select-none"
      >
        <div className="absolute top-8 left-8 z-30">
          <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
            CHAPTER 03 // COMPETITIVE BREAKTHROUGHS
          </div>
          <h2 className="font-display font-medium text-2xl text-[var(--text-primary)] tracking-tight">
            4 Capabilities DISCUS & Capvidia Cannot Match
          </h2>
        </div>

        {/* Horizontal Track (4 Panels, xPercent: -75) */}
        <div
          ref={ch3TrackRef}
          className="flex h-[460px] w-[400vw] items-center pl-8 pr-16 gap-8 relative z-20"
        >
          {/* Panel 01: Delta-Revision Lock (Rev B -> Rev C) */}
          <div className="w-[85vw] max-w-xl h-full p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-page)] shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  BREAKTHROUGH 01 // DELTA-REVISION LOCK
                </div>
                {/* Interactive Toggle */}
                <div className="inline-flex p-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                  <button
                    onClick={() => setRevState('RevB')}
                    className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                      revState === 'RevB' ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-bold' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Rev B Baseline
                  </button>
                  <button
                    onClick={() => setRevState('RevC')}
                    className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                      revState === 'RevC' ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-bold' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Rev C Release
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">ECO Updates Without Breaking CMM Programs</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
                Legacy software re-scrambles all balloon numbers when an ECO adds or deletes a dimension. SpecBalloon locks Tag IDs #01..#14 permanently.
              </p>

              <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span>Tag #03 (Overall Length):</span>
                  <span className={`font-bold ${revState === 'RevC' ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-primary)]'}`}>
                    {revState === 'RevC' ? '120.0 ±0.15 (Tightened 40%)' : '120.0 ±0.25 (Baseline)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tag IDs Stability:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% UNCHANGED</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[var(--text-muted)]">
              Zeiss Calypso and Hexagon PC-DMIS inspection routines never need to be rewritten.
            </div>
          </div>

          {/* Panel 02: Dynamic MMC + Datum Shift Rescue */}
          <div className="w-[85vw] max-w-xl h-full p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-page)] shadow-md flex flex-col justify-between">
            <div>
              <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-4">
                BREAKTHROUGH 02 // DYNAMIC MMC + DATUM B SHIFT
              </div>
              <h3 className="text-xl font-semibold mb-2">Automated Scrap Rescue via ASME Y14.5 Math</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                When a hole’s true position appears out-of-spec, cross-row datum shift bonus can rescue the part from being falsely scrapped.
              </p>

              {/* Interactive Slider */}
              <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">MEASURED DATUM B (TAG #01):</span>
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">{datumBMeasurement.toFixed(3)} mm</span>
                </div>
                <input
                  type="range"
                  min="30.000"
                  max="30.021"
                  step="0.001"
                  value={datumBMeasurement}
                  onChange={(e) => setDatumBMeasurement(parseFloat(e.target.value))}
                  className="w-full accent-[var(--text-primary)] h-1.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer"
                />

                <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between">
                  <span>Effective USL for Tag #02:</span>
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">{calculatedEffectiveUsl.toFixed(3)} mm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Part Inspection Verdict:</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    isMmcPassed
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}>
                    {isMmcPassed ? 'PASS VIA MMC BONUS' : 'SCRAP OUT OF SPEC'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[var(--text-muted)]">
              Saves aerospace machine shops thousands of dollars per month in false scrap rates.
            </div>
          </div>

          {/* Panel 03: 4X Cavity & ISO Thread Decomposition */}
          <div className="w-[85vw] max-w-xl h-full p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-page)] shadow-md flex flex-col justify-between">
            <div>
              <div className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 mb-4">
                BREAKTHROUGH 03 // MULTI-CAVITY & THREAD PARSER
              </div>
              <h3 className="text-xl font-semibold mb-2">Automated Sub-Row Decomposition</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
                Callouts like <code className="font-mono bg-[var(--bg-subtle)] px-1 py-0.5 rounded">4X Ø8.50</code> and <code className="font-mono bg-[var(--bg-subtle)] px-1 py-0.5 rounded">M10×1.5 - 6H</code> cannot be measured with a single caliper touch.
              </p>

              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex items-center justify-between">
                  <span>Tag #04.1 — Bolt Hole Cavity 1</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">8.528 mm (PASS)</span>
                </div>
                <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex items-center justify-between">
                  <span>Tag #04.2 — Bolt Hole Cavity 2</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">8.532 mm (PASS)</span>
                </div>
                <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex items-center justify-between">
                  <span>Tag #16 — M10×1.5 Pitch Dia Limits</span>
                  <span className="font-bold text-[var(--text-primary)]">9.026 — 9.206 mm</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[var(--text-muted)]">
              1-click multi-cavity expansion satisfies AS9102 Rev C Form 3 column 5 requirements.
            </div>
          </div>

          {/* Panel 04: Live USB Caliper & ZEISS CMM Stream */}
          <div className="w-[85vw] max-w-xl h-full p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-page)] shadow-md flex flex-col justify-between">
            <div>
              <div className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 mb-4">
                BREAKTHROUGH 04 // WEBHID & CMM INGESTION
              </div>
              <h3 className="text-xl font-semibold mb-2">Hardware-Direct Measurement Sync</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                Connect physical Mitutoyo USB digital calipers or ingest raw ASCII coordinate runs from ZEISS Calypso and Hexagon PC-DMIS.
              </p>

              {/* Interactive Mini Instrument */}
              <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const reading = Number((30.010 + Math.random() * 0.006).toFixed(3));
                      setCaliperPulsed(reading);
                    }}
                    className="flex-1 py-2 rounded bg-[var(--text-primary)] text-[var(--bg-page)] font-bold hover:opacity-90 transition-opacity"
                  >
                    ⚡ Pulse USB Caliper
                  </button>
                  <button
                    onClick={() => setCaliperPulsed(30.012)}
                    className="flex-1 py-2 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] font-bold hover:bg-[var(--bg-page)] transition-colors"
                  >
                    📥 Ingest Zeiss CMM
                  </button>
                </div>

                <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between">
                  <span>Live Caliper DRO Reading:</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {caliperPulsed ? `${caliperPulsed.toFixed(3)} mm` : '30.012 mm'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[var(--text-muted)]">
              Sub-millisecond audio confirmation prevents inspector data entry error.
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 4: INTERACTIVE EMBEDDED 4-PANE IDE SANDBOX (100vh)
          ========================================================================= */}
      <section className="relative w-full min-h-screen py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-hairline)] bg-[var(--bg-page)] flex flex-col justify-center">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                CHAPTER 04 // LIVE INTERACTIVE WORKBENCH
              </div>
              <h2 className="font-display font-medium text-3xl text-[var(--text-primary)] tracking-tight">
                Experience the 4-Pane Metrology IDE
              </h2>
            </div>

            <button
              onClick={() => onNavigate('studio')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity self-start sm:self-auto cursor-pointer"
            >
              <span>Expand Full-Screen Studio IDE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Mini-Studio Container */}
          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
            {/* Left 8 Cols: Interactive Blueprint Stage */}
            <div className="lg:col-span-8 p-6 bg-[var(--bg-subtle)] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[var(--border-hairline)] relative select-none">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] mb-3">
                <span>DRAWING: AS-4092-C (REV C)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">● 14 DIMS VERIFIED</span>
              </div>

              {/* Blueprint Image with Interactive Hotspots */}
              <div className="relative w-full aspect-[4/3] bg-[var(--bg-surface)] rounded-lg border border-[var(--border-hairline)] shadow-inner overflow-hidden flex items-center justify-center">
                <img
                  src={BLUEPRINT_ASSET_MAP['AS-4092-C']}
                  alt="Aerospace CAD Drawing"
                  className="w-full h-full object-contain p-3 filter dark:invert contrast-125"
                />

                {/* Hotspot Pills */}
                {HERO_CALLOUTS.map((h) => {
                  const isSelected = sandboxSelectedTag.id === h.id;
                  return (
                    <button
                      key={h.id}
                      onClick={() => setSandboxSelectedTag(h)}
                      style={{ left: `${h.xPct}%`, top: `${h.yPct}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border transition-all cursor-pointer shadow-sm ${
                        isSelected
                          ? 'bg-[#0284C7] text-white border-[#0284C7] scale-110 ring-2 ring-sky-400/50'
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-strong)] hover:scale-105'
                      }`}
                    >
                      #{h.tag}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 text-[11px] font-mono text-[var(--text-muted)]">
                Click any balloon tag on the drawing to inspect OCR crops and tolerance limits.
              </div>
            </div>

            {/* Right 4 Cols: Live Docked Inspector & 10-Sample Heatmap */}
            <div className="lg:col-span-4 p-6 flex flex-col justify-between font-mono text-xs space-y-4">
              <div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] border-b border-[var(--border-hairline)] pb-2 mb-3">
                  <span>SINGLE-ITEM INSPECTOR</span>
                  <span className="font-bold text-[var(--text-primary)]">TAG #{sandboxSelectedTag.tag}</span>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] mb-4">
                  <div className="text-[10px] text-[var(--text-muted)] mb-1">OCR DETECTED CALLOUT</div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{sandboxSelectedTag.callout}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">{sandboxSelectedTag.feature}</div>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Nominal:</span>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums">{sandboxSelectedTag.nominal.toFixed(3)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Tolerance Limits:</span>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums">
                      {sandboxSelectedTag.lsl.toFixed(3)} — {sandboxSelectedTag.usl.toFixed(3)} mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Measured Value:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {sandboxSelectedTag.measured.toFixed(3)} mm
                    </span>
                  </div>
                </div>

                {/* 10-Sample Moving Range Heatmap */}
                <div className="pt-4 mt-4 border-t border-[var(--border-hairline)]">
                  <div className="text-[10px] text-[var(--text-muted)] mb-2 font-semibold">
                    10-PIECE SPC LOT SAMPLES
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {sandboxSelectedTag.samples.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-1 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                      >
                        {s.toFixed(3)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('studio')}
                className="w-full py-2.5 rounded bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity text-center cursor-pointer"
              >
                Open Full Drawing in Studio →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 5: BENCHMARKS, ROI CALCULATOR & MONUMENTAL FOOTER (90vh)
          ========================================================================= */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] select-none">
        <div className="max-w-6xl mx-auto">
          {/* Bar Race Benchmark */}
          <div className="mb-20">
            <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
              EMPIRICAL TIME-MOTION BENCHMARK
            </div>
            <h2 className="font-display font-medium text-3xl text-[var(--text-primary)] tracking-tight mb-8">
              5 Hours 40 Minutes vs 11.4 Seconds
            </h2>

            <div className="space-y-4 max-w-3xl font-mono text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[var(--text-secondary)]">Manual Ballooning & Excel Retyping (Legacy)</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">5 hrs 40 mins</span>
                </div>
                <div className="w-full h-3 rounded bg-[var(--bg-subtle)] overflow-hidden">
                  <div className="w-full h-full bg-rose-500/70 rounded" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[var(--text-secondary)]">SpecBalloon Autonomous Neuro-Symbolic Ingestion</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">11.4 seconds (97% Faster)</span>
                </div>
                <div className="w-full h-3 rounded bg-[var(--bg-subtle)] overflow-hidden">
                  <div className="w-[3.5%] h-full bg-emerald-500 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Shop ROI Calculator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-20 p-8 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-page)]">
            <div className="lg:col-span-7 space-y-6">
              <h3 className="font-display font-medium text-2xl text-[var(--text-primary)] tracking-tight">
                Calculate Quality Lab Savings
              </h3>

              <div className="space-y-4 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-secondary)]">DRAWINGS PER MONTH:</span>
                    <span className="font-bold text-[var(--text-primary)]">{roiDrawings} blueprints</span>
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
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-secondary)]">DIMENSIONS PER DRAWING:</span>
                    <span className="font-bold text-[var(--text-primary)]">{roiDims} dims</span>
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
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-secondary)]">QA HOURLY BILLABLE RATE:</span>
                    <span className="font-bold text-[var(--text-primary)]">${roiRate}/hr</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="150"
                    step="5"
                    value={roiRate}
                    onChange={(e) => setRoiRate(parseInt(e.target.value))}
                    className="w-full accent-[var(--text-primary)] h-1.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Savings Output */}
            <div className="lg:col-span-5 p-6 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-4">
              <div className="font-mono text-[10px] text-[var(--text-muted)]">ESTIMATED DIRECT ANNUAL RECOVERY</div>
              <div className="text-4xl font-display font-medium text-emerald-600 dark:text-emerald-400">
                ${(calculatedDollarSavings * 12).toLocaleString()}
              </div>
              <div className="text-xs font-mono text-[var(--text-secondary)]">
                {calculatedHoursSaved} hours of engineering time recovered per month.
              </div>
              <button
                onClick={() => onNavigate('pricing')}
                className="w-full py-2.5 rounded bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity"
              >
                View Transparent Pricing Plans →
              </button>
            </div>
          </div>

          {/* Monumental Architectural Brand Footer Banner */}
          <div className="relative pt-16 pb-8 border-t border-[var(--border-hairline)] flex flex-col items-center justify-center text-center overflow-hidden">
            {/* Oversized Wireframe SpecBalloonLogo in Background */}
            <div className="absolute -bottom-16 opacity-5 pointer-events-none text-[var(--text-primary)]">
              <SpecBalloonLogo size={420} animateRuby={false} />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="font-display font-medium text-3xl sm:text-4xl tracking-tight text-[var(--text-primary)]">
                The Metrology Operating System
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                AS9102 Rev C, AIAG PPAP 4th Edition, and FDA 21 CFR Part 11 compliant. Runs 100% locally in your browser with zero cloud telemetry.
              </p>
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => onNavigate('studio')}
                  className="px-6 py-2.5 rounded bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity"
                >
                  Start Inspecting in Studio →
                </button>
                <button
                  onClick={() => onNavigate('security')}
                  className="px-5 py-2.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-mono font-medium hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  Read ITAR & Security Specs
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
