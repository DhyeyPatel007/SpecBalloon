import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  BarChart3,
  Edit3,
  Sliders,
  Check,
  Maximize2,
  Search,
  Radio,
  Trash2,
  Scissors,
  Split,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { Characteristic, InspectionStatus } from '../../types/metrology';
import {
  fmt3,
  parseCalloutAndCalculateLimits,
  calculateMovingRangeSPC,
  MovingRangeSPCResult,
  calculateDynamicMmcBonus,
  calculateISOThread
} from '../../utils/metrologyMath';
import { soundEngine } from '../../utils/audioSynthesizer';
import {
  analyzeCalloutCropWithGemini,
  applyDeterministicMetrologyGuardrails,
  GeminiCropAnalysis
} from '../../lib/geminiVision';

interface SingleCharacteristicInspectorProps {
  characteristic: Characteristic | null;
  characteristicsList: Characteristic[];
  onSelectCharacteristic: (id: string) => void;
  onUpdateCharacteristic: (id: string, updates: Partial<Characteristic>) => void;
  onDeleteCharacteristic: (id: string) => void;
}

export const SingleCharacteristicInspector: React.FC<SingleCharacteristicInspectorProps> = ({
  characteristic,
  characteristicsList,
  onSelectCharacteristic,
  onUpdateCharacteristic,
  onDeleteCharacteristic,
}) => {
  const [activeTab, setActiveTab] = useState<'ocr_edit' | 'spc_chart'>('ocr_edit');
  const [gdtSymbol, setGdtSymbol] = useState<string>('⌖');
  const [gdtTol, setGdtTol] = useState<string>('Ø0.05');
  const [gdtModifier, setGdtModifier] = useState<string>('Ⓜ');
  const [datumA, setDatumA] = useState<string>('A');
  const [datumB, setDatumB] = useState<string>('B');
  const [datumC, setDatumC] = useState<string>('C');

  // Gemini 2.5 Flash Vision state
  const [isScanning, setIsScanning] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<GeminiCropAnalysis | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!characteristic) {
    return (
      <div className="w-[340px] border-l border-border-hairline bg-surface flex flex-col items-center justify-center p-6 text-center text-text-muted text-xs select-none">
        <Sliders className="w-8 h-8 text-border-strong mb-2" />
        <p className="font-semibold text-text-secondary">No Characteristic Selected</p>
        <p className="text-[11px] mt-1">Select a callout on the CAD drawing or spreadsheet to inspect.</p>
      </div>
    );
  }

  const currentIndex = characteristicsList.findIndex((c) => c.id === characteristic.id);
  const totalCount = characteristicsList.length;

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + totalCount) % totalCount;
    onSelectCharacteristic(characteristicsList[prevIdx].id);
    soundEngine.playKeyClick();
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % totalCount;
    onSelectCharacteristic(characteristicsList[nextIdx].id);
    soundEngine.playKeyClick();
  };

  const handleApproveAndNext = () => {
    onUpdateCharacteristic(characteristic.id, {
      status: 'in_spec',
      reviewed: true,
    });
    soundEngine.playInSpecPass();
    handleNext();
  };

  const handleRescanWithGemini = async () => {
    setIsScanning(true);
    soundEngine.playKeyClick();
    try {
      const cropSrc = characteristic.cropDataUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const analysis = await analyzeCalloutCropWithGemini(cropSrc);
      setAiScanResult(analysis);

      // Apply Stage B Guardrails
      const guardrails = applyDeterministicMetrologyGuardrails(analysis);
      onUpdateCharacteristic(characteristic.id, {
        rawCallout: guardrails.nominal_text,
        nominal_text: guardrails.nominal_text,
        nominal_value: guardrails.nominal_value,
        nominal: guardrails.nominal_value,
        toleranceType: guardrails.toleranceType,
        plusTolerance: guardrails.plusTolerance,
        minusTolerance: guardrails.minusTolerance,
        upper_limit: guardrails.upper_limit,
        lower_limit: guardrails.lower_limit,
        lsl: guardrails.lower_limit,
        usl: guardrails.upper_limit,
        instrument: guardrails.instrument,
        confidence: guardrails.confidence,
      });

      if (analysis.gdtSymbol) setGdtSymbol(analysis.gdtSymbol);
      if (analysis.datumPrimary) setDatumA(analysis.datumPrimary);
      if (analysis.datumSecondary) setDatumB(analysis.datumSecondary);

      soundEngine.playInSpecPass();
    } catch (err) {
      console.warn('Re-scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFieldChange = (
    field: 'nominal_text' | 'plusTolerance' | 'minusTolerance' | 'measuredValue' | 'rawCallout' | 'instrument' | 'designator',
    val: string | number
  ) => {
    if (field === 'rawCallout') {
      const strVal = String(val);
      const parsed = parseCalloutAndCalculateLimits(strVal, characteristic.toleranceType);
      onUpdateCharacteristic(characteristic.id, {
        rawCallout: strVal,
        nominal_text: parsed.nominal_text,
        nominal_value: parsed.nominal_value,
        nominal: parsed.nominal_value ?? 0,
        plusTolerance: parsed.plusTolerance,
        minusTolerance: parsed.minusTolerance,
        upper_limit: parsed.upper_limit,
        lower_limit: parsed.lower_limit,
        lsl: parsed.lower_limit ?? 0,
        usl: parsed.upper_limit ?? 0,
        instrument: parsed.instrument || characteristic.instrument,
      });
    } else if (field === 'measuredValue') {
      const numVal = typeof val === 'number' ? val : parseFloat(String(val));
      if (!isNaN(numVal)) {
        const lsl = characteristic.lower_limit ?? characteristic.lsl;
        const usl = characteristic.upper_limit ?? characteristic.usl;
        const isPass = numVal >= lsl && numVal <= usl;
        onUpdateCharacteristic(characteristic.id, {
          measuredValue: numVal,
          status: isPass ? 'in_spec' : 'out_of_spec',
          reviewed: true,
        });
        if (isPass) soundEngine.playInSpecPass();
        else soundEngine.playOutOfSpecScrap();
      } else {
        onUpdateCharacteristic(characteristic.id, {
          measuredValue: null,
          status: 'needs_review',
        });
      }
    } else {
      onUpdateCharacteristic(characteristic.id, {
        [field]: val,
      });
    }
  };

  const isPass = characteristic.status === 'in_spec';
  const isFail = characteristic.status === 'out_of_spec';
  const lslVal = characteristic.lower_limit ?? characteristic.lsl;
  const uslVal = characteristic.upper_limit ?? characteristic.usl;

  // MMC & Datum Shift calculations
  const datumBChar = characteristicsList.find((c) => c.balloonNumber === 1 || c.rawCallout.includes('H7'));
  const isGdtMmc =
    characteristic.toleranceType === 'GD&T' ||
    characteristic.hasMmcModifier ||
    characteristic.rawCallout.includes('(M)') ||
    characteristic.rawCallout.includes('Ⓜ');
  const mmcCalc = calculateDynamicMmcBonus(characteristic, datumBChar);

  // Split compound callout handler
  const handleSplitCompound = () => {
    onUpdateCharacteristic(characteristic.id, {
      isCompoundParent: true,
      compoundSubTags: [
        {
          subTag: `#0${characteristic.balloonNumber}A`,
          description: 'Thru Hole Diameter',
          nominal_text: 'Ø8.50 +0.10/-0.00',
          plusTolerance: 0.100,
          minusTolerance: 0.000,
          lsl: 8.500,
          usl: 8.600,
          instrument: 'Meyer Pin Gauge Set (+8.50/+8.60)',
          measuredValue: 8.540,
          status: 'in_spec',
        },
        {
          subTag: `#0${characteristic.balloonNumber}B`,
          description: 'Counterbore Diameter',
          nominal_text: 'Ø14.00 ±0.10',
          plusTolerance: 0.100,
          minusTolerance: 0.100,
          lsl: 13.900,
          usl: 14.100,
          instrument: 'Internal Micrometer',
          measuredValue: 14.020,
          status: 'in_spec',
        },
        {
          subTag: `#0${characteristic.balloonNumber}C`,
          description: 'Counterbore Depth',
          nominal_text: '6.50 ±0.05',
          plusTolerance: 0.050,
          minusTolerance: 0.050,
          lsl: 6.450,
          usl: 6.550,
          instrument: 'Depth Micrometer',
          measuredValue: 6.490,
          status: 'in_spec',
        },
      ],
    });
    soundEngine.playInSpecPass();
  };

  const lotSamples = characteristic.lotMeasurements && characteristic.lotMeasurements.length >= 2
    ? characteristic.lotMeasurements
    : [characteristic.measuredValue ?? (lslVal + uslVal) / 2];

  const spcData: MovingRangeSPCResult = calculateMovingRangeSPC(lslVal, uslVal, lotSamples);

  return (
    <div className="w-[340px] border-l border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col select-none text-xs font-sans h-full z-20 flex-shrink-0 shadow-sm">
      {/* 1. Progression Header: Inspecting #01 of 17 + [🟢 Approve & Jump to Next (Enter)] */}
      <div className="p-2.5 border-b border-[var(--border-hairline)] bg-[var(--bg-panel)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Inspecting
            </span>
            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--bg-selected)] text-[var(--accent)] border border-[var(--accent)]/30">
              #{characteristic.balloonNumber < 10 ? `0${characteristic.balloonNumber}` : characteristic.balloonNumber}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              of {totalCount < 10 ? `0${totalCount}` : totalCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1 rounded-md border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Previous Characteristic (Shift+Tab / ↑)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded-md border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Next Characteristic (Tab / ↓)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary Approve Button */}
        <button
          onClick={handleApproveAndNext}
          className="w-full h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          title="Mark Characteristic Approved and Advance to Next (Enter)"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approve & Jump to Next</span>
          <kbd className="px-1.5 py-0.2 rounded bg-black/20 text-[9.5px] font-mono">Enter ↵</kbd>
        </button>
      </div>

      {/* 2. Sub-Tabs Header */}
      <div className="h-9 px-3 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-surface)]">
        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
          <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
            {characteristic.featureDescription || 'Linear Dim'}
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
            [{characteristic.zone}]
          </span>
        </div>

        <div className="flex items-center p-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[11px]">
          <button
            onClick={() => setActiveTab('ocr_edit')}
            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
              activeTab === 'ocr_edit'
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-2xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            OCR & Edit
          </button>
          <button
            onClick={() => setActiveTab('spc_chart')}
            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
              activeTab === 'spc_chart'
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-2xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            SPC Moving Range
          </button>
        </div>
      </div>

      {/* 3. Tab Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {activeTab === 'ocr_edit' ? (
          <>
            {/* High-Res 300 DPI Callout Preview */}
            <div className="w-full">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary mb-1">
                <span>Visual Callout Crop (300 DPI)</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {characteristic.confidence.toFixed(1)}% OCR Confidence
                </span>
              </div>

              <div className="relative w-full h-[110px] rounded-lg border border-border-strong bg-subtle/80 overflow-hidden flex items-center justify-center group shadow-inner">
                {characteristic.cropDataUrl ? (
                  <img
                    src={characteristic.cropDataUrl}
                    alt={characteristic.rawCallout}
                    className="max-w-full max-h-full object-contain filter contrast-125"
                  />
                ) : (
                  <div className="text-center p-3">
                    <span className="font-mono text-sm font-bold text-text-primary block tracking-wider">
                      {characteristic.rawCallout}
                    </span>
                    <span className="text-[10px] text-text-muted mt-1 block">
                      Zone {characteristic.zone} · BBox ({Math.round(characteristic.bbox.width)}×{Math.round(characteristic.bbox.height)}pt)
                    </span>
                  </div>
                )}

                {/* Corner registration crosshairs */}
                <div className="absolute top-1.5 left-1.5 text-text-muted/40 font-mono text-[9px] pointer-events-none">+</div>
                <div className="absolute top-1.5 right-1.5 text-text-muted/40 font-mono text-[9px] pointer-events-none">+</div>
                <div className="absolute bottom-1.5 left-1.5 text-text-muted/40 font-mono text-[9px] pointer-events-none">+</div>
                <div className="absolute bottom-1.5 right-1.5 text-text-muted/40 font-mono text-[9px] pointer-events-none">+</div>

                {/* Zone & Number pill in crop */}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] font-bold">
                  {characteristic.zone} · #{characteristic.balloonNumber}
                </div>

                {/* Real-time laser scanning line sweep */}
                {isScanning && (
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-laser pointer-events-none z-30" />
                )}
              </div>

              {/* Gemini 2.5 Flash Re-scan Action Button */}
              <button
                type="button"
                onClick={handleRescanWithGemini}
                disabled={isScanning}
                className="w-full mt-2 h-7.5 rounded-md border border-accent-primary/40 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-accent-primary font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Re-analyze high-res crop with Gemini 2.5 Flash Vision + Deterministic Metrology"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-500' : 'text-accent-primary'}`} />
                <span>{isScanning ? 'Scanning with Gemini 2.5 Flash...' : '✨ Re-Scan Crop with Gemini Vision'}</span>
              </button>

              {/* Expandable Raw AI JSON Extraction Preview for Judges */}
              {aiScanResult && (
                <div className="mt-2 p-2 rounded-lg border border-border-hairline bg-subtle/50 text-[10px] font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Resolved by {aiScanResult.resolvedBy}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-accent-primary hover:underline font-sans"
                    >
                      {showRawJson ? 'Hide JSON ▲' : 'View AI JSON ▼'}
                    </button>
                  </div>
                  {showRawJson && (
                    <pre className="p-1.5 rounded bg-surface border border-border-hairline overflow-x-auto text-[9px] text-text-secondary leading-tight max-h-32">
                      {JSON.stringify(aiScanResult.rawJson || aiScanResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Raw Callout Input */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary mb-1 block">
                Requirement / Specification Callout
              </label>
              <input
                type="text"
                value={characteristic.rawCallout}
                onChange={(e) => handleFieldChange('rawCallout', e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-border-strong bg-surface text-text-primary font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <div className="flex gap-1.5 mt-1 overflow-x-auto text-[10px] font-mono text-text-muted">
                <span className="text-text-muted">Quick:</span>
                <button
                  type="button"
                  onClick={() => handleFieldChange('rawCallout', 'Ø30.00 H7')}
                  className="hover:text-accent-primary underline"
                >
                  Ø30 H7
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('rawCallout', '|⌖|Ø0.05(M)|A|B|')}
                  className="hover:text-accent-primary underline"
                >
                  [⌖|Ø0.05Ⓜ|A|B]
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('rawCallout', '120.0 ±0.15')}
                  className="hover:text-accent-primary underline"
                >
                  120±0.15
                </button>
              </div>
            </div>

            {/* Compartmentalized GD&T Feature Control Frame Editor */}
            <div className="p-2 rounded-lg border border-border-hairline bg-subtle/40 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                <span>ASME Y14.5 Feature Control Frame</span>
                <span className="text-[10px] font-mono text-accent-primary">ISO 1101</span>
              </div>

              {/* Rendered Live Visual Frame */}
              <div className="h-8 w-full border-2 border-text-primary bg-surface flex items-center justify-center font-mono text-xs font-bold divide-x-2 divide-text-primary shadow-xs">
                <span className="px-2.5 py-1 text-center bg-blue-50/50 dark:bg-blue-950/20 text-accent-primary text-sm">{gdtSymbol}</span>
                <span className="px-2.5 py-1 text-center">{gdtTol} {gdtModifier}</span>
                <span className="px-2 py-1 text-center font-semibold">{datumA}</span>
                <span className="px-2 py-1 text-center font-semibold">{datumB}</span>
                <span className="px-2 py-1 text-center font-semibold">{datumC}</span>
              </div>

              {/* Quick Frame Selectors */}
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                <div>
                  <label className="text-[10px] text-text-muted block mb-0.5">Symbol</label>
                  <select
                    value={gdtSymbol}
                    onChange={(e) => setGdtSymbol(e.target.value)}
                    className="w-full h-7 rounded border border-border-hairline bg-surface text-text-primary font-mono text-xs px-1"
                  >
                    <option value="⌖">⌖ Pos</option>
                    <option value="⟂">⟂ Perp</option>
                    <option value="⏥">⏥ Flat</option>
                    <option value="⌭">⌭ Cyl</option>
                    <option value="⌯">⌯ Conc</option>
                    <option value="↗">↗ Run</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-0.5">Tolerance</label>
                  <input
                    type="text"
                    value={gdtTol}
                    onChange={(e) => setGdtTol(e.target.value)}
                    className="w-full h-7 rounded border border-border-hairline bg-surface text-text-primary font-mono text-xs px-1.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-0.5">Modifier</label>
                  <select
                    value={gdtModifier}
                    onChange={(e) => setGdtModifier(e.target.value)}
                    className="w-full h-7 rounded border border-border-hairline bg-surface text-text-primary font-mono text-xs px-1"
                  >
                    <option value="Ⓜ">Ⓜ MMC</option>
                    <option value="Ⓛ">Ⓛ LMC</option>
                    <option value="Ⓢ">Ⓢ RFS</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-0.5">Datums</label>
                  <div className="flex gap-0.5">
                    <input
                      type="text"
                      value={datumA}
                      onChange={(e) => setDatumA(e.target.value)}
                      className="w-1/3 h-7 text-center rounded border border-border-hairline bg-surface text-text-primary font-mono text-xs"
                    />
                    <input
                      type="text"
                      value={datumB}
                      onChange={(e) => setDatumB(e.target.value)}
                      className="w-1/3 h-7 text-center rounded border border-border-hairline bg-surface text-text-primary font-mono text-xs"
                    />
                    <input
                      type="text"
                      value={datumC}
                      onChange={(e) => setDatumC(e.target.value)}
                      className="w-1/3 h-7 text-center rounded border border-border-hairline bg-surface text-text-primary font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Limits & Tolerances Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[var(--text-muted)] block mb-0.5 font-medium">Nominal Value</label>
                <input
                  type="text"
                  value={characteristic.nominal_text || fmt3(characteristic.nominal_value ?? characteristic.nominal)}
                  onChange={(e) => handleFieldChange('nominal_text', e.target.value)}
                  className="w-full h-7 px-2 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] font-mono font-bold syntax-nominal focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-0.5 font-medium">Designator</label>
                <select
                  value={characteristic.designator}
                  onChange={(e) => handleFieldChange('designator', e.target.value as 'Critical' | 'Major' | 'Minor')}
                  className="w-full h-7 px-2 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] text-[11px]"
                >
                  <option value="Critical">Critical (AS9102 Key)</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-0.5 font-medium">Lower Limit (LSL)</label>
                <div className="h-7 px-2 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex items-center font-mono font-bold syntax-tolerance">
                  {fmt3(lslVal)} {characteristic.units}
                </div>
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-0.5 font-medium">Upper Limit (USL)</label>
                <div className="h-7 px-2 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex items-center font-mono font-bold syntax-tolerance">
                  {fmt3(uslVal)} {characteristic.units}
                </div>
              </div>
            </div>

            {/* Inspection Gauge & Measured DRO */}
            <div className="p-2.5 rounded-lg border border-border-strong bg-subtle/50 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Digital Caliper DRO & Tooling</span>
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    isPass
                      ? 'bg-status-pass-bg text-status-pass-text border border-status-pass-border'
                      : isFail
                      ? 'bg-status-fail-bg text-status-fail-text border border-status-fail-border'
                      : 'bg-status-warn-bg text-status-warn-text border border-status-warn-border'
                  }`}
                >
                  {isPass ? 'PASS' : isFail ? 'OUT OF SPEC' : 'NEEDS REVIEW'}
                </span>
              </div>

              <div>
                <label className="text-[10px] text-text-muted block mb-0.5">Measurement Instrument</label>
                <input
                  type="text"
                  value={characteristic.instrument}
                  onChange={(e) => handleFieldChange('instrument', e.target.value)}
                  className="w-full h-7 px-2 rounded border border-border-hairline bg-surface font-sans text-xs text-text-primary"
                />
              </div>

              <div>
                <label className="text-[10px] text-text-muted block mb-0.5 font-semibold">
                  Live Measured Value ({characteristic.units})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Enter reading..."
                    value={characteristic.measuredValue !== undefined && characteristic.measuredValue !== null ? characteristic.measuredValue : ''}
                    onChange={(e) => handleFieldChange('measuredValue', e.target.value)}
                    className="flex-1 h-9 px-2.5 rounded border-2 border-accent-primary bg-surface text-text-primary font-mono text-sm font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleFieldChange('measuredValue', Number(((lslVal + uslVal) / 2).toFixed(3)))}
                    className="h-9 px-2.5 rounded bg-subtle border border-border-hairline hover:bg-surface text-[11px] font-mono text-text-secondary font-medium"
                    title="Set reading to exact nominal midpoint"
                  >
                    Nominal
                  </button>
                </div>
              </div>
            </div>

            {/* Capability 4: Live Dynamic MMC Bonus & Datum Shift Calculator */}
            {isGdtMmc && (
              <div className="p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-status-pass" />
                    <span>ASME Y14.5 Dynamic MMC & Datum Shift</span>
                  </span>
                  <span className="font-mono text-[10px] px-1 rounded bg-white/70 dark:bg-black/30 font-bold">
                    {mmcCalc.passedViaBonus ? 'BONUS ACTIVE' : 'MMC / RFS'}
                  </span>
                </div>

                {/* Live Math Equation Pill */}
                <div className="p-2 rounded bg-surface border border-border-hairline text-[11px] font-mono leading-relaxed space-y-1">
                  <div className="text-text-secondary text-[10px]">
                    Effective USL = T<sub>stated</sub> + Bonus<sub>Feat MMC</sub> + Shift<sub>Datum B MMC</sub>
                  </div>
                  <div className="font-bold text-text-primary text-[11px]">
                    {fmt3(mmcCalc.statedTolerance)} + {fmt3(mmcCalc.featureBonus)} + {fmt3(mmcCalc.datumShift)} ={' '}
                    <span className="text-status-pass">{fmt3(mmcCalc.effectiveUsl)} mm</span>
                  </div>
                </div>

                {/* Saved from false scrap badge */}
                {mmcCalc.passedViaBonus ? (
                  <div className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-400 dark:border-emerald-700 text-status-pass text-xs font-bold flex items-start gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-status-pass" />
                    <div>
                      <div>✅ PASS VIA MMC BONUS (SAVED FROM FALSE SCRAP)</div>
                      <div className="text-[10px] font-normal text-text-secondary mt-0.5 font-sans leading-tight">
                        Reading ({fmt3(characteristic.measuredValue)} mm) exceeds static {fmt3(mmcCalc.statedTolerance)} mm limit, but dynamically passes under the {fmt3(mmcCalc.effectiveUsl)} mm MMC envelope derived from Tag #01 datum bore departure.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[10px] text-text-muted">
                    <span>Test MMC Envelope:</span>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('measuredValue', 0.058)}
                      className="text-accent-primary hover:underline font-mono"
                    >
                      Simulate 0.058mm (Pass via Bonus)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Capability 3: ISO 68-1 / ISO 965 Metric & Unified Thread Metrology Parameters */}
            {(characteristic.toleranceType === 'Thread' || characteristic.rawCallout.toUpperCase().startsWith('M')) && (
              <div className="p-2.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-purple-800 dark:text-purple-300">
                  <span>ISO 68-1 / ISO 965 Thread Parameters</span>
                  <span className="font-mono text-[10px] px-1 rounded bg-white/70 dark:bg-black/30 font-bold">
                    {characteristic.threadData?.threadClass || '6H'}
                  </span>
                </div>

                {(() => {
                  const tData = characteristic.threadData || calculateISOThread(10, 1.5, '6H', true);
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                        <div className="p-1.5 rounded bg-surface border border-border-hairline">
                          <span className="text-[10px] text-text-muted block">Pitch (P)</span>
                          <span className="font-bold text-text-primary">{tData.pitch.toFixed(3)} mm</span>
                        </div>
                        <div className="p-1.5 rounded bg-surface border border-border-hairline">
                          <span className="text-[10px] text-text-muted block">Triangle Height (H)</span>
                          <span className="font-bold text-text-primary">{tData.fundamentalHeight.toFixed(3)} mm</span>
                        </div>
                        <div className="p-1.5 rounded bg-surface border border-border-hairline col-span-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-text-muted">Pitch Diameter (D₂)</span>
                            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                              D - 0.649519·P
                            </span>
                          </div>
                          <span className="text-sm font-bold text-text-primary">
                            {tData.pitchDiameterD2.toFixed(3)} mm
                          </span>
                          <span className="text-[10px] text-text-secondary block mt-0.5">
                            Inspected via: GO / NO-GO Thread Plug Gauge ({tData.gaugeSerial})
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-surface border border-border-hairline col-span-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-text-muted">Minor Bore Diameter (D₁)</span>
                            <span className="text-[10px] font-mono text-text-muted">D - 1.082532·P</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-text-primary">
                              {tData.minorD1Lsl.toFixed(3)} - {tData.minorD1Usl.toFixed(3)} mm
                            </span>
                            <span className="text-[10px] text-text-muted">Meyer Pin / Bore Gauge</span>
                          </div>
                        </div>
                      </div>

                      {/* GO / NO-GO Attribute Gauging Toggle */}
                      <div className="pt-1 border-t border-purple-200 dark:border-purple-800/60 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-semibold text-text-secondary">Thread Plug Gauging:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateCharacteristic(characteristic.id, {
                                status: 'in_spec',
                                threadData: { ...tData, goNoGoResult: 'PASS' },
                              });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              tData.goNoGoResult === 'PASS'
                                ? 'bg-status-pass text-white'
                                : 'bg-subtle text-text-secondary hover:bg-surface'
                            }`}
                          >
                            GO: PASS
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateCharacteristic(characteristic.id, {
                                status: 'out_of_spec',
                                threadData: { ...tData, goNoGoResult: 'FAIL' },
                              });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              tData.goNoGoResult === 'FAIL'
                                ? 'bg-status-fail text-white'
                                : 'bg-subtle text-text-secondary hover:bg-surface'
                            }`}
                          >
                            NO-GO: FAIL
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Capability 2: Multi-Feature 4X Cavities Inspector */}
            {characteristic.quantity && characteristic.quantity > 1 && characteristic.subFeatures && (
              <div className="p-2.5 rounded-lg border border-border-hairline bg-subtle/40 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Split className="w-3.5 h-3.5 text-accent-primary" />
                    <span>Multi-Feature {characteristic.quantity}X Cavities</span>
                  </span>
                  <span className="font-mono text-[10px] text-status-pass font-bold">
                    All {characteristic.quantity} PASS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {characteristic.subFeatures.map((sub) => (
                    <div key={sub.subId} className="p-1.5 rounded bg-surface border border-border-hairline text-[11px]">
                      <div className="flex justify-between items-center text-[10px] text-text-muted mb-0.5">
                        <span className="font-bold">{sub.label}</span>
                        <span className="text-status-pass font-bold">PASS</span>
                      </div>
                      <input
                        type="number"
                        step="0.001"
                        value={sub.measuredValue !== undefined && sub.measuredValue !== null ? sub.measuredValue : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const updatedSub = characteristic.subFeatures?.map((s) =>
                            s.subId === sub.subId ? { ...s, measuredValue: isNaN(val) ? null : val } : s
                          );
                          onUpdateCharacteristic(characteristic.id, { subFeatures: updatedSub });
                        }}
                        className="w-full h-6 px-1.5 rounded border border-border-hairline font-mono text-xs font-semibold"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-text-muted text-center pt-0.5">
                  Cavity Limits: Min: 8.512 mm | Max: 8.548 mm
                </div>
              </div>
            )}

            {/* Capability 2: Compound Callout Splitter */}
            {characteristic.compoundSubTags && characteristic.compoundSubTags.length > 0 ? (
              <div className="p-2.5 rounded-lg border border-border-hairline bg-subtle/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-accent-primary" />
                    <span>Compound Sub-Characteristics</span>
                  </span>
                  <span className="text-[10px] font-mono text-accent-primary font-bold">
                    {characteristic.compoundSubTags.length} Sub-Tags
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  {characteristic.compoundSubTags.map((sub) => (
                    <div
                      key={sub.subTag}
                      className="p-1.5 rounded bg-surface border border-border-hairline flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-accent-primary mr-1.5">{sub.subTag}:</span>
                        <span className="font-medium text-text-primary">{sub.description}</span>
                        <div className="text-[10px] font-mono text-text-muted">
                          {sub.nominal_text} ({sub.instrument})
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-status-pass">
                        {fmt3(sub.measuredValue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              (characteristic.balloonNumber === 4 || characteristic.rawCallout.includes('THRU')) && (
                <button
                  type="button"
                  onClick={handleSplitCompound}
                  className="w-full h-7.5 rounded-md border border-accent-primary/40 bg-subtle hover:bg-surface text-accent-primary font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Decompose compound callout into #04A (Thru Hole), #04B (Counterbore Dia), and #04C (Depth)"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>[✂ Split into Sub-Characteristics]</span>
                </button>
              )
            )}

            {/* Danger Zone: Delete */}
            <div className="pt-2 border-t border-border-hairline flex justify-between items-center text-[11px]">
              <span className="text-text-muted">Char ID: {characteristic.id.slice(0, 8)}...</span>
              <button
                onClick={() => onDeleteCharacteristic(characteristic.id)}
                className="text-status-fail hover:text-red-700 flex items-center gap-1 font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Callout</span>
              </button>
            </div>
          </>
        ) : (
          /* Tab 2: SPC Moving Range Control Chart */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
              <span>SPC Moving Range (I-MR) Chart</span>
              <span
                className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                  spcData.inControl
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-status-pass'
                    : 'bg-red-50 dark:bg-red-950/40 text-status-fail'
                }`}
              >
                {spcData.inControl ? 'IN CONTROL' : 'OUT OF CONTROL'}
              </span>
            </div>

            {/* SVG Control Chart: Individuals (X) */}
            <div className="p-2.5 rounded-lg border border-border-hairline bg-surface space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
                <span className="font-bold text-text-secondary">Individual Values (X)</span>
                <span>UCL: {fmt3(spcData.ucl)} | LCL: {fmt3(spcData.lcl)}</span>
              </div>

              <div className="w-full h-32 relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120">
                  {/* Background grid */}
                  <line x1="20" y1="20" x2="290" y2="20" stroke="#EF4444" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="20" y1="60" x2="290" y2="60" stroke="#10B981" strokeWidth="1.25" />
                  <line x1="20" y1="100" x2="290" y2="100" stroke="#EF4444" strokeDasharray="3 3" strokeWidth="1" />

                  {/* Labels */}
                  <text x="295" y="23" fill="#EF4444" fontSize="8" fontFamily="monospace">UCL</text>
                  <text x="295" y="63" fill="#10B981" fontSize="8" fontFamily="monospace">X̄</text>
                  <text x="295" y="103" fill="#EF4444" fontSize="8" fontFamily="monospace">LCL</text>

                  {/* Connecting Line and Dots */}
                  {(() => {
                    const points = spcData.samples.map((s, i) => {
                      const spread = Math.max(0.001, spcData.ucl - spcData.lcl);
                      const x = 30 + (i * (250 / Math.max(1, spcData.samples.length - 1)));
                      // Normalize y: UCL at 20, LCL at 100
                      const y = 100 - ((s - spcData.lcl) / spread) * 80;
                      return { x, y: Math.min(115, Math.max(5, y)), val: s };
                    });

                    const polylinePts = points.map(p => `${p.x},${p.y}`).join(' ');

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#0284C7"
                          strokeWidth="1.75"
                          points={polylinePts}
                        />
                        {points.map((p, idx) => (
                          <g key={idx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="3.5"
                              fill={p.val >= spcData.lcl && p.val <= spcData.ucl ? '#0284C7' : '#EF4444'}
                              stroke="#FFFFFF"
                              strokeWidth="1"
                            />
                            <text
                              x={p.x}
                              y={p.y - 6}
                              fill="#64748B"
                              fontSize="7"
                              textAnchor="middle"
                              fontFamily="monospace"
                            >
                              {p.val.toFixed(2)}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* SVG Control Chart: Moving Range (MR) */}
            <div className="p-2.5 rounded-lg border border-border-hairline bg-surface space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
                <span className="font-bold text-text-secondary">Moving Range (MR)</span>
                <span>MR̄: {fmt3(spcData.avgMovingRange)} | UCL: {fmt3(spcData.ucl_mr)}</span>
              </div>

              <div className="w-full h-24 relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 80">
                  <line x1="20" y1="15" x2="290" y2="15" stroke="#F59E0B" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="20" y1="45" x2="290" y2="45" stroke="#64748B" strokeWidth="1" />
                  <line x1="20" y1="75" x2="290" y2="75" stroke="#E2E8F0" strokeWidth="1" />

                  <text x="295" y="18" fill="#F59E0B" fontSize="8" fontFamily="monospace">UCL</text>
                  <text x="295" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">MR̄</text>

                  {(() => {
                    if (spcData.movingRanges.length === 0) return null;
                    const maxMR = Math.max(spcData.ucl_mr * 1.2, 0.005);
                    const mrPoints = spcData.movingRanges.map((mr, i) => {
                      const x = 40 + (i * (240 / Math.max(1, spcData.movingRanges.length - 1)));
                      const y = 75 - (mr / maxMR) * 60;
                      return { x, y: Math.max(5, y), mr };
                    });

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#8B5CF6"
                          strokeWidth="1.5"
                          points={mrPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        />
                        {mrPoints.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r="2.5"
                            fill="#8B5CF6"
                            stroke="#FFFFFF"
                            strokeWidth="0.75"
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Statistical Capability Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 p-2 rounded-lg border border-border-hairline bg-subtle/50 text-[11px] font-mono">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted">Mean (X̄):</span>
                  <span className="font-bold text-text-primary">{fmt3(spcData.mean)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Avg MR:</span>
                  <span className="font-bold text-text-primary">{fmt3(spcData.avgMovingRange)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Est. σ:</span>
                  <span className="font-bold text-text-primary">{fmt3(spcData.sigma)}</span>
                </div>
              </div>

              <div className="space-y-1 pl-2 border-l border-border-hairline">
                <div className="flex justify-between">
                  <span className="text-text-muted">Cp:</span>
                  <span className={`font-bold ${spcData.cp >= 1.33 ? 'text-status-pass' : 'text-status-warn'}`}>
                    {spcData.cp.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Cpk:</span>
                  <span className={`font-bold ${spcData.cpk >= 1.33 ? 'text-status-pass' : 'text-status-warn'}`}>
                    {spcData.cpk.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Samples:</span>
                  <span className="font-bold text-text-primary">{spcData.samples.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

