import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export interface ExpandableCardData {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  summary: string;
  expandedDetails: {
    standard: string;
    toleranceRange?: string;
    formula?: string;
    auditRule?: string;
    description: string;
  };
  icon?: React.ReactNode;
}

export const ExpandableBentoCard = ({
  item,
  className,
}: {
  item: ExpandableCardData;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <motion.div
        layoutId={`card-${item.id}`}
        onClick={() => setIsOpen(true)}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.18 }}
        className={cn(
          'cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors shadow-sm hover:shadow-md select-none',
          className
        )}
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {item.tag}
            </span>
            <span className="text-zinc-400 text-xs font-mono">Click to inspect ↗</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {item.icon}
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              {item.title}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 font-mono mb-2">{item.subtitle}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans line-clamp-3">
            {item.summary}
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Standard: {item.expandedDetails.standard}</span>
          <span className="text-sky-600 dark:text-sky-400 font-semibold">AS9102 Rev C</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              layoutId={`card-${item.id}`}
              className="relative w-full max-w-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 z-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {item.tag}
                  </span>
                  <h3 className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                    {item.title}
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div>
                  <h4 className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider mb-1">
                    Specification Scope
                  </h4>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed">
                    {item.expandedDetails.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase">
                      Normative Reference
                    </div>
                    <div className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                      {item.expandedDetails.standard}
                    </div>
                  </div>
                  {item.expandedDetails.toleranceRange && (
                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
                      <div className="text-[10px] font-mono text-zinc-400 uppercase">
                        Tolerance Span
                      </div>
                      <div className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 mt-1">
                        {item.expandedDetails.toleranceRange}
                      </div>
                    </div>
                  )}
                </div>

                {item.expandedDetails.formula && (
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase mb-1">
                      Deterministic Formula
                    </div>
                    <code className="text-xs font-mono block text-emerald-400">
                      {item.expandedDetails.formula}
                    </code>
                  </div>
                )}

                {item.expandedDetails.auditRule && (
                  <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                    <div className="text-[10px] font-mono font-semibold uppercase mb-1">
                      AS9102 / IATF Audit Requirement
                    </div>
                    <p className="text-xs font-sans leading-relaxed">
                      {item.expandedDetails.auditRule}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 text-xs font-mono rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Close Specification [Esc]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

