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
  Trash2
} from 'lucide-react';
import { Characteristic, InspectionStatus } from '../../types/metrology';
import {
  fmt3,
  parseCalloutAndCalculateLimits,
  calculateMovingRangeSPC,
  MovingRangeSPCResult
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
      <div className="w-[360px] border-l border-border-hairline bg-surface flex flex-col items-center justify-center p-6 text-center text-text-muted text-xs select-none">
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

  const lotSamples = characteristic.lotMeasurements && characteristic.lotMeasurements.length >= 2
    ? characteristic.lotMeasurements
    : [characteristic.measuredValue ?? (lslVal + uslVal) / 2];

  const spcData: MovingRangeSPCResult = calculateMovingRangeSPC(lslVal, uslVal, lotSamples);

  return (
    <div className="w-[360px] border-l border-border-hairline bg-surface flex flex-col select-none text-xs font-sans h-full z-20 flex-shrink-0 shadow-sm">
      {/* 1. Top Action Bar: [🟢 Approve & Next (Enter)] */}
      <div className="p-2 border-b border-border-hairline bg-subtle/50 flex items-center justify-between gap-2">
        <button
          onClick={handleApproveAndNext}
          className="flex-1 h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
          title="Mark Characteristic Approved and Advance to Next (Enter)"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approve & Next (Enter)</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="w-8 h-8 rounded-md border border-border-hairline hover:bg-subtle flex items-center justify-center text-text-secondary hover:text-text-primary"
            title="Previous Characteristic [Shift+Tab]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-md border border-border-hairline hover:bg-subtle flex items-center justify-center text-text-secondary hover:text-text-primary"
            title="Next Characteristic [Tab]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Sub-Tabs Header */}
      <div className="h-9 px-3 border-b border-border-hairline flex items-center justify-between bg-surface">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-accent-primary text-xs px-1.5 py-0.5 rounded bg-selected border border-accent-primary/20">
            #{characteristic.balloonNumber < 10 ? `0${characteristic.balloonNumber}` : characteristic.balloonNumber}
          </span>
          <span className="text-[11px] font-semibold text-text-primary truncate max-w-[130px]">
            {characteristic.featureDescription || 'Linear Dim'}
          </span>
          <span className="text-[10px] font-mono text-text-muted">
            ({currentIndex + 1}/{totalCount})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('ocr_edit')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
              activeTab === 'ocr_edit'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:bg-subtle'
            }`}
          >
            OCR & Edit
          </button>
          <button
            onClick={() => setActiveTab('spc_chart')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
              activeTab === 'spc_chart'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:bg-subtle'
            }`}
          >
            SPC Chart
          </button>
        </div>
      </div>

      {/* 3. Tab Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {activeTab === 'ocr_edit' ? (
          <>
            {/* Giant High-Res Zoomed Callout Preview (100% width × 110px height) */}
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
                <label className="text-text-muted block mb-0.5 font-medium">Nominal Value</label>
                <input
                  type="text"
                  value={characteristic.nominal_text || fmt3(characteristic.nominal_value ?? characteristic.nominal)}
                  onChange={(e) => handleFieldChange('nominal_text', e.target.value)}
                  className="w-full h-7 px-2 rounded border border-border-hairline bg-surface font-mono font-semibold text-text-primary"
                />
              </div>

              <div>
                <label className="text-text-muted block mb-0.5 font-medium">Designator</label>
                <select
                  value={characteristic.designator}
                  onChange={(e) => handleFieldChange('designator', e.target.value as 'Critical' | 'Major' | 'Minor')}
                  className="w-full h-7 px-2 rounded border border-border-hairline bg-surface font-semibold text-text-primary text-[11px]"
                >
                  <option value="Critical">Critical (AS9102 Key)</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>

              <div>
                <label className="text-text-muted block mb-0.5 font-medium">Lower Limit (LSL)</label>
                <div className="h-7 px-2 rounded border border-border-hairline bg-subtle flex items-center font-mono font-bold text-text-secondary">
                  {fmt3(lslVal)} {characteristic.units}
                </div>
              </div>

              <div>
                <label className="text-text-muted block mb-0.5 font-medium">Upper Limit (USL)</label>
                <div className="h-7 px-2 rounded border border-border-hairline bg-subtle flex items-center font-mono font-bold text-text-secondary">
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

