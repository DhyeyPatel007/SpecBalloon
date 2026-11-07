import React, { useState } from 'react';
import { Calculator, Check, X, TrendingUp, DollarSign, Clock, ShieldCheck } from 'lucide-react';

export const RoiSection: React.FC = () => {
  const [drawingsPerMonth, setDrawingsPerMonth] = useState<number>(45);
  const [dimsPerDrawing, setDimsPerDrawing] = useState<number>(60);
  const [hourlyRate, setHourlyRate] = useState<number>(65);

  // ROI Math
  // Manual time: ~2.0 minutes per characteristic (drawing circle, looking up ISO 286/2768, copying to Excel)
  const manualHoursPerMonth = Math.round((drawingsPerMonth * dimsPerDrawing * 2.0) / 60);
  // SpecBalloon time: ~0.15 minutes per characteristic
  const automatedHoursPerMonth = Math.round((drawingsPerMonth * dimsPerDrawing * 0.15) / 60);
  const hoursSavedPerMonth = Math.max(0, manualHoursPerMonth - automatedHoursPerMonth);
  const hoursSavedPerYear = hoursSavedPerMonth * 12;

  const annualSavingsUsd = hoursSavedPerYear * hourlyRate;
  const inrConversion = 86; // 1 USD = 86 INR
  const annualSavingsInrLakhs = Number(((annualSavingsUsd * inrConversion) / 100000).toFixed(1));

  return (
    <section id="roi-calculator" className="w-full py-24 bg-surface border-y border-border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs font-semibold text-status-pass mb-4">
            <Calculator className="w-3.5 h-3.5" />
            <span>ROI &amp; ECONOMIC IMPACT</span>
          </div>

          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-pri tracking-tight mb-4">
            Calculate Your Machine Shop's Exact Return.
          </h2>

          <p className="text-base sm:text-lg text-text-sec font-sans leading-relaxed">
            Manual drawing ballooning and table lookup is an invisible multi-million dollar bottleneck. See how much time and money SpecBalloon returns to your engineering staff.
          </p>
        </div>

        {/* 2-Column Grid: Sliders & Outputs + Competitor Benchmark */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Sliders & Live Results */}
          <div className="lg:col-span-6 bento-card p-6 sm:p-8 flex flex-col justify-between">
            <h3 className="font-display font-bold text-xl text-text-pri mb-6 flex items-center justify-between">
              <span>Interactive Savings Calculator</span>
              <span className="text-xs font-mono font-medium text-status-pass bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                LIVE MODEL
              </span>
            </h3>

            {/* Slider 1: Drawings per Month */}
            <div className="mb-6 font-sans">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-semibold text-text-sec">Drawings Inspected / Month:</span>
                <span className="font-mono font-bold text-accent-primary text-base">{drawingsPerMonth}</span>
              </div>
              <input
                type="range"
                min="5"
                max="250"
                step="5"
                value={drawingsPerMonth}
                onChange={(e) => setDrawingsPerMonth(Number(e.target.value))}
                className="w-full h-1.5 bg-subtle rounded-lg appearance-none cursor-pointer accent-accent-primary"
              />
              <div className="flex justify-between text-[11px] font-mono text-text-mut mt-1">
                <span>5 (Small Job Shop)</span>
                <span>120 (Tier-1 Supplier)</span>
                <span>250 (Aerospace OEM)</span>
              </div>
            </div>

            {/* Slider 2: Average Dimensions per Drawing */}
            <div className="mb-6 font-sans">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-semibold text-text-sec">Avg. Dimensions / Drawing:</span>
                <span className="font-mono font-bold text-accent-primary text-base">{dimsPerDrawing}</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={dimsPerDrawing}
                onChange={(e) => setDimsPerDrawing(Number(e.target.value))}
                className="w-full h-1.5 bg-subtle rounded-lg appearance-none cursor-pointer accent-accent-primary"
              />
              <div className="flex justify-between text-[11px] font-mono text-text-mut mt-1">
                <span>10 (Turned Bushing)</span>
                <span>80 (Complex Housing)</span>
                <span>200 (Turbine Disc)</span>
              </div>
            </div>

            {/* Slider 3: QA Engineer Hourly Cost */}
            <div className="mb-8 font-sans">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-semibold text-text-sec">QA Engineer Hourly Rate ($ / hr):</span>
                <span className="font-mono font-bold text-accent-primary text-base">${hourlyRate}</span>
              </div>
              <input
                type="range"
                min="25"
                max="150"
                step="5"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full h-1.5 bg-subtle rounded-lg appearance-none cursor-pointer accent-accent-primary"
              />
              <div className="flex justify-between text-[11px] font-mono text-text-mut mt-1">
                <span>$25/hr (Offshore)</span>
                <span>$65/hr (US CNC QA)</span>
                <span>$150/hr (Aerospace Chief)</span>
              </div>
            </div>

            {/* Live Outputs Summary Box */}
            <div className="p-5 rounded-xl bg-subtle/80 border border-border-hairline space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-sec flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent-primary" />
                  <span>Hours Saved / Month:</span>
                </span>
                <span className="font-mono font-bold text-xl text-text-pri">{hoursSavedPerMonth} hrs</span>
              </div>

              <div className="h-px w-full bg-border-hairline" />

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-text-sec flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-status-pass" />
                    <span>Annual Net Labor Saved:</span>
                  </span>
                  <span className="text-[11px] font-mono text-text-mut">
                    INR: &#8377;{annualSavingsInrLakhs} Lakhs / yr
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-2xl text-status-pass tracking-tight">
                    ${annualSavingsUsd.toLocaleString()}
                  </span>
                  <span className="block text-[10px] font-mono text-text-mut">/ year</span>
                </div>
              </div>

              <div className="h-px w-full bg-border-hairline" />

              <div className="flex items-center justify-between text-xs">
                <span className="text-text-sec font-semibold">Estimated Payback Period:</span>
                <span className="font-mono font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-full">
                  &lt; 4 Calendar Days
                </span>
              </div>
            </div>
          </div>

          {/* Right: Competitor Comparison Matrix */}
          <div className="lg:col-span-6 bento-card p-6 sm:p-8 flex flex-col justify-between">
            <h3 className="font-display font-bold text-xl text-text-pri mb-6">
              Benchmark: SpecBalloon vs. Legacy Tools
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-hairline text-text-mut font-mono text-[11px]">
                    <th className="py-2.5 pr-2">Capability</th>
                    <th className="py-2.5 px-2 text-accent-primary font-bold">SpecBalloon</th>
                    <th className="py-2.5 px-2 text-text-mut">InspectionXpert</th>
                    <th className="py-2.5 pl-2 text-text-mut">HighQA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline font-sans">
                  <tr>
                    <td className="py-3 pr-2 font-medium text-text-pri">Autonomous Detection</td>
                    <td className="py-3 px-2 font-bold text-status-pass">Sub-second AI</td>
                    <td className="py-3 px-2 text-text-mut">Manual Box Clicking</td>
                    <td className="py-3 pl-2 text-text-mut">Semi-automatic</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-2 font-medium text-text-pri">ISO 286 Fit Calculation</td>
                    <td className="py-3 px-2 font-bold text-status-pass">Instant Math Engine</td>
                    <td className="py-3 px-2 text-status-fail font-semibold">Manual Lookup</td>
                    <td className="py-3 pl-2 text-text-mut">Static Rules</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-2 font-medium text-text-pri">Balloon Collision Avoidance</td>
                    <td className="py-3 px-2 font-bold text-status-pass">60fps Spring Physics</td>
                    <td className="py-3 px-2 text-status-fail font-semibold">Overlaps Drawing</td>
                    <td className="py-3 pl-2 text-status-fail font-semibold">Manual Placement</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-2 font-medium text-text-pri">Live USB Caliper Ingest</td>
                    <td className="py-3 px-2 font-bold text-status-pass">Native Web-HID / BLE</td>
                    <td className="py-3 px-2 text-status-fail font-semibold">None (Keyboard Only)</td>
                    <td className="py-3 pl-2 text-text-mut">Custom Dongle ($900)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-2 font-medium text-text-pri">Deployment</td>
                    <td className="py-3 px-2 font-bold text-status-pass">Instant Web App</td>
                    <td className="py-3 px-2 text-text-mut">Legacy Windows .exe</td>
                    <td className="py-3 pl-2 text-text-mut">Local Client-Server</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-subtle/50 border border-border-hairline flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-status-pass flex-shrink-0" />
              <p className="text-xs text-text-sec">
                <strong>Zero Lock-In Guarantee:</strong> Export full native Excel binary sheets (.xlsx) and CSV files compatible with any existing QMS or ERP system on earth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
