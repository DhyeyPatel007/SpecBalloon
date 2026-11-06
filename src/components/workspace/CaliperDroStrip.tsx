import React, { useState, useEffect } from 'react';
import { Characteristic } from '../../types/metrology';
import { calculateSPC } from '../../utils/metrologyMath';
import { Cpu, Play, AlertOctagon, RotateCcw, X, CheckCircle2 } from 'lucide-react';

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
      // Nominal + slight deviation
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

  const pulseScrapMeasurement = () => {
    if (!activeCharacteristic) return;
    // Force measurement outside limits
    const isAbove = Math.random() > 0.5;
    const value = isAbove
      ? Number((activeCharacteristic.usl + 0.025).toFixed(3))
      : Number((activeCharacteristic.lsl - 0.025).toFixed(3));

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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-1 border-t-2 border-acc-orange p-3 shadow-2xl z-40 font-mono select-none">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Target Balloon & Spec Limits */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-acc-orange text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 animate-pulse">
            #{activeCharacteristic.balloonNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-pri text-sm">
                {activeCharacteristic.rawCallout}
              </span>
              <span className="border border-border-str px-1.5 py-0.5 text-[10px] text-text-sec bg-surface-2 font-bold">
                ZONE {activeCharacteristic.zone}
              </span>
            </div>
            <div className="text-xs text-text-sec mt-0.5">
              TARGET: <span className="text-st-pass font-bold">{activeCharacteristic.lsl.toFixed(3)}</span> TO{' '}
              <span className="text-acc-orange font-bold">{activeCharacteristic.usl.toFixed(3)} mm</span>
            </div>
          </div>
        </div>

        {/* Center: GIANT 32PT DRO READOUT */}
        <div className="flex items-center gap-4">
          <div className="border-2 border-border-str bg-surface-2 px-6 py-1.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-text-pri">
              {isZeroed ? '0.000' : liveDroDisplay.toFixed(3)}
            </span>
            <span className="text-sm font-bold text-acc-orange">mm</span>
          </div>

          <div className="text-[10px] text-text-mut space-y-0.5 hidden lg:block">
            <div>BATCH Cp: <span className="text-text-pri font-bold">{spc.cp}</span></div>
            <div>BATCH Cpk: <span className="text-st-pass font-bold">{spc.cpk}</span></div>
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
            title="Simulate out-of-spec scrap dimension"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>PULSE SCRAP</span>
          </button>

          <button
            onClick={() => setIsZeroed(!isZeroed)}
            className="machined-btn border border-border-str bg-surface-2 hover:bg-surface-3 text-text-pri px-2 py-2 text-xs"
            title="Toggle ZERO / ABS Origin"
          >
            <RotateCcw className="w-3.5 h-3.5 text-acc-orange" />
          </button>

          <button
            onClick={onClose}
            className="machined-btn border border-border-str p-2 text-text-mut hover:text-text-pri"
            title="Close DRO"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

