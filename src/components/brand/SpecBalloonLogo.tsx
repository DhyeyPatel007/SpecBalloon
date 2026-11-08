import React from 'react';

export interface SpecBalloonLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  animateRuby?: boolean;
}

export const SpecBalloonLogo: React.FC<SpecBalloonLogoProps> = ({
  size = 24,
  className = '',
  animateRuby = true,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`specballoon-logo ${className}`}
      {...props}
    >
      {/* 4 Cardinal Crosshair Ticks (0°, 90°, 180°, 270°) */}
      {/* Top 0° */}
      <line x1="12" y1="1" x2="12" y2="3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* Bottom 180° */}
      <line x1="12" y1="20.5" x2="12" y2="23" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* Left 270° */}
      <line x1="1" y1="12" x2="3.5" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* Right 90° */}
      <line x1="20.5" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />

      {/* Sub-Vernier Angular Graduation Ticks (45°, 135°, 225°, 315°) */}
      <line x1="18.2" y1="5.8" x2="17.2" y2="6.8" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round" />
      <line x1="18.2" y1="18.2" x2="17.2" y2="17.2" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round" />
      <line x1="5.8" y1="18.2" x2="6.8" y2="17.2" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round" />
      <line x1="5.8" y1="5.8" x2="6.8" y2="6.8" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round" />

      {/* Outer Precision Vernier Ring */}
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Inner Offset Inspection Reticle Circle */}
      <circle
        cx="12"
        cy="12"
        r="4.25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2 1.5"
        strokeOpacity="0.75"
      />

      {/* Center Micro-Reticle Pivot */}
      <circle
        cx="12"
        cy="12"
        r="1.2"
        fill="currentColor"
      />

      {/* 45° Metrology Leader Stalk extending to upper-right */}
      <line
        x1="14.8"
        y1="9.2"
        x2="19.2"
        y2="4.8"
        stroke="#E11D48"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* 3mm Industrial Synthetic Ruby CMM Probe Dot (#E11D48) at upper-right 45° leader node */}
      <circle
        cx="19.2"
        cy="4.8"
        r="2.2"
        fill="#E11D48"
      />
      {/* Ruby Specular Highlight */}
      <circle
        cx="18.6"
        cy="4.2"
        r="0.7"
        fill="#FFFFFF"
        opacity="0.85"
      />

      {/* Optional Pulse Wave around ruby */}
      {animateRuby && (
        <circle
          cx="19.2"
          cy="4.8"
          r="3.5"
          stroke="#E11D48"
          strokeWidth="0.75"
          opacity="0.4"
          className="animate-ping"
          style={{ transformOrigin: '19.2px 4.8px' }}
        />
      )}
    </svg>
  );
};
