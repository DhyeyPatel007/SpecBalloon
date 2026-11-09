import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronsLeftRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CompareProps {
  firstContent: React.ReactNode;
  secondContent: React.ReactNode;
  firstLabel?: string;
  secondLabel?: string;
  className?: string;
  initialSliderPosition?: number;
}

export const Compare: React.FC<CompareProps> = ({
  firstContent,
  secondContent,
  firstLabel = 'Raw 2D CAD Blueprint',
  secondLabel = 'Auto-Ballooned AS9102 Overlay',
  className,
  initialSliderPosition = 50,
}) => {
  const [sliderPosition, setSliderPosition] = useState(initialSliderPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className={cn(
        "relative w-full overflow-hidden select-none rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] cursor-ew-resize shadow-md",
        className
      )}
    >
      {/* Second Item (Full underneath, revealed on right) */}
      <div className="w-full h-full relative">{secondContent}</div>

      {/* First Item (Clipped by slider percentage on left) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
        }}
      >
        {firstContent}
      </div>

      {/* Divider Hairline */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-[var(--accent)] z-20 pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Center Drag Handle Pill */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--accent)] shadow-xl flex items-center justify-center text-[var(--accent)] pointer-events-auto">
          <ChevronsLeftRight className="w-4 h-4 stroke-[2]" />
        </div>
      </div>

      {/* Labels */}
      {firstLabel && (
        <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-md bg-[var(--bg-surface)]/90 backdrop-blur-xs border border-[var(--border-hairline)] text-[10.5px] font-mono font-semibold text-[var(--text-secondary)] shadow-xs pointer-events-none">
          {firstLabel}
        </div>
      )}
      {secondLabel && (
        <div className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-md bg-[var(--bg-surface)]/90 backdrop-blur-xs border border-[var(--accent)]/40 text-[10.5px] font-mono font-semibold text-[var(--accent)] shadow-xs pointer-events-none">
          {secondLabel}
        </div>
      )}
    </div>
  );
};
