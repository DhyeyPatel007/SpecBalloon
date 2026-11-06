import React, { useState, useEffect, useRef } from 'react';
import { calculateISO286, calculateSPC, recommendInstrument, fmtDim, fmtSpc } from '../../utils/metrologyMath';
import { ForceDirectedSimulator, PhysicsBalloon } from '../../utils/balloonPhysics';
import { Play, Check } from 'lucide-react';

interface CalloutItem {
  label: string;
  nominal: number;
  plus?: number;
  minus?: number;
  fit?: string;
  type: 'Fit' | 'Bilateral' | 'General' | 'GD&T';
  mmcBonus?: string;
}

export const FourBaysSection: React.FC = () => {
  // BAY 01 STATE
  const [selectedCallout, setSelectedCallout] = useState('Ø30 H7');
  const callouts: CalloutItem[] = [
    { label: 'Ø30 H7', nominal: 30.0, fit: 'H7', type: 'Fit' },
    { label: 'Ø50 g6', nominal: 50.0, fit: 'G6', type: 'Fit' },
    { label: '18.5 ±0.15', nominal: 18.5, plus: 0.15, minus: 0.15, type: 'Bilateral' },
    { label: '64 (ISO 2768-m)', nominal: 64.0, plus: 0.3, minus: 0.3, type: 'General' },
    { label: '|⌖|Ø0.04(M)|A|B|', nominal: 0.000, plus: 0.040, minus: 0.000, type: 'GD&T', mmcBonus: '+0.000 TO +0.021mm' }
  ];

  const currentCallout = callouts.find(c => c.label === selectedCallout) || callouts[0];
  let bay1Nominal = currentCallout.nominal;
  let bay1Plus = 0.021;
  let bay1Minus = 0.0;
  let bay1Instrument = 'Air Plug Gauge / Bore Micrometer';
  let bay1Lsl = 30.000;
  let bay1Usl = 30.021;

  if (currentCallout.type === 'GD&T') {
    bay1Nominal = 0.000;
    bay1Minus = 0.000;
    bay1Plus = currentCallout.plus ?? 0.040;
    bay1Lsl = 0.000;
    bay1Usl = bay1Plus;
    bay1Instrument = 'Zeiss Prismo CMM Probe';
  } else if (currentCallout.type === 'Fit') {
    const res = calculateISO286(currentCallout.nominal, currentCallout.fit || 'H7');
    bay1Plus = res.plusTol;
    bay1Minus = res.minusTol;
    bay1Instrument = res.instrument;
    bay1Lsl = bay1Nominal - bay1Minus;
    bay1Usl = bay1Nominal + bay1Plus;
  } else {
    bay1Plus = currentCallout.plus !== undefined ? currentCallout.plus : 0.100;
    bay1Minus = currentCallout.minus !== undefined ? currentCallout.minus : 0.100;
    bay1Lsl = bay1Nominal - bay1Minus;
    bay1Usl = bay1Nominal + bay1Plus;
    bay1Instrument = recommendInstrument(currentCallout.label, (bay1Plus + bay1Minus));
  }

  const bay1MicronSpread = Math.round((bay1Usl - bay1Lsl) * 1000);

  // BAY 02 STATE: Force-Directed Physics Sandbox
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<ForceDirectedSimulator | null>(null);
  const [draggedBalloon, setDraggedBalloon] = useState<number | null>(null);

  useEffect(() => {
    // 6 anchors with >=95px horizontal, >=65px vertical separation (Fix 06 & 20 #2)
    const initialBalloons: PhysicsBalloon[] = [
      { id: 1, label: '01', x: 95, y: 35, vx: 0, vy: 0, anchorX: 70, anchorY: 45, radius: 14 },
      { id: 2, label: '02', x: 160, y: 35, vx: 0, vy: 0, anchorX: 180, anchorY: 45, radius: 14 },
      { id: 3, label: '03', x: 335, y: 35, vx: 0, vy: 0, anchorX: 310, anchorY: 45, radius: 14 },
      { id: 4, label: '04', x: 95, y: 145, vx: 0, vy: 0, anchorX: 70, anchorY: 135, radius: 14 },
      { id: 5, label: '05', x: 160, y: 145, vx: 0, vy: 0, anchorX: 180, anchorY: 135, radius: 14 },
      { id: 6, label: '06', x: 335, y: 145, vx: 0, vy: 0, anchorX: 310, anchorY: 135, radius: 14 }
    ];

    simRef.current = new ForceDirectedSimulator(initialBalloons);

    let animationId: number;
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !simRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      simRef.current.step();

      // Render frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw faint dimension labels at anchors
      simRef.current.balloons.forEach((b, i) => {
        // Dimension target box
        ctx.strokeStyle = '#2563EB';
        ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
        ctx.strokeRect(b.anchorX - 25, b.anchorY - 10, 50, 20);
        ctx.fillRect(b.anchorX - 25, b.anchorY - 10, 50, 20);

        ctx.fillStyle = '#66645E';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`DIM #${i + 1}`, b.anchorX, b.anchorY);

        // Leader line
        ctx.strokeStyle = '#FF5500';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(b.anchorX, b.anchorY);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Balloon circle
        ctx.fillStyle = '#FF5500';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, b.x, b.y);
      });

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleSandboxPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !simRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.x;
    const y = e.clientY - rect.y;

    for (const b of simRef.current.balloons) {
      const dx = b.x - x;
      const dy = b.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= b.radius + 8) {
        b.isDragging = true;
        setDraggedBalloon(b.id);
        break;
      }
    }
  };

  const handleSandboxPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !simRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.x;
    const y = e.clientY - rect.y;

    if (draggedBalloon !== null) {
      const b = simRef.current.balloons.find(item => item.id === draggedBalloon);
      if (b) {
        b.x = x;
        b.y = y;
        b.vx = 0;
        b.vy = 0;
      }
    } else {
      // Repel from cursor
      simRef.current.step({ x, y });
    }
  };

  const handleSandboxPointerUp = () => {
    if (simRef.current && draggedBalloon !== null) {
      const b = simRef.current.balloons.find(item => item.id === draggedBalloon);
      if (b) {
        b.isDragging = false;
        // Lock new resting anchor point near drag release (Fix 20 #2)
        b.vx = 0;
        b.vy = 0;
      }
      setDraggedBalloon(null);
    }
  };

  // BAY 03 STATE: Zero-Ping-Pong Tape with Keyboard & Clickable Badges (Fix 20 #3)
  const [tapeIndex, setTapeIndex] = useState(0);
  const [tapeRows, setTapeRows] = useState([
    { id: 1, callout: 'Ø30.00 H7', lsl: 30.000, usl: 30.021, measured: 30.012, verified: true },
    { id: 2, callout: '|⌖|Ø0.05(M)|A|B|', lsl: 0.000, usl: 0.050, measured: 0.028, verified: true },
    { id: 3, callout: '120.0 ±0.15', lsl: 119.850, usl: 120.150, measured: 120.080, verified: false }
  ]);

  // Window key listener for keys '1', '2', '3'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === '1') setTapeIndex(0);
      if (e.key === '2') setTapeIndex(1);
      if (e.key === '3') setTapeIndex(2);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleVerify = (index: number) => {
    setTapeRows(prev => prev.map((r, i) => i === index ? { ...r, verified: !r.verified } : r));
  };

  // BAY 04 STATE: Live USB Caliper & SPC
  const [caliperSamples, setCaliperSamples] = useState<number[]>([30.008, 30.012, 30.015, 30.010, 30.014]);
  const [lastCaliperPulse, setLastCaliperPulse] = useState(30.014);

  const spcMetrics = calculateSPC(30.000, 30.021, caliperSamples);

  const pulseCaliper = () => {
    const val = Number((30.006 + Math.random() * 0.013).toFixed(3));
    setLastCaliperPulse(val);
    setCaliperSamples(prev => [...prev.slice(-9), val]);
  };

  return (
    <section id="telemetry-bays" className="w-full border-b border-border-str bg-surface-1 py-16 px-4 sm:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <div className="font-mono text-xs text-acc-orange mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-acc-orange"></span>
            <span>03 // LIVE TELEMETRY BAYS</span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-text-pri">
            FOUR INTERACTIVE MACHINED INSTRUMENTS.
          </h2>
          <p className="text-text-sec text-sm sm:text-base max-w-3xl mt-3 font-sans">
            Every core engine feature is an active, living instrument. Test deterministic ISO tolerance math, 
            force-directed physics, characteristic tape verification, and live USB caliper SPC in real time.
          </p>
        </div>

        {/* 2x2 Architectural Grid Bays */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BAY 01: ISO 286 Math Resolver */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Top Mechanical Header Strip */}
              <div className="flex items-center justify-between font-mono text-[11px] pb-3 mb-4 border-b border-border-str text-text-sec">
                <span className="text-text-pri font-bold">BAY 01 // ISO 286 & GD&T LIMIT RESOLVER</span>
                <span className="text-acc-orange font-bold">ACTIVE TELEMETRY</span>
              </div>

              {/* Callout Pills Selector */}
              <div className="text-[11px] font-mono text-text-mut mb-2 font-bold">SELECT TEST ENGINEERING CALLOUT:</div>
              <div className="flex flex-wrap gap-1.5 mb-6">
                {callouts.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => setSelectedCallout(c.label)}
                    className={`machined-btn px-2.5 py-1 text-xs font-mono border ${
                      selectedCallout === c.label
                        ? 'bg-acc-orange text-white border-acc-orange font-bold'
                        : 'bg-surface-2 border-border-str text-text-pri hover:border-acc-orange'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Metrology Calculation Grid */}
              <div className="border border-border-str bg-surface-2 p-4 font-mono text-xs mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4 pb-3 border-b border-border-str">
                  <div>
                    <div className="text-[11px] text-text-mut uppercase font-bold">Nominal</div>
                    <div className="text-base font-bold text-text-pri">{fmtDim(bay1Nominal)} mm</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-mut uppercase font-bold">+Tol / -Tol</div>
                    <div className="text-sm font-bold text-text-pri">+{fmtDim(bay1Plus)} / -{fmtDim(bay1Minus)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-mut uppercase font-bold">Lower Limit (LSL)</div>
                    <div className="text-base font-bold text-st-pass">{fmtDim(bay1Lsl)} mm</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-mut uppercase font-bold">Upper Limit (USL)</div>
                    <div className="text-base font-bold text-acc-orange">{fmtDim(bay1Usl)} mm</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] pt-1">
                  <div>TOLERANCE SPREAD: <span className="text-text-pri font-bold">{bay1MicronSpread} µm</span></div>
                  <div className="text-acc-orange font-bold truncate">TOOL: {bay1Instrument}</div>
                </div>

                {currentCallout.mmcBonus && (
                  <div className="mt-3 p-2 bg-acc-orange/10 border border-acc-orange/30 text-acc-orange text-[11px] font-bold text-center">
                    MMC BONUS: {currentCallout.mmcBonus} (MAX MATERIAL CONDITION)
                  </div>
                )}
              </div>
            </div>

            <div className="font-mono text-[11px] text-text-mut border-t border-border-str pt-3 flex items-baseline gap-1">
              <span>EQUATION: i = 0.45 ·</span>
              <span className="inline-flex items-baseline">
                <sup className="text-[0.7em] font-bold -mr-0.5">3</sup>
                &radic;<span className="border-t border-text-mut">D</span>
              </span>
              <span>+ 0.001 · D [MICRO-EXACT DETERMINISTIC OUTPUT]</span>
            </div>
          </div>

          {/* BAY 02: Force-Directed Balloon Physics Sandbox */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Top Mechanical Header Strip */}
              <div className="flex items-center justify-between font-mono text-[11px] pb-3 mb-2 border-b border-border-str text-text-sec">
                <span className="text-text-pri font-bold">BAY 02 // FORCE-DIRECTED SPRING REPULSION SOLVER (60FPS)</span>
                <span className="text-st-pass font-bold">60 FPS RUNNING</span>
              </div>

              <div className="text-[11px] text-text-sec font-mono mb-3">
                DRAG ANY BALLOON OR MOVE CURSOR THROUGH CLUSTER TO FEEL SPRING REPULSION:
              </div>

              {/* Canvas Physics Simulation */}
              <div className="border border-border-str bg-surface-2 relative overflow-hidden h-[180px]">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={180}
                  onPointerDown={handleSandboxPointerDown}
                  onPointerMove={handleSandboxPointerMove}
                  onPointerUp={handleSandboxPointerUp}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                />
              </div>
            </div>

            <div className="font-mono text-[11px] text-text-mut border-t border-border-str pt-3 flex items-center justify-between">
              <span>REPULSION: F_rep = k_r / dist²</span>
              <span className="text-acc-orange font-bold">ZERO TEXT OVERLAP GUARANTEED</span>
            </div>
          </div>

          {/* BAY 03: Zero-Ping-Pong Crop-Tape Simulator */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Top Mechanical Header Strip */}
              <div className="flex items-center justify-between font-mono text-[11px] pb-3 mb-3 border-b border-border-str text-text-sec">
                <span className="text-text-pri font-bold">BAY 03 // ZERO-PING-PONG CROP-TAPE</span>
                {/* Clickable keyboard badges (Fix 20 #3) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-text-mut">KEYS:</span>
                  {[0, 1, 2].map((k) => (
                    <button
                      key={k}
                      onClick={() => setTapeIndex(k)}
                      className={`machined-btn px-2 py-0.5 text-[11px] border font-bold ${
                        tapeIndex === k
                          ? 'bg-acc-orange text-white border-acc-orange'
                          : 'bg-surface-2 text-text-pri border-border-str'
                      }`}
                    >
                      {k + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-text-sec font-mono mb-3">
                HIGH-CONTRAST CAD INK SNIPPET EMBEDDED DIRECTLY NEXT TO MEASUREMENT:
              </div>

              {/* Stacked Characteristic Rows */}
              <div className="space-y-2 mb-4 font-mono text-xs">
                {tapeRows.map((row, idx) => (
                  <div
                    key={row.id}
                    onClick={() => setTapeIndex(idx)}
                    className={`p-2.5 border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      tapeIndex === idx
                        ? 'border-acc-orange bg-surface-2 ring-1 ring-acc-orange'
                        : 'border-border-str bg-surface-1 hover:border-text-mut'
                    }`}
                  >
                    {/* Balloon Number */}
                    <div className="w-6 h-6 rounded-full bg-acc-orange text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      0{row.id}
                    </div>

                    {/* Simulated High-Contrast CAD Crop Patch */}
                    <div className="w-32 h-8 border border-border-str bg-white text-black flex items-center justify-center font-bold text-[11px] px-1 overflow-hidden select-none">
                      {row.callout}
                    </div>

                    {/* Numeric Metrology Data */}
                    <div className="flex-1 text-[11px]">
                      <div className="font-bold text-text-pri">{fmtDim(row.measured)} mm</div>
                      <div className="text-[11px] text-text-mut">[{fmtDim(row.lsl)} - {fmtDim(row.usl)}]</div>
                    </div>

                    {/* Verification Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVerify(idx);
                      }}
                      className={`machined-btn px-2 py-1 text-[11px] border font-bold flex items-center gap-1 ${
                        row.verified
                          ? 'bg-st-pass text-white border-st-pass'
                          : 'bg-surface-1 text-text-sec border-border-str'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{row.verified ? 'VERIFIED' : 'REVIEW'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="font-mono text-[11px] text-text-mut border-t border-border-str pt-3">
              BENEFIT: Eliminates 300+ eye gaze saccades per drawing.
            </div>
          </div>

          {/* BAY 04: Live USB Caliper & SPC Telemetry */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Top Mechanical Header Strip */}
              <div className="flex items-center justify-between font-mono text-[11px] pb-3 mb-3 border-b border-border-str text-text-sec">
                <span className="text-text-pri font-bold">BAY 04 // USB-HID CALIPER & SPC ENGINE</span>
                <span className="text-st-pass font-bold">USB-HID ACTIVE</span>
              </div>

              {/* Caliper Action Controls */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <button
                  onClick={pulseCaliper}
                  className="machined-btn flex-1 bg-acc-orange hover:bg-orange-600 text-white font-mono font-bold py-2 px-3 text-xs flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>PULSE MITUTOYO CALIPER DATA</span>
                </button>

                <div className="border border-border-str bg-surface-2 px-3 py-1.5 font-mono text-center">
                  <div className="text-[11px] text-text-mut font-bold">LAST PULSE</div>
                  <div className="text-base font-bold text-text-pri">{fmtDim(lastCaliperPulse)} mm</div>
                </div>
              </div>

              {/* Control Chart Visual [LSL ---|--- USL] */}
              <div className="border border-border-str bg-surface-2 p-3 font-mono text-xs mb-3">
                <div className="flex justify-between text-[11px] text-text-mut mb-1 font-bold">
                  <span>LSL: 30.000</span>
                  <span className="text-text-pri font-bold">TARGET: 30.0105</span>
                  <span>USL: 30.021</span>
                </div>

                {/* Tolerance Zone Bar */}
                <div className="relative w-full h-4 bg-surface-1 border border-border-str">
                  {/* Target Centerline */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-border-str"></div>
                  {/* Plotted Samples */}
                  {caliperSamples.map((s, idx) => {
                    const pct = Math.max(0, Math.min(100, ((s - 30.000) / 0.021) * 100));
                    return (
                      <div
                        key={idx}
                        className="absolute top-0.5 bottom-0.5 w-1 bg-acc-orange"
                        style={{ left: `${pct}%` }}
                        title={`${fmtDim(s)} mm`}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-border-str text-center">
                  <div>
                    <div className="text-[11px] text-text-mut font-bold">PROCESS Cp</div>
                    <div className="font-bold text-text-pri">{fmtSpc(spcMetrics.cp)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-mut font-bold">PROCESS Cpk</div>
                    <div className="font-bold text-st-pass">{fmtSpc(spcMetrics.cpk)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-mut font-bold">SAMPLE COUNT</div>
                    <div className="font-bold text-text-pri">{caliperSamples.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="font-mono text-[11px] text-text-mut border-t border-border-str pt-3">
              HARDWARE: Compatible with Mitutoyo Digimatic, Fowler, Mahr, and Starrett USB wedges.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
