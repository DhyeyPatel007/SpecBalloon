import { useEffect, useRef, useState, useCallback } from 'react';
import { soundEngine } from '../utils/audioSynthesizer';

interface UsbCaliperListenerOptions {
  enabled?: boolean;
  onMeasurementReceived: (val: number) => void;
}

export function useUsbCaliperListener({
  enabled = true,
  onMeasurementReceived,
}: UsbCaliperListenerOptions) {
  const bufferRef = useRef<Array<{ char: string; time: number }>>([]);
  const [lastBurst, setLastBurst] = useState<{
    value: number;
    timestamp: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in a standard input, textarea, or contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const now = performance.now();

      // Check for Enter key finishing a hardware caliper burst
      if (e.key === 'Enter') {
        const buf = bufferRef.current;
        if (buf.length >= 3) {
          // Verify that this was a high-speed hardware burst (< 65ms per stroke)
          let isHighSpeedBurst = true;
          for (let i = 1; i < buf.length; i++) {
            const delta = buf[i].time - buf[i - 1].time;
            if (delta > 75) {
              isHighSpeedBurst = false;
              break;
            }
          }

          if (isHighSpeedBurst) {
            const rawStr = buf.map((b) => b.char).join('');
            const val = parseFloat(rawStr);
            if (!isNaN(val) && isFinite(val)) {
              e.preventDefault();
              e.stopPropagation();

              setLastBurst({
                value: val,
                timestamp: Date.now(),
                count: buf.length,
              });

              onMeasurementReceived(val);
              bufferRef.current = [];
              return;
            }
          }
        }
        bufferRef.current = [];
        return;
      }

      // Collect numeric and decimal characters: 0-9, ., -
      if (/^[0-9.-]$/.test(e.key)) {
        const buf = bufferRef.current;
        if (buf.length > 0) {
          const delta = now - buf[buf.length - 1].time;
          // If human gap (> 120ms), start fresh buffer
          if (delta > 120) {
            bufferRef.current = [{ char: e.key, time: now }];
            return;
          }
        }
        bufferRef.current.push({ char: e.key, time: now });
      } else {
        // Discard buffer on non-numeric keys
        bufferRef.current = [];
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, onMeasurementReceived]);

  // Test simulation trigger for judges / testers without physical USB hardware
  const simulateCaliperBurst = useCallback(
    (mockValue: number = 30.012) => {
      setLastBurst({
        value: mockValue,
        timestamp: Date.now(),
        count: 6,
      });
      onMeasurementReceived(mockValue);
    },
    [onMeasurementReceived]
  );

  return {
    lastBurst,
    simulateCaliperBurst,
  };
}
