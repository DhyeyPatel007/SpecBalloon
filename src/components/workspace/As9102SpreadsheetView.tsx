import React, { useState } from 'react';
import { Characteristic, DrawingSpec } from '../../types/metrology';
import { calculateSPC, fmt3, fmtSpc, fmtPct } from '../../utils/metrologyMath';
import {
  Download,
  FileSpreadsheet,
  RotateCw,
  Search,
  Undo2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface As9102SpreadsheetViewProps {
  drawing: DrawingSpec;
  characteristics: Characteristic[];
  onUpdateCharacteristic: (id: string, updates: Partial<Characteristic>) => void;
  onAutoCalculateFits: () => void;
  onSortClockwise: () => void;
  onFillSimulatedLot: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onCloseSheetView?: () => void;
  onUndoBulkAction?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onRedoBulkAction?: () => void;
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
  canRedo,
  onRedoBulkAction,
  isDrawer = false,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = characteristics.filter(
    (c) =>
      c.rawCallout.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.designator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nominal_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inSpecCount = characteristics.filter((c) => c.status === 'in_spec').length;
  const passRate = characteristics.length > 0 ? (inSpecCount / characteristics.length) * 100 : 100;

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

      <div className="flex items-center gap-2">
        <div className="flex items-center border border-border-hairline rounded-md bg-subtle/50 px-2 py-1 w-44 sm:w-56 text-xs">
          <Search className="w-3.5 h-3.5 text-text-mut mr-1.5 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search callout, zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-text-pri text-xs placeholder:text-text-mut"
          />
        </div>

        {canUndo && onUndoBulkAction && (
          <button
            onClick={onUndoBulkAction}
            className="apple-btn-secondary px-2 py-1 text-xs font-medium flex items-center gap-1"
            title="Undo Last Action (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        )}

        {canRedo && onRedoBulkAction && (
          <button
            onClick={onRedoBulkAction}
            className="apple-btn-secondary px-2 py-1 text-xs font-medium flex items-center gap-1"
            title="Redo Action (Ctrl+Shift+Z)"
          >
            <span>Redo</span>
          </button>
        )}

        <button
          onClick={onExportExcel}
          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm"
          title="Export AS9102 Form 3 Excel (.xlsx)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Excel</span>
        </button>

        <button
          onClick={onExportCSV}
          className="apple-btn-secondary px-2.5 py-1 text-xs font-medium flex items-center gap-1.5"
          title="Export CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSV</span>
        </button>

        {isDrawer && onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="apple-btn-secondary p-1 ml-1"
            title={isExpanded ? 'Collapse Bottom Sheet' : 'Expand Bottom Sheet'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );

  const tableContent = (
    <div className="flex-1 overflow-auto bg-surface">
      <table className="w-full border-collapse text-left text-xs font-mono select-text">
        <thead className="bg-subtle/80 sticky top-0 border-b border-border-hairline z-10 text-text-mut text-[11px] font-sans">
          <tr>
            <th className="p-2 font-semibold w-12 text-center">Char #</th>
            <th className="p-2 font-semibold w-16">Zone</th>
            <th className="p-2 font-semibold w-20">Type</th>
            <th className="p-2 font-semibold min-w-[180px]">Requirement / Specification</th>
            <th className="p-2 font-semibold w-24">Nominal (Truth)</th>
            <th className="p-2 font-semibold w-20">+Tol</th>
            <th className="p-2 font-semibold w-20">-Tol</th>
            <th className="p-2 font-semibold w-24">Lower Limit</th>
            <th className="p-2 font-semibold w-24">Upper Limit</th>
            <th className="p-2 font-semibold w-14">Units</th>
            <th className="p-2 font-semibold min-w-[160px]">Tooling / Gauge</th>
            <th className="p-2 font-semibold w-24">Measured</th>
            <th className="p-2 font-semibold w-20">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-hairline">
          {filtered.map((char) => {
            const isPass = char.status === 'in_spec';
            const isFail = char.status === 'out_of_spec';

            return (
              <tr
                key={char.id}
                className="hover:bg-subtle/40 transition-colors cursor-pointer group"
              >
                <td className="p-2 text-center font-bold text-accent-primary">
                  {char.balloonNumber}
                </td>
                <td className="p-2 text-text-sec">{char.zone}</td>
                <td className="p-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      char.designator === 'Critical'
                        ? 'bg-red-50 dark:bg-red-950/40 text-status-fail'
                        : char.designator === 'Major'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-accent-primary'
                        : 'bg-subtle text-text-sec'
                    }`}
                  >
                    {char.designator}
                  </span>
                </td>
                <td className="p-2 font-semibold text-text-pri truncate max-w-[220px]" title={char.rawCallout}>
                  {char.rawCallout}
                </td>
                <td className="p-2 text-text-pri font-semibold truncate max-w-[120px]" title={char.nominal_text}>
                  {char.nominal_text || fmt3(char.nominal_value ?? char.nominal)}
                </td>
                <td className="p-2 text-text-mut">+{fmt3(char.plusTolerance)}</td>
                <td className="p-2 text-text-mut">-{fmt3(char.minusTolerance)}</td>
                <td className="p-2 text-text-sec">{fmt3(char.lower_limit ?? char.lsl)}</td>
                <td className="p-2 text-text-sec">{fmt3(char.upper_limit ?? char.usl)}</td>
                <td className="p-2 text-text-mut">{char.units}</td>
                <td className="p-2 text-text-sec truncate max-w-[180px]" title={char.instrument}>
                  {char.instrument}
                </td>
                <td className="p-2 font-semibold">
                  {char.isDemo ? (
                    <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      DEMO ONLY
                    </span>
                  ) : char.measuredValue !== undefined && char.measuredValue !== null ? (
                    <span className={isPass ? 'text-status-pass' : 'text-status-fail'}>
                      {fmt3(char.measuredValue)}
                    </span>
                  ) : (
                    <span className="text-text-mut italic">NEEDS_REVIEW</span>
                  )}
                </td>
                <td className="p-2">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
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
    </div>
  );

  if (isDrawer) {
    return (
      <div
        className={`w-full bg-surface border-t border-border-hairline shadow-lg transition-all duration-300 z-20 flex flex-col ${
          isExpanded ? 'h-72' : 'h-10'
        }`}
      >
        {headerBar}
        {isExpanded && tableContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-9 bg-surface z-40 flex flex-col">
      {headerBar}
      {tableContent}
    </div>
  );
};
