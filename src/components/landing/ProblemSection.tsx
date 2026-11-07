import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, FileWarning, Sparkles, Zap } from 'lucide-react';
import { SafeImage } from '../../utils/assetLoader';

export const ProblemSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before');

  return (
    <section className="w-full py-20 bg-surface border-y border-border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-xs font-semibold text-status-fail mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>THE $4.2B MANUFACTURING BOTTLENECK</span>
          </div>

          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-pri tracking-tight mb-4">
            Highlighters &amp; Excel Typos Cost Aerospace Millions.
          </h2>

          <p className="text-base sm:text-lg text-text-sec font-sans leading-relaxed">
            Quality assurance engineers spend 4 to 8 hours per drawing manually drawing red circles, hunting through ISO fit lookup tables, and copying numbers into Excel — causing 18% of all AS9102 First Article rejections.
          </p>
        </div>

        {/* Visual Comparison Bento Card */}
        <div className="rounded-2xl border border-border-hairline bg-page overflow-hidden shadow-apple-md">
          {/* Top Tab Switcher */}
          <div className="h-12 px-6 border-b border-border-hairline bg-surface flex items-center justify-between text-xs font-sans">
            <span className="font-mono text-text-mut text-[11px] font-semibold">
              DIAGNOSTIC COMPARISON
            </span>

            <div className="flex items-center gap-1 bg-subtle p-0.5 rounded-lg border border-border-hairline">
              <button
                onClick={() => setActiveTab('before')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'before'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-text-sec hover:text-text-pri'
                }`}
              >
                Before SpecBalloon (Manual Chaos)
              </button>
              <button
                onClick={() => setActiveTab('after')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'after'
                    ? 'bg-status-pass text-white shadow-sm'
                    : 'text-text-sec hover:text-text-pri'
                }`}
              >
                With SpecBalloon (Autonomous Order)
              </button>
            </div>
          </div>

          {/* Comparison Body: Side-by-Side or Image Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-10 items-center">
            {/* Visual Image */}
            <div className="lg:col-span-7 rounded-xl overflow-hidden border border-border-hairline shadow-apple-sm bg-surface">
              <SafeImage
                src="/assets/problem-chaos-vs-order.png"
                alt="Manual Chaos vs SpecBalloon Autonomous Order"
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Comparison Metrics */}
            <div className="lg:col-span-5 flex flex-col gap-4 font-sans">
              <div
                className={`p-5 rounded-xl border transition-all ${
                  activeTab === 'before'
                    ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                    : 'bg-surface border-border-hairline opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 text-status-fail font-semibold text-sm mb-3">
                  <FileWarning className="w-4 h-4" />
                  <span>The Legacy Manual Workflow</span>
                </div>
                <ul className="space-y-2 text-xs text-text-sec">
                  <li className="flex items-start gap-2">
                    <span className="text-status-fail font-bold">•</span>
                    <span><strong>4.5 Hours per Sheet:</strong> Manual paper stamping and red ink ballooning.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-status-fail font-bold">•</span>
                    <span><strong>65% Math Error Rate:</strong> Human lookup error in ISO 286 / 2768 tables.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-status-fail font-bold">•</span>
                    <span><strong>Severe Overlaps:</strong> Overcrowded drawings cause inspector misreads.</span>
                  </li>
                </ul>
              </div>

              <div
                className={`p-5 rounded-xl border transition-all ${
                  activeTab === 'after'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-surface border-border-hairline opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 text-status-pass font-semibold text-sm mb-3">
                  <Zap className="w-4 h-4 text-status-pass" />
                  <span>The SpecBalloon Autonomous Pipeline</span>
                </div>
                <ul className="space-y-2 text-xs text-text-sec">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-status-pass flex-shrink-0 mt-0.5" />
                    <span><strong>1.2 Seconds per Sheet:</strong> Instant vector OCR and feature extraction.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-status-pass flex-shrink-0 mt-0.5" />
                    <span><strong>100% Deterministic Math:</strong> Exact limit calculation for ISO and ASME GD&amp;T.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-status-pass flex-shrink-0 mt-0.5" />
                    <span><strong>60fps Collision Physics:</strong> Repulsive springs eliminate overlaps.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
