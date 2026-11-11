import React from 'react';
import { Check, ArrowRight, ShieldCheck, Zap, Building2 } from 'lucide-react';
import { SectionReveal } from '../ui/section-reveal';

interface StickyPricingDeckProps {
  onSelectPlan: (plan: string) => void;
}

const TIERS = [
  {
    id: 'starter',
    title: 'Quality Lab Starter',
    badge: 'COMMUNITY',
    description: 'Single-station browser IDE for small job-shop machinists and quality technicians.',
    price: '$0',
    period: '/ forever',
    icon: Zap,
    features: [
      'Canvas-First Metrology Studio Workbench',
      'Unlimited Local Drawing Sessions',
      'Deterministic ISO 286 Fit Solver',
      'AS9102 Form 3 CSV Export',
      '100% Client-Side Processing (0 Cloud Bytes)',
    ],
    ctaText: 'Launch Studio Free',
    ctaAction: 'studio',
    cardTop: 'top-24 sm:top-28',
    zIndex: 10,
    accentBorder: 'border-neutral-200 dark:border-neutral-800',
    bg: 'bg-white dark:bg-neutral-950',
  },
  {
    id: 'pro',
    title: 'Machine Shop Pro',
    badge: 'AEROSPACE FAI',
    description: 'For aerospace and automotive machine shops requiring AS9102 Rev C audit certification.',
    price: '$180',
    period: '/ month per facility',
    icon: ShieldCheck,
    features: [
      'Complete 4-Sheet AS9102 Rev C Excel Suite (Forms 1–3)',
      'Delta-Revision Lock Engine (ECO Diff & CMM Preservation)',
      'ZEISS Calypso & PC-DMIS CMM Report Importer',
      'WebHID USB & BLE Mitutoyo / Mahr Caliper Bridge',
      '2-Page Print-Ready QR Traveler Decks & Run Charts',
    ],
    ctaText: 'Start 14-Day Free Trial',
    ctaAction: 'pricing',
    cardTop: 'top-32 sm:top-36',
    zIndex: 20,
    accentBorder: 'border-[#0047AB]/50 dark:border-[#0047AB]/60 ring-1 ring-[#0047AB]/30',
    bg: 'bg-white dark:bg-neutral-950',
  },
  {
    id: 'enterprise',
    title: 'Air-Gapped Enterprise',
    badge: 'DEFENSE & ITAR',
    description: 'For defense contractors and tier-1 primes requiring strict on-premises ITAR isolation.',
    price: 'Custom',
    period: '/ annual license',
    icon: Building2,
    features: [
      '100% Air-Gapped On-Premises Docker / PWA Deployment',
      'Private BYOK Vertex AI / Gemini Vision Endpoints',
      '21 CFR Part 11 Cryptographic SHA-256 Audit Trail',
      'SAP, Epicor, & Plex MES/ERP Real-Time Sync',
      'Dedicated Metrology Systems Architect & Custom Drivers',
    ],
    ctaText: 'Contact Defense Team',
    ctaAction: 'security',
    cardTop: 'top-40 sm:top-44',
    zIndex: 30,
    accentBorder: 'border-neutral-200 dark:border-neutral-800',
    bg: 'bg-white dark:bg-neutral-950',
  },
];

export const StickyPricingDeck: React.FC<StickyPricingDeckProps> = ({ onSelectPlan }) => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 select-none">
      <div className="max-w-7xl mx-auto">
        <SectionReveal className="max-w-2xl mb-12">
          <div className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] tracking-widest uppercase font-semibold mb-2">
            04 // TRANSPARENT TIERS
          </div>
          <h2 className="font-display font-medium text-3xl sm:text-4xl text-neutral-950 dark:text-white tracking-tight">
            Predictable Plans for Modern Quality Labs
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Replace legacy per-seat dongle licenses with modern, transparent metrology software.
          </p>
        </SectionReveal>

        {/* Sticky Stacking Cards Container */}
        <div className="relative max-w-4xl mx-auto space-y-8 pb-12">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isPro = tier.id === 'pro';

            return (
              <div
                key={tier.id}
                style={{ zIndex: tier.zIndex }}
                className={`sticky ${tier.cardTop} rounded-2xl border ${tier.accentBorder} ${tier.bg} p-6 sm:p-8 shadow-xl transition-all font-mono`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-900">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-[#0047AB]/10 text-[#0047AB] dark:text-[#38BDF8]">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-medium text-xl sm:text-2xl text-neutral-950 dark:text-white">
                          {tier.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPro
                              ? 'bg-[#0047AB] text-white'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {tier.badge}
                        </span>
                      </div>
                      <p className="font-sans text-xs sm:text-sm text-neutral-500 mt-1">
                        {tier.description}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="flex items-baseline sm:justify-end gap-1">
                      <span className="font-display font-bold text-3xl sm:text-4xl text-neutral-950 dark:text-white">
                        {tier.price}
                      </span>
                      <span className="text-xs text-neutral-400 font-sans">{tier.period}</span>
                    </div>
                  </div>
                </div>

                <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-3 font-sans text-xs sm:text-sm">
                  {tier.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="p-0.5 rounded-full bg-[#0047AB]/10 text-[#0047AB] dark:text-[#38BDF8] shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                      <span className="text-neutral-700 dark:text-neutral-300">{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => onSelectPlan(tier.ctaAction)}
                    className={`w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      isPro
                        ? 'bg-[#0047AB] hover:bg-[#003887] text-white'
                        : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:bg-[#0047AB] hover:text-white hover:border-[#0047AB]'
                    }`}
                  >
                    <span>{tier.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

