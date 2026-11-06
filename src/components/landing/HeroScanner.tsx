import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sliders, FileText, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { SAMPLE_DRAWINGS } from '../../data/sampleDrawings';

interface HeroScannerProps {
  onLaunchWorkspace: (sampleId?: string) => void;
}

export const HeroScanner: React.FC<HeroScannerProps> = ({ onLaunchWorkspace }) => {
  const [sliderPos, setSliderPos] = useState(52); // percentage 0 to 100
  const [autoSweep, setAutoSweep] = useState(true);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-sweep oscillation until user interacts
  useEffect(() => {
    if (!autoSweep) return;
    let angle = 0;
    const interval = setInterval(() => {
      angle += 0.025;
      const pos = 50 + Math.sin(angle) * 32;
      setSliderPos(pos);
    }, 30);
    return () => clearInterval(interval);
  }, [autoSweep]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setAutoSweep(false);
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateSliderFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateSliderFromEvent(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const updateSliderFromEvent = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.x));
    const pct = Math.round((x / rect.width) * 100);
    setSliderPos(pct);
  };

  const sampleBlueprint = SAMPLE_DRAWINGS[0];

  return (
    <section className="relative w-full border-b border-border-str bg-surface-1">
      {/* Corner Registration Crosshairs */}
      <div className="absolute top-2 left-2 font-mono text-[10px] text-border-str pointer-events-none">+ SYS-01 // RETICLE HERO</div>
      <div className="absolute top-2 right-2 font-mono text-[10px] text-border-str pointer-events-none">+ 2D CAD ENGINE</div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column (45% -> 5 cols on lg) */}
        <div className="lg:col-span-5 p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-border-str flex flex-col justify-between">
          <div>
            {/* Classification Tag */}
            <div className="inline-flex items-center gap-2 border border-border-str px-2 py-0.5 bg-surface-2 text-[11px] font-mono text-acc-orange mb-6">
              <span className="w-1.5 h-1.5 bg-acc-orange rounded-none"></span>
              <span>AUTONOMOUS 2D CAD METROLOGY & FAI ENGINE</span>
            </div>

            {/* Monumental Headline */}
            <h1 className="font-display font-bold text-3xl sm:text-4xl xl:text-5xl tracking-tight text-text-pri leading-[1.08] mb-6">
              ZERO-ERROR FIRST ARTICLE INSPECTION IN 11 SECONDS.
            </h1>

            {/* Engineering Sub-copy */}
            <p className="text-text-sec text-sm sm:text-base leading-relaxed mb-8 font-sans">
              SpecBalloon eliminates 6 hours of manual PDF drawing ballooning and spreadsheet data entry. 
              Deterministic vector path decomposition, ISO 286 tolerance math, and live cropped visual verification 
              deliver submission-ready AS9102 Form 3 and AIAG PPAP packages in one click.
            </p>

            {/* Dual Action Cluster */}
            <div className="space-y-4 mb-8">
              <button
                onClick={() => onLaunchWorkspace('AS-4092-C')}
                className="machined-btn w-full bg-acc-orange hover:bg-orange-600 text-white font-mono font-bold py-3.5 px-6 flex items-center justify-center gap-3 text-sm shadow-sm"
              >
                <span>OPEN LIVE DATUM WORKSPACE</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="border border-border-str p-3 bg-surface-2">
                <div className="text-[10px] font-mono text-text-mut mb-2 flex items-center justify-between">
                  <span>TEST PRE-EXTRACTED PRODUCTION BLUEPRINTS:</span>
                  <span className="text-acc-orange">CLICK TO LOAD</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_DRAWINGS.map((draw) => (
                    <button
                      key={draw.id}
                      onClick={() => onLaunchWorkspace(draw.id)}
                      className="machined-btn border border-border-str bg-surface-1 hover:border-acc-orange hover:text-acc-orange p-2 text-left font-mono text-[10px] transition-colors"
                    >
                      <div className="font-bold truncate text-text-pri">{draw.partNumber}</div>
                      <div className="text-text-mut text-[9px] truncate">{draw.characteristics.length} Dims</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Proof Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-6 border-t border-border-str font-mono">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-text-pri">&lt;0.2s</div>
              <div className="text-[10px] text-text-mut uppercase">Vector Parse</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-text-pri">99.4%</div>
              <div className="text-[10px] text-text-mut uppercase">GD&T Recall</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-acc-orange">ISO 286</div>
              <div className="text-[10px] text-text-mut uppercase">Native Limits</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-st-pass">AS9102</div>
              <div className="text-[10px] text-text-mut uppercase">Rev C Ready</div>
            </div>
          </div>
        </div>

        {/* Right Column (55% -> 7 cols on lg) — X-RAY VERNIER SCANNER */}
        <div className="lg:col-span-7 bg-surface-2 relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none">
          {/* Top Scanner HUD bar */}
          <div className="flex items-center justify-between font-mono text-[11px] pb-3 border-b border-border-str text-text-sec">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-acc-orange animate-ping"></span>
              <span>LIVE X-RAY VERNIER SCANNER</span>
              <span className="text-text-mut">| SPLIT-RETICLE VIEW</span>
            </div>
            <button
              onClick={() => setAutoSweep(!autoSweep)}
              className={`machined-btn border border-border-str px-2 py-0.5 text-[10px] flex items-center gap-1.5 ${
                autoSweep ? 'bg-acc-orange text-white border-acc-orange' : 'bg-surface-1 text-text-sec'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>{autoSweep ? 'AUTO-SWEEP: ON' : 'AUTO-SWEEP: PAUSED'}</span>
            </button>
          </div>

          {/* Viewport Container */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative flex-1 my-3 bg-surface-1 border border-border-str overflow-hidden cursor-ew-resize min-h-[460px]"
          >
            {/* Technical grid overlay */}
            <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none"></div>

            {/* SVG Engineering Drawing representation */}
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <svg viewBox="0 0 800 500" className="w-full h-full max-h-[480px]">
                {/* Centerline */}
                <line x1="80" y1="250" x2="720" y2="250" stroke="#2563EB" strokeWidth="1" strokeDasharray="12 4 2 4" />
                
                {/* Mechanical Part Outlines */}
                <rect x="140" y="150" width="40" height="200" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-sec" />
                <rect x="180" y="180" width="340" height="140" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-sec" />
                <rect x="520" y="200" width="160" height="100" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-sec" />

                {/* Hatching patterns */}
                <line x1="180" y1="180" x2="200" y2="200" stroke="currentColor" strokeWidth="1" className="text-border-str" />
                <line x1="220" y1="180" x2="240" y2="200" stroke="currentColor" strokeWidth="1" className="text-border-str" />
                <line x1="260" y1="180" x2="280" y2="200" stroke="currentColor" strokeWidth="1" className="text-border-str" />

                {/* Dimension Extension Lines */}
                <line x1="180" y1="140" x2="520" y2="140" stroke="currentColor" strokeWidth="1" className="text-text-mut" />
                <line x1="180" y1="135" x2="180" y2="180" stroke="currentColor" strokeWidth="1" className="text-text-mut" />
                <line x1="520" y1="135" x2="520" y2="200" stroke="currentColor" strokeWidth="1" className="text-text-mut" />

                <line x1="695" y1="200" x2="695" y2="300" stroke="currentColor" strokeWidth="1" className="text-text-mut" />
                <line x1="680" y1="200" x2="710" y2="200" stroke="currentColor" strokeWidth="1" className="text-text-mut" />
                <line x1="680" y1="300" x2="710" y2="300" stroke="currentColor" strokeWidth="1" className="text-text-mut" />

                {/* Raw Dimension Labels (Visible across drawing) */}
                <text x="350" y="130" fill="currentColor" className="text-text-pri font-mono text-[13px] font-bold" textAnchor="middle">120.0 ±0.15</text>
                <text x="350" y="245" fill="currentColor" className="text-text-pri font-mono text-[13px] font-bold" textAnchor="middle">Ø30.00 H7</text>
                <text x="350" y="270" fill="currentColor" className="text-text-pri font-mono text-[11px] font-bold" textAnchor="middle">|⌖|Ø0.05(M)|A|B|</text>
                <text x="600" y="190" fill="currentColor" className="text-text-pri font-mono text-[12px] font-bold" textAnchor="middle">45.0° ±0.5°</text>
                <text x="730" y="255" fill="currentColor" className="text-text-pri font-mono text-[12px] font-bold">Ø45.00 ±0.02</text>
                <text x="140" y="380" fill="currentColor" className="text-text-pri font-mono text-[12px] font-bold">4x Ø8.50 +0.10/-0.00</text>
              </svg>
            </div>

            {/* RIGHT SIDE LAYER: SPECBALLOON DATUM ENGINE (Clipped by slider percentage) */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            >
              <div className="absolute inset-0 bg-acc-orange/[0.04]">
                {/* Rendered Balloons & Cyan BBoxes */}
                <svg viewBox="0 0 800 500" className="w-full h-full max-h-[480px]">
                  {/* Balloon 1: Ø30 H7 */}
                  <rect x="290" y="230" width="120" height="22" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="270" y1="200" x2="310" y2="230" stroke="#FF5500" strokeWidth="1.5" />
                  <circle cx="260" cy="190" r="14" fill="#FF5500" />
                  <text x="260" y="194" fill="#FFFFFF" font-family="'JetBrains Mono', monospace" fontSize="11" fontWeight="bold" textAnchor="middle">01</text>

                  {/* Balloon 2: GD&T Frame */}
                  <rect x="270" y="255" width="160" height="20" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="240" y1="280" x2="275" y2="265" stroke="#FF5500" strokeWidth="1.5" />
                  <circle cx="230" cy="290" r="14" fill="#FF5500" />
                  <text x="230" y="294" fill="#FFFFFF" font-family="'JetBrains Mono', monospace" fontSize="11" fontWeight="bold" textAnchor="middle">02</text>

                  {/* Balloon 3: 120.0 ±0.15 */}
                  <rect x="290" y="115" width="120" height="22" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="250" y1="100" x2="295" y2="120" stroke="#22C55E" strokeWidth="1.5" />
                  <circle cx="240" cy="90" r="14" fill="#22C55E" />
                  <text x="240" y="94" fill="#FFFFFF" font-family="'JetBrains Mono', monospace" fontSize="11" fontWeight="bold" textAnchor="middle">03</text>

                  {/* Balloon 4: 4x Ø8.50 */}
                  <rect x="120" y="365" width="160" height="22" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="90" y1="410" x2="130" y2="380" stroke="#FF5500" strokeWidth="1.5" />
                  <circle cx="80" cy="420" r="14" fill="#FF5500" />
                  <text x="80" y="424" fill="#FFFFFF" font-family="'JetBrains Mono', monospace" fontSize="11" fontWeight="bold" textAnchor="middle">04</text>

                  {/* Balloon 5: Ø45.00 */}
                  <rect x="710" y="240" width="110" height="22" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="770" y1="190" x2="740" y2="238" stroke="#EF4444" strokeWidth="1.5" />
                  <circle cx="780" cy="180" r="14" fill="#EF4444" />
                  <text x="780" y="184" fill="#FFFFFF" font-family="'JetBrains Mono', monospace" fontSize="11" fontWeight="bold" textAnchor="middle">05</text>
                </svg>

                {/* Floating Telemetry Inspector Card in Live Zone */}
                <div className="absolute bottom-4 right-4 border border-acc-orange bg-surface-1 p-3 text-xs font-mono shadow-md w-72">
                  <div className="flex items-center justify-between text-[10px] text-acc-orange mb-1 font-bold">
                    <span>[VERNIER METROLOGY HUD]</span>
                    <span className="text-st-pass">ISO 286 RESOLVED</span>
                  </div>
                  <div className="font-bold text-text-pri text-sm">Ø30.00 H7 (Balloon #01)</div>
                  <div className="text-[11px] text-text-sec mt-1 grid grid-cols-2 gap-x-2">
                    <div>LSL: <span className="font-bold text-text-pri">30.000mm</span></div>
                    <div>USL: <span className="font-bold text-text-pri">30.021mm</span></div>
                    <div className="col-span-2 text-text-mut text-[10px] mt-1">
                      TOOL: Air Plug Gauge (Ø30.000)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DRAGGABLE VERNIER DIVIDER BAR */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-acc-orange cursor-ew-resize z-20"
              style={{ left: `${sliderPos}%` }}
            >
              {/* Micrometer Vernier Handle Knob */}
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-12 bg-acc-orange border border-white/40 flex flex-col items-center justify-center gap-1 shadow-lg">
                <div className="w-4 h-0.5 bg-white"></div>
                <div className="w-4 h-0.5 bg-white"></div>
                <div className="w-4 h-0.5 bg-white"></div>
              </div>

              {/* Top Vernier Scale Ticks */}
              <div className="absolute top-1 -translate-x-1/2 bg-surface-1 border border-border-str px-1 py-0.5 text-[9px] font-mono text-text-pri whitespace-nowrap shadow-sm">
                VERNIER {sliderPos}%
              </div>
            </div>

            {/* Left Tag (Raw CAD) */}
            <div className="absolute top-3 left-3 border border-border-str bg-surface-1/90 px-2 py-1 text-[10px] font-mono pointer-events-none">
              <span className="text-st-fail font-bold">RAW UNPARSED CAD PDF</span>
              <div className="text-text-mut text-[9px]">MANUAL ENTRY: 4h 12m // HIGH TYPO RISK</div>
            </div>

            {/* Right Tag (SpecBalloon Engine) */}
            <div className="absolute top-3 right-3 border border-acc-orange bg-surface-1/90 px-2 py-1 text-[10px] font-mono pointer-events-none">
              <span className="text-acc-orange font-bold">SPECBALLOON DATUM ENGINE</span>
              <div className="text-st-pass text-[9px]">AUTO-BALLOONED + ISO 286 LIMITS: 0.2s</div>
            </div>
          </div>

          {/* Bottom Telemetry strip */}
          <div className="flex items-center justify-between font-mono text-[10px] text-text-mut pt-2 border-t border-border-str">
            <div>SHEET ZONE: B2 - B4 | PROJECTION: FIRST ANGLE</div>
            <div className="text-acc-orange">DRAG VERNIER BAR TO SCAN DRAWING</div>
          </div>
        </div>
      </div>
    </section>
  );
};
