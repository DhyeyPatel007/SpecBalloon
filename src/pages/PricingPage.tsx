import React, { useState } from 'react';
import {
  Check,
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building,
  Factory,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { AppPage } from '../components/navigation/GlobalNavbar';

interface PricingPageProps {
  onNavigate: (page: AppPage) => void;
}

type Currency = 'INR' | 'USD';

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const [currency, setCurrency] = useState<Currency>('INR');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // ROI Calculator states
  const [drawingsPerMonth, setDrawingsPerMonth] = useState<number>(40);
  const [dimsPerDrawing, setDimsPerDrawing] = useState<number>(65);
  const [hourlyRate, setHourlyRate] = useState<number>(currency === 'INR' ? 850 : 45);

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Switch rate default when currency toggles
  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    if (newCurrency === 'INR') {
      setHourlyRate(850);
    } else {
      setHourlyRate(45);
    }
  };

  // ROI Math
  // Manual time: 3.5 min/dim ballooning + 1.5 min/dim data entry = 5 min/dim
  const manualHoursPerDrawing = (dimsPerDrawing * 5.0) / 60;
  const specBalloonHoursPerDrawing = 4.0 / 60; // 4 mins total automated
  const hoursSavedPerDrawing = Math.max(0.1, manualHoursPerDrawing - specBalloonHoursPerDrawing);
  const monthlyHoursSaved = Math.round(drawingsPerMonth * hoursSavedPerDrawing);
  const monthlyCostSavings = Math.round(monthlyHoursSaved * hourlyRate);
  const annualCostSavings = monthlyCostSavings * 12;

  const faqs = [
    {
      q: 'Does SpecBalloon require sending ITAR defense drawings to a public cloud?',
      a: 'No. SpecBalloon features a 100% client-side WebAssembly Metrology Engine. Your PDF drawings, vector geometry, and dimensional measurements remain in volatile browser RAM and are never transmitted to external cloud servers. Defense installations can run fully air-gapped on-premise.'
    },
    {
      q: 'Can we import actual CMM inspection data from ZEISS Calypso or Hexagon PC-DMIS?',
      a: 'Yes. In the IDE or BoC panel, click [📥 Import CMM Data] to parse standard .csv or .txt coordinate inspection reports. SpecBalloon automatically maps measured values to characteristic IDs, computes Euclidean true position errors (2√(ΔX² + ΔY²)), and applies MMC bonus tolerance.'
    },
    {
      q: 'How does the WebHID USB and Bluetooth caliper integration work?',
      a: 'SpecBalloon connects directly to digital calipers (Mitutoyo, Fowler, Sylvac) via the browser WebHID API or BLE GATT protocol. Pressing the physical caliper data button transmits the exact micrometric reading into the active Form 3 characteristic with sub-millisecond audio confirmation.'
    },
    {
      q: 'What happens when an Engineering Change Order (ECO) updates Rev B to Rev C?',
      a: 'SpecBalloon’s Revision Diff & Delta-Lock engine aligns the new CAD sheet against the prior baseline. Existing characteristic IDs (#01..#14) remain permanently locked so shop-floor inspection routines never break. Changed dimensions are highlighted in amber, additions in blue, and deletions in red.'
    },
    {
      q: 'Are the exported AS9102 Form 1, 2, and 3 spreadsheets compatible with Net-Inspect?',
      a: 'Yes. Our 4-Sheet AS9102 Rev C Excel workbook adheres strictly to SAE AS9102 standards and is 100% compatible with Net-Inspect, DISCUS, and major aerospace OEM supplier portals.'
    },
    {
      q: 'Can we run SpecBalloon entirely offline without internet connectivity?',
      a: 'Yes. The entire IDE runs as a Progressive Web Application (PWA) with cached WebAssembly math engines and offline vector OCR heuristics. It operates on isolated shop-floor inspection computers without active network connections.'
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Hero Header */}
      <section className="pt-24 pb-16 px-6 sm:px-12 max-w-7xl mx-auto text-center border-b border-[var(--border-hairline)]">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] mb-6">
            <span>TRANSPARENT, PER-FACILITY PRICING</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-medium tracking-tight mb-6">
            Predictable Plans for Modern Quality Labs.
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
            Replace legacy per-seat dongle licenses with modern, transparent metrology software. Unlimited drawings, local air-gapped security, and real-time CMM sync.
          </p>

          {/* Currency & Billing Toggle */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="inline-flex p-1 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <button
                onClick={() => handleCurrencyChange('INR')}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  currency === 'INR'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                🇮🇳 INR (₹)
              </button>
              <button
                onClick={() => handleCurrencyChange('USD')}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  currency === 'USD'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                🇺🇸 USD ($)
              </button>
            </div>

            <div className="inline-flex p-1 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Save 20%
                </span>
              </button>
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Monthly Billing
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[var(--border-hairline)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Tier 1: CNC Job Shop */}
          <div className="p-8 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-2">CNC JOB SHOP</div>
              <h3 className="text-2xl font-semibold mb-2">Precision Shop</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                For precision machine shops ballooning 20–100 drawings monthly and needing instant AS9102 / PPAP export.
              </p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-display font-medium">
                  {currency === 'INR' ? (billingCycle === 'annual' ? '₹4,999' : '₹5,999') : (billingCycle === 'annual' ? '$79' : '$99')}
                </span>
                <span className="text-xs text-[var(--text-muted)]">/month</span>
              </div>

              <div className="space-y-3 pt-6 border-t border-[var(--border-hairline)] text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Up to 3 QA inspection workstations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Unlimited blueprints & characteristic tags</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>AS9102 Rev C Form 3 Excel (.xlsx) export</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>WebHID USB digital caliper live input</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>ISO 2768 & ISO 286 Fit tolerance solver</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>100% Air-gapped local browser engine</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('studio')}
              className="mt-8 w-full py-2.5 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-page)] text-xs font-mono font-medium transition-colors"
            >
              Launch Precision Tier
            </button>
          </div>

          {/* Tier 2: Tier-1 Production Facility (Featured) */}
          <div className="p-8 rounded-xl border-2 border-[var(--text-primary)] bg-[var(--bg-surface)] relative flex flex-col justify-between shadow-sm">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-page)] text-[10px] font-mono tracking-wider uppercase font-semibold">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-2">TIER-1 SUPPLIER</div>
              <h3 className="text-2xl font-semibold mb-2">Production Plant</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                For aerospace, automotive, and medical plants needing automated CMM ingestion, revision delta-locking, and BLE calipers.
              </p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-display font-medium">
                  {currency === 'INR' ? (billingCycle === 'annual' ? '₹11,999' : '₹14,999') : (billingCycle === 'annual' ? '$199' : '$249')}
                </span>
                <span className="text-xs text-[var(--text-muted)]">/month</span>
              </div>

              <div className="space-y-3 pt-6 border-t border-[var(--border-hairline)] text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Everything in Precision, plus:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Up to 15 QA stations & CMM cells</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>ZEISS Calypso & Hexagon CMM auto-importer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Revision Diff & Delta-Lock engine (Rev B → C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Live Mobile QR Traveler sync for shop floor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>2-Page PDF Traveler Deck with interactive QR codes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>21 CFR Part 11 SHA-256 cryptographic audit trail</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('studio')}
              className="mt-8 w-full py-2.5 rounded-md bg-[var(--text-primary)] text-[var(--bg-page)] hover:opacity-90 text-xs font-mono font-medium transition-opacity"
            >
              Start 14-Day Plant Trial
            </button>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="p-8 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-2">AEROSPACE & DEFENSE</div>
              <h3 className="text-2xl font-semibold mb-2">Enterprise Defense</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                Air-gapped on-premise deployment for defense primes, multi-plant operations, and custom MES/ERP integrations.
              </p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-display font-medium">Custom</span>
                <span className="text-xs text-[var(--text-muted)]">annual agreement</span>
              </div>

              <div className="space-y-3 pt-6 border-t border-[var(--border-hairline)] text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Everything in Plant, plus:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Unlimited seats across multiple facilities</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>On-premise Docker / Kubernetes air-gapped install</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Private BYOK Vertex AI / Gemini endpoint routing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>SAP, Epicor, & Plex MES/ERP bi-directional sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Dedicated Metrology Systems Architect & 99.99% SLA</span>
                </div>
              </div>
            </div>

            <a
              href="mailto:enterprise@specballoon.com?subject=Enterprise%20Defense%20Inquiry"
              className="mt-8 w-full py-2.5 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-page)] text-xs font-mono font-medium transition-colors text-center"
            >
              Contact Metrology Architects
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Shop ROI & Labor Savings Calculator */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[var(--border-hairline)]">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-muted)] mb-3">
            <Calculator className="w-3.5 h-3.5" />
            <span>INTERACTIVE METROLOGY ROI ENGINE</span>
          </div>
          <h2 className="text-3xl font-display font-medium tracking-tight">Calculate Your Quality Lab Savings</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Based on empirical time-motion studies comparing manual ballooning & inspection logging against SpecBalloon’s neuro-symbolic engine.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sliders (7 cols) */}
          <div className="lg:col-span-7 p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-[var(--text-secondary)]">BLUEPRINTS PER MONTH</span>
                <span className="text-[var(--text-primary)] font-semibold">{drawingsPerMonth} drawings</span>
              </div>
              <input
                type="range"
                min="5"
                max="300"
                step="5"
                value={drawingsPerMonth}
                onChange={(e) => setDrawingsPerMonth(parseInt(e.target.value))}
                className="w-full accent-[var(--text-primary)] h-1.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] mt-1">
                <span>5 / mo</span>
                <span>150 / mo</span>
                <span>300 / mo</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-[var(--text-secondary)]">AVG. DIMENSIONS / CHARACTERISTICS PER DRAWING</span>
                <span className="text-[var(--text-primary)] font-semibold">{dimsPerDrawing} dims</span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                step="5"
                value={dimsPerDrawing}
                onChange={(e) => setDimsPerDrawing(parseInt(e.target.value))}
                className="w-full accent-[var(--text-primary)] h-1.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] mt-1">
                <span>10 dims</span>
                <span>125 dims</span>
                <span>250 dims</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-[var(--text-secondary)]">QA ENGINEER HOURLY COST</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  {currency === 'INR' ? `₹${hourlyRate}/hr` : `$${hourlyRate}/hr`}
                </span>
              </div>
              <input
                type="range"
                min={currency === 'INR' ? 400 : 20}
                max={currency === 'INR' ? 3000 : 120}
                step={currency === 'INR' ? 50 : 5}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseInt(e.target.value))}
                className="w-full accent-[var(--text-primary)] h-1.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] mt-1">
                <span>{currency === 'INR' ? '₹400/hr' : '$20/hr'}</span>
                <span>{currency === 'INR' ? '₹1,700/hr' : '$70/hr'}</span>
                <span>{currency === 'INR' ? '₹3,000/hr' : '$120/hr'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-hairline)] text-[11px] text-[var(--text-muted)]">
              Manual baseline: 3.5 min/dim ballooning + 1.5 min/dim inspection data entry = 5.0 min/dim. SpecBalloon baseline: 4 minutes automated total per drawing.
            </div>
          </div>

          {/* Savings Summary (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] space-y-6">
            <div>
              <div className="text-xs font-mono text-[var(--text-muted)] mb-1">PROJECTED ANNUAL SAVINGS</div>
              <div className="text-3xl sm:text-4xl font-display font-medium text-emerald-600 dark:text-emerald-400">
                {currency === 'INR'
                  ? `₹${annualCostSavings.toLocaleString('en-IN')}`
                  : `$${annualCostSavings.toLocaleString('en-US')}`}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {currency === 'INR'
                  ? `₹${monthlyCostSavings.toLocaleString('en-IN')}/mo in direct labor recovered`
                  : `$${monthlyCostSavings.toLocaleString('en-US')}/mo in direct labor recovered`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-hairline)]">
              <div>
                <div className="text-[10px] font-mono text-[var(--text-muted)]">MONTHLY HOURS SAVED</div>
                <div className="text-xl font-semibold font-display text-[var(--text-primary)] mt-0.5">
                  {monthlyHoursSaved} hrs/mo
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[var(--text-muted)]">PAYBACK HORIZON</div>
                <div className="text-xl font-semibold font-display text-[var(--text-primary)] mt-0.5">
                  &lt; 5 Days
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('studio')}
              className="w-full py-2.5 rounded-md bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span>Verify Savings in Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 px-6 sm:px-12 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Common Questions</span>
          <h2 className="text-3xl font-display font-medium tracking-tight mt-1">Technical & Licensing FAQ</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
