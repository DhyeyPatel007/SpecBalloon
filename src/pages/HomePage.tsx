import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'motion/react';
import {
  ArrowRight,
  Play,
  Upload,
  ShieldCheck,
  GitCompare,
} from 'lucide-react';
import { AppPage } from '@/components/navigation/GlobalNavbar';
import {
  OrthographicBlueprintSvg,
  BLUEPRINT_CALLOUTS,
} from '@/components/home/OrthographicBlueprintSvg';
import { AnimatedStat } from '@/components/ui';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { HeroHeadline } from '@/components/home/HeroHeadline';
import { SectionReveal } from '@/components/ui/section-reveal';
import { HorizontalFeatures } from '@/components/home/HorizontalFeatures';
import { PinnedHowItWorks } from '@/components/home/PinnedHowItWorks';
import { DoubleMarquee } from '@/components/home/DoubleMarquee';
import { StickyPricingDeck } from '@/components/home/StickyPricingDeck';

interface HomePageProps {
  onNavigate: (page: AppPage, sampleId?: string) => void;
  onStartTour: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onStartTour }) => {
  // Hero Scroll Parallax & Scrubbing
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroSectionRef,
    offset: ['start start', 'end start'],
  });

  const headlineOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0.05]);
  const headlineY = useTransform(scrollYProgress, [0, 0.55], [0, -35]);
  const mockupScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const mockupOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 0.95, 0.45]);

  // Product Theatre States (scrubbed to scroll position)
  const [theatreMode, setTheatreMode] = useState<'scan' | 'xray' | 'diff'>('scan');
  const [activeCalloutId, setActiveCalloutId] = useState<string>('tag-01');
  const [scanBeamPct, setScanBeamPct] = useState<number>(24);
  const [scrubbedDimensionsCount, setScrubbedDimensionsCount] = useState<number>(3);
  const [isHoveringLoupe, setIsHoveringLoupe] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState({ x: 260, y: 240 });

  // Scrub callout tags and extracted dimensions directly to scroll position
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    // Scrub scan beam position
    const beam = Math.min(92, Math.max(12, 14 + latest * 95));
    setScanBeamPct(beam);

    // Scrub active callout and extracted dimensions count
    if (latest < 0.18) {
      setActiveCalloutId('tag-01');
      setScrubbedDimensionsCount(3);
    } else if (latest < 0.38) {
      setActiveCalloutId('tag-02');
      setScrubbedDimensionsCount(7);
    } else if (latest < 0.58) {
      setActiveCalloutId('tag-03');
      setScrubbedDimensionsCount(11);
    } else if (latest < 0.78) {
      setActiveCalloutId('tag-04');
      setScrubbedDimensionsCount(14);
    } else {
      setActiveCalloutId('tag-05');
      setScrubbedDimensionsCount(17);
    }
  });

  const activeCallout =
    BLUEPRINT_CALLOUTS.find((c) => c.id === activeCalloutId) || BLUEPRINT_CALLOUTS[0];

  return (
    <div className="w-full max-w-full overflow-x-clip bg-[var(--bg-page,#FAFAFA)] text-[var(--text-primary,#09090B)] font-sans selection:bg-[#0047AB] selection:text-white">
      {/* =========================================================================
          SECTION 1: HERO WITH SCROLL PARALLAX, FADE & SCRUBBED STUDIO MOCKUP
          ========================================================================= */}
      <section
        ref={heroSectionRef}
        className="relative pt-20 pb-20 px-4 sm:px-6 lg:px-8 border-b border-neutral-200 dark:border-neutral-800 overflow-hidden"
      >
        {/* Soft Full-Bleed Blueprint Grid with gentle radial fade */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
          style={{
            backgroundSize: '36px 36px',
            backgroundImage:
              'linear-gradient(to right, rgba(0,71,171,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,71,171,0.14) 1px, transparent 1px)',
            maskImage: 'radial-gradient(ellipse at 50% 30%, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 40%, transparent 80%)',
          }}
        />

        {/* Parallax Fading Headline Stack */}
        <motion.div
          style={{ opacity: headlineOpacity, y: headlineY }}
          className="max-w-4xl mx-auto text-center relative z-10 mb-12"
        >
          {/* Engineering Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 font-mono text-xs mb-6 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#0047AB] animate-pulse" />
            <span className="font-semibold text-neutral-900 dark:text-white">
              AS9102 REV C &bull; AIAG PPAP
            </span>
            <span className="text-neutral-400">|</span>
            <span>DETERMINISTIC METROLOGY ENGINE</span>
          </div>

          {/* Immediate Crisp Word-by-Word Rise (No Glitch, Fluid Clamp Type, No Word Breaking) */}
          <HeroHeadline words="Precision First Article Inspection. Built for the speed of thought." />

          {/* Subheadline: Domain Copy */}
          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
            Drop any 2D aerospace or automotive CAD drawing. SpecBalloon extracts every dimension, resolves ISO 286 limits and ASME Y14.5 MMC bonuses deterministically, and exports audit-ready AS9102 Form 1, 2, and 3 workbooks.
          </p>

          {/* Action Buttons: Magnetic Primary CTA */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MagneticButton
              strength={0.3}
              onClick={() => onNavigate('studio')}
              className="px-6 py-3 rounded-lg bg-[#0047AB] hover:bg-[#003887] text-white text-xs font-mono font-semibold transition-colors shadow-sm flex items-center gap-2"
            >
              <span>Launch Studio IDE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </MagneticButton>

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
        </motion.div>

        {/* Scroll-Scrubbed Studio Mockup Stage (Fades, rises & scales 1 -> ~0.94) */}
        <motion.div
          style={{
            scale: mockupScale,
            y: mockupY,
            opacity: mockupOpacity,
          }}
          className="max-w-6xl mx-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl overflow-hidden relative z-10 select-none"
        >
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
                <span className="font-bold text-neutral-900 dark:text-white">
                  AS-4092-C_Hydraulic_Actuator_RevC.pdf
                </span>
                <span className="hidden md:inline text-neutral-500">— SpecBalloon IDE</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Scroll-Scrubbed Counter Indicator */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 text-[10.5px] font-mono text-neutral-700 dark:text-neutral-300">
                <span className="text-[#0047AB] dark:text-[#38BDF8] font-bold">
                  {scrubbedDimensionsCount} / 17
                </span>
                <span className="text-neutral-500">Dimensions Found</span>
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
                    y: Math.max(60, Math.min(rect.height - 120, e.clientY - rect.top)),
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
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute pointer-events-none z-30 w-36 h-36 rounded-full border-2 border-[#0047AB] bg-white dark:bg-neutral-950 shadow-2xl overflow-hidden flex flex-col items-center justify-center p-3 text-center"
                >
                  <div className="text-[10px] font-mono text-[#0047AB] dark:text-[#38BDF8] font-bold">
                    2× OPTICAL LOUPE
                  </div>
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
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Cpk = 1.74 (PASS)
                    </span>
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
                    <span className="col-span-4 truncate text-neutral-900 dark:text-neutral-100">
                      {item.callout}
                    </span>
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
        </motion.div>
      </section>

      {/* =========================================================================
          SECTION 2: VERIFIABLE STATS BAR WITH SPRING NUMBER-FLOW
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
          SECTION 3: HORIZONTAL SCROLL FEATURES (PINNED TRACK ON DESKTOP, VERTICAL ON MOBILE)
          ========================================================================= */}
      <HorizontalFeatures />

      {/* =========================================================================
          SECTION 4: PINNED SCROLLYTELLING HOW-IT-WORKS (SWAPPING HIGHLIGHTS & TIMELINE SPINE)
          ========================================================================= */}
      <PinnedHowItWorks onOpenStudio={() => onNavigate('studio')} />

      {/* =========================================================================
          SECTION 5: DOUBLE-ROW MARQUEE (ACTIVE DEPLOYMENTS + METROLOGY TESTIMONIALS)
          ========================================================================= */}
      <DoubleMarquee />

      {/* =========================================================================
          SECTION 6: STICKY STACKING PRICING CARDS
          ========================================================================= */}
      <StickyPricingDeck onSelectPlan={(action) => onNavigate(action as AppPage)} />

      {/* =========================================================================
          SECTION 7: FINAL CALL-TO-ACTION (CLEAN FLAT BACKGROUND, NO RECTANGLE, NO V2.5)
          ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-center select-none relative overflow-hidden">
        <SectionReveal className="max-w-2xl mx-auto space-y-5">
          <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl tracking-tight text-neutral-950 dark:text-white">
            Start Inspecting in Seconds.
          </h2>
          <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl mx-auto">
            Zero installation required. Drop your aerospace or automotive CAD PDF directly into our air-gapped local browser engine.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <MagneticButton
              strength={0.3}
              onClick={() => onNavigate('studio')}
              className="px-6 py-3 rounded-lg bg-[#0047AB] hover:bg-[#003887] text-white text-xs font-mono font-semibold transition-colors shadow-sm flex items-center gap-2"
            >
              <span>Launch SpecBalloon Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </MagneticButton>

            <button
              onClick={() => onNavigate('security')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs font-mono font-medium transition-colors cursor-pointer text-neutral-800 dark:text-neutral-200"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Read ITAR & Security Specs</span>
            </button>
          </div>
        </SectionReveal>
      </section>
    </div>
  );
};
