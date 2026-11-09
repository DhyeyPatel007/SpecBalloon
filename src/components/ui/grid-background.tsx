import React from 'react';
import { cn } from '../../lib/utils';

export interface GridBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  children,
  className,
  containerClassName,
}) => {
  return (
    <div
      className={cn(
        "relative w-full h-full flex items-center justify-center bg-[var(--bg-app)] overflow-hidden",
        containerClassName
      )}
    >
      {/* 1px Precision CAD Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-40"
        style={{
          backgroundSize: '32px 32px',
          backgroundImage:
            'linear-gradient(to right, var(--border-hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--border-hairline) 1px, transparent 1px)',
        }}
      />
      {/* Radial fade mask to focus center content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, transparent 30%, var(--bg-app) 80%)',
        }}
      />
      <div className={cn("relative z-10 w-full", className)}>{children}</div>
    </div>
  );
};
