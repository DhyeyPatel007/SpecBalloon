import React from 'react';

export interface OrthographicBlueprintSvgProps {
  className?: string;
  activeTagId?: string | null;
  onSelectTag?: (tagId: string) => void;
  scanBeamPct?: number; // 0 to 100
  showLaser?: boolean;
}

export interface BlueprintCalloutItem {
  id: string;
  tag: string;
  zone: string;
  callout: string;
  feature: string;
  nominal: number;
  plus: number;
  minus: number;
  lsl: number;
  usl: number;
  measured: number;
  instrument: string;
  xPct: number;
  yPct: number;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  gdtFrame?: string;
  status: 'pass' | 'active' | 'warn';
}

export const BLUEPRINT_CALLOUTS: BlueprintCalloutItem[] = [
  {
    id: 'tag-01',
    tag: '01',
    zone: 'B3',
    callout: 'Ø30.00 H7 (+0.021 / -0.000)',
    feature: 'Main Actuator Cylinder Bore (Datum B)',
    nominal: 30.000,
    plus: 0.021,
    minus: 0.000,
    lsl: 30.000,
    usl: 30.021,
    measured: 30.012,
    instrument: 'Mahr Air Plug Gauge (Ø30)',
    xPct: 24,
    yPct: 49,
    boxX: 185,
    boxY: 275,
    boxW: 135,
    boxH: 26,
    status: 'pass'
  },
  {
    id: 'tag-02',
    tag: '02',
    zone: 'B4',
    callout: '|⌖|Ø0.05(M)|A|B(M)|',
    feature: 'Bore True Position to Datums A & B',
    nominal: 0.000,
    plus: 0.050,
    minus: 0.000,
    lsl: 0.000,
    usl: 0.070, // with +0.020 MMC bonus
    measured: 0.058,
    instrument: 'ZEISS PRISMO CMM Probe',
    xPct: 37,
    yPct: 62,
    boxX: 285,
    boxY: 345,
    boxW: 130,
    boxH: 26,
    gdtFrame: '⌖ Ø0.05 Ⓜ | A | B Ⓜ',
    status: 'pass'
  },
  {
    id: 'tag-03',
    tag: '03',
    zone: 'A2',
    callout: '120.0 ±0.15',
    feature: 'Outer Flange Major Diameter (Datum C)',
    nominal: 120.000,
    plus: 0.150,
    minus: 0.150,
    lsl: 119.850,
    usl: 120.150,
    measured: 120.040,
    instrument: 'Mitutoyo Digital Caliper 0-150mm',
    xPct: 15,
    yPct: 18,
    boxX: 110,
    boxY: 95,
    boxW: 115,
    boxH: 26,
    status: 'pass'
  },
  {
    id: 'tag-04',
    tag: '04',
    zone: 'C2',
    callout: '4X Ø8.530 ±0.035',
    feature: 'Bolt Pattern Hole Cavities (#04.1..#04.4)',
    nominal: 8.530,
    plus: 0.035,
    minus: 0.035,
    lsl: 8.495,
    usl: 8.565,
    measured: 8.528,
    instrument: 'Meyer Pin Gage Set Class X',
    xPct: 38,
    yPct: 22,
    boxX: 290,
    boxY: 120,
    boxW: 130,
    boxH: 26,
    status: 'pass'
  },
  {
    id: 'tag-05',
    tag: '05',
    zone: 'A5',
    callout: 'Ra 1.6 µm',
    feature: 'Mounting Face Surface Roughness',
    nominal: 1.600,
    plus: 0.000,
    minus: 1.600,
    lsl: 0.000,
    usl: 1.600,
    measured: 1.120,
    instrument: 'Mitutoyo Surftest SJ-210 Stylus',
    xPct: 62,
    yPct: 16,
    boxX: 475,
    boxY: 85,
    boxW: 90,
    boxH: 26,
    status: 'pass'
  },
  {
    id: 'tag-06',
    tag: '06',
    zone: 'B6',
    callout: '|⏥|0.025|A|',
    feature: 'Mounting Face Flatness (Datum A)',
    nominal: 0.000,
    plus: 0.025,
    minus: 0.000,
    lsl: 0.000,
    usl: 0.025,
    measured: 0.018,
    instrument: 'Tesa Micro-Hite 600 Gage',
    xPct: 68,
    yPct: 34,
    boxX: 520,
    boxY: 185,
    boxW: 105,
    boxH: 26,
    gdtFrame: '⏥ 0.025 | A',
    status: 'pass'
  },
  {
    id: 'tag-07',
    tag: '07',
    zone: 'C7',
    callout: 'M10×1.5 - 6H ↧ 18.0',
    feature: 'Internal Hydraulic Port Thread',
    nominal: 10.000,
    plus: 0.206,
    minus: 0.000,
    lsl: 9.026,
    usl: 9.206,
    measured: 9.112,
    instrument: 'Thread Plug Gauge M10x1.5-6H',
    xPct: 75,
    yPct: 56,
    boxX: 575,
    boxY: 310,
    boxW: 140,
    boxH: 26,
    status: 'pass'
  },
  {
    id: 'tag-08',
    tag: '08',
    zone: 'D5',
    callout: '35.0 ±0.05',
    feature: 'Actuator Counterbore Depth',
    nominal: 35.000,
    plus: 0.050,
    minus: 0.050,
    lsl: 34.950,
    usl: 35.050,
    measured: 35.018,
    instrument: 'Mitutoyo Digital Depth Micrometer',
    xPct: 54,
    yPct: 72,
    boxX: 415,
    boxY: 400,
    boxW: 105,
    boxH: 26,
    status: 'pass'
  }
];

export const OrthographicBlueprintSvg: React.FC<OrthographicBlueprintSvgProps> = ({
  className = '',
  activeTagId,
  onSelectTag,
  scanBeamPct = 50,
  showLaser = true
}) => {
  // SVG Viewbox dimensions: 800 x 550 (Standard 16:11 Aspect Ratio)
  const svgWidth = 800;
  const svgHeight = 550;
  const laserX = (scanBeamPct / 100) * svgWidth;

  return (
    <div className={`relative w-full h-full select-none overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full"
        style={{ shapeRendering: 'geometricPrecision' }}
      >
        <defs>
          {/* Engineering 10mm / 50mm Millimeter Grid Pattern */}
          <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.35" strokeOpacity="0.08" />
          </pattern>
          <pattern id="majorGrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#smallGrid)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.65" strokeOpacity="0.16" />
          </pattern>

          {/* 45° Section View Hatching Pattern for Machined Metal Wall */}
          <pattern id="hatchMetal" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.35" />
          </pattern>

          {/* Arrowhead Markers */}
          <marker id="arrowStart" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 5 L 10 2 L 8 5 L 10 8 Z" fill="currentColor" />
          </marker>
          <marker id="arrowEnd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 2 L 10 5 L 0 8 L 2 5 Z" fill="currentColor" />
          </marker>

          {/* Datum Feature Symbol Marker */}
          <marker id="datumA" viewBox="0 0 20 20" refX="10" refY="10" markerWidth="10" markerHeight="10" orient="auto">
            <polygon points="10,0 20,20 0,20" fill="currentColor" />
          </marker>
        </defs>

        {/* 1. Engineering Millimeter Grid Background */}
        <rect width={svgWidth} height={svgHeight} fill="url(#majorGrid)" />

        {/* 2. ISO 5457 Outer Border Frame & Zone Reference Markers (A-D / 1-8) */}
        <rect
          x="18"
          y="18"
          width={svgWidth - 36}
          height={svgHeight - 36}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        />

        {/* Inner Margin Border (10mm standard) */}
        <rect
          x="26"
          y="26"
          width={svgWidth - 52}
          height={svgHeight - 52}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeOpacity="0.5"
        />

        {/* Zone Markers: 1 to 8 across Top & Bottom */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((num, i) => {
          const xPos = 26 + (i + 0.5) * ((svgWidth - 52) / 8);
          return (
            <g key={`num-${num}`} className="font-mono text-[9px] fill-current opacity-60 text-anchor-middle">
              <text x={xPos} y="23" textAnchor="middle">{num}</text>
              <text x={xPos} y={svgHeight - 20} textAnchor="middle">{num}</text>
              <line x1={xPos} y1="18" x2={xPos} y2="26" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
              <line x1={xPos} y1={svgHeight - 26} x2={xPos} y2={svgHeight - 18} stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
            </g>
          );
        })}

        {/* Zone Markers: A to D across Left & Right */}
        {['A', 'B', 'C', 'D'].map((letter, i) => {
          const yPos = 26 + (i + 0.5) * ((svgHeight - 52) / 4);
          return (
            <g key={`alpha-${letter}`} className="font-mono text-[9px] fill-current opacity-60">
              <text x="21" y={yPos + 3} textAnchor="middle">{letter}</text>
              <text x={svgWidth - 22} y={yPos + 3} textAnchor="middle">{letter}</text>
              <line x1="18" y1={yPos} x2="26" y2={yPos} stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
              <line x1={svgWidth - 26} y1={yPos} x2={svgWidth - 18} y2={yPos} stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
            </g>
          );
        })}

        {/* 3. Engineering Title Block in Lower Right */}
        <g className="font-mono text-[9px] text-[var(--text-primary)]">
          <rect
            x={svgWidth - 260}
            y={svgHeight - 100}
            width="234"
            height="74"
            fill="var(--bg-surface)"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <line x1={svgWidth - 260} y1={svgHeight - 76} x2={svgWidth - 26} y2={svgHeight - 76} stroke="currentColor" strokeWidth="0.75" />
          <line x1={svgWidth - 260} y1={svgHeight - 52} x2={svgWidth - 26} y2={svgHeight - 52} stroke="currentColor" strokeWidth="0.75" />
          <line x1={svgWidth - 140} y1={svgHeight - 76} x2={svgWidth - 140} y2={svgHeight - 26} stroke="currentColor" strokeWidth="0.75" />

          <text x={svgWidth - 252} y={svgHeight - 85} className="font-bold text-[10px] tracking-wider">SPECBALLOON METROLOGY</text>
          <text x={svgWidth - 85} y={svgHeight - 85} className="text-[8px] opacity-70">ISO 2768-m</text>

          <text x={svgWidth - 252} y={svgHeight - 64} className="text-[8px] opacity-60">DWG NO:</text>
          <text x={svgWidth - 252} y={svgHeight - 55} className="font-bold text-[10px]">AS-4092-C</text>

          <text x={svgWidth - 134} y={svgHeight - 64} className="text-[8px] opacity-60">REV:</text>
          <text x={svgWidth - 134} y={svgHeight - 55} className="font-bold text-[10px]">REV C (ECO-881)</text>

          <text x={svgWidth - 252} y={svgHeight - 40} className="text-[8px] opacity-60">TITLE:</text>
          <text x={svgWidth - 252} y={svgHeight - 31} className="font-bold text-[8.5px]">AEROSPACE HYDRAULIC ACTUATOR HOUSING</text>

          <text x={svgWidth - 134} y={svgHeight - 40} className="text-[8px] opacity-60">SCALE / SHT:</text>
          <text x={svgWidth - 134} y={svgHeight - 31} className="font-bold text-[9px]">1:1 · SHEET 1 OF 1</text>
        </g>

        {/* =========================================================================
            VIEW 1 (LEFT): ORTHOGRAPHIC FRONT FLANGE VIEW (With Bolt Circle & Center Bore)
            Center: (210, 260)
            ========================================================================= */}
        <g id="view1-front-flange" stroke="currentColor">
          {/* View Label */}
          <text x="210" y="80" className="font-mono font-bold text-[11px] fill-current text-anchor-middle tracking-wider" textAnchor="middle">
            VIEW 1: FRONT FLANGE (1:1)
          </text>

          {/* Centerlines (Long dash - dot) */}
          <line x1="85" y1="260" x2="335" y2="260" strokeWidth="0.65" strokeDasharray="18 4 3 4" strokeOpacity="0.5" />
          <line x1="210" y1="135" x2="210" y2="385" strokeWidth="0.65" strokeDasharray="18 4 3 4" strokeOpacity="0.5" />

          {/* Outer Flange Major Diameter Circle (Ø120 mm -> R=105px) */}
          <circle cx="210" cy="260" r="105" fill="none" strokeWidth="1.8" />

          {/* Bolt Pitch Circle (BCD Ø90 mm -> R=78px, dashed centerline) */}
          <circle cx="210" cy="260" r="78" fill="none" strokeWidth="0.85" strokeDasharray="8 4 2 4" strokeOpacity="0.6" />

          {/* Center Raised Boss Diameter (Ø60 mm -> R=52px) */}
          <circle cx="210" cy="260" r="52" fill="none" strokeWidth="1.2" />

          {/* Main Internal Bore (Datum B: Ø30.00 H7 -> R=28px) */}
          <circle cx="210" cy="260" r="28" fill="none" strokeWidth="1.8" />

          {/* 4X Bolt Holes (Ø8.53 mm -> R=7.5px) at 45°, 135°, 225°, 315° */}
          {[45, 135, 225, 315].map((angle, idx) => {
            const rad = (angle * Math.PI) / 180;
            const hX = 210 + Math.cos(rad) * 78;
            const hY = 260 + Math.sin(rad) * 78;
            return (
              <g key={`hole-${idx}`}>
                {/* Hole Circle */}
                <circle cx={hX} cy={hY} r="7.5" fill="none" strokeWidth="1.4" />
                {/* Crosshairs */}
                <line x1={hX - 11} y1={hY} x2={hX + 11} y2={hY} strokeWidth="0.5" strokeOpacity="0.5" />
                <line x1={hX} y1={hY - 11} x2={hX} y2={hY + 11} strokeWidth="0.5" strokeOpacity="0.5" />
              </g>
            );
          })}

          {/* Section Cut Line A ———— A (Through Center Vertical) */}
          <line x1="210" y1="110" x2="210" y2="135" strokeWidth="2.5" />
          <line x1="210" y1="385" x2="210" y2="410" strokeWidth="2.5" />
          {/* Direction Arrows */}
          <polyline points="210,110 225,110" strokeWidth="2" markerEnd="url(#arrowEnd)" />
          <polyline points="210,410 225,410" strokeWidth="2" markerEnd="url(#arrowEnd)" />
          <text x="232" y="113" className="font-mono font-bold text-[11px] fill-current">A</text>
          <text x="232" y="413" className="font-mono font-bold text-[11px] fill-current">A</text>
        </g>

        {/* =========================================================================
            VIEW 2 (RIGHT): CROSS-SECTION VIEW A-A (With 45° Metal Hatching)
            Offset: (480, 260)
            ========================================================================= */}
        <g id="view2-section-a-a" stroke="currentColor">
          {/* Section Label */}
          <text x="560" y="80" className="font-mono font-bold text-[11px] fill-current text-anchor-middle tracking-wider" textAnchor="middle">
            SECTION A-A (CROSS-SECTION 1:1)
          </text>

          {/* Axis of Revolution Centerline */}
          <line x1="420" y1="260" x2="710" y2="260" strokeWidth="0.65" strokeDasharray="18 4 3 4" strokeOpacity="0.5" />

          {/* Top Metal Wall Profile (Cross-Hatched) */}
          {/* Profile: (x: 460 to 660, y: 155 to 232) */}
          <path
            d="M 460 155 L 660 155 L 660 208 L 620 208 L 620 232 L 460 232 Z"
            fill="url(#hatchMetal)"
            strokeWidth="1.6"
          />

          {/* Bottom Metal Wall Profile (Cross-Hatched, Mirrored) */}
          <path
            d="M 460 365 L 660 365 L 660 312 L 620 312 L 620 288 L 460 288 Z"
            fill="url(#hatchMetal)"
            strokeWidth="1.6"
          />

          {/* Bore Inner Through Surface Lines */}
          <line x1="460" y1="232" x2="620" y2="232" strokeWidth="1.6" />
          <line x1="460" y1="288" x2="620" y2="288" strokeWidth="1.6" />

          {/* Stepped Counterbore Vertical Walls */}
          <line x1="620" y1="208" x2="620" y2="232" strokeWidth="1.6" />
          <line x1="620" y1="288" x2="620" y2="312" strokeWidth="1.6" />
          <line x1="620" y1="208" x2="660" y2="208" strokeWidth="1.6" />
          <line x1="620" y1="312" x2="660" y2="312" strokeWidth="1.6" />

          {/* Outer Ends */}
          <line x1="460" y1="155" x2="460" y2="365" strokeWidth="1.8" />
          <line x1="660" y1="155" x2="660" y2="365" strokeWidth="1.6" />

          {/* Datum A Leader & Box (Mounting Face at X=460) */}
          <line x1="460" y1="380" x2="460" y2="410" strokeWidth="1.2" />
          <line x1="460" y1="410" x2="490" y2="410" strokeWidth="1.2" />
          <polygon points="460,375 456,388 464,388" fill="currentColor" />
          <g className="font-mono font-bold text-[10px] fill-current">
            <rect x="490" y="401" width="18" height="18" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
            <text x="495" y="414">A</text>
          </g>

          {/* Datum B Leader & Box (Center Bore Centerline at Y=260) */}
          <line x1="430" y1="260" x2="410" y2="260" strokeWidth="1.2" />
          <line x1="410" y1="260" x2="410" y2="225" strokeWidth="1.2" />
          <polygon points="435,260 422,256 422,264" fill="currentColor" />
          <g className="font-mono font-bold text-[10px] fill-current">
            <rect x="401" y="207" width="18" height="18" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
            <text x="406" y="220">B</text>
          </g>
        </g>

        {/* =========================================================================
            DIMENSION EXTENSION LINES & CAD ARROWS
            ========================================================================= */}
        <g id="dimension-lines" stroke="currentColor" strokeWidth="0.85" opacity="0.8">
          {/* Tag 03: 120.0 Major Diameter Dimension line (Left side of View 1) */}
          <line x1="85" y1="155" x2="70" y2="155" />
          <line x1="85" y1="365" x2="70" y2="365" />
          <line x1="75" y1="155" x2="75" y2="365" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />

          {/* Tag 01: Bore Dimension Leader (View 1 Center Bore to Tag 01) */}
          <line x1="210" y1="232" x2="250" y2="280" />
          <line x1="250" y1="280" x2="310" y2="280" />

          {/* Tag 04: Bolt Hole Leader (View 1 Hole to Tag 04) */}
          <line x1="265" y1="205" x2="330" y2="135" />
          <line x1="330" y1="135" x2="390" y2="135" />

          {/* Tag 08: Counterbore Depth Dimension line (View 2) */}
          <line x1="620" y1="375" x2="620" y2="410" />
          <line x1="660" y1="375" x2="660" y2="410" />
          <line x1="620" y1="405" x2="660" y2="405" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
        </g>

        {/* =========================================================================
            AUTOMATED SCANNING COBALT LASER BEAM (Sweeps vertically or horizontally)
            ========================================================================= */}
        {showLaser && (
          <g id="scanning-laser" className="pointer-events-none transition-all duration-75">
            <line
              x1={laserX}
              y1="26"
              x2={laserX}
              y2={svgHeight - 26}
              stroke="#0284C7"
              strokeWidth="2"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
            {/* Laser Head Node */}
            <circle cx={laserX} cy="26" r="4" fill="#0284C7" />
            <circle cx={laserX} cy={svgHeight - 26} r="4" fill="#0284C7" />

            {/* Glowing Scan Aura */}
            <rect
              x={laserX - 24}
              y="26"
              width="24"
              height={svgHeight - 52}
              fill="url(#laserGlow)"
              opacity="0.15"
            />
          </g>
        )}

        {/* =========================================================================
            INTERACTIVE HIGHLIGHT PILLS & CORNER BALLOON TAGS (#01 TO #08)
            ========================================================================= */}
        {BLUEPRINT_CALLOUTS.map((callout) => {
          const isSelected = activeTagId === callout.id;
          const isPassedLaser = showLaser ? laserX >= callout.boxX - 20 : true;

          return (
            <g
              key={callout.id}
              onClick={() => onSelectTag && onSelectTag(callout.id)}
              className="cursor-pointer group"
              style={{
                opacity: isPassedLaser ? 1 : 0.25,
                transition: 'opacity 0.2s ease-out'
              }}
            >
              {/* Highlight Background Pill */}
              <rect
                x={callout.boxX}
                y={callout.boxY}
                width={callout.boxW}
                height={callout.boxH}
                rx="4"
                fill={isSelected ? 'rgba(2, 132, 199, 0.18)' : 'rgba(5, 150, 105, 0.08)'}
                stroke={isSelected ? '#0284C7' : '#059669'}
                strokeWidth={isSelected ? '1.75' : '1'}
                strokeDasharray={isSelected ? 'none' : '3 2'}
                className="transition-all"
              />

              {/* Tag Balloon Badge (Upper Left of Pill) */}
              <rect
                x={callout.boxX - 6}
                y={callout.boxY - 8}
                width="20"
                height="15"
                rx="3"
                fill={isSelected ? '#0284C7' : '#059669'}
                stroke="#FFFFFF"
                strokeWidth="1"
              />
              <text
                x={callout.boxX + 4}
                y={callout.boxY + 3}
                fill="#FFFFFF"
                className="font-mono font-bold text-[9px] text-anchor-middle"
                textAnchor="middle"
              >
                {callout.tag}
              </text>

              {/* Callout Text */}
              <text
                x={callout.boxX + 18}
                y={callout.boxY + 16}
                className="font-mono font-semibold text-[10px] fill-current"
              >
                {callout.gdtFrame || callout.callout}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

