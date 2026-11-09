// src/components/ui/animated-number.tsx
// Adapted from Skiper UI (skiper37, variant 004) — https://skiper-ui.com
import NumberFlow, { type Format } from "@number-flow/react";
import { useInView } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedStatProps {
  value: number;
  prefix?: string;
  suffix?: string;
  format?: Format;
  label: string;
  sublabel?: string;
  className?: string;
}

export function AnimatedStat({
  value,
  prefix,
  suffix,
  format,
  label,
  sublabel,
  className,
}: AnimatedStatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col border-l-2 border-[#0047AB] pl-4 py-1.5",
        className
      )}
    >
      <div className="font-mono text-3xl font-bold tracking-tight text-neutral-950 md:text-4xl dark:text-white">
        <NumberFlow
          value={isInView ? value : 0}
          prefix={prefix}
          suffix={suffix}
          format={format}
        />
      </div>
      <span className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
        {label}
      </span>
      {sublabel && (
        <span className="text-[11px] font-sans text-neutral-500 mt-0.5">
          {sublabel}
        </span>
      )}
    </div>
  );
}
