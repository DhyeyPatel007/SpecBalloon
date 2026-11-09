import React from 'react';
import { cn } from '@/lib/utils';

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
        "relative w-full h-full flex items-center justify-center bg-transparent overflow-hidden",
        containerClassName
      )}
    >
      {/* 1px Precision CAD Blueprint Grid (Cobalt at low opacity) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundSize: '36px 36px',
          backgroundImage:
            'linear-gradient(to right, rgba(37,99,235,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.12) 1px, transparent 1px)',
        }}
      />
      {/* Radial fade mask to focus center content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, transparent 25%, var(--bg-app, #FAFAFA) 80%)',
        }}
      />
      <div className={cn("relative z-10 w-full", className)}>{children}</div>
    </div>
  );
};
