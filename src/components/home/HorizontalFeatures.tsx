import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Cpu, FileSpreadsheet, Sliders, GitCompare, CheckCircle2 } from 'lucide-react';
import { SectionReveal } from '../ui/section-reveal';

gsap.registerPlugin(ScrollTrigger);

export const HorizontalFeatures: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Bento 02: Dynamic MMC Datum Shift Slider state
  const [datumBValue, setDatumBValue] = useState<number>(30.012);
  const datumBShift = Math.max(0, Number((datumBValue - 30.0).toFixed(4)));
  const effectiveUsl = Number((0.05 + 0.008 + datumBShift).toFixed(4));
  const measuredTruePos = 0.058;
  const isMmcPassed = measuredTruePos <= effectiveUsl;

  // Bento 04: Rev Diff state
  const [revBentoState, setRevBentoState] = useState<'RevB' | 'RevC'>('RevC');

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px) and (pointer: fine)', () => {
      const getScrollAmount = () => {
        const trackWidth = track.scrollWidth;
        return -(trackWidth - window.innerWidth + 80);
      };

      const tween = gsap.to(track, {
        x: getScrollAmount,
        ease: 'none',
      });

      const st = ScrollTrigger.create({
        trigger: section,
        start: 'top top+=80',
        end: () => `+=${Math.abs(getScrollAmount()) + 400}`,
        pin: true,
        animation: tween,
        scrub: 1,
        invalidateOnRefresh: true,
      });

      return () => {
        st.kill();
        tween.kill();
      };
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-20 px-4 sm:px-6 lg:px-8 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden select-none"
    >
      <div className="max-w-7xl mx-auto mb-10">
        <SectionReveal className="max-w-2xl">
          <div className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] tracking-widest uppercase font-semibold mb-2">
            01 // CORE METROLOGY INSTRUMENTS
          </div>
          <h2 className="font-display font-medium text-3xl sm:text-4xl text-neutral-950 dark:text-white tracking-tight">
            Deterministic Precision for High-Reliability Manufacturing
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Eliminate hours of manual snipping, typing, and false scrap calculations with four purpose-built metrology breakthroughs.
          </p>
        </SectionReveal>
      </div>

      {/* Horizontal Scroll Track (Desktop) / Vertical Stack (Mobile) */}
      <div
        ref={trackRef}
        className="flex flex-col md:flex-row gap-6 w-full md:w-max md:pl-4 pb-6"
      >
        {/* Card 1: Vector Stroke Decomposition */}
        <div className="w-full md:w-[480px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-6 flex flex-col justify-between shadow-xs shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-lg bg-[#0047AB]/10 text-[#0047AB]">
                <Cpu className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] font-bold">
                01.1 // DECOMPOSITION
              </span>
            </div>
            <h3 className="font-display font-medium text-xl text-neutral-950 dark:text-white mb-2">
              Vector Stroke Decomposition & Auto-Ballooning
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              Extracts vector stroke streams at 300 DPI, crops 45° angled callouts, and computes rotation angle θ = atan2(b, a) to eliminate OCR skew and coordinate hallucination.
            </p>
          </div>

          <div className="w-full h-44 rounded-lg bg-[#0047AB]/10 dark:bg-[#0047AB]/15 border border-[#0047AB]/20 p-4 font-mono text-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-neutral-500">
              <span>VECTOR PARSER</span>
              <span className="text-[#0047AB] font-bold">300 DPI AFFINE</span>
            </div>
            <div>
              <div className="text-neutral-900 dark:text-neutral-100 font-bold">
                [ymin: 240, xmin: 185, ymax: 275, xmax: 320]
              </div>
              <div className="text-[10px] text-[#0047AB] dark:text-[#38BDF8] mt-1">
                ROTATION ANGLE: 0.00° (DESKEWED)
              </div>
            </div>
            <div className="text-[10px] text-neutral-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Zero coordinate hallucination · Exact PDF points</span>
            </div>
          </div>
        </div>

        {/* Card 2: AS9102 Rev C Suite */}
        <div className="w-full md:w-[480px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-6 flex flex-col justify-between shadow-xs shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-lg bg-[#0047AB]/10 text-[#0047AB]">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] font-bold">
                01.2 // COMPLIANCE
              </span>
            </div>
            <h3 className="font-display font-medium text-xl text-neutral-950 dark:text-white mb-2">
              AS9102 Rev C Forms 1, 2 & 3 Suite
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              Autonomous compilation of complete aerospace FAI packages including Form 1 (Part Record), Form 2 (Materials & Processes), and Form 3 (Characteristics).
            </p>
          </div>

          <div className="w-full h-44 rounded-lg bg-[#0047AB]/10 dark:bg-[#0047AB]/15 border border-[#0047AB]/20 p-4 font-mono text-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-neutral-500">
              <span>SAE AS9102 SUITE</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">AUDIT READY</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-600 dark:text-neutral-400">Form 1: Part Record</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">Compiled</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-600 dark:text-neutral-400">Form 2: Raw Material Certs</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">Verified</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-600 dark:text-neutral-400">Form 3: Characteristic Grid</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">100% Mapped</span>
              </div>
            </div>
            <div className="text-[10px] text-neutral-400">
              Direct import into Net-Inspect and DISCUS
            </div>
          </div>
        </div>

        {/* Card 3: Dynamic MMC & Datum Shift */}
        <div className="w-full md:w-[480px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-6 flex flex-col justify-between shadow-xs shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-lg bg-[#0047AB]/10 text-[#0047AB]">
                <Sliders className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] font-bold">
                01.3 // GD&T SOLVER
              </span>
            </div>
            <h3 className="font-display font-medium text-xl text-neutral-950 dark:text-white mb-2">
              ASME Y14.5 MMC & Datum Shift Solver
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              ASME Y14.5 allows expanding position tolerance as datum features depart from MMC. Drag the slider to compute dynamic bonus and eliminate false scrap.
            </p>
          </div>

          <div className="w-full h-44 rounded-lg bg-[#0047AB]/10 dark:bg-[#0047AB]/15 border border-[#0047AB]/20 p-3 font-mono text-xs flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-neutral-500">DATUM B BORE (#01):</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {datumBValue.toFixed(3)} mm
              </span>
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
              <span className="text-neutral-500">Dynamic USL for Tag #02:</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {effectiveUsl.toFixed(3)} mm
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-neutral-500">Verdict (0.058 mm):</span>
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  isMmcPassed
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/20 text-red-600'
                }`}
              >
                {isMmcPassed ? 'PASS VIA MMC BONUS' : 'FALSE SCRAP'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Delta-Revision Lock Engine */}
        <div className="w-full md:w-[480px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-6 flex flex-col justify-between shadow-xs shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-lg bg-[#0047AB]/10 text-[#0047AB]">
                <GitCompare className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] font-bold">
                01.4 // VERSION CONTROL
              </span>
            </div>
            <h3 className="font-display font-medium text-xl text-neutral-950 dark:text-white mb-2">
              Delta-Revision Lock Engine (ECO Diff)
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              When engineering releases an ECO, legacy tools renumber balloons and break CMM routines. SpecBalloon locks Tag IDs #01..#14 while flagging delta modifications.
            </p>
          </div>

          <div className="w-full h-44 rounded-lg bg-[#0047AB]/10 dark:bg-[#0047AB]/15 border border-[#0047AB]/20 p-3 font-mono text-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">ECO VERSION LOCK</span>
              <div className="inline-flex p-0.5 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-[9px]">
                <button
                  onClick={() => setRevBentoState('RevB')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    revBentoState === 'RevB'
                      ? 'bg-[#0047AB] text-white font-bold'
                      : 'text-neutral-500'
                  }`}
                >
                  Rev B
                </button>
                <button
                  onClick={() => setRevBentoState('RevC')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    revBentoState === 'RevC'
                      ? 'bg-[#0047AB] text-white font-bold'
                      : 'text-neutral-500'
                  }`}
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
            <div className="text-[10px] text-neutral-400">
              ZEISS Calypso programs never require re-teaching
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

