import React, { useRef, useEffect } from 'react';
import { Characteristic, InspectionStatus } from '../../types/metrology';
import { Check, Trash2 } from 'lucide-react';
import { fmtDim } from '../../utils/metrologyMath';

interface CharacteristicTapeProps {
  characteristics: Characteristic[];
  activeBalloonId: number | null;
  onSelectCharacteristic: (id: number) => void;
  onUpdateCharacteristic: (id: number, updates: Partial<Characteristic>) => void;
  onDeleteCharacteristic: (id: number) => void;
  statusFilter: InspectionStatus | 'all';
  onResetFilter?: () => void;
}

export const CharacteristicTape: React.FC<CharacteristicTapeProps> = ({
  characteristics,
  activeBalloonId,
  onSelectCharacteristic,
  onUpdateCharacteristic,
  onDeleteCharacteristic,
  statusFilter,
  onResetFilter,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLDivElement>(null);

  // Filter characteristics according to active status filter
  const filteredChars = characteristics.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

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
        const nextIdx = (currentIdx + 1) % filteredChars.length;
        if (filteredChars[nextIdx]) {
          onSelectCharacteristic(filteredChars[nextIdx].id);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = filteredChars.findIndex((c) => c.id === activeBalloonId);
        const prevIdx = (currentIdx - 1 + filteredChars.length) % filteredChars.length;
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
    <div className="w-full md:w-[360px] lg:w-[420px] xl:w-[460px] h-full border-l border-border-str bg-surface-1 flex flex-col select-none z-20 flex-shrink-0">
      {/* Top Tape Header Strip */}
      <div className="h-10 border-b border-border-str px-3 bg-surface-2 flex items-center justify-between font-mono text-xs text-text-sec">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text-pri">CHARACTERISTIC TAPE</span>
          <span className="text-[11px] text-text-mut">
            [{filteredChars.length} OF {characteristics.length}]
          </span>
        </div>
        <div className="text-[11px] text-acc-orange flex items-center gap-1 font-bold">
          <span>NAV: TAB / ↑ ↓ ARROWS</span>
        </div>
      </div>

      {/* Scrollable Inspection Cards Tape OR Centered Empty State (Fix 13) */}
      {filteredChars.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center font-mono">
          <div className="border border-border-str bg-surface-2 p-6 max-w-sm w-full shadow-sm">
            <div className="text-acc-orange font-bold text-xs mb-2">[FILTER: ZERO MATCHES]</div>
            <div className="text-text-pri font-bold text-sm mb-1">NO CHARACTERISTICS FOUND</div>
            <div className="text-text-mut text-[11px] mb-4">
              No characteristics match current filter "{statusFilter}".
            </div>
            {onResetFilter && (
              <button
                onClick={onResetFilter}
                className="machined-btn bg-text-pri text-canvas font-bold text-xs px-3 py-2 w-full hover:bg-acc-orange hover:text-white transition-colors"
              >
                [RESET FILTER TO ALL]
              </button>
            )}
          </div>
        </div>
      ) : (
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-2">
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
                className={`p-2.5 border transition-all cursor-pointer font-mono text-xs ${
                  isActive
                    ? 'border-acc-orange bg-surface-2 shadow-md ring-1 ring-acc-orange'
                    : 'border-border-str bg-surface-1 hover:border-text-mut'
                }`}
              >
                {/* Row Top: Badge + Callout + Verification Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Balloon Number Circle */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 ${
                        isActive
                          ? 'bg-acc-orange animate-pulse'
                          : isPass
                          ? 'bg-st-pass'
                          : isFail
                          ? 'bg-st-fail'
                          : 'bg-st-warn'
                      }`}
                    >
                      {char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber}
                    </div>

                    {/* Sheet Zone */}
                    <span className="border border-border-str bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-sec font-bold">
                      ZONE {char.zone}
                    </span>

                    {/* Designator */}
                    <span
                      className={`px-1.5 py-0.5 text-[11px] font-bold ${
                        char.designator === 'Critical'
                          ? 'bg-st-fail/10 text-st-fail border border-st-fail/30'
                          : char.designator === 'Major'
                          ? 'bg-acc-orange/10 text-acc-orange border border-acc-orange/30'
                          : 'bg-surface-3 text-text-sec'
                      }`}
                    >
                      {char.designator.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 ${
                        isPass
                          ? 'text-st-pass bg-st-pass/10'
                          : isFail
                          ? 'text-st-fail bg-st-fail/10'
                          : 'text-st-warn bg-st-warn/10'
                      }`}
                    >
                      {isPass ? 'PASS' : isFail ? 'FAIL' : 'REVIEW'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCharacteristic(char.id);
                      }}
                      className="p-1 hover:text-st-fail text-text-mut"
                      title="Delete Characteristic"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row Middle: Live Cropped CAD Canvas Patch + Raw Callout */}
                <div className="grid grid-cols-12 gap-2 items-center mb-2">
                  {/* Embedded Cropped Blueprint Patch (Fix 05) */}
                  <div className="col-span-5 h-12 border border-border-str bg-white flex items-center justify-center overflow-hidden relative shadow-inner">
                    {char.cropDataUrl ? (
                      <img
                        src={char.cropDataUrl}
                        alt="CAD Visual Crop"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-black font-mono font-bold text-[11px] text-center px-1">
                        {char.rawCallout}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 bg-black/70 text-white font-mono text-[11px] px-1 font-bold">
                      CROP
                    </div>
                  </div>

                  {/* Editable Raw Callout Field */}
                  <div className="col-span-7 flex flex-col justify-center">
                    <input
                      type="text"
                      value={char.rawCallout}
                      onChange={(e) => handleFieldChange(char, 'rawCallout', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-surface-2 border border-border-str px-1.5 py-1 text-text-pri font-bold text-xs focus:border-acc-orange focus:outline-none"
                    />
                    <div className="text-[11px] text-text-mut truncate mt-0.5 font-bold">
                      {char.featureDescription}
                    </div>
                  </div>
                </div>

                {/* MMC Bonus Badge (Fix 01) */}
                {char.mmcBonus && (
                  <div className="mb-2 p-1 bg-acc-orange/10 border border-acc-orange/30 text-acc-orange text-[11px] font-bold text-center">
                    MMC BONUS: {char.mmcBonus}
                  </div>
                )}

                {/* Row Lower: Nominal, Tolerances, and Limits */}
                <div className="grid grid-cols-4 gap-1 text-[11px] bg-surface-2 p-1.5 border border-border-str mb-2">
                  <div>
                    <div className="text-[11px] text-text-mut uppercase font-bold">Nominal</div>
                    <input
                      type="number"
                      step="0.001"
                      value={char.nominal}
                      onChange={(e) => handleFieldChange(char, 'nominal', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-surface-1 border border-border-str px-1 py-0.5 text-text-pri font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-text-mut uppercase font-bold">+Tol</div>
                    <input
                      type="number"
                      step="0.001"
                      value={char.plusTolerance}
                      onChange={(e) => handleFieldChange(char, 'plusTolerance', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-surface-1 border border-border-str px-1 py-0.5 text-text-pri font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-text-mut uppercase font-bold">-Tol</div>
                    <input
                      type="number"
                      step="0.001"
                      value={char.minusTolerance}
                      onChange={(e) => handleFieldChange(char, 'minusTolerance', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-surface-1 border border-border-str px-1 py-0.5 text-text-pri font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-text-mut uppercase font-bold">LSL / USL</div>
                    <div className="font-bold text-[11px] text-text-pri leading-tight mt-0.5">
                      LSL: {fmtDim(char.lsl)}<br />USL: {fmtDim(char.usl)}
                    </div>
                  </div>
                </div>

                {/* Measurement Input + Micro-Tolerance Bar */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-str">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[11px] text-text-sec uppercase font-bold">MEASURED:</span>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={char.measuredValue ?? ''}
                      onChange={(e) => handleFieldChange(char, 'measuredValue', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-24 border px-1.5 py-0.5 font-mono font-bold text-xs focus:outline-none ${
                        isPass
                          ? 'border-st-pass text-st-pass bg-st-pass/10'
                          : isFail
                          ? 'border-st-fail text-st-fail bg-st-fail/10'
                          : 'border-border-str bg-surface-1 text-text-pri'
                      }`}
                    />
                    <span className="text-[11px] text-text-mut">{char.units}</span>
                  </div>

                  {/* Verify Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newStatus = isPass ? 'needs_review' : 'in_spec';
                      onUpdateCharacteristic(char.id, { status: newStatus });
                    }}
                    className={`machined-btn px-2 py-1 text-[11px] border font-bold flex items-center gap-1 ${
                      isPass
                        ? 'bg-st-pass text-white border-st-pass'
                        : 'bg-surface-2 text-text-pri border-border-str hover:border-acc-orange'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>{isPass ? 'VERIFIED' : 'ACCEPT'}</span>
                  </button>
                </div>

                {/* Micro-Tolerance Zone Needle Bar [LSL ---|--- USL] */}
                <div className="mt-2 pt-1">
                  <div className="flex justify-between text-[11px] text-text-mut font-mono font-bold">
                    <span>LSL {fmtDim(char.lsl)}</span>
                    <span>USL {fmtDim(char.usl)}</span>
                  </div>
                  <div className="relative w-full h-2.5 bg-surface-2 border border-border-str mt-0.5 overflow-hidden">
                    {/* Center Target mark */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-border-str"></div>
                    {/* Active measurement needle */}
                    {char.measuredValue !== undefined && (
                      <div
                        className={`absolute top-0 bottom-0 w-1 ${
                          isPass ? 'bg-st-pass' : 'bg-st-fail'
                        }`}
                        style={{ left: `${needlePct}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
