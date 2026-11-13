import React, { useRef, useEffect } from 'react';
import { Characteristic, InspectionStatus } from '../../types/metrology';
import { Trash2, AlertCircle, CheckCircle2, XCircle, Gauge, Check } from 'lucide-react';
import { fmt3, parseCalloutAndCalculateLimits } from '../../utils/metrologyMath';
import { isCharacteristicFlagged } from '../../lib/reviewUtils';

interface CharacteristicTapeProps {
  characteristics: Characteristic[];
  activeBalloonId: string | null;
  onSelectCharacteristic: (id: string) => void;
  onUpdateCharacteristic: (id: string, updates: Partial<Characteristic>) => void;
  onDeleteCharacteristic: (id: string) => void;
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

  const filteredChars = characteristics.filter((c) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'needs_review') return isCharacteristicFlagged(c);
    return c.status === statusFilter;
  });

  const counts = {
    all: characteristics.length,
    in_spec: characteristics.filter((c) => c.status === 'in_spec').length,
    needs_review: characteristics.filter((c) => isCharacteristicFlagged(c)).length,
    out_of_spec: characteristics.filter((c) => c.status === 'out_of_spec').length,
  };

  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeBalloonId]);

  const handleFieldChange = (
    char: Characteristic,
    field: 'nominal_text' | 'plusTolerance' | 'minusTolerance' | 'measuredValue' | 'rawCallout',
    val: string
  ) => {
    if (field === 'rawCallout' || field === 'nominal_text') {
      const parsed = parseCalloutAndCalculateLimits(val, char.toleranceType);
      onUpdateCharacteristic(char.id, {
        rawCallout: val,
        nominal_text: parsed.nominal_text,
        nominal_value: parsed.nominal_value,
        nominal: parsed.nominal_value ?? char.nominal ?? 0,
        plusTolerance: parsed.plusTolerance,
        minusTolerance: parsed.minusTolerance,
        upper_limit: parsed.upper_limit,
        lower_limit: parsed.lower_limit,
        lsl: parsed.lower_limit ?? 0,
        usl: parsed.upper_limit ?? 0,
        instrument: parsed.instrument || char.instrument,
      });
      return;
    }

    if (field === 'measuredValue') {
      const num = parseFloat(val);
      if (isNaN(num)) {
        onUpdateCharacteristic(char.id, {
          measuredValue: null,
          status: 'needs_review',
        });
        return;
      }

      const lsl = char.lower_limit ?? char.lsl;
      const usl = char.upper_limit ?? char.usl;
      const isPass = num >= lsl && num <= usl;

      onUpdateCharacteristic(char.id, {
        measuredValue: num,
        status: isPass ? 'in_spec' : 'out_of_spec',
        reviewed: true,
        isDemo: false,
      });
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num)) return;

    const plus = field === 'plusTolerance' ? num : char.plusTolerance;
    const minus = field === 'minusTolerance' ? num : char.minusTolerance;
    const nominal = char.nominal_value ?? char.nominal ?? 0;

    const lower = Number((nominal - minus).toFixed(4));
    const upper = Number((nominal + plus).toFixed(4));

    onUpdateCharacteristic(char.id, {
      [field]: num,
      upper_limit: upper,
      lower_limit: lower,
      lsl: lower,
      usl: upper,
    });
  };

  const handleMarkReviewed = (char: Characteristic, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateCharacteristic(char.id, {
      status: 'in_spec',
      reviewed: true,
      isDemo: false,
    });
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
            const isReview = isCharacteristicFlagged(char);

            const lslVal = char.lower_limit ?? char.lsl;
            const uslVal = char.upper_limit ?? char.usl;

            let needlePct = 50;
            if (char.measuredValue !== undefined && char.measuredValue !== null) {
              const spread = uslVal - lslVal;
              if (spread > 0) {
                needlePct = Math.max(0, Math.min(100, ((char.measuredValue - lslVal) / spread) * 100));
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
                {/* Header: Balloon Badge + Zone + Designator + Pass/Fail/Review Pill */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
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

                    <span className="px-1.5 py-0.5 rounded bg-subtle border border-border-hairline font-mono font-medium text-[11px] text-text-sec">
                      Zone {char.zone}
                    </span>

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

                    {char.isDemo && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono text-[9px] font-bold">
                        DEMO ONLY
                      </span>
                    )}
                  </div>

                  {/* Actions: Review button, Status Pill & Delete */}
                  <div className="flex items-center gap-1.5">
                    {isReview && (
                      <button
                        onClick={(e) => handleMarkReviewed(char, e)}
                        className="px-2 py-0.5 rounded bg-accent-primary/10 hover:bg-accent-primary text-accent-primary hover:text-white border border-accent-primary/30 transition-all font-medium text-[11px] flex items-center gap-1"
                        title="Mark dimension as human reviewed"
                      >
                        <Check className="w-3 h-3" />
                        <span>Review</span>
                      </button>
                    )}

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
                          <span>NEEDS_REVIEW</span>
                        </>
                      )}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCharacteristic(char.id);
                      }}
                      className="p-1 text-text-mut hover:text-status-fail transition-colors rounded hover:bg-subtle"
                      title="Delete Characteristic [D]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Middle: CAD Visual Crop & Callout Description */}
                <div className="grid grid-cols-12 gap-2.5 items-center mb-2.5">
                  <div className="col-span-5 h-14 rounded-md border border-border-hairline bg-white flex items-center justify-center overflow-hidden relative shadow-inner">
                    {char.cropDataUrl ? (
                      <img
                        src={char.cropDataUrl}
                        alt="CAD Visual Crop"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-text-pri font-mono font-bold text-[11px] text-center px-1">
                        {char.nominal_text || char.rawCallout}
                      </div>
                    )}
                    <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white font-mono text-[9px] px-1 rounded font-medium">
                      CROP
                    </div>
                  </div>

                  <div className="col-span-7 flex flex-col justify-center">
                    <input
                      type="text"
                      value={char.rawCallout}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleFieldChange(char, 'rawCallout', e.target.value)}
                      className="font-mono font-bold text-text-pri text-xs border border-transparent hover:border-border-strong focus:border-accent-primary bg-transparent rounded px-1 -mx-1 truncate"
                      title="Click to edit raw callout"
                    />
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

                {/* Metrology Limit Table: Nominal Text, +Tol, -Tol, Lower Limit, Upper Limit */}
                <div className="grid grid-cols-5 gap-1 py-1.5 px-2 bg-subtle/60 rounded-md border border-border-hairline font-mono text-center mb-2.5">
                  <div>
                    <span className="text-[10px] text-text-mut block">NOMINAL</span>
                    <span className="font-semibold text-text-pri text-[11px] truncate block" title={char.nominal_text}>
                      {char.nominal_text || fmt3(char.nominal_value ?? char.nominal)}
                    </span>
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
                    <span className="text-[10px] text-text-mut block">LSL / LOWER</span>
                    <span className="font-semibold text-text-sec text-[11px]">{fmt3(lslVal)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-mut block">USL / UPPER</span>
                    <span className="font-semibold text-text-sec text-[11px]">{fmt3(uslVal)}</span>
                  </div>
                </div>

                {/* Micro-Tolerance Needle Bar */}
                <div className="mb-2.5">
                  <div className="flex justify-between text-[10px] font-mono text-text-mut mb-1">
                    <span>LSL: {fmt3(lslVal)}</span>
                    <span className="font-semibold text-text-sec">{char.nominal_text || fmt3(char.nominal_value ?? char.nominal)}</span>
                    <span>USL: {fmt3(uslVal)}</span>
                  </div>
                  <div className="h-2 w-full bg-subtle rounded-full overflow-hidden relative border border-border-hairline">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/40 via-emerald-500/50 to-amber-400/40" />
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-text-mut/50 -translate-x-1/2" />
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
                      value={char.measuredValue !== undefined && char.measuredValue !== null ? char.measuredValue : ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleFieldChange(char, 'measuredValue', e.target.value)}
                      placeholder="Pending"
                      className="w-20 h-6 px-1.5 rounded border border-border-strong bg-surface font-mono font-semibold text-text-pri text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary"
                    />
                    <span className="text-[11px] font-mono text-text-mut">{char.units}</span>
                  </div>

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
