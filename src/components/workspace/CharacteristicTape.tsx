import React, { useRef, useEffect } from 'react';
import { Characteristic, InspectionStatus } from '../../types/metrology';
import { Trash2, AlertCircle, CheckCircle2, XCircle, Gauge } from 'lucide-react';
import { fmt3 } from '../../utils/metrologyMath';

interface CharacteristicTapeProps {
  characteristics: Characteristic[];
  activeBalloonId: number | null;
  onSelectCharacteristic: (id: number) => void;
  onUpdateCharacteristic: (id: number, updates: Partial<Characteristic>) => void;
  onDeleteCharacteristic: (id: number) => void;
  statusFilter: InspectionStatus | 'all';
  onFilterChange?: (status: InspectionStatus | 'all') => void;
  onResetFilter?: () => void;
}

export const CharacteristicTape: React.FC<CharacteristicTapeProps> = ({
  characteristics,
  activeBalloonId,
  onSelectCharacteristic,
  onUpdateCharacteristic,
  onDeleteCharacteristic,
  statusFilter,
  onFilterChange,
  onResetFilter,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLDivElement>(null);

  // Filter characteristics according to active status filter
  const filteredChars = characteristics.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  // Status counts for filter pills
  const counts = {
    all: characteristics.length,
    in_spec: characteristics.filter((c) => c.status === 'in_spec').length,
    needs_review: characteristics.filter((c) => c.status === 'needs_review').length,
    out_of_spec: characteristics.filter((c) => c.status === 'out_of_spec').length,
  };

  // Scroll active card into view when activeBalloonId changes
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeBalloonId]);

  // Handle keyboard navigation: Up/Down arrow or Tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'Tab') {
        e.preventDefault();
        const currentIdx = filteredChars.findIndex((c) => c.id === activeBalloonId);
        const nextIdx = (currentIdx + 1) % (filteredChars.length || 1);
        if (filteredChars[nextIdx]) {
          onSelectCharacteristic(filteredChars[nextIdx].id);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = filteredChars.findIndex((c) => c.id === activeBalloonId);
        const prevIdx = (currentIdx - 1 + filteredChars.length) % (filteredChars.length || 1);
        if (filteredChars[prevIdx]) {
          onSelectCharacteristic(filteredChars[prevIdx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredChars, activeBalloonId, onSelectCharacteristic]);

  const handleFieldChange = (
    char: Characteristic,
    field: 'nominal' | 'plusTolerance' | 'minusTolerance' | 'measuredValue' | 'rawCallout',
    val: string
  ) => {
    const num = parseFloat(val);
    if (field === 'rawCallout') {
      onUpdateCharacteristic(char.id, { rawCallout: val });
      return;
    }

    if (isNaN(num)) return;

    const updates: Partial<Characteristic> = { [field]: num };

    // Recompute LSL / USL on nominal or tolerance changes
    const nominal = field === 'nominal' ? num : char.nominal;
    const plus = field === 'plusTolerance' ? num : char.plusTolerance;
    const minus = field === 'minusTolerance' ? num : char.minusTolerance;

    let lsl: number;
    let usl: number;

    if (char.toleranceType === 'GD&T' || char.toleranceType === 'Surface') {
      lsl = 0.000;
      usl = Number(plus.toFixed(4));
    } else {
      lsl = Number((nominal - minus).toFixed(4));
      usl = Number((nominal + plus).toFixed(4));
    }

    updates.lsl = lsl;
    updates.usl = usl;

    // Check inspection status against limits if measuredValue present
    const measured = field === 'measuredValue' ? num : char.measuredValue;
    if (measured !== undefined) {
      if (measured >= lsl && measured <= usl) {
        updates.status = 'in_spec';
      } else {
        updates.status = 'out_of_spec';
      }
    }

    onUpdateCharacteristic(char.id, updates);
  };

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] h-full border-l border-border-hairline bg-surface flex flex-col select-none z-20 flex-shrink-0 shadow-apple-sm">
      {/* 1. Sidebar Top Header */}
      <div className="p-3 border-b border-border-hairline bg-subtle/50 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-accent-primary" />
            <span className="font-semibold text-text-pri">Characteristic Inspector</span>
          </div>
          <span className="text-[11px] font-mono text-text-mut">
            {filteredChars.length} of {characteristics.length} Dims
          </span>
        </div>

        {/* Status Filter Tabs */}
        {onFilterChange && (
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-medium pt-0.5">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-2 py-0.5 rounded-full border transition-all ${
                statusFilter === 'all'
                  ? 'bg-accent-primary text-white border-accent-primary font-semibold'
                  : 'bg-surface text-text-sec border-border-hairline hover:bg-subtle'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => onFilterChange('in_spec')}
              className={`px-2 py-0.5 rounded-full border transition-all ${
                statusFilter === 'in_spec'
                  ? 'bg-status-pass text-white border-status-pass font-semibold'
                  : 'bg-surface text-status-pass border-border-hairline hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
              }`}
            >
              Pass ({counts.in_spec})
            </button>
            <button
              onClick={() => onFilterChange('needs_review')}
              className={`px-2 py-0.5 rounded-full border transition-all ${
                statusFilter === 'needs_review'
                  ? 'bg-status-warn text-white border-status-warn font-semibold'
                  : 'bg-surface text-status-warn border-border-hairline hover:bg-amber-50 dark:hover:bg-amber-950/20'
              }`}
            >
              Review ({counts.needs_review})
            </button>
            <button
              onClick={() => onFilterChange('out_of_spec')}
              className={`px-2 py-0.5 rounded-full border transition-all ${
                statusFilter === 'out_of_spec'
                  ? 'bg-status-fail text-white border-status-fail font-semibold'
                  : 'bg-surface text-status-fail border-border-hairline hover:bg-red-50 dark:hover:bg-red-950/20'
              }`}
            >
              Fail ({counts.out_of_spec})
            </button>
          </div>
        )}
      </div>

      {/* 2. Scrollable Inspection Cards Tape */}
      {filteredChars.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="border border-border-hairline bg-subtle/50 rounded-xl p-6 max-w-xs w-full shadow-apple-sm">
            <AlertCircle className="w-8 h-8 text-status-warn mx-auto mb-2" />
            <div className="text-text-pri font-semibold text-sm mb-1">No Characteristics</div>
            <div className="text-text-mut text-xs mb-4">
              No dimensions match the "{statusFilter}" filter.
            </div>
            {onResetFilter && (
              <button
                onClick={onResetFilter}
                className="w-full apple-btn-secondary py-1.5 text-xs font-semibold"
              >
                Reset Filter to All
              </button>
            )}
          </div>
        </div>
      ) : (
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredChars.map((char) => {
            const isActive = char.id === activeBalloonId;
            const isPass = char.status === 'in_spec';
            const isFail = char.status === 'out_of_spec';

            // Calculate needle position in micro tolerance bar (0% to 100%)
            let needlePct = 50;
            if (char.measuredValue !== undefined) {
              const spread = char.usl - char.lsl;
              if (spread > 0) {
                needlePct = Math.max(0, Math.min(100, ((char.measuredValue - char.lsl) / spread) * 100));
              }
            }

            return (
              <div
                key={char.id}
                ref={isActive ? activeCardRef : null}
                onClick={() => onSelectCharacteristic(char.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-xs font-sans ${
                  isActive
                    ? 'border-accent-primary bg-surface shadow-apple-md ring-1 ring-accent-primary/40'
                    : 'border-border-hairline bg-surface hover:border-border-strong hover:shadow-apple-sm'
                }`}
              >
                {/* Header: Balloon Badge + Zone + Designator + Pass/Fail Pill */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Balloon Badge */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[11px] text-white flex-shrink-0 shadow-sm ${
                        isActive
                          ? 'bg-accent-primary ring-2 ring-accent-primary/20'
                          : isPass
                          ? 'bg-status-pass'
                          : isFail
                          ? 'bg-status-fail'
                          : 'bg-status-warn'
                      }`}
                    >
                      {char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber}
                    </div>

                    {/* Zone Badge */}
                    <span className="px-1.5 py-0.5 rounded bg-subtle border border-border-hairline font-mono font-medium text-[11px] text-text-sec">
                      Zone {char.zone}
                    </span>

                    {/* Designator */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        char.designator === 'Critical'
                          ? 'bg-red-50 dark:bg-red-950/40 text-status-fail border border-red-200 dark:border-red-800/40'
                          : char.designator === 'Major'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-accent-primary border border-blue-200 dark:border-blue-800/40'
                          : 'bg-subtle text-text-sec border border-border-hairline'
                      }`}
                    >
                      {char.designator}
                    </span>
                  </div>

                  {/* Status Pill & Delete */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isPass
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-status-pass border border-emerald-200 dark:border-emerald-800/40'
                          : isFail
                          ? 'bg-red-50 dark:bg-red-950/40 text-status-fail border border-red-200 dark:border-red-800/40'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-status-warn border border-amber-200 dark:border-amber-800/40'
                      }`}
                    >
                      {isPass ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Pass</span>
                        </>
                      ) : isFail ? (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Fail</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          <span>Review</span>
                        </>
                      )}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCharacteristic(char.id);
                      }}
                      className="p-1 text-text-mut hover:text-status-fail transition-colors rounded hover:bg-subtle"
                      title="Delete Characteristic"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Middle: CAD Visual Crop & Callout Description */}
                <div className="grid grid-cols-12 gap-2.5 items-center mb-2.5">
                  {/* Cropped CAD Canvas Snippet */}
                  <div className="col-span-5 h-14 rounded-md border border-border-hairline bg-white flex items-center justify-center overflow-hidden relative shadow-inner">
                    {char.cropDataUrl ? (
                      <img
                        src={char.cropDataUrl}
                        alt="CAD Visual Crop"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-text-pri font-mono font-bold text-[11px] text-center px-1">
                        {char.rawCallout}
                      </div>
                    )}
                    <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white font-mono text-[9px] px-1 rounded font-medium">
                      CROP
                    </div>
                  </div>

                  {/* Feature & Callout */}
                  <div className="col-span-7 flex flex-col justify-center">
                    <span className="font-mono font-bold text-text-pri text-xs truncate" title={char.rawCallout}>
                      {char.rawCallout}
                    </span>
                    <span className="text-text-sec text-[11px] truncate mt-0.5" title={char.featureDescription}>
                      {char.featureDescription}
                    </span>
                    {char.mmcBonus && (
                      <span className="mt-1 text-[10px] font-mono font-semibold text-accent-primary bg-accent-primary/10 px-1.5 py-0.5 rounded w-fit">
                        MMC: {char.mmcBonus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrology Limit Table (strictly fmt3 formatted) */}
                <div className="grid grid-cols-5 gap-1 py-1.5 px-2 bg-subtle/60 rounded-md border border-border-hairline font-mono text-center mb-2.5">
                  <div>
                    <span className="text-[10px] text-text-mut block">NOM</span>
                    <span className="font-semibold text-text-pri text-[11px]">{fmt3(char.nominal)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-mut block">+TOL</span>
                    <span className="font-semibold text-text-pri text-[11px]">+{fmt3(char.plusTolerance)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-mut block">-TOL</span>
                    <span className="font-semibold text-text-pri text-[11px]">-{fmt3(char.minusTolerance)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-mut block">LSL</span>
                    <span className="font-semibold text-text-sec text-[11px]">{fmt3(char.lsl)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-mut block">USL</span>
                    <span className="font-semibold text-text-sec text-[11px]">{fmt3(char.usl)}</span>
                  </div>
                </div>

                {/* Micro-Tolerance Needle Bar */}
                <div className="mb-2.5">
                  <div className="flex justify-between text-[10px] font-mono text-text-mut mb-1">
                    <span>LSL: {fmt3(char.lsl)}</span>
                    <span className="font-semibold text-text-sec">NOM: {fmt3(char.nominal)}</span>
                    <span>USL: {fmt3(char.usl)}</span>
                  </div>
                  <div className="h-2 w-full bg-subtle rounded-full overflow-hidden relative border border-border-hairline">
                    {/* Tolerance Zone Gradient: Yellow - Green - Yellow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/40 via-emerald-500/50 to-amber-400/40" />
                    {/* Center Nominal Target Line */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-text-mut/50 -translate-x-1/2" />
                    {/* Dynamic Measurement Needle */}
                    <div
                      style={{ left: `${needlePct}%` }}
                      className={`absolute top-0 bottom-0 w-1.5 -translate-x-1/2 rounded-full shadow-sm ${
                        isPass ? 'bg-status-pass' : isFail ? 'bg-status-fail' : 'bg-status-warn'
                      }`}
                    />
                  </div>
                </div>

                {/* Measured Value Input & Instrument Pill */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-hairline">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-text-mut">Measured:</span>
                    <input
                      type="number"
                      step="0.001"
                      value={char.measuredValue !== undefined ? char.measuredValue : ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleFieldChange(char, 'measuredValue', e.target.value)}
                      placeholder={fmt3(char.nominal)}
                      className="w-20 h-6 px-1.5 rounded border border-border-strong bg-surface font-mono font-semibold text-text-pri text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary"
                    />
                    <span className="text-[11px] font-mono text-text-mut">{char.units}</span>
                  </div>

                  {/* Instrument Badge */}
                  <span
                    className="text-[10px] text-text-mut truncate max-w-[150px] font-mono"
                    title={char.instrument}
                  >
                    {char.instrument}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
