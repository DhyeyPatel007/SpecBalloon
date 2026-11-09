import React, { useState } from 'react';
import {
  Sparkles,
  Calculator,
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu,
  BarChart3,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { AppPage } from '../components/navigation/GlobalNavbar';
import { Characteristic } from '../types/metrology';
import {
  calculateISO286,
  calculateISOThread,
  calculateDynamicMmcBonus,
  calculateMovingRangeSPC,
  fmt3
} from '../utils/metrologyMath';
import { ExpandableBentoCard, ExpandableCardData, MagneticButton } from '../components/ui';

const METROLOGY_SPECS: ExpandableCardData[] = [
  {
    id: 'spec-iso286',
    tag: 'ISO 286-1:2010',
    title: 'ISO Limits and Fits',
    subtitle: 'Fundamental Deviations & Tolerance Units',
    summary: 'Computes standard tolerance grades (IT01 to IT18) using the fundamental tolerance unit formula without table lookup hallucination.',
    expandedDetails: {
      standard: 'ISO 286-1 / ISO 286-2 Geometrical Product Specifications',
      toleranceRange: 'IT6 through IT11 (0.006mm .. 0.160mm)',
      formula: 'i = 0.45 · ∛D + 0.001 · D  (µm)',
      auditRule: 'Mandatory deterministic calculation for all precision shaft/hole pairings in automotive and aerospace assemblies.',
      description: 'SpecBalloon calculates the exact tolerance grade for any nominal dimension D from 1mm to 500mm across 28 fundamental deviation letters (A through ZC).'
    }
  },
  {
    id: 'spec-asme-mmc',
    tag: 'ASME Y14.5-2018',
    title: 'Dynamic MMC & Datum Shift',
    subtitle: 'Section 7.3.3 Maximum Material Condition',
    summary: 'Automatically calculates feature MMC bonus and datum reference frame shift, expanding permissible tolerance zone and saving parts from false scrap.',
    expandedDetails: {
      standard: 'ASME Y14.5-2018 / ISO 5459:2011',
      toleranceRange: 'Variable (+0.000mm to +0.035mm bonus)',
      formula: 'Bonus = |Actual - MMC|; Effective USL = Stated + Bonus + DatumShift',
      auditRule: 'Permissible only when (M) modifier is explicitly present in feature control frame or datum reference compartment.',
      description: 'When a hole departs from its Maximum Material Condition (MMC) towards LMC, the additional material clearance is credited directly to the positional tolerance.'
    }
  },
  {
    id: 'spec-as9102c',
    tag: 'SAE AS9102 REV C',
    title: 'First Article Inspection Suite',
    subtitle: 'Forms 1, 2, and 3 Autonomous Assembly',
    summary: 'Builds 4-sheet formatted Excel workbooks containing Form 1 (Part Accountability), Form 2 (Materials & Processes), and Form 3 (Characteristic Accountability).',
    expandedDetails: {
      standard: 'SAE AS9102 Revision C (2023)',
      toleranceRange: '100% Characteristic Coverage',
      formula: 'Row Audit = 21 CFR Part 11 SHA-256 Hash Signature',
      auditRule: 'Requires 100% ballooning of every drawing characteristic, drawing zone correlation, and tool/gage traceability.',
      description: 'Generates Net-Inspect compatible Excel workbooks with real Excel cell formulas (=AVERAGE, =STDEV, =UCL) and embedded cryptographic verification hashes.'
    }
  },
  {
    id: 'spec-cmm-pos',
    tag: 'EUCLIDEAN GD&T',
    title: 'CMM True Position Solver',
    subtitle: '2-Axis Coordinate Vector Decomposition',
    summary: 'Converts Cartesian coordinate offsets (ΔX, ΔY) from ZEISS Calypso or Hexagon PC-DMIS into diametral true position deviation.',
    expandedDetails: {
      standard: 'ISO 1101:2017 / ASME Y14.5',
      toleranceRange: 'Diametral cylindrical tolerance zone',
      formula: 'Actual Error e_pos = 2 · √((ΔX)² + (ΔY)²)',
      auditRule: 'Measured true position error must be evaluated as a diametral diameter (multiplied by 2), not a radial distance.',
      description: 'Eliminates error-prone manual square root calculation on coordinate inspection reports. Evaluates against effective MMC limits in real time.'
    }
  }
];

interface EnginePageProps {
  onNavigate: (page: AppPage) => void;
}

export const EnginePage: React.FC<EnginePageProps> = ({ onNavigate }) => {
  // Sandbox A: ISO 286
  const [isoDia, setIsoDia] = useState<number>(30);
  const [isoFit, setIsoFit] = useState<string>('H7');

  // Sandbox B: ASME Y14.5 MMC
  const [statedTol, setStatedTol] = useState<number>(0.050);
  const [featureBore, setFeatureBore] = useState<number>(8.538);
  const [datumBBore, setDatumBBore] = useState<number>(30.012);

  // Sandbox C: Metric Thread
  const [threadChoice, setThreadChoice] = useState<'M6' | 'M8' | 'M10' | 'M12'>('M10');

  // Sandbox D: CMM True Position & SPC
  const [cmmDx, setCmmDx] = useState<number>(0.018);
  const [cmmDy, setCmmDy] = useState<number>(-0.022);

  // Computations
  const isoResult = calculateISO286(isoDia, isoFit);
  const iFactor = Number((0.45 * Math.cbrt(isoDia) + 0.001 * isoDia).toFixed(3));

  const featureChar: Partial<Characteristic> = {
    id: 'demo-char',
    balloonNumber: 3,
    zone: 'B3',
    designator: 'Critical',
    featureDescription: 'Hole True Position',
    rawCallout: '|⌖|Ø0.05(M)|A|B(M)|',
    plusTolerance: statedTol,
    minusTolerance: 0,
    lsl: 0,
    usl: statedTol,
    nominal: statedTol,
    nominal_value: statedTol,
    nominal_text: '|⌖|Ø0.05(M)|A|B(M)|',
    toleranceType: 'GD&T',
    status: 'in_spec',
    instrument: 'ZEISS CMM',
    hasMmcModifier: true,
    measuredValue: featureBore,
    lower_limit: 8.500,
    upper_limit: 8.550,
  };

  const datumBChar: Partial<Characteristic> = {
    id: 'demo-datum-b',
    balloonNumber: 1,
    zone: 'A1',
    designator: 'Major',
    featureDescription: 'Center Bore Datum B',
    rawCallout: 'Ø30.00 H7',
    plusTolerance: 0.021,
    minusTolerance: 0,
    lsl: 30.000,
    usl: 30.021,
    nominal: 30.000,
    nominal_value: 30.000,
    nominal_text: 'Ø30.00 H7',
    toleranceType: 'Limit',
    status: 'in_spec',
    instrument: 'Mahr Air Gage',
    measuredValue: datumBBore,
    lower_limit: 30.000,
    upper_limit: 30.021,
  };

  const mmcResult = calculateDynamicMmcBonus(
    featureChar as unknown as Characteristic,
    datumBChar as unknown as Characteristic
  );

  const threadParams =
    threadChoice === 'M6'
      ? calculateISOThread(6, 1.0, '6H', true)
      : threadChoice === 'M8'
      ? calculateISOThread(8, 1.25, '6H', true)
      : threadChoice === 'M10'
      ? calculateISOThread(10, 1.5, '6H', true)
      : calculateISOThread(12, 1.75, '6H', true);

  const cmmTruePos = Number((2 * Math.sqrt(cmmDx * cmmDx + cmmDy * cmmDy)).toFixed(3));
  const sampleLot = [cmmTruePos, 0.054, 0.056, 0.059, 0.052, 0.057, 0.055, 0.058, 0.053, 0.056];
  const spc = calculateMovingRangeSPC(0.000, mmcResult.effectiveUsl, sampleLot);

  return (
    <div className="w-full bg-page text-text-primary flex flex-col font-sans selection:bg-accent-primary selection:text-white">
      {/* Page Hero */}
      <section className="py-14 border-b border-border-hairline bg-surface/50 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <span className="px-2.5 py-1 rounded-full bg-subtle border border-border-hairline font-mono text-[10px] text-text-muted uppercase tracking-wider">
            Neuro-Symbolic Computational Metrology
          </span>
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-text-primary tracking-tight mt-3 mb-4">
            AI for Spatial Vision. Deterministic Math for Truth.
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl mx-auto">
            LLMs make calculation errors when estimating engineering tolerances. SpecBalloon decouples spatial detection from limit computation, running strict ISO & ASME math engines with 0.000 mm hallucination rates.
          </p>
        </div>
      </section>

      {/* 1. Two-Stage Pipeline Architecture */}
      <section className="py-12 border-b border-border-hairline bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="font-display font-semibold text-xl text-text-primary">
              The 2-Stage Neuro-Symbolic Metrology Pipeline
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Guarantees mathematical correctness while preserving sub-second parsing speed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border-hairline bg-subtle/30 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-accent-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-text-primary uppercase tracking-wide font-mono">
                    Stage 1 — Multimodal Spatial Vision
                  </h3>
                  <span className="text-[10px] text-text-muted">Gemini 2.5 Flash + PyMuPDF Vectors</span>
                </div>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Extracts normalized bounding boxes (`ymin, xmin, ymax, xmax`) for every dimension string, GD&T frame, datum letter, and title-block parameter without making mathematical assumptions.
              </p>
              <div className="p-2.5 rounded bg-surface border border-border-hairline font-mono text-[11px] text-text-muted">
                Input: Vector PDF / 300 DPI Drawing &rarr; Output: Raw Callout String (`Ø30.00 H7`)
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border-hairline bg-subtle/30 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-status-pass">
                  <Calculator className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-text-primary uppercase tracking-wide font-mono">
                    Stage 2 — Deterministic Math Guardrail
                  </h3>
                  <span className="text-[10px] text-text-muted">ISO 286, ASME Y14.5, ISO 68-1</span>
                </div>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Interprets the structured callout through compiled mathematical equations. Computes standard tolerance units ($i$), micron intervals, pitch diameters, and dynamic MMC bonuses with 100% precision.
              </p>
              <div className="p-2.5 rounded bg-surface border border-border-hairline font-mono text-[11px] text-status-pass font-bold">
                Output: LSL 30.000 mm, USL 30.021 mm (0.000% Error)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Four Interactive Playable Math Sandboxes */}
      <section className="py-14 max-w-5xl mx-auto px-4 sm:px-6 w-full space-y-10">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
            Live Computational Sandboxes
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Interact with the actual TypeScript math solvers that power SpecBalloon.
          </p>
        </div>

        {/* Sandbox A: ISO 286 Fits */}
        <div className="border border-border-hairline rounded-xl bg-surface p-6 shadow-apple-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-hairline pb-3">
            <div>
              <span className="text-[10px] font-mono text-accent-primary font-bold uppercase tracking-wider">
                Sandbox A // ISO 286-1 & 286-2
              </span>
              <h3 className="font-semibold text-sm text-text-primary">
                Hole & Shaft Fit Tolerance Solver
              </h3>
            </div>
            <div className="text-xs font-mono text-text-muted">
              Standard Formula: i = 0.45·<sup className="text-xs">3</sup>√D + 0.001D
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-text-secondary">Diameter (D):</span>
                  <span className="font-bold text-text-primary">{isoDia} mm</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="250"
                  step="1"
                  value={isoDia}
                  onChange={(e) => setIsoDia(parseInt(e.target.value, 10))}
                  className="w-full accent-accent-primary cursor-pointer"
                />
              </div>

              <div>
                <span className="text-xs font-mono text-text-secondary block mb-1.5">
                  Select Fit Class:
                </span>
                <div className="flex items-center gap-1.5">
                  {['H7', 'g6', 'f7', 'js6', 'H8'].map((fit) => (
                    <button
                      key={fit}
                      onClick={() => setIsoFit(fit)}
                      className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                        isoFit === fit
                          ? 'bg-accent-primary text-white shadow-xs'
                          : 'bg-subtle text-text-secondary hover:bg-surface border border-border-hairline'
                      }`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border-hairline bg-subtle/40 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Fundamental Tolerance Unit (i):</span>
                <span className="font-bold text-text-primary">{iFactor} µm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Plus Tolerance (+):</span>
                <span className="font-bold text-status-pass">+{fmt3(isoResult.plusTol)} mm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Minus Tolerance (-):</span>
                <span className="font-bold text-text-primary">-{fmt3(isoResult.minusTol)} mm</span>
              </div>
              <div className="pt-2 border-t border-border-hairline flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">Exact Limits:</span>
                <span className="font-bold text-text-primary">
                  {fmt3(isoDia - isoResult.minusTol)} — {fmt3(isoDia + isoResult.plusTol)} mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox B: ASME Y14.5 MMC Bonus + Datum Shift */}
        <div className="border border-border-hairline rounded-xl bg-surface p-6 shadow-apple-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-hairline pb-3">
            <div>
              <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase tracking-wider">
                Sandbox B // ASME Y14.5-2018
              </span>
              <h3 className="font-semibold text-sm text-text-primary">
                Dynamic Feature MMC Bonus + Datum B Shift Calculator
              </h3>
            </div>
            <div className="text-xs font-mono text-status-pass font-bold">
              Formula: Allowed Zone = Stated + Bonus + Datum Shift
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-text-secondary">Feature Bore Actual (Tag #02):</span>
                  <span className="font-bold text-text-primary">{fmt3(featureBore)} mm</span>
                </div>
                <input
                  type="range"
                  min="8.530"
                  max="8.565"
                  step="0.001"
                  value={featureBore}
                  onChange={(e) => setFeatureBore(parseFloat(e.target.value))}
                  className="w-full accent-accent-primary cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-text-secondary">Datum B Bore Actual (Tag #01):</span>
                  <span className="font-bold text-text-primary">{fmt3(datumBBore)} mm</span>
                </div>
                <input
                  type="range"
                  min="30.000"
                  max="30.021"
                  step="0.001"
                  value={datumBBore}
                  onChange={(e) => setDatumBBore(parseFloat(e.target.value))}
                  className="w-full accent-accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border-hairline bg-subtle/40 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Stated Position Tolerance:</span>
                <span className="text-text-secondary font-bold">{fmt3(statedTol)} mm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Feature MMC Bonus Departure:</span>
                <span className="text-status-pass font-bold">+{fmt3(mmcResult.featureBonus)} mm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Datum B MMC Shift:</span>
                <span className="text-status-pass font-bold">+{fmt3(mmcResult.datumShift)} mm</span>
              </div>
              <div className="pt-2 border-t border-border-hairline flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">Effective Allowed Boundary:</span>
                <span className="font-bold text-status-pass text-sm">
                  {fmt3(mmcResult.effectiveUsl)} mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox C: ISO 68-1 / 965 Metric Thread */}
        <div className="border border-border-hairline rounded-xl bg-surface p-6 shadow-apple-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-hairline pb-3">
            <div>
              <span className="text-[10px] font-mono text-purple-600 font-bold uppercase tracking-wider">
                Sandbox C // ISO 68-1 & ISO 965-1
              </span>
              <h3 className="font-semibold text-sm text-text-primary">
                Internal Metric Thread Geometry & Plug Gauge Limits
              </h3>
            </div>
            <div className="text-xs font-mono text-text-muted">
              Pitch Dia D2 = D - 0.649519P | Minor Dia D1 = D - 1.082532P
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <span className="text-xs font-mono text-text-secondary block">
                Select Thread Size:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(['M6', 'M8', 'M10', 'M12'] as const).map((th) => (
                  <button
                    key={th}
                    onClick={() => setThreadChoice(th)}
                    className={`py-2 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      threadChoice === th
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-subtle text-text-secondary hover:bg-surface border border-border-hairline'
                    }`}
                  >
                    {th}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-muted">
                Calculates fundamental triangle height (H = 0.866025P) and Class 6H GO/NO-GO tolerances.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border-hairline bg-subtle/40 font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Pitch (P):</span>
                <span className="text-text-primary font-bold">{threadParams.pitch} mm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Pitch Diameter Nominal (D2):</span>
                <span className="text-purple-600 font-bold">
                  {fmt3(threadParams.pitchDiameterD2)} mm
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Minor Bore 6H Limits (D1):</span>
                <span className="text-text-primary font-bold">
                  {fmt3(threadParams.minorD1Lsl)} — {fmt3(threadParams.minorD1Usl)} mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox D: Euclidean CMM True Position & SPC */}
        <div className="border border-border-hairline rounded-xl bg-surface p-6 shadow-apple-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-hairline pb-3">
            <div>
              <span className="text-[10px] font-mono text-amber-600 font-bold uppercase tracking-wider">
                Sandbox D // Euclidean CMM & Moving Range SPC
              </span>
              <h3 className="font-semibold text-sm text-text-primary">
                CMM True Position Deviation & Real-Time Capability Index
              </h3>
            </div>
            <div className="text-xs font-mono text-text-muted">
              e = 2·√(ΔX² + ΔY²) | UCL = X̄ + 2.66·MR
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-text-secondary">CMM ΔX Deviation:</span>
                  <span className="font-bold text-text-primary">{cmmDx > 0 ? `+${cmmDx}` : cmmDx} mm</span>
                </div>
                <input
                  type="range"
                  min="-0.035"
                  max="0.035"
                  step="0.001"
                  value={cmmDx}
                  onChange={(e) => setCmmDx(parseFloat(e.target.value))}
                  className="w-full accent-accent-primary cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-text-secondary">CMM ΔY Deviation:</span>
                  <span className="font-bold text-text-primary">{cmmDy > 0 ? `+${cmmDy}` : cmmDy} mm</span>
                </div>
                <input
                  type="range"
                  min="-0.035"
                  max="0.035"
                  step="0.001"
                  value={cmmDy}
                  onChange={(e) => setCmmDy(parseFloat(e.target.value))}
                  className="w-full accent-accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border-hairline bg-subtle/40 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Euclidean Diametral Error:</span>
                <span className="text-text-primary font-bold text-sm">{fmt3(cmmTruePos)} mm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">10-Sample Mean (X̄):</span>
                <span className="text-text-secondary font-bold">{fmt3(spc.mean)} mm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Process Capability (Cpk):</span>
                <span className="text-status-pass font-bold text-sm">{spc.cpk} (Pass &ge; 1.33)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Normative Metrology Specifications Library with Skiper UI Expandable Cards */}
      <section className="py-16 px-6 sm:px-12 max-w-7xl mx-auto border-t border-border-hairline">
        <div className="max-w-3xl mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono bg-surface border border-border-hairline text-text-muted mb-2">
            <span>NORMATIVE BENCHMARK SPECIFICATIONS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-medium text-text-primary tracking-tight">
            Deterministic Standards & Mathematical Proofs
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Click any specification card below to inspect full mathematical derivations, audit clauses, and tolerance limits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {METROLOGY_SPECS.map((spec) => (
            <ExpandableBentoCard key={spec.id} item={spec} />
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 border-t border-border-hairline bg-surface text-center">
        <h2 className="font-display font-semibold text-xl text-text-primary mb-2">
          Inspect with Guaranteed Mathematical Precision
        </h2>
        <p className="text-xs text-text-secondary max-w-md mx-auto mb-6">
          Test these exact algorithms against real vector CAD blueprints in our 4-Pane Studio IDE.
        </p>
        <MagneticButton
          onClick={() => onNavigate('studio')}
          className="bg-[#09090B] dark:bg-white text-white dark:text-[#09090B] px-6 py-2.5 rounded-md font-mono font-medium text-xs inline-flex items-center gap-2 cursor-pointer shadow-apple-sm"
        >
          <span>Open Studio IDE</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </MagneticButton>
      </section>
    </div>
  );
};
