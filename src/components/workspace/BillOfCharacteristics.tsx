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
  BarChart3
} from 'lucide-react';
import { Characteristic, DrawingSpec } from '../../types/metrology';
import { fmt3, fmtPct, fmtSpc, calculateMovingRangeSPC } from '../../utils/metrologyMath';

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
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'main_boc' | 'spc_heatmap' | 'basic_dims'>('main_boc');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = characteristics.filter((c) => {
    const matchesSearch =
      c.rawCallout.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.designator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nominal_text.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeSubTab === 'basic_dims') {
      return c.toleranceType === 'Basic' || c.rawCallout.includes('[') || c.rawCallout.includes('BSC');
    }
    return true;
  });

  const inSpecCount = characteristics.filter((c) => c.status === 'in_spec').length;
  const passRate = characteristics.length > 0 ? (inSpecCount / characteristics.length) * 100 : 100;

  return (
    <div className="w-full h-full border-t border-border-hairline bg-surface flex flex-col select-none text-xs font-sans overflow-hidden">
      {/* 1. Header Bar: Sub-Tabs + Search + Action Buttons */}
      <div className="h-10 border-b border-border-hairline px-3 bg-surface flex items-center justify-between text-xs font-sans gap-2 flex-shrink-0">
        {/* Left: Sub-Tabs & Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-text-primary mr-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Bill of Characteristics</span>
            <span className="px-1.5 py-0.5 rounded bg-subtle border border-border-hairline font-mono font-medium text-[11px] text-text-muted">
              {characteristics.length} Dims
            </span>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-subtle border border-border-hairline text-[11px] font-medium">
            <button
              onClick={() => setActiveSubTab('main_boc')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeSubTab === 'main_boc'
                  ? 'bg-surface text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Main AS9102 BoC
            </button>
            <button
              onClick={() => setActiveSubTab('spc_heatmap')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeSubTab === 'spc_heatmap'
                  ? 'bg-surface text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              10-Sample SPC Heatmap
            </button>
            <button
              onClick={() => setActiveSubTab('basic_dims')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeSubTab === 'basic_dims'
                  ? 'bg-surface text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Basic/Ref Dims
            </button>
          </div>
        </div>

        {/* Right: Search + Export Actions */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="flex items-center border border-border-hairline rounded-md bg-subtle/50 px-2 py-1 w-36 sm:w-48 text-xs">
            <Search className="w-3.5 h-3.5 text-text-muted mr-1.5 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search dims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-text-primary text-xs placeholder:text-text-muted"
            />
          </div>

          {onApproveAll && (
            <button
              onClick={onApproveAll}
              className="px-2 py-1 rounded-md border border-border-hairline bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary font-medium text-[11px] flex items-center gap-1 transition-all"
              title="Approve All Characteristics"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-status-pass" />
              <span className="hidden md:inline">Approve All</span>
            </button>
          )}

          <button
            onClick={onAutoCalculateFits}
            className="px-2 py-1 rounded-md border border-border-hairline bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary font-medium text-[11px] flex items-center gap-1 transition-all"
            title="Auto-Calculate Limits (ISO 286 / ISO 2768)"
          >
            <Calculator className="w-3.5 h-3.5 text-accent-primary" />
            <span className="hidden md:inline">ISO Fits</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1.5 transition-all shadow-xs"
            title="Export AS9102 Form 3 Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <button
            onClick={onExportCSV}
            className="px-2 py-1 rounded-md border border-border-hairline bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary font-medium text-[11px] flex items-center gap-1 transition-all"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {onToggleHeight && (
            <button
              onClick={onToggleHeight}
              className="p-1 rounded hover:bg-subtle text-text-muted hover:text-text-primary"
              title={isExpanded ? 'Minimize Sheet' : 'Restore Sheet'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Master Table Content */}
      <div className="flex-1 overflow-auto bg-surface">
        {activeSubTab === 'main_boc' || activeSubTab === 'basic_dims' ? (
          <table className="w-full border-collapse text-left text-xs font-mono select-text">
            <thead className="bg-subtle/90 sticky top-0 border-b border-border-hairline z-10 text-text-muted text-[11px] font-sans">
              <tr>
                <th className="p-2 font-semibold w-12 text-center">Char #</th>
                <th className="p-2 font-semibold w-14 text-center">Zone</th>
                <th className="p-2 font-semibold w-18">Type</th>
                <th className="p-2 font-semibold min-w-[200px]">Requirement / Specification</th>
                <th className="p-2 font-semibold min-w-[150px]">GD&T Control Frame</th>
                <th className="p-2 font-semibold w-24">Nominal</th>
                <th className="p-2 font-semibold w-18">+Tol</th>
                <th className="p-2 font-semibold w-18">-Tol</th>
                <th className="p-2 font-semibold w-24">LSL</th>
                <th className="p-2 font-semibold w-24">USL</th>
                <th className="p-2 font-semibold w-12">Units</th>
                <th className="p-2 font-semibold min-w-[150px]">Inspection Gauge</th>
                <th className="p-2 font-semibold w-24">Measured</th>
                <th className="p-2 font-semibold w-20 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {filtered.map((char) => {
                const isSelected = char.id === activeBalloonId;
                const isPass = char.status === 'in_spec';
                const isFail = char.status === 'out_of_spec';
                const lsl = char.lower_limit !== null && char.lower_limit !== undefined ? char.lower_limit : char.lsl;
                const usl = char.upper_limit !== null && char.upper_limit !== undefined ? char.upper_limit : char.usl;

                // Parse GD&T frame preview if available
                const isGDT = char.toleranceType === 'GD&T' || char.rawCallout.includes('|');
                const gdtBox = isGDT ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border-strong bg-subtle text-[10px] font-mono font-bold tracking-tight text-accent-primary">
                    {char.rawCallout}
                  </span>
                ) : (
                  <span className="text-text-muted text-[10px]">—</span>
                );

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
                    <td className="p-2 font-semibold text-text-primary truncate max-w-[220px]" title={char.rawCallout}>
                      {char.rawCallout}
                    </td>
                    <td className="p-2">{gdtBox}</td>
                    <td className="p-2 font-semibold text-text-primary truncate max-w-[120px]">
                      {char.nominal_text || fmt3(char.nominal_value ?? char.nominal)}
                    </td>
                    <td className="p-2 text-text-muted">+{fmt3(char.plusTolerance)}</td>
                    <td className="p-2 text-text-muted">-{fmt3(char.minusTolerance)}</td>
                    <td className="p-2 text-text-secondary font-mono">{fmt3(lsl)}</td>
                    <td className="p-2 text-text-secondary font-mono">{fmt3(usl)}</td>
                    <td className="p-2 text-text-muted">{char.units}</td>
                    <td className="p-2 text-text-secondary truncate max-w-[160px]" title={char.instrument}>
                      {char.instrument}
                    </td>
                    <td className="p-2 font-bold font-mono">
                      {char.measuredValue !== undefined && char.measuredValue !== null ? (
                        <span className={isPass ? 'text-status-pass' : 'text-status-fail'}>
                          {fmt3(char.measuredValue)}
                        </span>
                      ) : (
                        <span className="text-text-muted font-normal italic">NEEDS_REVIEW</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* 10-Sample SPC Heatmap Table */
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
                    #{idx + 1}
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

                      // Heatmap logic: within 1 sigma (green), 1 to 3 sigma (amber), outside limits (red)
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
      </div>
    </div>
  );
};

