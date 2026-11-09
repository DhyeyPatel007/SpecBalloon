import React, { useState } from 'react';
import {
  X,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  Trash2,
  Eye,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  ZoomIn,
  Search,
  Compass
} from 'lucide-react';
import { Characteristic, DrawingSpec, InspectionStatus } from '../../types/metrology';
import {
  fmt3,
  calculateDynamicMmcBonus,
  calculateISO286,
  calculateISOThread
} from '../../utils/metrologyMath';
import { soundEngine } from '../../utils/audioSynthesizer';
import {
  analyzeCalloutCropWithGemini,
  applyDeterministicMetrologyGuardrails,
  GeminiCropAnalysis
} from '../../lib/geminiVision';

export type RightDockTab = 'queue' | 'inspector' | 'layers';

export interface StudioRightDockProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: RightDockTab;
  onTabChange: (tab: RightDockTab) => void;
  drawing: DrawingSpec;
  characteristics: Characteristic[];
  activeBalloonId: string | null;
  onSelectCharacteristic: (id: string) => void;
  onUpdateCharacteristic: (id: string, updates: Partial<Characteristic>) => void;
  onDeleteCharacteristic: (id: string) => void;
  onApproveAll?: () => void;
  visibleLayers: {
    balloons: boolean;
    dimensions: boolean;
    datums: boolean;
    grid: boolean;
  };
  onToggleLayer: (layer: 'balloons' | 'dimensions' | 'datums' | 'grid') => void;
  selectedDatum?: 'A' | 'B' | 'C' | null;
  onSelectDatum?: (datum: 'A' | 'B' | 'C') => void;
  onSelectView?: (view: string) => void;
  isRevisionDiffMode?: boolean;
  onToggleRevisionDiff?: () => void;
  onExportExcel?: () => void;
}

export const StudioRightDock: React.FC<StudioRightDockProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  drawing,
  characteristics,
  activeBalloonId,
  onSelectCharacteristic,
  onUpdateCharacteristic,
  onDeleteCharacteristic,
  onApproveAll,
  visibleLayers,
  onToggleLayer,
  selectedDatum,
  onSelectDatum,
  onSelectView,
  isRevisionDiffMode = false,
  onToggleRevisionDiff,
  onExportExcel,
}) => {
  const activeChar = characteristics.find((c) => c.id === activeBalloonId) || characteristics[0] || null;

  // Filter flagged queue: unreviewed, confidence < 85%, needs_review, or out_of_spec
  const flaggedItems = characteristics.filter(
    (c) => c.status === 'needs_review' || c.status === 'out_of_spec' || (!c.reviewed && c.confidence < 85)
  );

  // Gemini state for inspector
  const [isScanning, setIsScanning] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<GeminiCropAnalysis | null>(null);

  // Inspector GD&T state
  const [gdtSymbol, setGdtSymbol] = useState<string>('⌖');
  const [gdtTol, setGdtTol] = useState<string>('Ø0.05');
  const [gdtModifier, setGdtModifier] = useState<string>('Ⓜ');
  const [datumA, setDatumA] = useState<string>('A');
  const [datumB, setDatumB] = useState<string>('B');
  const [datumC, setDatumC] = useState<string>('C');

  if (!isOpen) return null;

  const handleApprove = (id: string) => {
    onUpdateCharacteristic(id, {
      status: 'in_spec',
      reviewed: true,
      confidence: Math.max(90, characteristics.find(c => c.id === id)?.confidence || 90),
    });
    soundEngine.playInSpecPass();

    // Advance to next flagged item if available
    const nextItem = flaggedItems.find((c) => c.id !== id);
    if (nextItem) {
      onSelectCharacteristic(nextItem.id);
    }
  };

  const handlePrevChar = () => {
    if (!activeChar) return;
    const currentIndex = characteristics.findIndex((c) => c.id === activeChar.id);
    const prevIdx = (currentIndex - 1 + characteristics.length) % characteristics.length;
    onSelectCharacteristic(characteristics[prevIdx].id);
    soundEngine.playKeyClick();
  };

  const handleNextChar = () => {
    if (!activeChar) return;
    const currentIndex = characteristics.findIndex((c) => c.id === activeChar.id);
    const nextIdx = (currentIndex + 1) % characteristics.length;
    onSelectCharacteristic(characteristics[nextIdx].id);
    soundEngine.playKeyClick();
  };

  return (
    <aside
      className="w-[380px] h-full flex-shrink-0 bg-[var(--bg-surface)] border-l border-[var(--border-hairline)] flex flex-col z-20 shadow-xl overflow-hidden select-none transition-all duration-200"
      aria-label="Studio Dock"
    >
      {/* Dock Header & 3 Tabs */}
      <div className="h-12 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTabChange('queue')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs border border-[var(--border-hairline)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Flagged Queue</span>
            {flaggedItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                {flaggedItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('inspector')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'inspector'
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs border border-[var(--border-hairline)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Inspector</span>
          </button>

          <button
            onClick={() => onTabChange('layers')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'layers'
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs border border-[var(--border-hairline)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Views & Layers</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          title="Close Dock"
        >
          <X className="w-4 h-4 stroke-[1.75]" />
        </button>
      </div>

      {/* Dock Content Body */}
      <div className="flex-1 overflow-y-auto">
        {/* TAB 1: FLAGGED QUEUE */}
        {activeTab === 'queue' && (
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Items Needing Review
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {flaggedItems.length === 0
                    ? 'All dimensions verified to 100% confidence.'
                    : `${flaggedItems.length} dimensions flagged for verification before AS9102 export.`}
                </p>
              </div>
              {flaggedItems.length > 0 && onApproveAll && (
                <button
                  onClick={onApproveAll}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Approve All</span>
                </button>
              )}
            </div>

            {flaggedItems.length === 0 ? (
              <div className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center my-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2.5" />
                <h5 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  All Characteristics Verified ✓
                </h5>
                <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                  Every dimension matches ISO 286 / ASME limits and is verified. You are ready to generate the certified AS9102 package.
                </p>
                {onExportExcel && (
                  <button
                    onClick={onExportExcel}
                    className="w-full py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download AS9102 Excel Package</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {flaggedItems.map((item) => {
                  const isSelected = item.id === activeBalloonId;
                  const flagReason =
                    item.status === 'out_of_spec'
                      ? 'Measurement exceeds tolerance limits'
                      : item.confidence < 85
                      ? `Low OCR confidence (${item.confidence.toFixed(0)}%)`
                      : 'Missing explicit tolerance limits';

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectCharacteristic(item.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-xs'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {/* Item Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-mono font-bold text-xs flex items-center justify-center">
                            #{item.balloonNumber < 10 ? `0${item.balloonNumber}` : item.balloonNumber}
                          </span>
                          <div>
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                              {item.nominal_text || item.rawCallout}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono ml-2">
                              Zone {item.zone}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            item.designator === 'Critical'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.designator}
                        </span>
                      </div>

                      {/* Flag Reason */}
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-2.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{flagReason}</span>
                      </div>

                      {/* Cropped Image Thumbnail if present */}
                      {item.cropDataUrl && (
                        <div className="w-full h-12 bg-black/5 dark:bg-black/30 rounded border border-[var(--border-hairline)] mb-2.5 overflow-hidden flex items-center justify-center">
                          <img
                            src={item.cropDataUrl}
                            alt={item.rawCallout}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}

                      {/* Inline Quick Editable Limits */}
                      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] font-mono block">
                            Nominal
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={item.nominal_value ?? item.nominal ?? ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                onUpdateCharacteristic(item.id, {
                                  nominal_value: val,
                                  nominal: val,
                                  nominal_text: `${val}`,
                                  lsl: val - item.minusTolerance,
                                  usl: val + item.plusTolerance,
                                });
                              }
                            }}
                            className="w-full px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] font-mono block">
                            +Tol
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={item.plusTolerance}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                onUpdateCharacteristic(item.id, {
                                  plusTolerance: val,
                                  usl: (item.nominal_value ?? 0) + val,
                                });
                              }
                            }}
                            className="w-full px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] font-mono block">
                            -Tol
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={item.minusTolerance}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                onUpdateCharacteristic(item.id, {
                                  minusTolerance: val,
                                  lsl: (item.nominal_value ?? 0) - val,
                                });
                              }
                            }}
                            className="w-full px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
                          />
                        </div>
                      </div>

                      {/* Action Button: 1-Click Approve */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(item.id);
                          }}
                          className="flex-1 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Verify (Enter)</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCharacteristic(item.id);
                          }}
                          className="p-1.5 rounded-md border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete Dimension"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETAILED CHARACTERISTIC INSPECTOR */}
        {activeTab === 'inspector' && (
          <div className="p-3.5 space-y-4">
            {!activeChar ? (
              <div className="p-8 text-center text-[var(--text-muted)] text-xs">
                <Sliders className="w-8 h-8 text-[var(--border-strong)] mx-auto mb-2" />
                <p className="font-semibold text-[var(--text-secondary)]">No Characteristic Selected</p>
                <p className="text-[11px] mt-1">Select a callout on the CAD drawing to inspect details.</p>
              </div>
            ) : (
              <>
                {/* Navigation Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[var(--accent)] text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                      #{activeChar.balloonNumber < 10 ? `0${activeChar.balloonNumber}` : activeChar.balloonNumber}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] font-mono">
                        Tag #{activeChar.balloonNumber < 10 ? `0${activeChar.balloonNumber}` : activeChar.balloonNumber}
                      </h4>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        Zone {activeChar.zone} · Sheet 1
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevChar}
                      className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="Previous (↑)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextChar}
                      className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="Next (↓)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Cropped Image & Zoom */}
                {activeChar.cropDataUrl && (
                  <div className="rounded-lg border border-[var(--border-hairline)] bg-black/5 dark:bg-black/30 p-2 flex flex-col items-center">
                    <img
                      src={activeChar.cropDataUrl}
                      alt={activeChar.rawCallout}
                      className="max-h-20 max-w-full object-contain mb-1"
                    />
                    <div className="flex items-center justify-between w-full text-[10px] font-mono text-[var(--text-muted)]">
                      <span>300 DPI Vector Crop</span>
                      <span>Confidence: {activeChar.confidence.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* Callout & Classification */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-[var(--text-secondary)]">
                      Designation Class
                    </label>
                    <div className="flex items-center gap-1">
                      {(['Critical', 'Major', 'Minor'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => onUpdateCharacteristic(activeChar.id, { designator: d })}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                            activeChar.designator === d
                              ? d === 'Critical'
                                ? 'bg-rose-600 text-white font-bold'
                                : d === 'Major'
                                ? 'bg-amber-600 text-white font-bold'
                                : 'bg-[var(--accent)] text-white font-bold'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-hairline)]'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Raw Drawing Callout
                    </label>
                    <input
                      type="text"
                      value={activeChar.rawCallout}
                      onChange={(e) => onUpdateCharacteristic(activeChar.id, { rawCallout: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                {/* Dynamic MMC Bonus & GD&T Feature Control Frame (if applicable) */}
                {activeChar.hasMmcModifier && (
                  <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                        Dynamic MMC Bonus Solver
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                        ASME Y14.5
                      </span>
                    </div>

                    {(() => {
                      const datumBChar = characteristics.find((c) => c.datumFeature === 'B');
                      const mmcCalc = calculateDynamicMmcBonus(activeChar, datumBChar);

                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                            <span className="text-[10px] text-[var(--text-muted)] block">Bonus Tolerance</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                              +{fmt3(mmcCalc.featureBonus)} mm
                            </span>
                          </div>
                          <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                            <span className="text-[10px] text-[var(--text-muted)] block">Max Allowed Error</span>
                            <span className="font-bold text-[var(--accent)] text-xs">
                              Ø{fmt3(mmcCalc.effectiveUsl)} mm
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Production Caliper Shop-Floor Input */}
                <div className="p-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)] block">
                    Shop-Floor Measurement Entry
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Enter measured mm..."
                        value={activeChar.measuredValue ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          if (val === null) {
                            onUpdateCharacteristic(activeChar.id, { measuredValue: null });
                          } else if (!isNaN(val)) {
                            const lsl = activeChar.lower_limit ?? activeChar.lsl;
                            const usl = activeChar.upper_limit ?? activeChar.usl;
                            const inSpec = val >= lsl && val <= usl;
                            onUpdateCharacteristic(activeChar.id, {
                              measuredValue: val,
                              status: inSpec ? 'in_spec' : 'out_of_spec',
                              reviewed: true,
                            });
                          }
                        }}
                        className="w-full pl-2.5 pr-10 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] font-mono text-xs font-bold text-[var(--text-primary)]"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--text-muted)]">
                        {activeChar.units}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold ${
                        activeChar.status === 'in_spec'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : activeChar.status === 'out_of_spec'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {activeChar.status === 'in_spec' ? 'PASS' : activeChar.status === 'out_of_spec' ? 'FAIL' : 'REVIEW'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] pt-1">
                    <span>LSL: {fmt3(activeChar.lower_limit ?? activeChar.lsl)}</span>
                    <span>USL: {fmt3(activeChar.upper_limit ?? activeChar.usl)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateCharacteristic(activeChar.id, { status: 'in_spec', reviewed: true });
                      soundEngine.playInSpecPass();
                      handleNextChar();
                    }}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Next (Enter)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteCharacteristic(activeChar.id)}
                    className="p-2 rounded-lg border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    title="Delete Callout (D)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: VIEWS & LAYERS */}
        {activeTab === 'layers' && (
          <div className="p-3.5 space-y-4 text-xs font-sans">
            {/* Sheet & Views */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                Drawing Views
              </h4>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { name: 'Front Flange & Bolt Circle', key: 'front', tag: 4 },
                  { name: 'Section A-A (Cylinder Bore)', key: 'section', tag: 1 },
                  { name: 'Detail B (Thread & Chamfer)', key: 'detail', tag: 3 },
                ].map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      onSelectView?.(v.key);
                      const target = characteristics.find((c) => c.balloonNumber === v.tag);
                      if (target) onSelectCharacteristic(target.id);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-md text-left flex items-center justify-between bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <span>{v.name}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Jump</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Datums */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-500" />
                <span>Primary Datums</span>
              </h4>
              <div className="flex items-center gap-2">
                {(['A', 'B', 'C'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSelectDatum?.(d)}
                    className={`flex-1 py-1.5 rounded font-mono font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      selectedDatum === d
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-hairline)]'
                    }`}
                  >
                    <span>[{d}]</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Layer Toggles */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                Layer Visibility
              </h4>
              <div className="space-y-1.5">
                {[
                  { key: 'balloons', label: 'Inspection Balloons (#01..#17)' },
                  { key: 'dimensions', label: 'Dimension Annotations & Bboxes' },
                  { key: 'datums', label: 'Datum Reference Targets' },
                  { key: 'grid', label: 'ISO Sheet Grid (A-D, 1-8)' },
                ].map(({ key, label }) => {
                  const isVis = visibleLayers[key as keyof typeof visibleLayers];
                  return (
                    <label
                      key={key}
                      className="flex items-center justify-between p-2 rounded bg-[var(--bg-subtle)] cursor-pointer hover:bg-[var(--border-hairline)]"
                    >
                      <span className="text-xs text-[var(--text-primary)]">{label}</span>
                      <input
                        type="checkbox"
                        checked={isVis}
                        onChange={() => onToggleLayer(key as keyof typeof visibleLayers)}
                        className="rounded text-[var(--accent)] cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Revision Diff Toggle */}
            {onToggleRevisionDiff && (
              <div className="pt-2 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={onToggleRevisionDiff}
                  className={`w-full py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    isRevisionDiffMode
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hairline)]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isRevisionDiffMode ? 'Exit Revision Diff Mode' : 'Compare with Rev B (Diff)'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
