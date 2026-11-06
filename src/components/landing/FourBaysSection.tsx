import React, { useState, useEffect, useRef } from 'react';
import { calculateISO286, calculateSPC, recommendInstrument } from '../../utils/metrologyMath';
import { ForceDirectedSimulator, PhysicsBalloon } from '../../utils/balloonPhysics';
import { Play, Check, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';

export const FourBaysSection: React.FC = () => {
  // BAY 01 STATE
  const [selectedCallout, setSelectedCallout] = useState('Ø30 H7');
  const callouts = [
    { label: 'Ø30 H7', nominal: 30.0, fit: 'H7', type: 'Fit' },
    { label: 'Ø50 g6', nominal: 50.0, fit: 'G6', type: 'Fit' },
    { label: '18.5 ±0.15', nominal: 18.5, plus: 0.15, minus: 0.15, type: 'Bilateral' },
    { label: '64 (ISO 2768-m)', nominal: 64.0, plus: 0.3, minus: 0.3, type: 'General' },
    { label: '|⌖|Ø0.04(M)|A|B|', nominal: 0.04, plus: 0.04, minus: 0.0, type: 'GD&T' }
  ];

  const currentCallout = callouts.find(c => c.label === selectedCallout) || callouts[0];
  let bay1Nominal = currentCallout.nominal;
  let bay1Plus = 0.021;
  let bay1Minus = 0.0;
  let bay1Instrument = 'Air Plug Gauge / Bore Micrometer';

  if (currentCallout.type === 'Fit') {
    const res = calculateISO286(currentCallout.nominal, currentCallout.fit || 'H7');
    bay1Plus = res.plusTol;
    bay1Minus = res.minusTol;
    bay1Instrument = res.instrument;
  } else {
    bay1Plus = currentCallout.plus || 0.1;
    bay1Minus = currentCallout.minus || 0.1;
    bay1Instrument = recommendInstrument(currentCallout.label, (bay1Plus + bay1Minus));
  }

  const bay1Lsl = bay1Nominal - bay1Minus;
  const bay1Usl = bay1Nominal + bay1Plus;
  const bay1MicronSpread = Math.round((bay1Usl - bay1Lsl) * 1000);

  // BAY 02 STATE: Force-Directed Physics Sandbox
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<ForceDirectedSimulator | null>(null);
  const [draggedBalloon, setDraggedBalloon] = useState<number | null>(null);

  useEffect(() => {
    const initialBalloons: PhysicsBalloon[] = [
      { id: 1, label: '01', x: 120, y: 80, vx: 0, vy: 0, anchorX: 100, anchorY: 140, radius: 14 },
      { id: 2, label: '02', x: 130, y: 90, vx: 0, vy: 0, anchorX: 110, anchorY: 150, radius: 14 }, // Intentional cluster
      { id: 3, label: '03', x: 220, y: 70, vx: 0, vy: 0, anchorX: 230, anchorY: 130, radius: 14 },
      { id: 4, label: '04', x: 230, y: 80, vx: 0, vy: 0, anchorX: 240, anchorY: 140, radius: 14 }, // Intentional cluster
      { id: 5, label: '05', x: 310, y: 160, vx: 0, vy: 0, anchorX: 300, anchorY: 110, radius: 14 },
      { id: 6, label: '06', x: 330, y: 170, vx: 0, vy: 0, anchorX: 320, anchorY: 115, radius: 14 }
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
        ctx.font = '9px "JetBrains Mono", monospace';
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
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
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
      if (Math.sqrt(dx * dx + dy * dy) <= b.radius + 6) {
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
      if (b) b.isDragging = false;
      setDraggedBalloon(null);
    }
  };

  // BAY 03 STATE: Zero-Ping-Pong Tape
  const [tapeIndex, setTapeIndex] = useState(0);
  const [tapeRows, setTapeRows] = useState([
    { id: 1, callout: 'Ø30.00 H7', lsl: 30.000, usl: 30.021, measured: 30.012, verified: true },
    { id: 2, callout: '|⌖|Ø0.05(M)|A|B|', lsl: 0.000, usl: 0.050, measured: 0.028, verified: true },
    { id: 3, callout: '120.0 ±0.15', lsl: 119.850, usl: 120.150, measured: 120.080, verified: false }
  ]);

  const toggleVerify = (index: number) => {
    setTapeRows(prev => prev.map((r, i) => i === index ? { ...r, verified: !r.verified } : r));
  };

  // BAY 04 STATE: Live USB Caliper & SPC
  const [caliperSamples, setCaliperSamples] = useState<number[]>([30.008, 30.012, 30.015, 30.010, 30.014]);
  const [lastCaliperPulse, setLastCaliperPulse] = useState(30.014);

  const spcMetrics = calculateSPC(30.000, 30.021, caliperSamples);

  const pulseCaliper = () => {
    // Generate realistic measurement within or near tolerance
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
              <div className="flex items-center justify-between font-mono text-[10px] pb-3 mb-4 border-b border-border-str text-text-sec">
                <span className="text-text-pri font-bold">BAY 01 // ISO 286 & GD&T LIMIT RESOLVER</span>
                <span className="text-acc-orange">ACTIVE TELEMETRY</span>
              </div>

              {/* Callout Pills Selector */}
              <div className="text-[10px] font-mono text-text-mut mb-2">SELECT TEST ENGINEERING CALLOUT:</div>
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
                    <div className="text-[9px] text-text-mut uppercase">Nominal</div>
                    <div className="text-base font-bold text-text-pri">{bay1Nominal.toFixed(3)} mm</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-text-mut uppercase">+Tol / -Tol</div>
                    <div className="text-sm font-bold text-text-pri">+{bay1Plus.toFixed(3)} / -{bay1Minus.toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-text-mut uppercase">Lower Limit (LSL)</div>
                    <div className="text-base font-bold text-st-pass">{bay1Lsl.toFixed(3)} mm</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-text-mut uppercase">Upper Limit (USL)</div>
                    <div className="text-base font-bold text-acc-orange">{bay1Usl.toFixed(3)} mm</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] pt-1">
                  <div>TOLERANCE SPREAD: <span className="text-text-pri font-bold">{bay1MicronSpread} µm</span></div>
                  <div className="text-acc-orange font-bold">TOOL: {bay1Instrument}</div>
                </div>
              </div>
            </div>

            <div className="font-mono text-[10px] text-text-mut border-t border-border-str pt-3">
              EQUATION: i = 0.45 · ∛D + 0.001 · D [MICRO-EXACT DETERMINISTIC OUTPUT]
            </div>
          </div>

          {/* BAY 02: Force-Directed Balloon Physics Sandbox */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Top Mechanical Header Strip */}
              <div className="flex items-center justify-between font-mono text-[10px] pb-3 mb-2 border-b border-border-str text-text-sec">
                <span className="text-text-pri font-bold">BAY 02 // FORCE-DIRECTED BALLOON PHYSICS</span>
                <span className="text-st-pass">60 FPS RUNNING</span>
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

            <div className="font-mono text-[10px] text-text-mut border-t border-border-str pt-3 flex items-center justify-between">
              <span>REPULSION: F_rep = k_r / dist²</span>
              <span className="text-acc-orange">ZERO TEXT OVERLAP GUARANTEED</span>
            </div>
          </div>

          {/* BAY 03: Zero-Ping-Pong Crop-Tape Simulator */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Top Mechanical Header Strip */}
              <div className="flex items-center justify-between font-mono text-[10px] pb-3 mb-3 border-b border-border-str text-text-sec">
                <span className="text-text-pri font-bold">BAY 03 // ZERO-PING-PONG CROP-TAPE</span>
                <span className="text-acc-orange">KEYBOARD: 1, 2, 3</span>
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
                        ? 'border-acc-orange bg-surface-2'
                        : 'border-border-str bg-surface-1 hover:border-text-mut'
                    }`}
                  >
                    {/* Balloon Number */}
                    <div className="w-6 h-6 rounded-full bg-acc-orange text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      0{row.id}
                    </div>

                    {/* Simulated High-Contrast CAD Crop Patch */}
                    <div className="w-28 h-8 border border-border-str bg-white text-black flex items-center justify-center font-bold text-[10px] px-1 overflow-hidden select-none">
                      {row.callout}
                    </div>

                    {/* Numeric Metrology Data */}
                    <div className="flex-1 text-[11px]">
                      <div className="font-bold text-text-pri">{row.measured.toFixed(3)} mm</div>
                      <div className="text-[9px] text-text-mut">[{row.lsl.toFixed(3)} - {row.usl.toFixed(3)}]</div>
                    </div>

                    {/* Verification Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVerify(idx);
                      }}
                      className={`machined-btn px-2 py-1 text-[10px] border font-bold flex items-center gap-1 ${
                        row.verified
                          ? 'bg-st-pass text-white border-st-pass'
                          : 'bg-surface-1 text-text-sec border-border-str'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{row.verified ? 'VERIFIED' : 'REVIEW'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="font-mono text-[10px] text-text-mut border-t border-border-str pt-3">
              BENEFIT: Eliminates 300+ eye gaze saccades per drawing.
            </div>
          </div>

          {/* BAY 04: Live USB Caliper & SPC Telemetry */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Top Mechanical Header Strip */}
              <div className="flex items-center justify-between font-mono text-[10px] pb-3 mb-3 border-b border-border-str text-text-sec">
                <span className="text-text-pri font-bold">BAY 04 // USB-HID CALIPER & SPC ENGINE</span>
                <span className="text-st-pass">USB-HID ACTIVE</span>
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
                  <div className="text-[9px] text-text-mut">LAST PULSE</div>
                  <div className="text-base font-bold text-text-pri">{lastCaliperPulse.toFixed(3)} mm</div>
                </div>
              </div>

              {/* Control Chart Visual [LSL ---|--- USL] */}
              <div className="border border-border-str bg-surface-2 p-3 font-mono text-xs mb-3">
                <div className="flex justify-between text-[10px] text-text-mut mb-1">
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
                        title={`${s} mm`}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-border-str text-center">
                  <div>
                    <div className="text-[9px] text-text-mut">PROCESS Cp</div>
                    <div className="font-bold text-text-pri">{spcMetrics.cp}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-text-mut">PROCESS Cpk</div>
                    <div className="font-bold text-st-pass">{spcMetrics.cpk}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-text-mut">SAMPLE COUNT</div>
                    <div className="font-bold text-text-pri">{caliperSamples.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="font-mono text-[10px] text-text-mut border-t border-border-str pt-3">
              HARDWARE: Compatible with Mitutoyo Digimatic, Fowler, Mahr, and Starrett USB wedges.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

