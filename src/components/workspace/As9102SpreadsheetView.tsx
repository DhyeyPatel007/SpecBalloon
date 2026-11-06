import React, { useState } from 'react';
import { Characteristic, DrawingSpec } from '../../types/metrology';
import { calculateSPC, fmtDim, fmtSpc } from '../../utils/metrologyMath';
import {
  Download,
  FileSpreadsheet,
  RotateCw,
  Sparkles,
  Search,
  Undo2,
  AlertTriangle
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
  onCloseSheetView: () => void;
  onUndoBulkAction?: () => void;
  canUndo?: boolean;
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

  return (
    <div className="fixed inset-0 top-[44px] bg-canvas flex flex-col z-40 select-none font-mono text-xs overflow-hidden">
      {/* Top Engineering Header Strip */}
      <div className="min-h-12 border-b border-border-str px-4 py-2 bg-surface-1 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onCloseSheetView}
            className="machined-btn border border-border-str px-2.5 py-1 bg-surface-2 hover:bg-surface-3 text-text-pri font-bold text-[11px]"
          >
            ← BACK TO CAD VIEWPORT
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-pri text-sm">
              AS9102 REV C FORM 3 / AIAG PPAP SPREADSHEET
            </span>
            <span className="border border-border-str px-1.5 py-0.5 text-[11px] text-acc-orange bg-surface-2 font-bold">
              {drawing.partNumber} // {drawing.revision}
            </span>
          </div>
        </div>

        {/* Search Input & Bulk Operations */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="flex items-center border border-border-str bg-surface-2 px-2 py-1 w-56 text-[11px]">
            <Search className="w-3.5 h-3.5 text-text-mut mr-2" />
            <input
              type="text"
              placeholder="Search callout, zone, gauge..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent focus:outline-none text-text-pri text-xs w-full"
            />
          </div>

          {/* Bulk Operations */}
          <button
            onClick={onAutoCalculateFits}
            className="machined-btn border border-border-str bg-surface-2 hover:bg-surface-3 text-text-pri px-2.5 py-1 flex items-center gap-1.5 font-bold text-[11px]"
            title="Auto-resolve ISO 286 and ISO 2768 tolerances without wiping measured values"
          >
            <Sparkles className="w-3.5 h-3.5 text-acc-orange" />
            <span>AUTO-CALC FITS</span>
          </button>

          <button
            onClick={onSortClockwise}
            className="machined-btn border border-border-str bg-surface-2 hover:bg-surface-3 text-text-pri px-2.5 py-1 flex items-center gap-1.5 font-bold text-[11px]"
            title="Re-sort balloon sequence clockwise around part centroid"
          >
            <RotateCw className="w-3.5 h-3.5 text-acc-orange" />
            <span>SORT CW</span>
          </button>

          <button
            onClick={() => setShowLotConfirm(true)}
            className="machined-btn border border-border-str bg-surface-2 hover:bg-surface-3 text-text-pri px-2.5 py-1 flex items-center gap-1.5 font-bold text-[11px]"
            title="Generate 3-part production lot measurements"
          >
            <span>FILL LOT SAMPLES</span>
          </button>

          {/* Undo Action Button (Fix 10) */}
          {canUndo && onUndoBulkAction && (
            <button
              onClick={onUndoBulkAction}
              className="machined-btn border border-acc-orange bg-acc-orange/10 hover:bg-acc-orange/20 text-acc-orange px-2.5 py-1 flex items-center gap-1 font-bold text-[11px] animate-pulse"
              title="Undo last bulk action"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>[↶ UNDO BULK ACTION]</span>
            </button>
          )}

          <div className="h-4 w-px bg-border-str mx-1"></div>

          <button
            onClick={onExportCSV}
            className="machined-btn bg-surface-2 border border-border-str hover:bg-surface-3 text-text-pri px-3 py-1 flex items-center gap-1.5 font-bold text-[11px]"
          >
            <Download className="w-3.5 h-3.5 text-acc-orange" />
            <span>EXPORT CSV</span>
          </button>

          <button
            onClick={onExportExcel}
            className="machined-btn bg-acc-orange hover:bg-orange-600 text-white px-3 py-1 flex items-center gap-1.5 font-bold text-[11px]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>EXPORT EXCEL</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal Bar for Fill Lot Samples (Fix 10) */}
      {showLotConfirm && (
        <div className="bg-surface-2 border-b-2 border-acc-orange px-4 py-2.5 flex items-center justify-between text-xs z-20">
          <div className="flex items-center gap-2 text-text-pri">
            <AlertTriangle className="w-4 h-4 text-acc-orange flex-shrink-0" />
            <span>
              POPULATE 3-PART PRODUCTION LOT DATA? This will synthesize realistic normal distribution measurements across all {characteristics.length} characteristics.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onFillSimulatedLot();
                setShowLotConfirm(false);
              }}
              className="machined-btn bg-acc-orange text-white font-bold px-3 py-1 text-xs"
            >
              [CONFIRM POPULATE]
            </button>
            <button
              onClick={() => setShowLotConfirm(false)}
              className="machined-btn border border-border-str bg-surface-1 px-3 py-1 text-xs text-text-sec"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* 14-Column Dense Metrology Table OR Empty State (Fix 13 & 20 #5) */}
      <div className="flex-1 overflow-auto bg-surface-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="border border-border-str bg-surface-2 p-8 max-w-md w-full shadow-sm">
              <div className="text-acc-orange font-bold text-xs mb-2">[SEARCH: ZERO RESULTS]</div>
              <div className="text-text-pri font-bold text-base mb-1">NO CHARACTERISTICS MATCHED</div>
              <div className="text-text-mut text-[11px] mb-4">
                No characteristic records match search term "{searchTerm}".
              </div>
              <button
                onClick={() => setSearchTerm('')}
                className="machined-btn bg-text-pri text-canvas font-bold text-xs px-4 py-2 hover:bg-acc-orange hover:text-white transition-colors"
              >
                [CLEAR SEARCH FILTER]
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead className="sticky top-0 bg-surface-2 border-b border-border-str z-10 text-[11px] text-text-sec font-bold">
              <tr>
                <th className="p-2.5 border-r border-border-str text-center w-12">1. CHAR #</th>
                <th className="p-2.5 border-r border-border-str text-center w-16">2. ZONE</th>
                <th className="p-2.5 border-r border-border-str w-24">3. CLASS</th>
                <th className="p-2.5 border-r border-border-str min-w-[180px]">4. REQUIREMENT / GD&T</th>
                <th className="p-2.5 border-r border-border-str text-right w-20">5. NOMINAL</th>
                <th className="p-2.5 border-r border-border-str w-20">6. TYPE</th>
                <th className="p-2.5 border-r border-border-str text-right w-16">7. +TOL</th>
                <th className="p-2.5 border-r border-border-str text-right w-16">8. -TOL</th>
                <th className="p-2.5 border-r border-border-str text-right w-20 text-st-pass font-bold">9. LSL</th>
                <th className="p-2.5 border-r border-border-str text-right w-20 text-acc-orange font-bold">10. USL</th>
                <th className="p-2.5 border-r border-border-str text-center w-12">11. UNIT</th>
                <th className="p-2.5 border-r border-border-str min-w-[160px]">12. DESIGNED GAUGE</th>
                <th className="p-2.5 border-r border-border-str text-right w-24">13. MEASURED</th>
                <th className="p-2.5 border-r border-border-str text-center w-28">LOT (M1,M2,M3)</th>
                <th className="p-2.5 text-center w-28">14. STATUS / CPK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-str text-[11px]">
              {filtered.map((char) => {
                const spc = calculateSPC(char.lsl, char.usl, char.lotMeasurements);
                const isPass = char.status === 'in_spec';
                const isFail = char.status === 'out_of_spec';

                return (
                  <tr
                    key={char.id}
                    className="hover:bg-surface-2/60 transition-colors"
                  >
                    {/* 1. Char Number */}
                    <td className="p-2 border-r border-border-str text-center font-bold">
                      <span className="inline-block w-6 h-6 rounded-full bg-acc-orange text-white text-[11px] leading-6">
                        {char.balloonNumber}
                      </span>
                    </td>

                    {/* 2. Zone */}
                    <td className="p-2 border-r border-border-str text-center font-bold text-text-sec">
                      {char.zone}
                    </td>

                    {/* 3. Class Designator */}
                    <td className="p-2 border-r border-border-str">
                      <span
                        className={`px-1.5 py-0.5 text-[11px] font-bold ${
                          char.designator === 'Critical'
                            ? 'bg-st-fail/10 text-st-fail'
                            : char.designator === 'Major'
                            ? 'bg-acc-orange/10 text-acc-orange'
                            : 'bg-surface-3 text-text-sec'
                        }`}
                      >
                        {char.designator}
                      </span>
                    </td>

                    {/* 4. Raw Drawing Callout & GD&T */}
                    <td className="p-2 border-r border-border-str font-bold text-text-pri">
                      <div>{char.rawCallout}</div>
                      {char.mmcBonus && (
                        <div className="text-[10px] text-acc-orange font-bold">
                          MMC: {char.mmcBonus}
                        </div>
                      )}
                    </td>

                    {/* 5. Nominal */}
                    <td className="p-2 border-r border-border-str text-right">
                      {fmtDim(char.nominal)}
                    </td>

                    {/* 6. Tolerance Type */}
                    <td className="p-2 border-r border-border-str text-text-mut">
                      {char.toleranceType}
                    </td>

                    {/* 7. +Tol */}
                    <td className="p-2 border-r border-border-str text-right text-text-pri">
                      +{fmtDim(char.plusTolerance)}
                    </td>

                    {/* 8. -Tol */}
                    <td className="p-2 border-r border-border-str text-right text-text-pri">
                      -{fmtDim(char.minusTolerance)}
                    </td>

                    {/* 9. LSL */}
                    <td className="p-2 border-r border-border-str text-right font-bold text-st-pass">
                      {fmtDim(char.lsl)}
                    </td>

                    {/* 10. USL */}
                    <td className="p-2 border-r border-border-str text-right font-bold text-acc-orange">
                      {fmtDim(char.usl)}
                    </td>

                    {/* 11. Units */}
                    <td className="p-2 border-r border-border-str text-center text-text-mut font-bold">
                      {char.units}
                    </td>

                    {/* 12. Designed Gauge */}
                    <td className="p-2 border-r border-border-str text-text-sec truncate max-w-[200px]">
                      {char.instrument}
                    </td>

                    {/* 13. Measured Value */}
                    <td className="p-2 border-r border-border-str text-right">
                      <input
                        type="number"
                        step="0.001"
                        value={char.measuredValue !== undefined ? char.measuredValue : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const status = val >= char.lsl && val <= char.usl ? 'in_spec' : 'out_of_spec';
                            onUpdateCharacteristic(char.id, { measuredValue: val, status });
                          }
                        }}
                        className={`w-20 px-1 py-0.5 text-right font-bold border focus:outline-none ${
                          isPass
                            ? 'border-st-pass text-st-pass bg-st-pass/10'
                            : isFail
                            ? 'border-st-fail text-st-fail bg-st-fail/10'
                            : 'border-border-str bg-surface-2 text-text-pri'
                        }`}
                      />
                    </td>

                    {/* Lot Measurements (M1, M2, M3) */}
                    <td className="p-2 border-r border-border-str text-center text-[11px] text-text-mut font-bold">
                      {char.lotMeasurements.map((m) => fmtDim(m)).join(', ')}
                    </td>

                    {/* 14. Status / Cpk */}
                    <td className="p-2 text-center">
                      <div
                        className={`inline-block px-2 py-0.5 text-[11px] font-bold ${
                          isPass
                            ? 'bg-st-pass text-white'
                            : isFail
                            ? 'bg-st-fail text-white'
                            : 'bg-st-warn text-white'
                        }`}
                      >
                        {isPass ? `PASS (${fmtSpc(spc.cpk)})` : isFail ? `REJECT` : `REVIEW`}
                      </div>
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
