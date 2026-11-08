import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Info } from 'lucide-react';

export interface SmartTooltipProps {
  title: string;
  shortcut?: string;
  whatItDoes: string;
  aiAction?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  dismissDelay?: number;
  children: React.ReactNode;
  className?: string;
}

export const SmartTooltip: React.FC<SmartTooltipProps> = ({
  title,
  shortcut,
  whatItDoes,
  aiAction,
  side = 'bottom',
  delay = 2000,
  dismissDelay = 100,
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimeouts = () => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    showTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, dismissDelay);
  };

  useEffect(() => {
    return () => clearAllTimeouts();
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side];

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses} z-[9999] w-[280px] p-3 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-2xl backdrop-blur-md pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95`}
          style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)' }}
        >
          {/* Header Row: Title & Shortcut */}
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-hairline)] mb-2">
            <span className="font-semibold text-xs tracking-tight flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              {title}
            </span>
            {shortcut && (
              <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold uppercase rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-hairline)] shadow-2xs">
                {shortcut}
              </kbd>
            )}
          </div>

          {/* What it does */}
          <div className="mb-2">
            <div className="text-[9px] font-mono font-bold tracking-wider uppercase text-[var(--text-muted)] mb-0.5 flex items-center gap-1">
              <Info className="w-2.5 h-2.5" />
              <span>What it does</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
              {whatItDoes}
            </p>
          </div>

          {/* AI / Metrology Action */}
          {aiAction && (
            <div className="p-1.5 rounded bg-[var(--bg-subtle)]/70 border border-[var(--border-hairline)]">
              <div className="text-[9px] font-mono font-bold tracking-wider uppercase text-[var(--accent)] mb-0.5 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>AI / Metrology Action</span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-[var(--text-primary)] font-mono">
                {aiAction}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
