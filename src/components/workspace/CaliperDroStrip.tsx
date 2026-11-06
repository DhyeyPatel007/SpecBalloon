import React, { useState, useEffect } from 'react';
import { Characteristic } from '../../types/metrology';
import { calculateSPC, fmtDim, fmtSpc } from '../../utils/metrologyMath';
import { Play, X } from 'lucide-react';

interface CaliperDroStripProps {
  activeCharacteristic: Characteristic | null;
  onInjectMeasurement: (id: number, value: number) => void;
  onAdvanceToNextBalloon: () => void;
  onClose: () => void;
}

export const CaliperDroStrip: React.FC<CaliperDroStripProps> = ({
  activeCharacteristic,
  onInjectMeasurement,
  onAdvanceToNextBalloon,
  onClose,
}) => {
  const [liveDroDisplay, setLiveDroDisplay] = useState(30.014);
  const [isZeroed, setIsZeroed] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Sync live DRO with active characteristic nominal on change
  useEffect(() => {
    if (activeCharacteristic) {
      const mid = (activeCharacteristic.lsl + activeCharacteristic.usl) / 2;
      const dev = (Math.random() * 0.008 - 0.004);
      setLiveDroDisplay(Number((mid + dev).toFixed(3)));
    }
  }, [activeCharacteristic?.id]);

  // Handle Space key for hardware caliper pulse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        pulseConformingMeasurement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const pulseConformingMeasurement = () => {
    if (!activeCharacteristic) return;
    const mid = (activeCharacteristic.lsl + activeCharacteristic.usl) / 2;
    const spread = (activeCharacteristic.usl - activeCharacteristic.lsl) * 0.4;
    const value = Number((mid + (Math.random() * spread - spread / 2)).toFixed(3));
    setLiveDroDisplay(value);

    onInjectMeasurement(activeCharacteristic.id, value);

    if (autoAdvance) {
      setTimeout(() => {
        onAdvanceToNextBalloon();
      }, 350);
    }
  };

  // Clamped, non-negative scrap generator logic (Fix 11)
  const pulseScrapMeasurement = () => {
    if (!activeCharacteristic) return;
    let value: number;

    if (activeCharacteristic.lsl <= 0.0001) {
      // Unilateral GD&T or Ra starting at 0: scrap must ALWAYS exceed USL! Never negative!
      value = Number((activeCharacteristic.usl + 0.015 + Math.random() * 0.020).toFixed(3));
    } else {
      const isAbove = Math.random() > 0.5;
      if (isAbove) {
        value = Number((activeCharacteristic.usl + 0.015 + Math.random() * 0.020).toFixed(3));
      } else {
        // Clamped >= 0.001 to prevent negative metrology scrap
        value = Number(Math.max(0.001, activeCharacteristic.lsl - 0.015 - Math.random() * 0.020).toFixed(3));
      }
    }

    setLiveDroDisplay(value);
    onInjectMeasurement(activeCharacteristic.id, value);

    if (autoAdvance) {
      setTimeout(() => {
        onAdvanceToNextBalloon();
      }, 350);
    }
  };

  if (!activeCharacteristic) return null;

  const spc = calculateSPC(
    activeCharacteristic.lsl,
    activeCharacteristic.usl,
    activeCharacteristic.lotMeasurements
  );

  const cpkGrade =
    spc.cpk >= 1.33
      ? { label: 'CAPABLE (6-SIGMA)', color: 'text-st-pass bg-st-pass/10 border-st-pass/30' }
      : spc.cpk >= 1.00
      ? { label: 'MARGINAL (REVIEW)', color: 'text-st-warn bg-st-warn/10 border-st-warn/30' }
      : { label: 'INCAPABLE (SCRAP)', color: 'text-st-fail bg-st-fail/10 border-st-fail/30' };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-1 border-t-2 border-acc-orange p-3 shadow-2xl z-40 font-mono select-none">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Target Balloon & Spec Limits */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-acc-orange text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 animate-pulse">
            #{activeCharacteristic.balloonNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-pri text-sm">
                {activeCharacteristic.rawCallout}
              </span>
              <span className="border border-border-str px-1.5 py-0.5 text-[11px] text-text-sec bg-surface-2 font-bold">
                ZONE {activeCharacteristic.zone}
              </span>
            </div>
            <div className="text-xs text-text-sec mt-0.5 font-bold">
              TARGET: <span className="text-st-pass font-bold">{fmtDim(activeCharacteristic.lsl)}</span> TO{' '}
              <span className="text-acc-orange font-bold">{fmtDim(activeCharacteristic.usl)} mm</span>
            </div>
          </div>
        </div>

        {/* Center: GIANT 32PT DRO READOUT */}
        <div className="flex items-center gap-4">
          <div className="border-2 border-border-str bg-surface-2 px-6 py-1.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-text-pri">
              {isZeroed ? '0.000' : fmtDim(liveDroDisplay)}
            </span>
            <span className="text-sm font-bold text-acc-orange">mm</span>
          </div>

          {/* Dedicated Live SPC Telemetry Readout Box (Fix 11) */}
          <div className="border border-border-str bg-surface-2 p-2 font-mono text-[11px] space-y-1 hidden lg:block">
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-mut font-bold">BATCH Cp:</span>
              <span className="text-text-pri font-bold">{fmtSpc(spc.cp)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-mut font-bold">BATCH Cpk:</span>
              <span className="text-st-pass font-bold">{fmtSpc(spc.cpk)}</span>
            </div>
            <div className={`px-1.5 py-0.5 text-[10px] font-bold border text-center ${cpkGrade.color}`}>
              {cpkGrade.label}
            </div>
          </div>
        </div>

        {/* Right: Tactile Hardware Action Triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={pulseConformingMeasurement}
            className="machined-btn bg-st-pass hover:bg-green-700 text-white font-bold px-3 py-2 text-xs flex items-center gap-1.5 shadow-sm"
            title="Inject in-spec measurement (Space)"
          >
            <Play className="w-3.5 h-3.5" />
            <span>PULSE IN-SPEC (SPACE)</span>
          </button>

          <button
            onClick={pulseScrapMeasurement}
            className="machined-btn bg-st-fail hover:bg-red-700 text-white font-bold px-3 py-2 text-xs flex items-center gap-1.5"
            title="Inject clamped out-of-spec scrap measurement (Fix 11)"
          >
            <span>PULSE SCRAP</span>
          </button>

          <button
            onClick={() => setIsZeroed(!isZeroed)}
            className="machined-btn border border-border-str bg-surface-2 hover:bg-surface-3 text-text-pri px-2 py-2 text-xs font-bold"
            title="Zero Caliper Display"
          >
            {isZeroed ? 'ABS' : 'ZERO'}
          </button>

          <button
            onClick={onClose}
            className="machined-btn border border-border-str bg-surface-2 hover:bg-surface-3 text-text-sec hover:text-text-pri p-2"
            title="Close DRO Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
