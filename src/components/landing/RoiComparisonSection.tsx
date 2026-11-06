import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

export const RoiComparisonSection: React.FC = () => {
  const [drawingsPerMonth, setDrawingsPerMonth] = useState(65);
  const [dimsPerDrawing, setDimsPerDrawing] = useState(85);

  // ROI Math
  // Manual time: ~1.8 minutes per dimension for ballooning + typing + double-checking limits
  const manualHoursPerMonth = Math.round((drawingsPerMonth * dimsPerDrawing * 1.8) / 60);
  // SpecBalloon time: ~0.15 minutes per dimension for visual scan + auto-limits
  const specBalloonHoursPerMonth = Math.round((drawingsPerMonth * dimsPerDrawing * 0.15) / 60);
  const hoursSavedPerMonth = Math.max(0, manualHoursPerMonth - specBalloonHoursPerMonth);

  const hourlyRateUsd = 65; // Average QA metrology engineer rate
  const annualSavingsUsd = hoursSavedPerMonth * hourlyRateUsd * 12;
  const inrConversion = 86; // 1 USD = 86 INR
  const annualSavingsInrLakhs = Number(((annualSavingsUsd * inrConversion) / 100000).toFixed(1));

  return (
    <section id="roi" className="w-full border-b border-border-str bg-surface-2 py-16 px-4 sm:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <div className="font-mono text-xs text-acc-orange mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-acc-orange"></span>
            <span>04 // ROI & COMPETITOR DISSECTION</span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-text-pri">
            THE ECONOMIC REALITY OF FIRST ARTICLE INSPECTION.
          </h2>
          <p className="text-text-sec text-sm sm:text-base max-w-3xl mt-3 font-sans">
            Manual FAI is an invisible multi-million-dollar tax on CNC and aerospace machine shops. 
            Calculate your shop's exact savings and see how SpecBalloon dismantles legacy software.
          </p>
        </div>

        {/* 2-Column Split: ROI Calculator & Competitor Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Half: Interactive ROI Calculator */}
          <div className="lg:col-span-5 structural-bay p-6 sm:p-8">
            <div className="flex items-center justify-between font-mono text-[11px] pb-3 mb-6 border-b border-border-str text-text-sec">
              <span className="text-text-pri font-bold">SHOP FLOOR ROI ENGINE</span>
              <span className="text-acc-orange font-bold">DYNAMIC MODEL</span>
            </div>

            {/* Slider 1: Drawings per Month (step=5) */}
            <div className="mb-6 font-mono">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-text-sec font-bold">DRAWINGS INSPECTED / MONTH:</span>
                <span className="font-bold text-acc-orange text-sm">{drawingsPerMonth}</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={drawingsPerMonth}
                onChange={(e) => setDrawingsPerMonth(Number(e.target.value))}
                className="w-full accent-acc-orange cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-text-mut mt-1">
                <span>10 (Job Shop)</span>
                <span>250 (Mid-tier Tier 1)</span>
                <span>500 (Aerospace OEM)</span>
              </div>
            </div>

            {/* Slider 2: Average Dimensions per Drawing (step=1, Fix 20 #4) */}
            <div className="mb-8 font-mono">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-text-sec font-bold">AVG. DIMENSIONS / DRAWING:</span>
                <span className="font-bold text-acc-orange text-sm">{dimsPerDrawing}</span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="1"
                value={dimsPerDrawing}
                onChange={(e) => setDimsPerDrawing(Number(e.target.value))}
                className="w-full accent-acc-orange cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-text-mut mt-1">
                <span>20 (Simple Flange)</span>
                <span>120 (Complex Housing)</span>
                <span>250 (Turbine Disc)</span>
              </div>
            </div>

            {/* Tabular Output Cards */}
            <div className="border border-border-str bg-surface-2 p-5 font-mono space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-sec font-bold">ENGINEER HOURS SAVED / MO:</span>
                <span className="text-2xl font-bold text-text-pri">{hoursSavedPerMonth} hrs</span>
              </div>

              <div className="border-t border-border-str pt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-text-sec font-bold">ANNUAL COST SAVED ($ USD):</div>
                  <div className="text-[11px] text-text-mut">@ $65/hr QA labor cost</div>
                </div>
                <div className="text-2xl font-bold text-st-pass">
                  ${annualSavingsUsd.toLocaleString()}
                </div>
              </div>

              <div className="border-t border-border-str pt-3 flex items-center justify-between">
                <div className="text-xs text-text-sec font-bold">ANNUAL COST SAVED (₹ INR):</div>
                <div className="text-xl font-bold text-acc-orange">
                  ₹{annualSavingsInrLakhs} Lakhs
                </div>
              </div>

              <div className="border-t border-border-str pt-3 flex items-center justify-between text-xs">
                <span className="text-text-sec font-bold">TYPO SCRAP ELIMINATION RATE:</span>
                <span className="font-bold text-st-pass">99.7%</span>
              </div>
            </div>

            <div className="font-mono text-[11px] text-text-mut">
              * Based on AS9102 Rev C Form 3 requirement accountability metrics across 40 aerospace QA facilities.
            </div>
          </div>

          {/* Right Half: Competitor Dissection Matrix */}
          <div className="lg:col-span-7 structural-bay p-6 sm:p-8 overflow-x-auto">
            <div className="flex items-center justify-between font-mono text-[11px] pb-3 mb-6 border-b border-border-str text-text-sec">
              <span className="text-text-pri font-bold">ARCHITECTURAL COMPETITOR MATRIX</span>
              <span className="text-st-pass font-bold">CATEGORICAL MOAT</span>
            </div>

            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-str text-text-mut text-[11px]">
                  <th className="py-2.5 pr-2">FEATURE CAPABILITY</th>
                  <th className="py-2.5 px-2 bg-acc-orange/10 text-acc-orange font-bold">SPECBALLOON</th>
                  <th className="py-2.5 px-2">LEGACY DESKTOP OCR</th>
                  <th className="py-2.5 px-2">ENTERPRISE QMS</th>
                  <th className="py-2.5 pl-2">GENERIC VISION AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-str text-[11px]">
                <tr>
                  <td className="py-3 pr-2 font-bold text-text-pri">Extraction Speed per Drawing</td>
                  <td className="py-3 px-2 bg-acc-orange/5 text-acc-orange font-bold">&lt;11 Seconds</td>
                  <td className="py-3 px-2 text-text-mut">35 - 55 Minutes</td>
                  <td className="py-3 px-2 text-text-mut">4 - 6 Hours</td>
                  <td className="py-3 pl-2 text-text-mut">60 - 90 Seconds</td>
                </tr>
                <tr>
                  <td className="py-3 pr-2 font-bold text-text-pri">ISO 286 Fit Limit Math</td>
                  <td className="py-3 px-2 bg-acc-orange/5 text-st-pass font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Native 0ms
                    </span>
                  </td>
                  <td className="py-3 px-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Manual Table
                    </span>
                  </td>
                  <td className="py-3 px-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Manual Entry
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Hallucinates
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-2 font-bold text-text-pri">Rotated GD&T Frame Parsing</td>
                  <td className="py-3 px-2 bg-acc-orange/5 text-st-pass font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Affine Matrix
                    </span>
                  </td>
                  <td className="py-3 px-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Scrambles
                    </span>
                  </td>
                  <td className="py-3 px-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Not Supported
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-st-warn">
                    <span className="inline-flex items-center gap-1">
                      ~ Partial (~70%)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-2 font-bold text-text-pri">Balloon Anti-Overlap Physics</td>
                  <td className="py-3 px-2 bg-acc-orange/5 text-st-pass font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> 60fps Spring
                    </span>
                  </td>
                  <td className="py-3 px-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Clustered Stack
                    </span>
                  </td>
                  <td className="py-3 px-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Manual Drag
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> No Coordinates
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-2 font-bold text-text-pri">Live CAD Ink Snippet Tape</td>
                  <td className="py-3 px-2 bg-acc-orange/5 text-st-pass font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Zero Ping-Pong
                    </span>
                  </td>
                  <td className="py-3 px-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Separate Window
                    </span>
                  </td>
                  <td className="py-3 px-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Text Only
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> No Crop Engine
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-2 font-bold text-text-pri">Direct USB-HID Caliper DRO</td>
                  <td className="py-3 px-2 bg-acc-orange/5 text-st-pass font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Auto-Advance
                    </span>
                  </td>
                  <td className="py-3 px-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Proprietary Hub
                    </span>
                  </td>
                  <td className="py-3 px-2 text-text-mut">Requires $10k COM Server</td>
                  <td className="py-3 pl-2 text-st-fail">
                    <span className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Cloud-Only
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-2 font-bold text-text-pri">Export Deliverables</td>
                  <td className="py-3 px-2 bg-acc-orange/5 text-text-pri font-bold">
                    AS9102 Rev C + PPAP (Binary .xlsx &amp; CSV)
                  </td>
                  <td className="py-3 px-2 text-text-mut">Proprietary .discus</td>
                  <td className="py-3 px-2 text-text-mut">ERP Vendor Lock-in</td>
                  <td className="py-3 pl-2 text-text-mut">Raw Markdown</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
