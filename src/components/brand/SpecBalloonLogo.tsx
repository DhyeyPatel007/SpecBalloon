import React from 'react';

export interface SpecBalloonLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  dotPulse?: boolean;
  animateRuby?: boolean;
}

export const SpecBalloonLogo: React.FC<SpecBalloonLogoProps> = ({
  size = 28,
  className = '',
  dotPulse = true,
  animateRuby,
  ...props
}) => {
  const showPulse = animateRuby !== undefined ? animateRuby : dotPulse;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`specballoon-monogram select-none flex-shrink-0 ${className}`}
      {...props}
    >
      {/* 28x28 Squircle (rx=6, #09090B solid or var(--text-primary)) */}
      <rect
        width="28"
        height="28"
        rx="6"
        fill="#09090B"
        className="dark:fill-[#FAFAFA]"
      />

      {/* Subtle Inner Micro-Hairline Border */}
      <rect
        x="0.75"
        y="0.75"
        width="26.5"
        height="26.5"
        rx="5.25"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.75"
        className="dark:stroke-black/15"
      />

      {/* Geometric Engineered Uppercase "S" */}
      <path
        d="M17.5 9.5H12C10.6193 9.5 9.5 10.6193 9.5 12C9.5 13.3807 10.6193 14.5 12 14.5H16C17.3807 14.5 18.5 15.6193 18.5 17C18.5 18.3807 17.3807 19.5 16 19.5H10.5"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dark:stroke-[#09090B]"
      />

      {/* 4px Crimson CMM Inspection Probe Ruby Dot in Top-Right Corner (#E11D48) */}
      <circle
        cx="21.5"
        cy="6.5"
        r="2"
        fill="#E11D48"
      />

      {/* Optional Soft Specular / Pulse */}
      {showPulse && (
        <circle
          cx="21.5"
          cy="6.5"
          r="3.5"
          stroke="#E11D48"
          strokeWidth="0.75"
          opacity="0.45"
          className="animate-ping"
          style={{ transformOrigin: '21.5px 6.5px' }}
        />
      )}
    </svg>
  );
};
