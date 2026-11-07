import React, { useState } from 'react';
import { Characteristic } from '../../types/metrology';
import { fmt3 } from '../../utils/metrologyMath';
import { Radio, X, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface CaliperDroStripProps {
  activeCharacteristic: Characteristic | null;
  onInjectMeasurement: (id: string, value: number) => void;
  onAdvanceToNextBalloon: () => void;
  onClose: () => void;
}

export const CaliperDroStrip: React.FC<CaliperDroStripProps> = ({
  activeCharacteristic,
  onInjectMeasurement,
  onAdvanceToNextBalloon,
  onClose,
}) => {
  const [manualInput, setManualInput] = useState<string>('');

  if (!activeCharacteristic) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(manualInput);
    if (!isNaN(val)) {
      onInjectMeasurement(activeCharacteristic.id, val);
      setManualInput('');
      onAdvanceToNextBalloon();
    }
  };

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md border border-border-hairline rounded-xl shadow-apple-lg px-4 py-2.5 z-30 flex items-center gap-4 text-xs select-none">
      {/* Telemetry Status: Caliper DRO UI placeholder */}
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-text-mut" />
        <div className="flex flex-col">
          <span className="font-semibold text-text-sec flex items-center gap-1.5">
            <span>Caliper DRO</span>
            <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Not connected
            </span>
          </span>
          <span className="text-[10px] text-text-mut font-mono">USB / BLE Interface Inactive</span>
        </div>
      </div>

      <div className="h-7 w-px bg-border-hairline" />

      {/* Target Characteristic Info */}
      <div className="flex flex-col font-mono">
        <span className="text-[10px] text-text-mut">
          ACTIVE: #{activeCharacteristic.balloonNumber < 10 ? `0${activeCharacteristic.balloonNumber}` : activeCharacteristic.balloonNumber} ({activeCharacteristic.zone})
        </span>
        <span className="font-bold text-text-pri">
          {activeCharacteristic.nominal_text || fmt3(activeCharacteristic.nominal_value ?? activeCharacteristic.nominal)}
          <span className="text-text-mut font-normal text-[11px] ml-1">
            [{fmt3(activeCharacteristic.lower_limit ?? activeCharacteristic.lsl)} – {fmt3(activeCharacteristic.upper_limit ?? activeCharacteristic.usl)}]
          </span>
        </span>
      </div>

      <div className="h-7 w-px bg-border-hairline" />

      {/* Human Measurement Entry */}
      <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
        <input
          type="number"
          step="0.001"
          placeholder="Enter measured value"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          className="w-32 h-7 px-2 rounded border border-border-strong bg-surface font-mono font-semibold text-text-pri text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
        <button
          type="submit"
          className="h-7 px-2.5 rounded bg-accent-primary text-white font-medium hover:bg-accent-primary/90 transition-colors flex items-center gap-1"
        >
          <span>Record</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </form>

      <div className="h-7 w-px bg-border-hairline" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="w-6 h-6 rounded flex items-center justify-center text-text-mut hover:text-text-pri hover:bg-subtle transition-colors"
        title="Close Caliper DRO Banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
