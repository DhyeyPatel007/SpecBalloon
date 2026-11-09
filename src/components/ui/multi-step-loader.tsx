import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingStep {
  text: string;
  subtext?: string;
}

export interface MultiStepLoaderProps {
  loadingStates: LoadingStep[];
  loading: boolean;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

export const MultiStepLoader: React.FC<MultiStepLoaderProps> = ({
  loadingStates,
  loading,
  duration = 1200,
  onComplete,
  className,
}) => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    if (!loading) {
      setCurrentState(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentState((prev) => {
        if (prev < loadingStates.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onComplete?.();
          }, 300);
          return prev;
        }
      });
    }, duration);

    return () => clearInterval(interval);
  }, [loading, duration, loadingStates.length, onComplete]);

  if (!loading) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none",
          className
        )}
      >
        <motion.div
          initial={{ scale: 0.95, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-lg rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl text-[var(--text-primary)] font-sans"
        >
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-hairline)] mb-5">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                AI Metrology Pipeline Executing
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Stage {currentState + 1} of {loadingStates.length} · Neuro-Symbolic Engine
              </p>
            </div>
          </div>

          {/* Steps List */}
          <div className="space-y-3.5">
            {loadingStates.map((step, idx) => {
              const isPast = idx < currentState;
              const isCurrent = idx === currentState;
              const isFuture = idx > currentState;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-lg border transition-colors",
                    isCurrent
                      ? "border-[var(--accent)]/50 bg-[var(--bg-selected)]/40 shadow-xs"
                      : isPast
                      ? "border-[var(--border-hairline)] bg-[var(--bg-subtle)]/30"
                      : "border-transparent opacity-40"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {isPast ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 flex items-center justify-center">
                        <Loader2 className="w-3 h-3 animate-spin stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-center">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-xs font-medium leading-snug",
                        isCurrent
                          ? "text-[var(--text-primary)] font-semibold"
                          : isPast
                          ? "text-[var(--text-secondary)]"
                          : "text-[var(--text-muted)]"
                      )}
                    >
                      {step.text}
                    </p>
                    {step.subtext && (
                      <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        {step.subtext}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer seal */}
          <div className="mt-5 pt-3.5 border-t border-[var(--border-hairline)] flex items-center justify-between text-[10.5px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Deterministic ISO 286 / ASME Y14.5 Math</span>
            </span>
            <span>PyMuPDF 300 DPI</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
