import React, { useState } from 'react';
import { AlertOctagon, RotateCcw, AlertTriangle, Eye, RefreshCw, Cpu } from 'lucide-react';

export const BottleneckSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [pingPongCount, setPingPongCount] = useState(148);
  const [showTypo, setShowTypo] = useState(false);

  const triggerPingPong = () => {
    setPingPongCount(prev => prev + 12);
    setShowTypo(true);
    setTimeout(() => setShowTypo(false), 2400);
  };

  return (
    <section id="bottleneck" className="w-full border-b border-border-str bg-surface-1 py-16 px-4 sm:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <div className="font-mono text-xs text-acc-orange mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-acc-orange"></span>
            <span>01 // THE GLOBAL QUALITY BOTTLENECK</span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-text-pri">
            WHY 50,000+ MACHINE SHOPS BLEED 4 TO 8 HOURS PER PART.
          </h2>
          <p className="text-text-sec text-sm sm:text-base max-w-3xl mt-3 font-sans">
            First Article Inspection (AS9102 / PPAP) requires extracting 100 to 400 dimensions per drawing. 
            Legacy tools fail three distinct ways, forcing QA engineers back to manual spreadsheet typing.
          </p>
        </div>

        {/* 3-Column Diagnostic Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FAILURE MODE 01: Human Eye Fatigue */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Header Strip */}
              <div className="flex items-center justify-between font-mono text-[10px] pb-3 mb-4 border-b border-border-str text-text-sec">
                <span className="text-st-fail font-bold">FAILURE MODE 01 // HUMAN FATIGUE</span>
                <span className="bg-st-fail/10 text-st-fail px-1.5 py-0.5">HIGH SCRAP RISK</span>
              </div>

              <h3 className="font-display font-bold text-lg text-text-pri mb-2">
                The "Eye Ping-Pong" Trap (4-8 Hours)
              </h3>
              <p className="text-text-sec text-xs leading-relaxed mb-6">
                Inspectors bounce their gaze over 300 times between a 4K zoomed-out CAD drawing and tiny spreadsheet rows. 
                One single digit transposed turns a conforming part into a rejected shipment.
              </p>

              {/* Interactive Eye Ping-Pong Simulation */}
              <div className="border border-border-str bg-surface-2 p-4 font-mono text-xs relative overflow-hidden mb-4">
                <div className="flex items-center justify-between text-[10px] text-text-mut mb-3">
                  <span>SIMULATED GAZE TRAJECTORY</span>
                  <span className="text-acc-orange">{pingPongCount} SACCADES</span>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  {/* Drawing Side */}
                  <div className={`p-2 border ${showTypo ? 'border-st-fail bg-st-fail/10' : 'border-border-str bg-surface-1'} text-center`}>
                    <div className="text-[10px] text-text-mut mb-1">A0 DRAWING INK</div>
                    <div className="font-bold text-sm text-text-pri">25.05 ±0.02</div>
                  </div>

                  {/* Excel Side */}
                  <div className={`p-2 border ${showTypo ? 'border-st-fail bg-st-fail/20' : 'border-border-str bg-surface-1'} text-center`}>
                    <div className="text-[10px] text-text-mut mb-1">EXCEL ROW #48</div>
                    <div className="font-bold text-sm text-st-fail">
                      {showTypo ? '25.50 (TYPO!)' : '25.05'}
                    </div>
                  </div>
                </div>

                {showTypo && (
                  <div className="mt-3 p-2 bg-st-fail text-white text-[10px] font-bold flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>CRITICAL OEM REJECTION: Decimal position inverted by eye fatigue!</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={triggerPingPong}
              className="machined-btn w-full border border-border-str bg-surface-2 hover:bg-surface-3 text-text-pri font-mono text-xs py-2 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-acc-orange" />
              <span>SIMULATE EYE FATIGUE ACCUMULATION</span>
            </button>
          </div>

          {/* FAILURE MODE 02: Legacy Desktop OCR */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Header Strip */}
              <div className="flex items-center justify-between font-mono text-[10px] pb-3 mb-4 border-b border-border-str text-text-sec">
                <span className="text-st-warn font-bold">FAILURE MODE 02 // LEGACY DESKTOP OCR</span>
                <span className="bg-st-warn/10 text-st-warn px-1.5 py-0.5">DISCUS / TESSERACT</span>
              </div>

              <h3 className="font-display font-bold text-lg text-text-pri mb-2">
                45° Angled GD&T Frame Scramble
              </h3>
              <p className="text-text-sec text-xs leading-relaxed mb-6">
                Legacy desktop OCR programs built in 2012 assume horizontal text. 
                Rotated chamfers and stacked GD&T geometric frames degrade into unreadable punctuation salad.
              </p>

              {/* Interactive OCR Scramble Visual */}
              <div className="border border-border-str bg-surface-2 p-4 font-mono text-xs mb-4">
                <div className="text-[10px] text-text-mut mb-2 flex items-center justify-between">
                  <span>ROTATED GD&T INPUT:</span>
                  <span className="text-text-pri font-bold">45° ROTATED</span>
                </div>

                <div className="p-2 border border-border-str bg-surface-1 mb-3">
                  <div className="text-[10px] text-text-mut">INTENDED CAD SPEC:</div>
                  <div className="font-bold text-text-pri">|⟂| 0.02 | A |</div>
                </div>

                <div className="p-2 border border-st-warn/50 bg-st-warn/5">
                  <div className="text-[10px] text-st-warn font-bold">LEGACY OCR RECOGNITION RESULT:</div>
                  <div className="font-bold text-st-fail line-through">|1| O.O2 | /-\ |</div>
                  <div className="text-[10px] text-text-mut mt-1">Requires 6 manual dialog box clicks per balloon.</div>
                </div>
              </div>
            </div>

            <div className="p-2.5 border border-border-str bg-surface-2 font-mono text-[11px] text-text-sec">
              <span className="text-acc-orange font-bold">SPECBALLOON FIX:</span> Native affine transformation matrix rotates text back horizontal prior to reading.
            </div>
          </div>

          {/* FAILURE MODE 03: Generic Frontier LLMs */}
          <div className="structural-bay p-6 flex flex-col justify-between">
            <div>
              {/* Header Strip */}
              <div className="flex items-center justify-between font-mono text-[10px] pb-3 mb-4 border-b border-border-str text-text-sec">
                <span className="text-st-fail font-bold">FAILURE MODE 03 // GENERIC FRONTIER AI</span>
                <span className="bg-border-str px-1.5 py-0.5">CHATGPT / CLAUDE</span>
              </div>

              <h3 className="font-display font-bold text-lg text-text-pri mb-2">
                Spatial Grounding Hallucination
              </h3>
              <p className="text-text-sec text-xs leading-relaxed mb-6">
                Feeding a full A0 PDF into generic frontier vision models fails because they do not output pixel-locked coordinates, 
                hallucinate tolerance limits, and cannot place physical balloons on CAD geometry.
              </p>

              {/* Spatial Hallucination Visual */}
              <div className="border border-border-str bg-surface-2 p-4 font-mono text-xs mb-4">
                <div className="text-[10px] text-text-mut mb-2 flex items-center justify-between">
                  <span>SPATIAL RECONSTRUCTION TEST:</span>
                  <span className="text-st-fail">LOST (X, Y) ANCHORS</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex items-start gap-2 text-st-fail">
                    <span className="text-st-fail font-bold">✕</span>
                    <span>No pixel coordinates for balloon circles</span>
                  </div>
                  <div className="flex items-start gap-2 text-st-fail">
                    <span className="text-st-fail font-bold">✕</span>
                    <span>Cannot compute ISO 286 tolerance limits</span>
                  </div>
                  <div className="flex items-start gap-2 text-st-fail">
                    <span className="text-st-fail font-bold">✕</span>
                    <span>Outputs freeform markdown, not AS9102 Form 3</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2.5 border border-border-str bg-surface-2 font-mono text-[11px] text-text-sec">
              <span className="text-acc-orange font-bold">SPECBALLOON FIX:</span> Deterministic geometry pipeline with locked bounding box coordinate crops.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
