import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface HoverEffectItem {
  title: string;
  description: string;
  price?: string;
  period?: string;
  badge?: string;
  features?: string[];
  ctaText?: string;
  link?: string;
  onAction?: () => void;
  popular?: boolean;
}

export const HoverEffect = ({
  items,
  className,
}: {
  items: HoverEffectItem[];
  className?: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-3 py-6 gap-6",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={item.title}
          className="relative group block p-2 h-full w-full cursor-pointer select-none"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={item.onAction}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-[#0047AB]/10 dark:bg-[#0047AB]/20 block rounded-2xl z-10"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.1 },
                }}
              />
            )}
          </AnimatePresence>
          <HoverCard>
            <div className="flex items-center justify-between mb-3">
              <HoverCardTitle>{item.title}</HoverCardTitle>
              {item.badge && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#0047AB]/30 bg-[#0047AB]/10 text-[#0047AB] dark:text-[#38BDF8] font-bold">
                  {item.badge}
                </span>
              )}
            </div>
            {item.price && (
              <div className="mb-3">
                <span className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100">
                  {item.price}
                </span>
                {item.period && (
                  <span className="text-xs font-mono text-neutral-500 ml-1">
                    {item.period}
                  </span>
                )}
              </div>
            )}
            <HoverCardDescription>{item.description}</HoverCardDescription>
            {item.features && item.features.length > 0 && (
              <ul className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-900 space-y-2 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                {item.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-2">
                    <span className="text-[#0047AB] font-bold">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            )}
            {item.ctaText && (
              <div className="mt-6">
                <button
                  type="button"
                  className={cn(
                    "w-full py-2.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 group-hover:bg-[#0047AB] group-hover:text-white group-hover:border-[#0047AB] shadow-2xs"
                  )}
                >
                  {item.ctaText}
                </button>
              </div>
            )}
          </HoverCard>
        </div>
      ))}
    </div>
  );
};

export const HoverCard = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
  popular?: boolean;
}) => {
  return (
    <div
      className={cn(
        "rounded-xl h-full w-full p-6 overflow-hidden bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 transition duration-200 group-hover:border-[#0047AB] dark:group-hover:border-[#0047AB] relative z-20 shadow-xs flex flex-col justify-between",
        className
      )}
    >
      <div className="relative z-50">
        <div className="p-1">{children}</div>
      </div>
    </div>
  );
};

export const HoverCardTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <h4
      className={cn(
        "text-neutral-900 dark:text-neutral-100 font-mono text-sm font-bold tracking-wide uppercase",
        className
      )}
    >
      {children}
    </h4>
  );
};

export const HoverCardDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <p
      className={cn(
        "text-neutral-600 dark:text-neutral-400 tracking-normal leading-relaxed text-xs font-sans",
        className
      )}
    >
      {children}
    </p>
  );
};
