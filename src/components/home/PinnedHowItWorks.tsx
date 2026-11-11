import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Upload, Cpu, Sliders, FileSpreadsheet, Check, ArrowRight } from 'lucide-react';
import { SectionReveal } from '../ui/section-reveal';

gsap.registerPlugin(ScrollTrigger);

interface PinnedHowItWorksProps {
  onOpenStudio: () => void;
}

const STEPS = [
  {
    step: '01',
    title: 'Upload CAD',
    subtitle: 'Local Vector Stream Extraction',
    description:
      'Drag and drop any vector engineering drawing (PDF up to 5 pages, 10MB) or high-res blueprint. All parsing occurs strictly in local browser memory without cloud exposure.',
    badge: 'Vector Decomposition · 300 DPI Affine',
    mockupHeader: 'STAGE 1: INPUT VERIFICATION & PARSING',
    mockupDetails: {
      tag: '#01',
      callout: 'AS-4092-C_Hydraulic_Actuator_RevC.pdf',
      status: 'VERIFIED VECTOR PDF',
      note: 'Native text stream extracted · 17 candidate dimensions found',
      metrics: [
        { label: 'Coordinate Engine', val: 'Euclidean Vector (DPI: 300)' },
        { label: 'Cloud Transmission', val: '0 bytes (100% Client-Side)' },
      ],
    },
  },
  {
    step: '02',
    title: 'Auto-Balloon',
    subtitle: 'Deterministic GD&T Math Solver',
    description:
      'Spatial vision crops angled callouts and computes skew angle θ = atan2(b, a), while deterministic ISO 286 and ASME Y14.5 algorithms calculate limits and tolerance bonuses to 0.001mm.',
    badge: 'Zero Hallucination · Pure Metrology Math',
    mockupHeader: 'STAGE 2: FEATURE-CONTROL FRAME SOLVER',
    mockupDetails: {
      tag: '#02',
      callout: '|⌖|Ø0.05(M)|A|B(M)|',
      status: 'EFFECTIVE USL: 0.070 mm',
      note: 'Datum B MMC shift (+0.012 mm) + feature bonus (+0.008 mm) added',
      metrics: [
        { label: 'Stated Tol', val: 'Ø0.050 mm' },
        { label: 'Dynamic MMC Bonus', val: '+0.020 mm' },
      ],
    },
  },
  {
    step: '03',
    title: 'Studio Review',
    subtitle: 'Hardware WebHID Caliper Bridge',
    description:
      'Inspect characteristics in the Canvas Studio. Stream live micrometer readings from physical Mitutoyo USB / Bluetooth calipers directly into Form 3 rows with sub-millisecond audio feedback.',
    badge: 'WebHID USB / BLE Caliper Sync',
    mockupHeader: 'STAGE 3: LIVE HARDWARE CALIPER INGESTION',
    mockupDetails: {
      tag: '#01',
      callout: 'Ø30.00 H7 (+0.021 / -0.000)',
      status: 'MEASURED: 30.012 mm (IN-SPEC PASS)',
      note: 'Mahr Air Plug Gauge verified · Audio chime confirmed',
      metrics: [
        { label: 'Nominal / LSL..USL', val: '30.000 .. 30.021 mm' },
        { label: 'Operator Action', val: 'Hands-Free Enter Key' },
      ],
    },
  },
  {
    step: '04',
    title: 'AS9102 Export',
    subtitle: 'Audit-Ready 4-Sheet Excel Package',
    description:
      'One-click compilation of complete SAE AS9102 Rev C Excel workbooks (Forms 1, 2, 3), 10-piece moving-range SPC charts, and 21 CFR Part 11 cryptographic SHA-256 audit trails.',
    badge: 'SAE AS9102 Rev C · Net-Inspect Compatible',
    mockupHeader: 'STAGE 4: AUDIT COMPLIANCE WORKBOOK',
    mockupDetails: {
      tag: 'FA-01',
      callout: 'AS9102 Rev C Forms 1, 2 & 3 Suite',
      status: 'AUDIT PACKAGE COMPILED',
      note: '100% Characteristic mapping · Compatible with Net-Inspect and DISCUS',
      metrics: [
        { label: 'SPC Capability', val: 'Cpk = 1.74 (PASS)' },
        { label: 'Integrity Seal', val: '21 CFR Part 11 SHA-256' },
      ],
    },
  },
];

export const PinnedHowItWorks: React.FC<PinnedHowItWorksProps> = ({ onOpenStudio }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const spineFillRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    const mockup = mockupRef.current;
    if (!el || !mockup) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px) and (pointer: fine)', () => {
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top top+=90',
        end: 'bottom bottom-=40',
        pin: mockup,
        scrub: 0.5,
        onUpdate: (self) => {
          const stepIndex = Math.min(
            STEPS.length - 1,
            Math.floor(self.progress * STEPS.length)
          );
          setActiveStep(stepIndex);

          if (spineFillRef.current) {
            spineFillRef.current.style.transform = `scaleY(${self.progress})`;
          }
        },
      });

      return () => {
        st.kill();
      };
    });

    return () => {
      mm.revert();
    };
  }, []);

  const currentStepData = STEPS[activeStep];

  return (
    <section
      ref={containerRef}
      className="relative py-20 px-4 sm:px-6 lg:px-8 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 select-none"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <SectionReveal className="max-w-2xl mb-16">
          <div className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] tracking-widest uppercase font-semibold mb-2">
            02 // HOW IT WORKS
          </div>
          <h2 className="font-display font-medium text-3xl sm:text-4xl text-neutral-950 dark:text-white tracking-tight">
            From Raw CAD Blueprint to Audit-Ready AS9102 Package
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Four deterministic stages designed for aerospace quality engineers and machine shop metrologists.
          </p>
        </SectionReveal>

        {/* Pinned Scrollytelling Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          {/* Left Column: Timeline Steps with Scroll-Driven Spine */}
          <div className="md:col-span-5 relative pl-8 space-y-16 py-4">
            {/* Background Spine Line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-neutral-200 dark:bg-neutral-800" />
            {/* Scroll-Driven Active Progress Spine */}
            <div
              ref={spineFillRef}
              className="absolute left-3 top-0 bottom-0 w-0.5 bg-[#0047AB] origin-top transition-transform duration-75"
              style={{ transform: 'scaleY(0)' }}
            />

            {STEPS.map((step, idx) => {
              const isActive = idx === activeStep;
              return (
                <div
                  key={step.step}
                  onClick={() => setActiveStep(idx)}
                  className={`cursor-pointer transition-all duration-300 relative ${
                    isActive ? 'opacity-100 translate-x-1' : 'opacity-40 hover:opacity-75'
                  }`}
                >
                  {/* Step Dot Anchor */}
                  <div
                    className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                      isActive
                        ? 'border-[#0047AB] bg-white dark:bg-neutral-950 shadow-xs ring-4 ring-[#0047AB]/20'
                        : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                    }`}
                  />

                  <div className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] font-bold">
                    {step.step} // {step.title.toUpperCase()}
                  </div>
                  <h3 className="font-display font-medium text-lg text-neutral-950 dark:text-white mt-1">
                    {step.subtitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mt-2">
                    {step.description}
                  </p>

                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0047AB]/10 text-[#0047AB] dark:text-[#38BDF8] font-mono text-[10.5px] font-semibold border border-[#0047AB]/20">
                    <Check className="w-3 h-3" />
                    <span>{step.badge}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Pinned Studio Mockup Container */}
          <div className="md:col-span-7">
            <div
              ref={mockupRef}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl overflow-hidden font-mono text-xs"
            >
              {/* Studio Window Title Bar */}
              <div className="h-10 px-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-[11px] text-neutral-500 font-semibold">
                    SPECBALLOON WORKBENCH // {currentStepData.mockupHeader}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0047AB] text-white">
                  STEP {currentStepData.step}/04
                </span>
              </div>

              {/* Mockup Dynamic Content */}
              <div className="p-6 space-y-6">
                {/* Active Characteristic Header */}
                <div className="p-4 rounded-lg border border-[#0047AB]/20 bg-[#0047AB]/5 dark:bg-[#0047AB]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
                      TARGET CHARACTERISTIC
                    </div>
                    <div className="text-base font-bold text-neutral-950 dark:text-white mt-0.5">
                      {currentStepData.mockupDetails.callout}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {currentStepData.mockupDetails.note}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="inline-block px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {currentStepData.mockupDetails.status}
                    </span>
                  </div>
                </div>

                {/* Key Metrics Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentStepData.mockupDetails.metrics.map((metric, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50"
                    >
                      <div className="text-[10px] text-neutral-400 uppercase">{metric.label}</div>
                      <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                        {metric.val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Simulated Waveform / Progress Strip */}
                <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-500">
                    <span className="font-semibold">METROLOGY CORE STREAM</span>
                    <span className="text-[#0047AB] dark:text-[#38BDF8] font-bold">
                      ACTIVE &bull; 0.001 mm
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0047AB] transition-all duration-500"
                      style={{ width: `${(activeStep + 1) * 25}%` }}
                    />
                  </div>
                </div>

                {/* CTA Action */}
                <button
                  onClick={onOpenStudio}
                  className="w-full py-2.5 rounded-lg bg-[#0047AB] hover:bg-[#003887] text-white text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Launch Studio to Inspect This Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

