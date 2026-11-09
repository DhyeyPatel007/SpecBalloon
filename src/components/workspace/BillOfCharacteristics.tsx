import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Undo2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Calculator,
  Layers,
  BarChart3,
  GitCompare,
  Scissors,
  Check,
  AlertTriangle,
  Clock,
  DollarSign,
  ShieldAlert,
  ChevronRight,
  Split,
  Maximize2,
  Cpu
} from 'lucide-react';
import {
  Characteristic,
  DrawingSpec,
  GageRegistryItem,
  AS9102Form1Data,
  AS9102Form2Item,
  InspectionStatus
} from '../../types/metrology';
import {
  fmt3,
  fmtPct,
  fmtSpc,
  calculateMovingRangeSPC,
  DEFAULT_GAGE_REGISTRY,
  DEFAULT_FORM1_DATA,
  DEFAULT_FORM2_ITEMS,
  calculateAQLSampling,
  calculateDynamicMmcBonus
} from '../../utils/metrologyMath';

interface BillOfCharacteristicsProps {
  drawing: DrawingSpec;
  characteristics: Characteristic[];
  activeBalloonId: string | null;
  onSelectCharacteristic: (id: string) => void;
  onUpdateCharacteristic: (id: string, updates: Partial<Characteristic>) => void;
  onAutoCalculateFits: () => void;
  onApproveAll?: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  heightPct?: number;
  onToggleHeight?: () => void;
  isExpanded?: boolean;
  isRevisionDiffMode?: boolean;
  onOpenCmmImport?: () => void;
  activeSubTab?: 'main_boc' | 'spc_heatmap' | 'form1_form2' | 'aql_costing';
  onTabChange?: (tab: 'main_boc' | 'spc_heatmap' | 'form1_form2' | 'aql_costing') => void;
}

export const BillOfCharacteristics: React.FC<BillOfCharacteristicsProps> = ({
  drawing,
  characteristics,
  activeBalloonId,
  onSelectCharacteristic,
  onUpdateCharacteristic,
  onAutoCalculateFits,
  onApproveAll,
  onExportCSV,
  onExportExcel,
  isExpanded = true,
  onToggleHeight,
  isRevisionDiffMode = false,
  onOpenCmmImport,
  activeSubTab: externalSubTab,
  onTabChange: externalOnTabChange,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<'main_boc' | 'spc_heatmap' | 'form1_form2' | 'aql_costing'>('main_boc');
  const activeSubTab = externalSubTab ?? internalSubTab;
  const setActiveSubTab = (tab: 'main_boc' | 'spc_heatmap' | 'form1_form2' | 'aql_costing') => {
    setInternalSubTab(tab);
    externalOnTabChange?.(tab);
  };
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-Feature Cavity Expansion state (#04 -> #04.1..4)
  const [expandedCavities, setExpandedCavities] = useState<Record<string, boolean>>({
    'demo-as4092c-4': true,
  });

  // Gage Calibration Registry state
  const [gageRegistry, setGageRegistry] = useState<GageRegistryItem[]>(DEFAULT_GAGE_REGISTRY);
  const [simulateExpiredCmm, setSimulateExpiredCmm] = useState(false);

  // Form 1 & Form 2 Data
  const [form1Data, setForm1Data] = useState<AS9102Form1Data>(DEFAULT_FORM1_DATA);
  const [form2Data] = useState<AS9102Form2Item[]>(DEFAULT_FORM2_ITEMS);

  // AQL Sampling & Costing Parameters
  const [aqlLotSize, setAqlLotSize] = useState(250);
  const [aqlLevel, setAqlLevel] = useState<'Level II' | 'Level III'>('Level II');
  const [qaHourlyRate, setQaHourlyRate] = useState(600); // default ₹600/hr
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  const toggleExpandCavities = (id: string) => {
    setExpandedCavities((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleCmmCalibration = () => {
    setSimulateExpiredCmm((prev) => {
      const next = !prev;
      setGageRegistry((list) =>
        list.map((g) =>
          g.id === 'CMM-01'
            ? {
                ...g,
                status: next ? 'EXPIRED' : 'VALID',
                nextDueDate: next ? '2026-10-01 (EXPIRED)' : '2027-01-20',
              }
            : g
        )
      );
      return next;
    });
  };

  const [tableFilter, setTableFilter] = useState<'all' | 'in_spec' | 'needs_review' | 'out_of_spec'>('all');

  const filtered = characteristics.filter((c) => {
    if (tableFilter !== 'all' && c.status !== tableFilter) return false;
    const matchesSearch =
      c.rawCallout.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.designator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nominal_text.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const inSpecCount = characteristics.filter((c) => c.status === 'in_spec').length;
  const needsReviewCount = characteristics.filter((c) => c.status === 'needs_review').length;
  const outOfSpecCount = characteristics.filter((c) => c.status === 'out_of_spec').length;
  const passRate = characteristics.length > 0 ? (inSpecCount / characteristics.length) * 100 : 100;

  // AQL sampling calculation result
  const aqlResult = calculateAQLSampling(aqlLotSize, aqlLevel, characteristics, qaHourlyRate, currency);

  const datumB = characteristics.find(c => c.balloonNumber === 1 || c.rawCallout.includes('H7'));

  return (
    <div className="w-full h-full border-t border-border-hairline bg-surface flex flex-col select-none text-xs font-sans overflow-hidden">
      {/* 1. Header Bar: Sub-Tabs + Search + Action Buttons */}
      <div className="h-10 border-b border-border-hairline px-3 bg-surface flex items-center justify-between text-xs font-sans gap-2 flex-shrink-0">
        {/* Left: Sub-Tabs & Title */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 font-semibold text-text-primary mr-1.5 flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden xl:inline">Bill of Characteristics</span>
            <span className="px-1.5 py-0.5 rounded bg-subtle border border-border-hairline font-mono font-medium text-[11px] text-text-muted">
              {characteristics.length} Dims
            </span>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-subtle border border-border-hairline text-[11px] font-medium flex-shrink-0">
            <button
              onClick={() => setActiveSubTab('main_boc')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                activeSubTab === 'main_boc'
                  ? 'bg-surface text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <span>📋 Form 3: BoC</span>
              {isRevisionDiffMode && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('spc_heatmap')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeSubTab === 'spc_heatmap'
                  ? 'bg-surface text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              🌡️ 10-Sample SPC Heatmap
            </button>
            <button
              onClick={() => setActiveSubTab('form1_form2')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                activeSubTab === 'form1_form2'
                  ? 'bg-surface text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <span>📄 Form 1 & 2: Part & Gage Cal</span>
              {simulateExpiredCmm && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('aql_costing')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeSubTab === 'aql_costing'
                  ? 'bg-surface text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              ⏱️ AQL Sampling & Quoting Cost
            </button>
          </div>
        </div>

        {/* Right: Status Filter Pills + Search + Collapse Button (Zero duplicate export/CMM buttons here) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status Filter Pills */}
          <div className="flex items-center p-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[10.5px] font-mono">
            <button
              onClick={() => setTableFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                tableFilter === 'all'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({characteristics.length})
            </button>
            <button
              onClick={() => setTableFilter('in_spec')}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                tableFilter === 'in_spec'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-emerald-500'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Pass ({inSpecCount})</span>
            </button>
            <button
              onClick={() => setTableFilter('needs_review')}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                tableFilter === 'needs_review'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-semibold shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-amber-500'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Review ({needsReviewCount})</span>
            </button>
            <button
              onClick={() => setTableFilter('out_of_spec')}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                tableFilter === 'out_of_spec'
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-semibold shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-red-500'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Fail ({outOfSpecCount})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex items-center border border-[var(--border-hairline)] rounded-md bg-[var(--bg-subtle)] px-2 py-1 w-32 sm:w-44 text-xs">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] mr-1.5 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search characteristics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)]"
            />
          </div>

          {onToggleHeight && (
            <button
              onClick={onToggleHeight}
              className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              title={isExpanded ? 'Minimize Sheet' : 'Restore Sheet'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Sub-Tab Body */}
      <div className="flex-1 overflow-auto bg-surface">
        {/* SUB-TAB 1: Form 3 Master Bill of Characteristics */}
        {activeSubTab === 'main_boc' && (
          <table className="w-full border-collapse text-left text-xs font-mono select-text">
            <thead className="bg-subtle/90 sticky top-0 border-b border-border-hairline z-10 text-text-muted text-[11px] font-sans">
              <tr>
                <th className="p-2 font-semibold w-12 text-center">Char #</th>
                <th className="p-2 font-semibold w-14 text-center">Zone</th>
                <th className="p-2 font-semibold w-18">Type</th>
                <th className="p-2 font-semibold min-w-[200px]">Requirement / Specification</th>
                <th className="p-2 font-semibold min-w-[150px]">GD&T Control Frame / Sub-Tags</th>
                <th className="p-2 font-semibold w-24">Nominal</th>
                <th className="p-2 font-semibold w-18">+Tol</th>
                <th className="p-2 font-semibold w-18">-Tol</th>
                <th className="p-2 font-semibold w-24">LSL</th>
                <th className="p-2 font-semibold w-24">USL</th>
                <th className="p-2 font-semibold w-12">Units</th>
                <th className="p-2 font-semibold min-w-[170px]">Inspection Gauge</th>
                <th className="p-2 font-semibold w-24">Measured</th>
                <th className="p-2 font-semibold w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {filtered.map((char) => {
                const isSelected = char.id === activeBalloonId;
                const isPass = char.status === 'in_spec';
                const isFail = char.status === 'out_of_spec';
                const lsl = char.lower_limit !== null && char.lower_limit !== undefined ? char.lower_limit : char.lsl;
                const usl = char.upper_limit !== null && char.upper_limit !== undefined ? char.upper_limit : char.usl;

                // Check Gage Expiration Guardrail
                const isCmmGage = char.instrument.toLowerCase().includes('cmm') || char.instrument.toLowerCase().includes('zeiss');
                const isGageExpired = simulateExpiredCmm && isCmmGage;

                // Check MMC Bonus status
                const isGdtMmc = char.toleranceType === 'GD&T' && (char.rawCallout.includes('(M)') || char.rawCallout.includes('Ⓜ'));
                const mmcCalc = isGdtMmc ? calculateDynamicMmcBonus(char, datumB) : null;

                // Multi-feature cavity expansion
                const is4XCavity = char.quantity && char.quantity > 1;
                const isExpanded = expandedCavities[char.id] ?? false;

                // Historical strike-through for deleted/superseded characteristics
                const isDeletedHistorical = char.deltaState === 'SUPERSEDED' || char.isDeletedHistorical;

                // Parse GD&T frame preview if available
                const isGDT = char.toleranceType === 'GD&T' || char.rawCallout.includes('|');
                const gdtBox = isGDT ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[10px] font-mono font-bold tracking-tight syntax-gdt">
                    {char.rawCallout}
                  </span>
                ) : char.toleranceType === 'Thread' ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-[10px] font-mono font-bold syntax-fit">
                    ISO 965: D2={char.threadData?.pitchDiameterD2 || '9.026'}
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)] text-[10px]">—</span>
                );

                return (
                  <React.Fragment key={char.id}>
                    <tr
                      onClick={() => onSelectCharacteristic(char.id)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected
                          ? 'bg-selected font-semibold text-text-primary'
                          : 'hover:bg-subtle/50 text-text-secondary'
                      } ${isDeletedHistorical ? 'opacity-60 bg-red-50/20 dark:bg-red-950/10 line-through' : ''}`}
                    >
                      <td className="p-2 text-center font-bold text-accent-primary">
                        {isDeletedHistorical ? (
                          <span className="text-red-500 line-through">#{char.balloonNumber}-DEL</span>
                        ) : (
                          `#${char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber}`
                        )}
                      </td>
                      <td className="p-2 text-center text-text-secondary font-mono">{char.zone}</td>
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            char.designator === 'Critical'
                              ? 'bg-red-50 dark:bg-red-950/40 text-status-fail'
                              : char.designator === 'Major'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-accent-primary'
                              : 'bg-subtle text-text-secondary'
                          }`}
                        >
                          {char.designator}
                        </span>
                      </td>

                      {/* Requirement & Diff Note */}
                      <td className="p-2 font-semibold text-text-primary max-w-[240px]">
                        <div className="flex flex-col">
                          <span className="truncate" title={char.rawCallout}>{char.rawCallout}</span>

                          {/* Capability 1: Revision Diff side-by-side badge */}
                          {char.diffNote && (
                            <span
                              className={`mt-0.5 inline-block text-[10px] font-mono font-semibold px-1 rounded ${
                                char.deltaState === 'MODIFIED'
                                  ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                                  : char.deltaState === 'ADDED'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {char.diffNote}
                            </span>
                          )}

                          {/* Multi-feature expander button */}
                          {is4XCavity && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandCavities(char.id);
                              }}
                              className="mt-1 flex items-center gap-1 text-[10px] font-sans font-bold text-accent-primary hover:underline"
                            >
                              <span>{isExpanded ? '⊟ Collapse 4X Cavities' : '⊞ Expand 4X Cavities'}</span>
                              <span className="text-[9px] text-text-muted font-mono font-normal">
                                [Min: 8.512 | Max: 8.548 | All 4 PASS]
                              </span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-2">
                        <div className="space-y-1">
                          {gdtBox}
                          {/* Compound Sub-Tags Preview */}
                          {char.compoundSubTags && char.compoundSubTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                              {char.compoundSubTags.map((sub) => (
                                <span
                                  key={sub.subTag}
                                  className="px-1 py-0.2 rounded bg-subtle border border-border-hairline text-text-secondary"
                                  title={`${sub.description} (${sub.nominal_text})`}
                                >
                                  {sub.subTag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-2 font-bold syntax-nominal truncate max-w-[120px]">
                        {char.nominal_text || fmt3(char.nominal_value ?? char.nominal)}
                      </td>
                      <td className="p-2 syntax-tolerance">+{fmt3(char.plusTolerance)}</td>
                      <td className="p-2 syntax-tolerance">-{fmt3(char.minusTolerance)}</td>
                      <td className="p-2 syntax-tolerance font-mono">{fmt3(lsl)}</td>
                      <td className="p-2 syntax-tolerance font-mono">
                        {fmt3(usl)}
                        {mmcCalc && (
                          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold" title="Effective USL with MMC Bonus">
                            Eff: {fmt3(mmcCalc.effectiveUsl)}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-text-muted">{char.units}</td>

                      {/* Tooling + Expired Gage Guardrail Warning */}
                      <td className="p-2 text-text-secondary max-w-[180px]">
                        <div className="truncate" title={char.instrument}>{char.instrument}</div>
                        {isGageExpired && (
                          <div className="inline-flex items-center gap-1 mt-0.5 px-1 py-0.2 rounded bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800 text-[9px] font-sans font-bold text-red-600 dark:text-red-400 animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>⚠️ GAGE CAL EXPIRED (CMM-01)</span>
                          </div>
                        )}
                      </td>

                      {/* Measured Value */}
                      <td className="p-2 font-bold font-mono">
                        {char.measuredValue !== undefined && char.measuredValue !== null ? (
                          <span className={isPass ? 'text-status-pass' : 'text-status-fail'}>
                            {fmt3(char.measuredValue)}
                          </span>
                        ) : (
                          <span className="text-text-muted font-normal italic">NEEDS_REVIEW</span>
                        )}
                      </td>

                      {/* Inspection Status */}
                      <td className="p-2 text-center">
                        {mmcCalc?.passedViaBonus ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            MMC PASS
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isPass
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-status-pass'
                                : isFail
                                ? 'bg-red-50 dark:bg-red-950/40 text-status-fail'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-status-warn'
                            }`}
                          >
                            {isPass ? 'PASS' : isFail ? 'FAIL' : 'REVIEW'}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Multi-Feature Expanded Sub-Rows (#04.1 .. #04.4) */}
                    {is4XCavity && isExpanded && char.subFeatures && (
                      char.subFeatures.map((sub, sIdx) => (
                        <tr
                          key={sub.subId}
                          className="bg-subtle/40 border-l-2 border-accent-primary text-[11px] font-mono text-text-secondary"
                        >
                          <td className="p-1.5 text-center font-bold text-accent-primary/80">
                            #{char.balloonNumber}.{sIdx + 1}
                          </td>
                          <td className="p-1.5 text-center text-text-muted">{char.zone}</td>
                          <td className="p-1.5 text-text-muted">Sub-Feat</td>
                          <td className="p-1.5 pl-6 font-medium text-text-primary">
                            ↳ {sub.label}
                          </td>
                          <td className="p-1.5 text-text-muted">Pin Gauge (+8.50/+8.60)</td>
                          <td className="p-1.5">{fmt3(char.nominal_value)}</td>
                          <td className="p-1.5 text-text-muted">+{fmt3(char.plusTolerance)}</td>
                          <td className="p-1.5 text-text-muted">-{fmt3(char.minusTolerance)}</td>
                          <td className="p-1.5">{fmt3(lsl)}</td>
                          <td className="p-1.5">{fmt3(usl)}</td>
                          <td className="p-1.5">{char.units}</td>
                          <td className="p-1.5 text-text-muted">Meyer Pin Gauge #PG-55</td>
                          <td className="p-1.5 font-bold font-mono">
                            <input
                              type="number"
                              step="0.001"
                              value={sub.measuredValue !== undefined && sub.measuredValue !== null ? sub.measuredValue : ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const updatedSub = char.subFeatures?.map(s =>
                                  s.subId === sub.subId
                                    ? {
                                        ...s,
                                        measuredValue: isNaN(val) ? null : val,
                                        status: (!isNaN(val) && val >= lsl && val <= usl ? 'in_spec' : 'out_of_spec') as InspectionStatus
                                      }
                                    : s
                                );
                                onUpdateCharacteristic(char.id, { subFeatures: updatedSub });
                              }}
                              className="w-20 h-6 px-1.5 rounded border border-border-hairline bg-surface text-text-primary text-[11px] font-mono font-bold"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-status-pass">
                              PASS
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {/* SUB-TAB 2: 10-Sample SPC Heatmap */}
        {activeSubTab === 'spc_heatmap' && (
          <table className="w-full border-collapse text-left text-xs font-mono select-text">
            <thead className="bg-subtle/90 sticky top-0 border-b border-border-hairline z-10 text-text-muted text-[11px] font-sans">
              <tr>
                <th className="p-2 font-semibold w-12 text-center">Char #</th>
                <th className="p-2 font-semibold min-w-[180px]">Requirement</th>
                <th className="p-2 font-semibold w-20">LSL</th>
                <th className="p-2 font-semibold w-20">USL</th>
                <th className="p-2 font-semibold w-20">Mean (X̄)</th>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <th key={idx} className="p-2 font-semibold w-16 text-center">
                    SN-00{idx + 1}
                  </th>
                ))}
                <th className="p-2 font-semibold w-16 text-center">Cp</th>
                <th className="p-2 font-semibold w-16 text-center">Cpk</th>
                <th className="p-2 font-semibold w-20 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {filtered.map((char) => {
                const isSelected = char.id === activeBalloonId;
                const lsl = char.lower_limit !== null && char.lower_limit !== undefined ? char.lower_limit : char.lsl;
                const usl = char.upper_limit !== null && char.upper_limit !== undefined ? char.upper_limit : char.usl;
                const lot = char.lotMeasurements && char.lotMeasurements.length >= 2 ? char.lotMeasurements : [char.measuredValue ?? (lsl + usl) / 2];
                const spc = calculateMovingRangeSPC(lsl, usl, lot);

                return (
                  <tr
                    key={char.id}
                    onClick={() => onSelectCharacteristic(char.id)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-selected font-semibold text-text-primary'
                        : 'hover:bg-subtle/50 text-text-secondary'
                    }`}
                  >
                    <td className="p-2 text-center font-bold text-accent-primary">
                      #{char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber}
                    </td>
                    <td className="p-2 font-semibold text-text-primary truncate max-w-[200px]" title={char.rawCallout}>
                      {char.rawCallout}
                    </td>
                    <td className="p-2 text-text-secondary">{fmt3(lsl)}</td>
                    <td className="p-2 text-text-secondary">{fmt3(usl)}</td>
                    <td className="p-2 font-bold text-text-primary">{fmt3(spc.mean)}</td>

                    {/* 10 Heat-mapped Sample Cells */}
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const sampleVal = char.lotMeasurements && char.lotMeasurements[idx];
                      if (sampleVal === undefined) {
                        return <td key={idx} className="p-2 text-center text-text-muted">—</td>;
                      }

                      const isOutOfLimits = sampleVal < lsl || sampleVal > usl;
                      const distFromMean = Math.abs(sampleVal - spc.mean);
                      const isNearLimit = distFromMean > 2 * spc.sigma;

                      let cellBg = 'bg-emerald-50/60 dark:bg-emerald-950/20 text-status-pass';
                      if (isOutOfLimits) {
                        cellBg = 'bg-red-100 dark:bg-red-950/50 text-status-fail font-bold';
                      } else if (isNearLimit) {
                        cellBg = 'bg-amber-100/70 dark:bg-amber-950/30 text-status-warn';
                      }

                      return (
                        <td key={idx} className={`p-2 text-center border-l border-border-hairline font-mono text-[11px] ${cellBg}`}>
                          {fmt3(sampleVal)}
                        </td>
                      );
                    })}

                    <td className="p-2 text-center font-bold text-text-secondary">
                      {spc.cp.toFixed(2)}
                    </td>
                    <td className="p-2 text-center font-bold">
                      <span className={spc.cpk >= 1.33 ? 'text-status-pass' : 'text-status-warn'}>
                        {spc.cpk.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          spc.inControl
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-status-pass'
                            : 'bg-red-50 dark:bg-red-950/40 text-status-fail'
                        }`}
                      >
                        {spc.inControl ? 'CONTROL' : 'OUT'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* SUB-TAB 3: Form 1 & Form 2 Accountability Suite */}
        {activeSubTab === 'form1_form2' && (
          <div className="p-4 space-y-5 max-w-6xl mx-auto font-sans">
            {/* 1. AS9102 Rev C Form 1 Card */}
            <div className="p-4 rounded-xl border border-border-hairline bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border-hairline pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-accent-primary font-mono font-bold text-[11px]">
                    AS9102 REV C — FORM 1
                  </span>
                  <h3 className="font-bold text-text-primary text-sm">Part Number Accountability</h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  STATUS: {form1Data.reportStatus.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-text-muted block font-medium">1. Organization</label>
                  <input
                    type="text"
                    value={form1Data.organization}
                    onChange={(e) => setForm1Data({ ...form1Data, organization: e.target.value })}
                    className="w-full h-7 px-2 rounded border border-border-hairline bg-subtle/50 text-text-primary font-semibold text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-medium">2. Part Number</label>
                  <div className="h-7 px-2 rounded border border-border-hairline bg-subtle flex items-center font-mono font-bold text-text-primary text-xs mt-0.5">
                    {drawing.partNumber}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-medium">3. Part Name</label>
                  <input
                    type="text"
                    value={form1Data.partName}
                    onChange={(e) => setForm1Data({ ...form1Data, partName: e.target.value })}
                    className="w-full h-7 px-2 rounded border border-border-hairline bg-subtle/50 text-text-primary font-semibold text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-medium">4. Drawing Revision</label>
                  <div className="h-7 px-2 rounded border border-border-hairline bg-subtle flex items-center font-mono font-bold text-text-primary text-xs mt-0.5">
                    {drawing.revision} (Baseline: {form1Data.baselineRevision})
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-medium">5. Serial Number</label>
                  <input
                    type="text"
                    value={form1Data.serialNumber}
                    onChange={(e) => setForm1Data({ ...form1Data, serialNumber: e.target.value })}
                    className="w-full h-7 px-2 rounded border border-border-hairline bg-subtle/50 text-text-primary font-mono text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-medium">6. FAIR Identifier</label>
                  <input
                    type="text"
                    value={form1Data.fairIdentifier}
                    onChange={(e) => setForm1Data({ ...form1Data, fairIdentifier: e.target.value })}
                    className="w-full h-7 px-2 rounded border border-border-hairline bg-subtle/50 text-text-primary font-mono text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-medium">7. Part Type</label>
                  <select
                    value={form1Data.partType}
                    onChange={(e) => setForm1Data({ ...form1Data, partType: e.target.value as 'Detail' | 'Assembly' })}
                    className="w-full h-7 px-2 rounded border border-border-hairline bg-subtle/50 text-text-primary text-xs mt-0.5"
                  >
                    <option value="Detail">Detail (Machined Component)</option>
                    <option value="Assembly">Assembly / Sub-Assembly</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-medium">8. Digital Sign-off</label>
                  <div className="h-7 px-2 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center text-status-pass text-[11px] font-semibold mt-0.5">
                    ✓ Verified by QA-Lead
                  </div>
                </div>
              </div>
            </div>

            {/* 2. AS9102 Rev C Form 2 Card (Materials & Special Processes) */}
            <div className="p-4 rounded-xl border border-border-hairline bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border-hairline pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-accent-primary font-mono font-bold text-[11px]">
                    AS9102 REV C — FORM 2
                  </span>
                  <h3 className="font-bold text-text-primary text-sm">
                    Product Accountability: Materials, Special Processes & Functional Testing
                  </h3>
                </div>
                <span className="text-[10px] text-text-muted font-mono">Auto-extracted from Blueprint Notes</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-subtle text-text-muted text-[11px] font-medium border-b border-border-hairline">
                    <tr>
                      <th className="p-2">Category</th>
                      <th className="p-2">Material / Process Specification</th>
                      <th className="p-2">Supplier / Processor</th>
                      <th className="p-2">Heat / Lot #</th>
                      <th className="p-2 text-center">Certificate of Conformance (CoC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {form2Data.map((item) => (
                      <tr key={item.id} className="hover:bg-subtle/30">
                        <td className="p-2 font-bold text-accent-primary">{item.category}</td>
                        <td className="p-2 font-mono font-medium text-text-primary">{item.specification}</td>
                        <td className="p-2 text-text-secondary">{item.supplierOrProcessor}</td>
                        <td className="p-2 font-mono text-text-muted">{item.heatLotNumber}</td>
                        <td className="p-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-status-pass font-semibold text-[11px]">
                            <Check className="w-3 h-3" />
                            <span>CoC Verified</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Active Metrology Gage Calibration Registry Card (Linked to Form 3) */}
            <div className="p-4 rounded-xl border border-border-hairline bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border-hairline pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-mono font-bold text-[11px]">
                    NIST / NABL TRACEABLE
                  </span>
                  <h3 className="font-bold text-text-primary text-sm">
                    Active Metrology Gage Calibration Registry
                  </h3>
                </div>

                {/* Audit Guardrail Simulation Toggle */}
                <button
                  type="button"
                  onClick={toggleCmmCalibration}
                  className={`px-2.5 py-1 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    simulateExpiredCmm
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-subtle hover:bg-surface text-text-secondary border-border-hairline'
                  }`}
                  title="Toggle CMM-01 calibration expiry simulation to test audit guardrails"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>
                    {simulateExpiredCmm
                      ? '⚠️ Simulating: CMM-01 Expired'
                      : 'Simulate Expired Gage (CMM-01)'}
                  </span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-mono">
                  <thead className="bg-subtle text-text-muted text-[11px] font-sans border-b border-border-hairline">
                    <tr>
                      <th className="p-2">Gage ID</th>
                      <th className="p-2">Instrument Description</th>
                      <th className="p-2">Serial Number</th>
                      <th className="p-2">Cert #</th>
                      <th className="p-2">Last Calibrated</th>
                      <th className="p-2">Next Due Date</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2">Used in Form 3 Dims</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {gageRegistry.map((gage) => {
                      const isExpired = gage.status === 'EXPIRED';
                      return (
                        <tr
                          key={gage.id}
                          className={`hover:bg-subtle/30 ${
                            isExpired ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                          }`}
                        >
                          <td className="p-2 font-bold text-accent-primary">{gage.id}</td>
                          <td className="p-2 font-sans font-medium text-text-primary">{gage.name}</td>
                          <td className="p-2 text-text-muted">{gage.serial}</td>
                          <td className="p-2 text-text-secondary">{gage.certNumber}</td>
                          <td className="p-2 text-text-muted">{gage.lastCalDate}</td>
                          <td className={`p-2 font-semibold ${isExpired ? 'text-status-fail font-bold' : 'text-text-primary'}`}>
                            {gage.nextDueDate}
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                isExpired
                                  ? 'bg-red-100 dark:bg-red-950 text-status-fail border border-red-300 dark:border-red-800 animate-pulse'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-status-pass border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              {isExpired ? '🔴 EXPIRED' : '🟢 VALID'}
                            </span>
                          </td>
                          <td className="p-2 font-bold text-accent-primary">
                            {gage.usedInTags.join(', ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 4: AQL Sampling Planner (ISO 2859-1) & RFQ Cost Estimator */}
        {activeSubTab === 'aql_costing' && (
          <div className="p-4 space-y-5 max-w-6xl mx-auto font-sans">
            {/* 4 Interactive KPI Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* Card 1: Lot Size & Level Control */}
              <div className="p-3.5 rounded-xl border border-border-hairline bg-surface shadow-xs space-y-2">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="font-semibold text-[11px] uppercase tracking-wider">Lot Size & Standard</span>
                  <span className="font-mono text-accent-primary text-[10px]">ISO 2859-1</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={aqlLotSize}
                    onChange={(e) => setAqlLotSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 h-8 px-2 rounded-md border border-border-strong bg-subtle/60 text-text-primary font-mono text-base font-bold"
                  />
                  <span className="font-medium text-text-secondary">pcs lot</span>
                </div>
                <select
                  value={aqlLevel}
                  onChange={(e) => setAqlLevel(e.target.value as 'Level II' | 'Level III')}
                  className="w-full h-7 px-1.5 rounded border border-border-hairline bg-surface text-text-secondary text-[11px]"
                >
                  <option value="Level II">Normal Inspection (Level II)</option>
                  <option value="Level III">Tightened Inspection (Level III)</option>
                </select>
              </div>

              {/* Card 2: First-Article Inspection (FAI) Time */}
              <div className="p-3.5 rounded-xl border border-border-hairline bg-surface shadow-xs space-y-1.5">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="font-semibold text-[11px] uppercase tracking-wider">FAI Time (1st Piece)</span>
                  <Clock className="w-3.5 h-3.5 text-accent-primary" />
                </div>
                <div className="text-2xl font-mono font-bold text-text-primary tracking-tight">
                  {aqlResult.faiTimeDisplay}
                </div>
                <p className="text-[11px] text-text-muted">
                  Cumulative cycle time across all {characteristics.length} blueprint callouts.
                </p>
              </div>

              {/* Card 3: Full Lot AQL Inspection Time */}
              <div className="p-3.5 rounded-xl border border-border-hairline bg-surface shadow-xs space-y-1.5">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="font-semibold text-[11px] uppercase tracking-wider">Total Lot AQL Time</span>
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {aqlResult.totalLotTimeDisplay}
                </div>
                <p className="text-[11px] text-text-muted">
                  {aqlResult.totalChecksAcrossLot} total physical checks based on criticality.
                </p>
              </div>

              {/* Card 4: Inspection Cost per Part */}
              <div className="p-3.5 rounded-xl border border-border-hairline bg-surface shadow-xs space-y-1.5">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="font-semibold text-[11px] uppercase tracking-wider">QA Cost per Part</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCurrency('INR')}
                      className={`px-1 py-0.2 rounded ${currency === 'INR' ? 'bg-accent-primary text-white font-bold' : 'text-text-muted'}`}
                    >
                      ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`px-1 py-0.2 rounded ${currency === 'USD' ? 'bg-accent-primary text-white font-bold' : 'text-text-muted'}`}
                    >
                      $
                    </button>
                  </div>
                </div>
                <div className="text-2xl font-mono font-bold text-accent-primary tracking-tight">
                  {currency === 'INR' ? '₹' : '$'}{aqlResult.costPerPart.toFixed(2)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
                  <span>QA Labor Rate:</span>
                  <span className="font-mono font-semibold text-text-secondary">
                    {currency === 'INR' ? '₹' : '$'}{qaHourlyRate}/hr
                  </span>
                </div>
              </div>
            </div>

            {/* AQL Characteristic Breakdown Table */}
            <div className="p-4 rounded-xl border border-border-hairline bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border-hairline pb-2.5">
                <div>
                  <h3 className="font-bold text-text-primary text-sm">
                    ISO 2859-1 / ANSI Z1.4 Sampling Plan Allocation
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Critical: C=0 (AQL 0.10) → {aqlResult.criticalSampleCount} pcs | Major: AQL 1.0 → {aqlResult.majorSampleCount} pcs | Minor: AQL 2.5 → {aqlResult.minorSampleCount} pcs
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-accent-primary">
                  Total QA Budget: {currency === 'INR' ? '₹' : '$'}{aqlResult.totalCost.toFixed(2)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-mono">
                  <thead className="bg-subtle text-text-muted text-[11px] font-sans border-b border-border-hairline">
                    <tr>
                      <th className="p-2 text-center w-12">Char #</th>
                      <th className="p-2">Requirement</th>
                      <th className="p-2">Criticality</th>
                      <th className="p-2">Assigned Tooling</th>
                      <th className="p-2 text-center">Cycle Time (s)</th>
                      <th className="p-2 text-center">AQL Sample Count</th>
                      <th className="p-2 text-right">Total Inspection Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {aqlResult.rows.map((row) => (
                      <tr key={row.balloonNumber} className="hover:bg-subtle/30">
                        <td className="p-2 text-center font-bold text-accent-primary">
                          #{row.balloonNumber < 10 ? `0${row.balloonNumber}` : row.balloonNumber}
                        </td>
                        <td className="p-2 font-semibold text-text-primary">{row.rawCallout}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              row.designator === 'Critical'
                                ? 'bg-red-50 dark:bg-red-950/40 text-status-fail'
                                : row.designator === 'Major'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-accent-primary'
                                : 'bg-subtle text-text-secondary'
                            }`}
                          >
                            {row.designator}
                          </span>
                        </td>
                        <td className="p-2 font-sans text-text-secondary">{row.instrument}</td>
                        <td className="p-2 text-center text-text-primary font-bold">{row.cycleTimeSec}s</td>
                        <td className="p-2 text-center font-bold text-accent-primary">
                          {row.sampleSize} pcs
                        </td>
                        <td className="p-2 text-right text-text-secondary font-mono">
                          {Math.floor(row.totalTimeSec / 60)}m {row.totalTimeSec % 60}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
