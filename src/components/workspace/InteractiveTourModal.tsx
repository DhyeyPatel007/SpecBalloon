import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GitCompare,
  Calculator,
  BarChart3,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Play,
  RotateCcw
} from 'lucide-react';
import { soundEngine } from '../../utils/audioSynthesizer';

interface InteractiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStepChange: (stepIndex: number) => void;
}

export interface TourStep {
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  keyMoat: string;
  uiTarget: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: '1. Neuro-Symbolic Auto-Ballooning',
    subtitle: 'Gemini 2.5 Flash Vision + Deterministic Metrology Engine',
    badge: 'VISION AI & OCR',
    icon: <Sparkles className="w-4 h-4 text-accent-primary" />,
    description:
      'SpecBalloon combines Google Gemini 2.5 Flash Vision for high-resolution spatial layout extraction with deterministic ISO 286 / ISO 2768-m metrology math. Every dimension, GD&T Feature Control Frame, and datum reference is detected and framed in sub-seconds with zero hallucinated tolerance limits.',
    keyMoat: 'Sub-second spatial detection + exact mathematical boundary guarantees.',
    uiTarget: 'CAD Viewport & Contextual Drawing Toolbar',
  },
  {
    title: '2. Revision Diff & Delta-Lock Engine',
    subtitle: 'Rev B → Rev C Tolerance Shift without Breaking Tag IDs',
    badge: 'ECO STABILITY',
    icon: <GitCompare className="w-4 h-4 text-indigo-500" />,
    description:
      'Solves the #1 industry bottleneck where engineering change orders (ECOs) scramble balloon numbers and break downstream CMM routines. SpecBalloon keeps Tag IDs (#01..#14) permanently locked, automatically dimming unchanged features, highlighting tightened tolerances in purple, and marking new features in green.',
    keyMoat: 'Delta-lock protects shop-floor CMM programs from breaking on rev updates.',
    uiTarget: 'Floating Revision Diff Banner & 2D Canvas Highlight Pills',
  },
  {
    title: '3. Cross-Row Dynamic MMC & Datum Shift',
    subtitle: 'ASME Y14.5 / ISO 1101 Cross-Row Boundary Solver',
    badge: 'FALSE SCRAP SAVIOR',
    icon: <Calculator className="w-4 h-4 text-emerald-500" />,
    description:
      'Inspect Tag #02 (|⌖|Ø0.05(M)|A|B(M)|). While a traditional caliper flags the 0.058 mm reading as out-of-spec, our dynamic solver calculates +0.008 mm feature MMC departure and +0.012 mm Datum B shift, expanding the effective boundary to 0.070 mm—saving the workpiece from false scrap.',
    keyMoat: 'Live cross-row tolerance synthesis prevents costly false rejects.',
    uiTarget: 'Right Single-Characteristic Inspector (MMC Dynamic Card)',
  },
  {
    title: '4. 10-Sample SPC Heatmap & Capability Matrix',
    subtitle: 'Automotive PPAP & Aerospace AS9102 Real-Time Control',
    badge: 'REAL-TIME SPC',
    icon: <BarChart3 className="w-4 h-4 text-amber-500" />,
    description:
      'Live Moving Range calculations continuously compute Mean (X̄), Standard Deviation (σ), Upper/Lower Control Limits (UCL / LCL), and Capability Indices (Cp / Cpk >= 1.33) across 10-part production lots with interactive color-coded heatmaps.',
    keyMoat: 'Statistical process capability verified before mass production launch.',
    uiTarget: 'Bottom Bill of Characteristics (Tab 2: SPC Heatmap)',
  },
  {
    title: '5. AS9102 Excel Suite & QR Shop Traveler',
    subtitle: 'Multi-Sheet Excel Deliverables + Printable QR Traveler',
    badge: 'HARDWARE CLOSURE',
    icon: <FileSpreadsheet className="w-4 h-4 text-blue-500" />,
    description:
      'Exports a complete 4-sheet native Excel AS9102 Rev C workbook (Form 1, Form 2 & Gage Cal, Form 3, and SPC Matrix) plus a 2-page printable PDF inspection deck with scannable deep-link QR codes for seamless mobile and digital caliper synchronization.',
    keyMoat: 'End-to-end compliance closure from CAD blueprint to physical shop traveler.',
    uiTarget: 'Top Ribbon Export Group ([Excel AS9102] & [📕 PDF Deck])',
  },
];

export const InteractiveTourModal: React.FC<InteractiveTourModalProps> = ({
  isOpen,
  onClose,
  onStepChange,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      onStepChange(0);
      soundEngine.playKeyClick();
    }
  }, [isOpen, onStepChange]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      onStepChange(next);
      soundEngine.playKeyClick();
    } else {
      soundEngine.playInSpecPass();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      onStepChange(prev);
      soundEngine.playKeyClick();
    }
  };

  const handleJump = (idx: number) => {
    setCurrentStep(idx);
    onStepChange(idx);
    soundEngine.playKeyClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
      <div className="bg-surface border border-border-hairline rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="p-3.5 border-b border-border-hairline flex items-center justify-between bg-subtle/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary">
              <Play className="w-3.5 h-3.5 fill-accent-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  SpecBalloon 45s Guided Product Tour
                </span>
                <span className="px-1.5 py-0.2 rounded bg-accent-primary/10 border border-accent-primary/30 text-[10px] font-mono font-bold text-accent-primary">
                  {step.badge}
                </span>
              </div>
              <span className="text-[10px] text-text-muted">
                Step {currentStep + 1} of {TOUR_STEPS.length} · Live Metrology IDE Showcase
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
            title="Skip Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tour Step Content */}
        <div className="p-5 space-y-4 text-xs font-sans">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {step.icon}
              <h2 className="text-sm font-bold text-text-primary">{step.title}</h2>
            </div>
            <p className="text-[11px] font-medium text-accent-primary">
              {step.subtitle}
            </p>
          </div>

          <p className="text-text-secondary leading-relaxed text-[12px]">
            {step.description}
          </p>

          {/* Key Architectural Moat Box */}
          <div className="p-3 rounded-lg border border-border-hairline bg-subtle/40 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-text-primary uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-status-pass" />
              <span>Core Architectural Moat</span>
            </div>
            <p className="text-[11px] text-text-muted font-sans italic">
              "{step.keyMoat}"
            </p>
            <div className="pt-1 text-[10px] font-mono text-accent-primary">
              Focus Area: {step.uiTarget}
            </div>
          </div>

          {/* Step Navigation Dots */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleJump(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-accent-primary w-6'
                    : 'bg-border-strong hover:bg-text-secondary'
                }`}
                title={`Jump to Step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-border-hairline bg-subtle/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 h-8 rounded-md border border-border-hairline bg-surface hover:bg-subtle text-text-secondary text-xs font-medium"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            <button
              disabled={currentStep === 0}
              onClick={handlePrev}
              className="px-3 h-8 rounded-md border border-border-hairline bg-surface hover:bg-subtle disabled:opacity-40 text-text-secondary text-xs font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              className="px-4 h-8 rounded-md bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>{currentStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
