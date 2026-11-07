import React, { useState } from 'react';
import { Characteristic, DrawingSpec } from '../../types/metrology';
import { calculateSPC, fmt3, fmtSpc, fmtPct } from '../../utils/metrologyMath';
import {
  Download,
  FileSpreadsheet,
  RotateCw,
  Sparkles,
  Search,
  Undo2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface As9102SpreadsheetViewProps {
  drawing: DrawingSpec;
  characteristics: Characteristic[];
  onUpdateCharacteristic: (id: number, updates: Partial<Characteristic>) => void;
  onAutoCalculateFits: () => void;
  onSortClockwise: () => void;
  onFillSimulatedLot: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onCloseSheetView?: () => void;
  onUndoBulkAction?: () => void;
  canUndo?: boolean;
  isDrawer?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const As9102SpreadsheetView: React.FC<As9102SpreadsheetViewProps> = ({
  drawing,
  characteristics,
  onUpdateCharacteristic,
  onAutoCalculateFits,
  onSortClockwise,
  onFillSimulatedLot,
  onExportCSV,
  onExportExcel,
  onCloseSheetView,
  onUndoBulkAction,
  canUndo,
  isDrawer = false,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showLotConfirm, setShowLotConfirm] = useState(false);

  const filtered = characteristics.filter(
    (c) =>
      c.rawCallout.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.designator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instrument.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inSpecCount = characteristics.filter((c) => c.status === 'in_spec').length;
  const passRate = characteristics.length > 0 ? (inSpecCount / characteristics.length) * 100 : 100;

  // Header Bar Content (reusable between drawer and full view)
  const headerBar = (
    <div className="h-10 border-b border-border-hairline px-3 bg-surface flex items-center justify-between text-xs font-sans">
      <div className="flex items-center gap-3">
        {onCloseSheetView && !isDrawer && (
          <button
            onClick={onCloseSheetView}
            className="apple-btn-secondary px-2.5 py-1 text-xs font-semibold"
          >
            ← Back to Viewport
          </button>
        )}

        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-status-pass" />
          <span className="font-semibold text-text-pri">
            AS9102 Form 3 / PPAP Sheet
          </span>
          <span className="px-1.5 py-0.5 rounded bg-subtle border border-border-hairline font-mono font-medium text-[11px] text-text-mut">
            {characteristics.length} Dims
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 font-mono font-semibold text-[11px] text-status-pass">
            {fmtPct(passRate)} In-Spec
          </span>
        </div>
      </div>

      {/* Search Input & Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-border-hairline rounded-md bg-subtle/50 px-2 py-1 w-44 sm:w-56 text-xs">
          <Search className="w-3.5 h-3.5 text-text-mut mr-1.5 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search callout, zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent focus:outline-none text-text-pri text-xs w-full"
          />
        </div>

        <button
          onClick={() => setShowLotConfirm(true)}
          className="h-7 px-2.5 rounded-md border border-border-hairline bg-surface hover:bg-subtle text-text-sec text-xs font-medium transition-all hidden sm:flex items-center gap-1.5"
          title="Populate 3-part production lot samples"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
          <span>Fill Lot</span>
        </button>

        {canUndo && onUndoBulkAction && (
          <button
            onClick={onUndoBulkAction}
            className="h-7 px-2.5 rounded-md border border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 text-status-warn text-xs font-semibold flex items-center gap-1"
            title="Undo bulk lot action"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        )}

        {isDrawer && onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="h-7 px-2.5 rounded-md border border-border-hairline bg-surface hover:bg-subtle text-text-pri text-xs font-semibold flex items-center gap-1 transition-all"
            title={isExpanded ? 'Collapse Bottom Sheet' : 'Expand Bottom Sheet'}
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-text-mut" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-accent-primary" />
                <span>Expand Sheet</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`${
        isDrawer
          ? `w-full border-t border-border-hairline bg-surface flex flex-col z-20 transition-all duration-300 ${
              isExpanded ? 'h-80 shadow-apple-lg' : 'h-10'
            }`
          : 'fixed inset-0 top-[36px] bg-surface flex flex-col z-40 select-none font-mono text-xs overflow-hidden'
      }`}
    >
      {headerBar}

      {/* Lot Confirmation Modal */}
      {showLotConfirm && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-status-warn/30 px-3 py-2 flex items-center justify-between text-xs font-sans z-30">
          <div className="flex items-center gap-2 text-status-warn font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Populate 3-part production lot samples across all {characteristics.length} characteristics?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onFillSimulatedLot();
                setShowLotConfirm(false);
              }}
              className="apple-btn-primary px-3 py-1 text-xs"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowLotConfirm(false)}
              className="apple-btn-secondary px-3 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 14-Column Table */}
      {(!isDrawer || isExpanded) && (
        <div className="flex-1 overflow-auto bg-surface font-mono">
          <table className="w-full text-left border-collapse min-w-[1300px] text-xs">
            <thead className="sticky top-0 bg-subtle border-b border-border-hairline z-10 text-[11px] text-text-sec font-semibold">
              <tr>
                <th className="p-2 border-r border-border-hairline text-center w-12">1. CHAR</th>
                <th className="p-2 border-r border-border-hairline text-center w-16">2. ZONE</th>
                <th className="p-2 border-r border-border-hairline w-20">3. CLASS</th>
                <th className="p-2 border-r border-border-hairline min-w-[180px]">4. REQUIREMENT / GD&T</th>
                <th className="p-2 border-r border-border-hairline text-right w-20">5. NOM</th>
                <th className="p-2 border-r border-border-hairline w-20">6. TYPE</th>
                <th className="p-2 border-r border-border-hairline text-right w-16">7. +TOL</th>
                <th className="p-2 border-r border-border-hairline text-right w-16">8. -TOL</th>
                <th className="p-2 border-r border-border-hairline text-right w-20 text-status-pass font-bold">9. LSL</th>
                <th className="p-2 border-r border-border-hairline text-right w-20 text-accent-primary font-bold">10. USL</th>
                <th className="p-2 border-r border-border-hairline text-center w-12">11. UNIT</th>
                <th className="p-2 border-r border-border-hairline min-w-[160px]">12. GAUGE</th>
                <th className="p-2 border-r border-border-hairline text-right w-24">13. MEASURED</th>
                <th className="p-2 border-r border-border-hairline text-center w-28">LOT (M1,M2,M3)</th>
                <th className="p-2 text-center w-28">14. STATUS / CPK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline text-xs">
              {filtered.map((char) => {
                const spc = calculateSPC(char.lsl, char.usl, char.lotMeasurements);
                const isPass = char.status === 'in_spec';
                const isFail = char.status === 'out_of_spec';

                return (
                  <tr
                    key={char.id}
                    className="hover:bg-subtle/50 transition-colors"
                  >
                    <td className="p-2 border-r border-border-hairline text-center font-bold">
                      {char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-center text-text-sec">
                      {char.zone}
                    </td>
                    <td className="p-2 border-r border-border-hairline">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          char.designator === 'Critical'
                            ? 'bg-red-50 dark:bg-red-950/40 text-status-fail'
                            : char.designator === 'Major'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-accent-primary'
                            : 'text-text-sec'
                        }`}
                      >
                        {char.designator}
                      </span>
                    </td>
                    <td className="p-2 border-r border-border-hairline font-bold text-text-pri">
                      {char.rawCallout}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-right font-semibold">
                      {fmt3(char.nominal)}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-text-sec text-[11px]">
                      {char.toleranceType}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-right text-text-mut">
                      +{fmt3(char.plusTolerance)}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-right text-text-mut">
                      -{fmt3(char.minusTolerance)}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-right font-bold text-status-pass">
                      {fmt3(char.lsl)}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-right font-bold text-accent-primary">
                      {fmt3(char.usl)}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-center text-text-mut">
                      {char.units}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-text-sec truncate max-w-[160px]" title={char.instrument}>
                      {char.instrument}
                    </td>
                    <td className="p-2 border-r border-border-hairline text-right">
                      <input
                        type="number"
                        step="0.001"
                        value={char.measuredValue !== undefined ? char.measuredValue : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const newStatus = val >= char.lsl && val <= char.usl ? 'in_spec' : 'out_of_spec';
                            onUpdateCharacteristic(char.id, { measuredValue: val, status: newStatus });
                          }
                        }}
                        className="w-20 px-1 py-0.5 rounded border border-border-strong bg-surface text-right font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      />
                    </td>
                    <td className="p-2 border-r border-border-hairline text-center text-[10px] text-text-mut">
                      {char.lotMeasurements && char.lotMeasurements.length > 0
                        ? char.lotMeasurements.map((m) => fmt3(m)).join(', ')
                        : '—'}
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isPass
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-status-pass'
                            : isFail
                            ? 'bg-red-50 dark:bg-red-950/40 text-status-fail'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-status-warn'
                        }`}
                      >
                        {isPass ? 'PASS' : isFail ? 'FAIL' : 'REV'}
                        <span className="text-[10px] font-mono text-text-mut">({fmtSpc(spc.cpk)})</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
