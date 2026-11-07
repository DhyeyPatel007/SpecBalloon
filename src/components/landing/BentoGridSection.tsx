import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Radio,
  Sparkles,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Cpu,
  Move,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { SafeImage } from '../../utils/assetLoader';
import { soundEngine } from '../../utils/audioSynthesizer';
import { exportAS9102Excel, fmt3 } from '../../utils/metrologyMath';
import { SAMPLE_DRAWINGS } from '../../data/sampleDrawings';

interface PhysicsDot {
  id: number;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  anchorX: number;
  anchorY: number;
}

export const BentoGridSection: React.FC = () => {
  // Card 1: Active Layer
  const [activeArchLayer, setActiveArchLayer] = useState<1 | 2 | 3>(2);

  // Card 2: Caliper Simulation
  const [simulatedCaliperVal, setSimulatedCaliperVal] = useState<number>(30.012);
  const [caliperStatus, setCaliperStatus] = useState<'pass' | 'scrap'>('pass');
  const [pulseCount, setPulseCount] = useState<number>(0);

  const handleSimulateCaliper = () => {
    const isPass = Math.random() > 0.15;
    const val = isPass
      ? Number((30.000 + Math.random() * 0.020).toFixed(3))
      : Number((30.021 + 0.015 + Math.random() * 0.010).toFixed(3));
    setSimulatedCaliperVal(val);
    setCaliperStatus(isPass ? 'pass' : 'scrap');
    setPulseCount((prev) => prev + 1);

    if (isPass) {
      soundEngine.playInSpecPass();
    } else {
      soundEngine.playOutOfSpecScrap();
    }
  };

  // Card 3: Interactive Physics Canvas
  const physicsCanvasRef = useRef<HTMLCanvasElement>(null);
  const [draggedBalloonIdx, setDraggedBalloonIdx] = useState<number | null>(null);

  const balloonsRef = useRef<PhysicsDot[]>([
    { id: 1, label: '01', x: 70, y: 55, vx: 0, vy: 0, anchorX: 130, anchorY: 100 },
    { id: 2, label: '02', x: 200, y: 60, vx: 0, vy: 0, anchorX: 160, anchorY: 110 },
    { id: 3, label: '03', x: 230, y: 150, vx: 0, vy: 0, anchorX: 170, anchorY: 140 },
    { id: 4, label: '04', x: 65, y: 160, vx: 0, vy: 0, anchorX: 120, anchorY: 135 },
  ]);

  useEffect(() => {
    const canvas = physicsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const dots = balloonsRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Draw subtle background grid
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      for (let x = 20; x < w; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 20; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Physics step: Repulsion between balloons + Spring attraction to anchor
      for (let i = 0; i < dots.length; i++) {
        if (i === draggedBalloonIdx) continue;
        const b = dots[i];

        // Spring to anchor
        const dxAnchor = b.anchorX - b.x;
        const dyAnchor = b.anchorY - b.y;
        const distAnchor = Math.sqrt(dxAnchor * dxAnchor + dyAnchor * dyAnchor);
        const desiredDist = 55;
        const springForce = (distAnchor - desiredDist) * 0.05;

        if (distAnchor > 0) {
          b.vx += (dxAnchor / distAnchor) * springForce;
          b.vy += (dyAnchor / distAnchor) * springForce;
        }

        // Repulsion from other balloons
        for (let j = 0; j < dots.length; j++) {
          if (i === j) continue;
          const other = dots[j];
          const dx = b.x - other.x;
          const dy = b.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0 && dist < 50) {
            const rep = ((50 - dist) / 50) * 1.8;
            b.vx += (dx / dist) * rep;
            b.vy += (dy / dist) * rep;
          }
        }

        // Damping
        b.vx *= 0.85;
        b.vy *= 0.85;

        // Position update
        b.x += b.vx;
        b.y += b.vy;

        // Bounds
        b.x = Math.max(16, Math.min(w - 16, b.x));
        b.y = Math.max(16, Math.min(h - 16, b.y));
      }

      // Draw anchors and leader lines
      dots.forEach((b) => {
        // Leader line
        ctx.strokeStyle = '#0066CC';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b.anchorX, b.anchorY);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Anchor crosshair
        ctx.fillStyle = '#0066CC';
        ctx.fillRect(b.anchorX - 2, b.anchorY - 2, 4, 4);

        // Balloon circle
        ctx.fillStyle = '#E11D48';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, b.x, b.y);
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [draggedBalloonIdx]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = physicsCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dots = balloonsRef.current;
    const foundIdx = dots.findIndex((b) => {
      const dx = b.x - x;
      const dy = b.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= 18;
    });

    if (foundIdx !== -1) {
      setDraggedBalloonIdx(foundIdx);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedBalloonIdx === null) return;
    const canvas = physicsCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(16, Math.min(canvas.width - 16, e.clientX - rect.left));
    const y = Math.max(16, Math.min(canvas.height - 16, e.clientY - rect.top));

    balloonsRef.current[draggedBalloonIdx].x = x;
    balloonsRef.current[draggedBalloonIdx].y = y;
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDraggedBalloonIdx(null);
  };

  // Card 4: 1-Click Excel Export
  const handleExportSampleExcel = () => {
    const sample = SAMPLE_DRAWINGS[0];
    exportAS9102Excel(sample.partNumber, sample.revision, sample.characteristics);
  };

  return (
    <section id="architecture" className="w-full py-24 bg-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-xs font-semibold text-accent-primary mb-4">
            <Cpu className="w-3.5 h-3.5" />
            <span>METROLOGY ARCHITECTURE</span>
          </div>

          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-pri tracking-tight mb-4">
            Engineered for Zero-Defect Aerospace &amp; Automotive QA.
          </h2>

          <p className="text-base sm:text-lg text-text-sec font-sans leading-relaxed">
            Four breakthroughs working in unison: 3-layer deep vector extraction, instant Bluetooth caliper synchronization, 60fps force-directed spring physics, and native binary Excel generation.
          </p>
        </div>

        {/* Apple 4-Card Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* BENTO CARD 1: 3-Layer Vision & ISO Math Architecture (col-span-7) */}
          <div className="lg:col-span-7 bento-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-accent-primary">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-text-pri">3-Layer Vision &amp; Math Architecture</h3>
                    <p className="text-xs text-text-sec">From raw drawing ink to certified AS9102 inspection limits</p>
                  </div>
                </div>

                {/* Layer Switcher Pills */}
                <div className="flex items-center gap-1 bg-subtle p-0.5 rounded-lg border border-border-hairline text-[11px] font-medium">
                  <button
                    onClick={() => setActiveArchLayer(1)}
                    className={`px-2 py-0.5 rounded transition-all ${
                      activeArchLayer === 1 ? 'bg-accent-primary text-white font-semibold' : 'text-text-sec'
                    }`}
                  >
                    L1: OCR
                  </button>
                  <button
                    onClick={() => setActiveArchLayer(2)}
                    className={`px-2 py-0.5 rounded transition-all ${
                      activeArchLayer === 2 ? 'bg-accent-primary text-white font-semibold' : 'text-text-sec'
                    }`}
                  >
                    L2: GD&amp;T
                  </button>
                  <button
                    onClick={() => setActiveArchLayer(3)}
                    className={`px-2 py-0.5 rounded transition-all ${
                      activeArchLayer === 3 ? 'bg-accent-primary text-white font-semibold' : 'text-text-sec'
                    }`}
                  >
                    L3: ISO Math
                  </button>
                </div>
              </div>

              {/* Exploded Architecture Image */}
              <div className="rounded-xl overflow-hidden border border-border-hairline bg-surface shadow-apple-sm mb-4">
                <SafeImage
                  src="/assets/bento-iso-layers.png"
                  alt="SpecBalloon 3-Layer Vision and Math Architecture"
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Dynamic Layer Explanation */}
              <div className="p-3.5 rounded-xl bg-subtle/70 border border-border-hairline text-xs font-sans text-text-sec">
                {activeArchLayer === 1 && (
                  <p>
                    <strong>Layer 1 (Vector Ink OCR):</strong> Ingests DWG, DXF, or PDF raster drawings, segmenting dimensional text, leader line polylines, datum targets, and engineering title blocks in sub-second inference.
                  </p>
                )}
                {activeArchLayer === 2 && (
                  <p>
                    <strong>Layer 2 (GD&amp;T Semantic Parser):</strong> Decodes complex ASME Y14.5 and ISO 1101 feature control frames (e.g. <span className="font-mono font-semibold">|⌖|Ø0.05(M)|A|B|</span>) with material condition modifiers.
                  </p>
                )}
                {activeArchLayer === 3 && (
                  <p>
                    <strong>Layer 3 (Deterministic Metrology Math):</strong> Computes exact USL and LSL using ISO 286 shaft/hole fits and ISO 2768-m general tolerances. Eliminates human lookup table mistakes permanently.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* BENTO CARD 2: Live USB-HID Caliper & DRO Synchronization (col-span-5) */}
          <div id="caliper-sync" className="lg:col-span-5 bento-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-status-pass">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-text-pri">Live USB Caliper DRO Sync</h3>
                  <p className="text-xs text-text-sec">Direct shop-floor Bluetooth / USB-HID metrology ingest</p>
                </div>
              </div>

              {/* Caliper Sync Asset Image */}
              <div className="rounded-xl overflow-hidden border border-border-hairline bg-surface shadow-apple-sm mb-4">
                <SafeImage
                  src="/assets/bento-caliper-sync.png"
                  alt="Live USB Caliper Synchronization"
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Interactive Digital Caliper Readout Sandbox */}
              <div className="p-4 rounded-xl bg-subtle/80 border border-border-hairline flex flex-col gap-3 font-mono">
                <div className="flex items-center justify-between text-xs text-text-mut">
                  <span>TARGET: Ø30.00 H7 (LSL: 30.000 / USL: 30.021)</span>
                  <span className="text-status-pass font-semibold">USB 9600 BAUD</span>
                </div>

                <div className="flex items-center justify-between bg-surface p-3 rounded-lg border border-border-hairline">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-bold tracking-tight ${
                        caliperStatus === 'pass' ? 'text-status-pass' : 'text-status-fail'
                      }`}
                    >
                      {fmt3(simulatedCaliperVal)}
                    </span>
                    <span className="text-xs text-text-mut">mm</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      caliperStatus === 'pass'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-status-pass border border-emerald-200'
                        : 'bg-red-50 dark:bg-red-950/40 text-status-fail border border-red-200'
                    }`}
                  >
                    {caliperStatus === 'pass' ? 'IN SPEC' : 'NON-CONFORMING'}
                  </span>
                </div>

                <button
                  onClick={handleSimulateCaliper}
                  className="apple-btn-primary w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Simulate Caliper Trigger ({pulseCount} Captured)</span>
                </button>
              </div>
            </div>
          </div>

          {/* BENTO CARD 3: 60fps Force-Directed Balloon Physics (col-span-6) */}
          <div id="balloon-physics" className="lg:col-span-6 bento-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center text-accent-balloon">
                    <Move className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-text-pri">60fps Force-Directed Balloon Physics</h3>
                    <p className="text-xs text-text-sec">Spring dynamics guarantee zero overlapping bubbles</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-subtle border border-border-hairline text-[11px] font-mono font-semibold text-text-sec">
                  DRAG BALLOON
                </span>
              </div>

              {/* Interactive Physics Sandbox Canvas */}
              <div className="relative rounded-xl border border-border-hairline bg-surface overflow-hidden shadow-apple-sm mb-4">
                <canvas
                  ref={physicsCanvasRef}
                  width={400}
                  height={220}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  className="w-full h-[220px] block cursor-grab active:cursor-grabbing select-none"
                />
              </div>

              <p className="text-xs text-text-sec font-sans leading-relaxed">
                Traditional CAD software dumps balloons in overlapping clusters. SpecBalloon runs an electrostatic repulsion and Hooke spring model directly in Web Workers, guaranteeing clean leader lines and readable drawings.
              </p>
            </div>
          </div>

          {/* BENTO CARD 4: 1-Click Native Binary Excel (.xlsx) Export (col-span-6) */}
          <div className="lg:col-span-6 bento-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-status-pass">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-text-pri">1-Click AS9102 Rev C Excel Export</h3>
                    <p className="text-xs text-text-sec">Native binary .xlsx with verified cell formatting and formulas</p>
                  </div>
                </div>

                <button
                  onClick={handleExportSampleExcel}
                  className="apple-btn-secondary px-3 py-1 text-xs font-semibold flex items-center gap-1.5"
                  title="Download Sample AS9102 Form 3 Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5 text-status-pass" />
                  <span>Download .xlsx</span>
                </button>
              </div>

              {/* Live Form 3 Table Mock Preview */}
              <div className="rounded-xl border border-border-hairline bg-surface overflow-hidden shadow-apple-sm mb-4 font-mono text-[11px]">
                <div className="bg-subtle p-2 border-b border-border-hairline font-semibold text-text-sec flex justify-between">
                  <span>AS9102 FORM 3 — CHARACTERISTIC ACCOUNTABILITY</span>
                  <span className="text-status-pass font-bold">CERTIFIED</span>
                </div>
                <div className="p-3 space-y-1.5 text-text-pri">
                  <div className="flex justify-between border-b border-border-hairline pb-1">
                    <span className="font-bold">#01 [B2] Bore Diameter</span>
                    <span>30.000 +0.021 / -0.000 mm</span>
                    <span className="text-status-pass font-bold">PASS (30.012)</span>
                  </div>
                  <div className="flex justify-between border-b border-border-hairline pb-1">
                    <span className="font-bold">#02 [B3] True Position</span>
                    <span>0.000 +0.050 / -0.000 mm</span>
                    <span className="text-status-pass font-bold">PASS (0.028)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">#03 [A4] Overall Length</span>
                    <span>120.000 &plusmn;0.150 mm</span>
                    <span className="text-status-pass font-bold">PASS (120.080)</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-text-sec font-sans leading-relaxed">
                Export directly to native Microsoft Excel binary format (.xlsx) compliant with AS9102 Rev C Form 3, AIAG PPAP Level 3, and customer audit templates without third-party converters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
