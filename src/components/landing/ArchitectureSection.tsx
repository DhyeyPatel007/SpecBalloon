import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const ArchitectureSection: React.FC = () => {
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(2);

  return (
    <section id="architecture" className="w-full border-b border-border-str bg-surface-2 py-16 px-4 sm:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <div className="font-mono text-xs text-acc-orange mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-acc-orange"></span>
            <span>02 // THE SPECBALLOON PARADIGM</span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-text-pri">
            COMPUTATIONAL GEOMETRY + VISION PATCH SYNTHESIS.
          </h2>
          <p className="text-text-sec text-sm sm:text-base max-w-3xl mt-3 font-sans">
            We don't send raw 4K blueprints to black-box LLMs. SpecBalloon executes a three-stage 
            deterministic pipeline: vector path decomposition, ISO mathematical limits, and live visual crop verification.
          </p>
        </div>

        {/* 3-Stage Axonometric Pipeline Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6 font-mono text-xs">
          <button
            onClick={() => setActiveStage(1)}
            className={`machined-btn p-3 border text-left flex items-center justify-between transition-colors ${
              activeStage === 1
                ? 'bg-surface-1 border-acc-orange text-text-pri font-bold'
                : 'bg-surface-1/60 border-border-str text-text-mut hover:text-text-pri'
            }`}
          >
            <span>STAGE 01 // VECTOR DECOMPOSITION</span>
            <span className="text-[11px] text-acc-orange font-bold">0.15s</span>
          </button>

          <button
            onClick={() => setActiveStage(2)}
            className={`machined-btn p-3 border text-left flex items-center justify-between transition-colors ${
              activeStage === 2
                ? 'bg-surface-1 border-acc-orange text-text-pri font-bold'
                : 'bg-surface-1/60 border-border-str text-text-mut hover:text-text-pri'
            }`}
          >
            <span>STAGE 02 // ISO MATH & SPRING PHYSICS</span>
            <span className="text-[11px] text-acc-orange font-bold">0.25s</span>
          </button>

          <button
            onClick={() => setActiveStage(3)}
            className={`machined-btn p-3 border text-left flex items-center justify-between transition-colors ${
              activeStage === 3
                ? 'bg-surface-1 border-acc-orange text-text-pri font-bold'
                : 'bg-surface-1/60 border-border-str text-text-mut hover:text-text-pri'
            }`}
          >
            <span>STAGE 03 // CROP-TAPE & CALIPER WEDGE</span>
            <span className="text-[11px] text-acc-orange font-bold">0.05s</span>
          </button>
        </div>

        {/* Dynamic Interactive Stage Inspector Bay */}
        <div className="structural-bay p-6 sm:p-8">
          {activeStage === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4 font-mono">
                <div className="text-xs text-acc-orange font-bold uppercase tracking-wider">
                  [STAGE 01: NATIVE VECTOR & AFFINE MATRIX DECOMPOSITION]
                </div>
                <h3 className="font-display font-bold text-2xl text-text-pri">
                  Direct PostScript Vector Traversal
                </h3>
                <p className="text-text-sec text-xs leading-relaxed font-sans">
                  Instead of rasterizing into blurry pixels, SpecBalloon traverses raw PDF Bézier curves, text glyphs, 
                  and transformation matrices. We compute rotation angle θ and normalize text horizontal before running DBSCAN clustering.
                </p>

                {/* Mathematical Formula Bay */}
                <div className="border border-border-str bg-surface-2 p-4 text-xs space-y-3">
                  <div className="text-[11px] text-text-mut font-bold">1. ROTATION MATRIX NORMALIZATION:</div>
                  <div className="p-2 bg-surface-1 border border-border-str text-acc-orange font-bold">
                    θ = atan2(b, a) × (180 / π)
                  </div>

                  <div className="text-[11px] text-text-mut font-bold">2. DBSCAN SPATIAL SUPERSCRIPT CLUSTERING:</div>
                  <div className="p-2 bg-surface-1 border border-border-str text-text-pri">
                    Δx &lt; 1.2 · h_nominal &nbsp;&amp;&nbsp; Δy &lt; 0.8 · h_nominal
                  </div>
                  <div className="text-[11px] text-text-mut">
                    Merges isolated superscript <span className="text-text-pri font-bold">+0.05</span> and subscript <span className="text-text-pri font-bold">-0.02</span> into parent nominal <span className="text-text-pri font-bold">25.00</span>.
                  </div>
                </div>
              </div>

              {/* Visual Interactive Diagram */}
              <div className="lg:col-span-6 border border-border-str bg-surface-2 p-6 flex flex-col items-center justify-center min-h-[320px]">
                <div className="w-full max-w-md border border-border-str bg-surface-1 p-6 relative font-mono text-xs">
                  <div className="absolute top-2 left-2 text-[11px] text-text-mut font-bold">AFFINE DECOMPOSED PATH</div>
                  <div className="my-8 text-center">
                    <div className="text-3xl font-bold text-text-pri tracking-wider">
                      25.00 <span className="text-sm text-acc-orange align-super">+0.05</span>
                      <span className="text-sm text-st-fail align-sub ml-[-34px]">-0.02</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] border-t border-border-str pt-3 text-text-sec">
                    <span>ROTATION: 0.00° [NORMALIZED]</span>
                    <span className="text-st-pass font-bold">CLUSTER CONFIDENCE: 99.8%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStage === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4 font-mono">
                <div className="text-xs text-acc-orange font-bold uppercase tracking-wider">
                  [STAGE 02: DETERMINISTIC METROLOGY MATH & SPRING PHYSICS]
                </div>
                <h3 className="font-display font-bold text-2xl text-text-pri">
                  ISO 286 Limit Engine & Repulsion Physics
                </h3>
                <p className="text-text-sec text-xs leading-relaxed font-sans">
                  SpecBalloon resolves fit callouts like <span className="font-mono font-bold text-text-pri">Ø30 H7</span> into micro-exact 
                  Lower and Upper Specification Limits without human lookup tables, then positions balloon markers 
                  using 60fps force-directed spring physics to prevent overlapping text.
                </p>

                {/* Mathematical Formula Bay */}
                <div className="border border-border-str bg-surface-2 p-4 text-xs space-y-3">
                  <div className="text-[11px] text-text-mut font-bold">1. ISO 286 TOLERANCE UNIT EQUATION:</div>
                  <div className="p-2 bg-surface-1 border border-border-str text-acc-orange font-bold flex items-baseline gap-1">
                    <span>i = 0.45 ·</span>
                    <span className="inline-flex items-baseline">
                      <sup className="text-[0.7em] font-bold -mr-0.5">3</sup>
                      &radic;<span className="border-t border-acc-orange">D</span>
                    </span>
                    <span>+ 0.001 · D &nbsp;(µm)</span>
                  </div>
                  <div className="text-[11px] text-text-mut">
                    Calculates IT7 grade for D=30mm → <span className="text-text-pri font-bold">LSL: 30.000mm / USL: 30.021mm</span>
                  </div>

                  <div className="text-[11px] text-text-mut font-bold">2. BALLOON NON-OVERLAP REPULSION SPRING:</div>
                  <div className="p-2 bg-surface-1 border border-border-str text-text-pri">
                    F_rep = k_r · (b_i - b_j) / ||b_i - b_j||²
                  </div>
                </div>
              </div>

              {/* Visual Interactive Diagram */}
              <div className="lg:col-span-6 border border-border-str bg-surface-2 p-6 flex flex-col items-center justify-center min-h-[320px]">
                <div className="w-full max-w-md border border-acc-orange bg-surface-1 p-6 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] text-acc-orange font-bold mb-4">
                    <span>FIT RESOLVED // ISO 286-1</span>
                    <span className="text-st-pass">DETERMINISTIC 0ms</span>
                  </div>
                  <div className="text-2xl font-bold text-text-pri mb-1">Ø30.00 H7</div>
                  <div className="grid grid-cols-2 gap-3 my-4 p-3 bg-surface-2 border border-border-str">
                    <div>
                      <div className="text-[11px] text-text-mut">LOWER SPEC (LSL)</div>
                      <div className="text-base font-bold text-text-pri">30.000 mm</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-mut">UPPER SPEC (USL)</div>
                      <div className="text-base font-bold text-text-pri">30.021 mm</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-text-sec flex items-center justify-between">
                    <span>TOLERANCE SPREAD: 21 µm</span>
                    <span className="text-acc-orange font-bold">GAUGE: Air Plug Gauge</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStage === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4 font-mono">
                <div className="text-xs text-acc-orange font-bold uppercase tracking-wider">
                  [STAGE 03: LIVE CROP-TAPE & USB CALIPER WEDGE]
                </div>
                <h3 className="font-display font-bold text-2xl text-text-pri">
                  The Zero-Ping-Pong Characteristic Tape
                </h3>
                <p className="text-text-sec text-xs leading-relaxed font-sans">
                  Every ballooned dimension is paired with a live, high-contrast visual crop of the original CAD blueprint ink. 
                  Inspectors verify numbers directly beside the drawing patch and pulse measurements straight from USB calipers.
                </p>

                <div className="border border-border-str bg-surface-2 p-4 text-xs space-y-2">
                  <div className="text-[11px] text-text-mut font-bold">KEY CAPABILITIES:</div>
                  <div className="flex items-center gap-2 text-text-pri">
                    <CheckCircle2 className="w-4 h-4 text-st-pass" />
                    <span>Real-time HTML5 coordinate patch extraction (140x48px)</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-pri">
                    <CheckCircle2 className="w-4 h-4 text-st-pass" />
                    <span>USB-HID hardware keystroke listener for Mitutoyo calipers</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-pri">
                    <CheckCircle2 className="w-4 h-4 text-st-pass" />
                    <span>Live tolerance bar showing measurement needle in spec zone</span>
                  </div>
                </div>
              </div>

              {/* Visual Interactive Diagram */}
              <div className="lg:col-span-6 border border-border-str bg-surface-2 p-6 flex flex-col items-center justify-center min-h-[320px]">
                <div className="w-full max-w-md border border-border-str bg-surface-1 p-4 font-mono text-xs">
                  <div className="text-[11px] text-text-mut mb-2 flex items-center justify-between">
                    <span>LIVE CHARACTERISTIC STRIP</span>
                    <span className="text-st-pass font-bold">IN SPEC // 30.012 mm</span>
                  </div>
                  {/* Micro Characteristic Card */}
                  <div className="p-3 bg-surface-2 border border-border-str flex items-center justify-between gap-3">
                    <div className="w-7 h-7 bg-acc-orange text-white flex items-center justify-center font-bold text-xs rounded-full">
                      01
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-text-pri text-xs">Ø30.00 H7</div>
                      <div className="text-[11px] text-text-mut">[30.000 — 30.021 mm]</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-st-pass text-sm">30.012 mm</div>
                      <div className="text-[11px] text-text-mut">CALIPER USB-HID</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
