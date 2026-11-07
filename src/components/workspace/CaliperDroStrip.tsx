import React, { useState, useEffect } from 'react';
import { Characteristic } from '../../types/metrology';
import { calculateSPC, fmt3, fmtSpc } from '../../utils/metrologyMath';
import { Radio, X, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

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

  const pulseScrapMeasurement = () => {
    if (!activeCharacteristic) return;
    let value: number;

    if (activeCharacteristic.lsl <= 0.0001) {
      value = Number((activeCharacteristic.usl + 0.015 + Math.random() * 0.020).toFixed(3));
    } else {
      const isAbove = Math.random() > 0.5;
      if (isAbove) {
        value = Number((activeCharacteristic.usl + 0.015 + Math.random() * 0.020).toFixed(3));
      } else {
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

  const isPass = liveDroDisplay >= activeCharacteristic.lsl && liveDroDisplay <= activeCharacteristic.usl;

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md border border-border-hairline rounded-xl shadow-apple-lg px-4 py-2.5 z-30 flex items-center gap-4 text-xs select-none">
      {/* Telemetry Status */}
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-accent-primary animate-pulse" />
        <div className="flex flex-col">
          <span className="font-semibold text-text-pri text-xs">Mitutoyo USB-HID DRO</span>
          <span className="text-[10px] font-mono text-status-pass">CONNECTED (9600 BAUD)</span>
        </div>
      </div>

      <div className="h-7 w-px bg-border-hairline" />

      {/* Target Characteristic */}
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded bg-accent-primary text-white font-mono font-bold text-xs">
          #{activeCharacteristic.balloonNumber < 10 ? `0${activeCharacteristic.balloonNumber}` : activeCharacteristic.balloonNumber}
        </span>
        <div className="flex flex-col max-w-[140px]">
          <span className="font-mono font-bold text-text-pri truncate">{activeCharacteristic.rawCallout}</span>
          <span className="text-[10px] text-text-mut truncate">NOM {fmt3(activeCharacteristic.nominal)} mm</span>
        </div>
      </div>

      <div className="h-7 w-px bg-border-hairline" />

      {/* Large Digital Caliper Readout */}
      <div className="flex items-baseline gap-1 bg-subtle px-3 py-1 rounded-lg border border-border-hairline">
        <span
          className={`font-mono font-bold text-lg tabular-nums tracking-tight ${
            isPass ? 'text-status-pass' : 'text-status-fail'
          }`}
        >
          {fmt3(liveDroDisplay)}
        </span>
        <span className="text-[10px] font-mono text-text-mut">mm</span>
      </div>

      <div className="h-7 w-px bg-border-hairline" />

      {/* Trigger Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={pulseConformingMeasurement}
          className="h-7 px-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-status-pass/40 text-status-pass hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-semibold text-xs flex items-center gap-1 transition-all"
          title="Inject In-Spec Reading (Spacebar)"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Pass [Space]</span>
        </button>

        <button
          onClick={pulseScrapMeasurement}
          className="h-7 px-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-status-fail/40 text-status-fail hover:bg-red-100 dark:hover:bg-red-900/40 font-semibold text-xs flex items-center gap-1 transition-all"
          title="Inject Out-of-Spec Scrap Reading"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Scrap</span>
        </button>

        {/* Auto Advance Toggle */}
        <label className="flex items-center gap-1.5 text-[11px] text-text-sec cursor-pointer pl-1">
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
            className="rounded accent-accent-primary"
          />
          <span>Auto-Next</span>
        </label>
      </div>

      <div className="h-7 w-px bg-border-hairline" />

      {/* Close Button */}
      <button
        onClick={onClose}
        className="w-6 h-6 rounded-md hover:bg-subtle text-text-mut hover:text-text-pri flex items-center justify-center transition-all"
        title="Close Caliper DRO Strip"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
