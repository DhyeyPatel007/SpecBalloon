import React, { useState } from 'react';
import {
  Clock,
  TrendingDown,
  ShieldCheck,
  Building2,
  Plane,
  Car,
  HeartPulse,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { AppPage } from '../components/navigation/GlobalNavbar';

interface CustomersPageProps {
  onNavigate: (page: AppPage) => void;
}

type Sector = 'all' | 'aerospace' | 'automotive' | 'medical';

interface CaseStudy {
  id: string;
  sector: 'aerospace' | 'automotive' | 'medical';
  sectorLabel: string;
  company: string;
  location: string;
  part: string;
  challenge: string;
  solution: string;
  metrics: {
    timeReduction: string;
    falseScrapSaved: string;
    ecoUpdateSpeed: string;
  };
  quote: string;
  author: string;
  title: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'case-aero',
    sector: 'aerospace',
    sectorLabel: 'Aerospace AS9102 Rev C',
    company: 'Apex Aero Propulsion Systems',
    location: 'Wichita, KS & Bengaluru, India',
    part: 'Turbine Stator Housing (184 characteristics, 5 datum references)',
    challenge:
      'Engineers spent 6+ hours per drawing manually retyping coordinate measurements into AS9102 Form 3 spreadsheets. During ECO revisions, shifted balloon numbers broke existing Zeiss CMM routines.',
    solution:
      'SpecBalloon ingested native vector blueprints, auto-locked balloon tags #01..#184 during Rev C releases, and parsed Zeiss Calypso CMM printouts in sub-seconds.',
    metrics: {
      timeReduction: '93% FAI Time Saved (5h 40m → 4m 12s)',
      falseScrapSaved: '$42,800/yr Saved via Dynamic MMC Bonus',
      ecoUpdateSpeed: 'Instant Rev B → C Delta Lock',
    },
    quote:
      'SpecBalloon paid for itself on our first turbine nozzle run. The MMC datum shift bonus alone saved 6 expensive titanium forgings that our previous software falsely flagged as scrap.',
    author: 'Marcus Vance',
    title: 'Director of Aerospace Quality & Mission Assurance',
  },
  {
    id: 'case-auto',
    sector: 'automotive',
    sectorLabel: 'Automotive IATF 16949 PPAP',
    company: 'Varun Precision Powertrain',
    location: 'Pune, India',
    part: 'Multi-Cavity Engine Cylinder Head (4X bore patterns, 80 dims)',
    challenge:
      'High-volume Tier-1 supplier needed 10-sample PPAP capability studies for Daimler & Maruti. Manual moving-range calculations delayed production line sign-offs by full shifts.',
    solution:
      'Deployed SpecBalloon Tablet Workbench with Mitutoyo USB caliper wedge. Operators measured parts directly at the CNC cell with live Cp/Cpk calculation.',
    metrics: {
      timeReduction: '85% Faster PPAP Level 3 Sign-Off',
      falseScrapSaved: 'Zero False Rejects Across 10-Piece Lots',
      ecoUpdateSpeed: '4X Multi-Cavity Auto-Decomposition',
    },
    quote:
      'The multi-cavity 4X expander and live moving-range control chart let our shop-floor machinists verify capability before running 5,000-piece production batches.',
    author: 'Rajesh K. Sharma',
    title: 'VP of Quality & Manufacturing Engineering',
  },
  {
    id: 'case-med',
    sector: 'medical',
    sectorLabel: 'Precision CNC Medical (ISO 13485)',
    company: 'BioOrthometrics Surgical',
    location: 'Zürich, Switzerland',
    part: 'Titanium Bone Plate & Spinal Implant (Micro-tolerances ±0.008 mm)',
    challenge:
      'Stringent FDA 21 CFR Part 11 validation requirements made spreadsheet macros non-compliant. Every dimensional change required a certified cryptographic audit trail.',
    solution:
      'Integrated SpecBalloon on air-gapped on-premises servers. The tamper-evident SHA-256 hash log automatically recorded every caliper and optical gauge reading.',
    metrics: {
      timeReduction: '100% Audit-Ready FDA 21 CFR Part 11',
      falseScrapSaved: 'Sub-Micron ISO 286 Precision Guaranteed',
      ecoUpdateSpeed: 'Complete Cryptographic Event Trail',
    },
    quote:
      'Having a native 21 CFR Part 11 audit log built directly into the metrology software eliminated weeks of compliance paperwork during our annual ISO 13485 audit.',
    author: 'Elena Rossi',
    title: 'Principal Regulatory & Metrology Specialist',
  },
];

export const CustomersPage: React.FC<CustomersPageProps> = ({ onNavigate }) => {
  const [filter, setFilter] = useState<Sector>('all');

  const filtered =
    filter === 'all'
      ? CASE_STUDIES
      : CASE_STUDIES.filter((c) => c.sector === filter);

  return (
    <div className="w-full bg-page text-text-primary flex flex-col font-sans selection:bg-accent-primary selection:text-white">
      {/* Hero */}
      <section className="py-14 border-b border-border-hairline bg-surface/50 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <span className="px-2.5 py-1 rounded-full bg-subtle border border-border-hairline font-mono text-[10px] text-text-muted uppercase tracking-wider">
            Industrial Case Studies & Field Telemetry
          </span>
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-text-primary tracking-tight mt-3 mb-4">
            Trusted by Precision Defense, Automotive & Medical Shops
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-xl mx-auto">
            See how quality engineering teams slash first-article turnaround times from half a day down to minutes while preventing false scrap.
          </p>
        </div>
      </section>

      {/* 1. Time-Motion Benchmark Chart */}
      <section className="py-12 border-b border-border-hairline bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="font-display font-semibold text-xl text-text-primary">
              Time-Motion Inspection Benchmark
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Time to extract 120 dimensions, resolve limits, and generate AS9102 Form 3 package.
            </p>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Manual Excel */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary text-[11px]">
                <span>Manual PDF Snipping + Excel Typing:</span>
                <span className="font-bold text-text-primary">5 hrs 40 mins</span>
              </div>
              <div className="w-full h-7 rounded bg-subtle overflow-hidden border border-border-hairline flex">
                <div className="h-full bg-red-400 dark:bg-red-900/60 w-full flex items-center px-3 text-[10px] font-bold text-white">
                  340 minutes (High human transcription error risk)
                </div>
              </div>
            </div>

            {/* Legacy Desktop OCR */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary text-[11px]">
                <span>Legacy Desktop OCR (2010s Windows Tools):</span>
                <span className="font-bold text-text-primary">1 hr 15 mins</span>
              </div>
              <div className="w-full h-7 rounded bg-subtle overflow-hidden border border-border-hairline flex">
                <div className="h-full bg-amber-400 dark:bg-amber-900/60 w-[22%] flex items-center px-3 text-[10px] font-bold text-white whitespace-nowrap">
                  75 minutes
                </div>
              </div>
            </div>

            {/* SpecBalloon */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-text-primary font-bold text-[11px]">
                <span className="flex items-center gap-1.5 text-accent-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SpecBalloon 4-Pane Studio IDE:</span>
                </span>
                <span className="text-status-pass text-sm">4 mins 12 secs (98.7% Faster)</span>
              </div>
              <div className="w-full h-7 rounded bg-subtle overflow-hidden border border-border-hairline flex">
                <div className="h-full bg-emerald-600 w-[2.5%] min-w-[70px] flex items-center justify-center text-[10px] font-bold text-white">
                  4.2 mins
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Filterable Case Studies */}
      <section className="py-14 max-w-5xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-hairline pb-4">
          <div>
            <h2 className="font-display font-semibold text-xl text-text-primary">
              Engineering Case Studies
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Verified operational outcomes from precision manufacturing plants.
            </p>
          </div>

          {/* Sector Filter Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-md border border-border-hairline bg-subtle/80 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-surface font-semibold text-text-primary shadow-2xs border border-border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All Sectors
            </button>
            <button
              onClick={() => setFilter('aerospace')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                filter === 'aerospace'
                  ? 'bg-surface font-semibold text-text-primary shadow-2xs border border-border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Aerospace
            </button>
            <button
              onClick={() => setFilter('automotive')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                filter === 'automotive'
                  ? 'bg-surface font-semibold text-text-primary shadow-2xs border border-border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Automotive
            </button>
            <button
              onClick={() => setFilter('medical')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                filter === 'medical'
                  ? 'bg-surface font-semibold text-text-primary shadow-2xs border border-border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Medical
            </button>
          </div>
        </div>

        {/* Case Cards List */}
        <div className="space-y-6">
          {filtered.map((study) => (
            <div
              key={study.id}
              className="p-6 rounded-xl border border-border-hairline bg-surface shadow-apple-sm space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-hairline pb-3">
                <div>
                  <span className="px-2 py-0.5 rounded bg-subtle border border-border-hairline text-[10px] font-mono text-text-muted uppercase">
                    {study.sectorLabel}
                  </span>
                  <h3 className="font-semibold text-base text-text-primary mt-1">
                    {study.company}
                  </h3>
                  <div className="text-[11px] text-text-muted font-mono">{study.location}</div>
                </div>

                <div className="text-right font-mono text-[11px] text-text-secondary">
                  Part: <span className="text-text-primary font-bold">{study.part}</span>
                </div>
              </div>

              {/* Problem / Solution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-text-primary uppercase tracking-wider font-mono text-[10px]">
                    The Challenge:
                  </div>
                  <p className="text-text-secondary leading-relaxed">{study.challenge}</p>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-accent-primary uppercase tracking-wider font-mono text-[10px]">
                    The SpecBalloon Solution:
                  </div>
                  <p className="text-text-secondary leading-relaxed">{study.solution}</p>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-subtle/50 border border-border-hairline font-mono text-xs">
                <div className="text-center sm:text-left">
                  <div className="text-[10px] text-text-muted">TIME METRIC</div>
                  <div className="font-bold text-text-primary text-[11px] mt-0.5">
                    {study.metrics.timeReduction}
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-[10px] text-text-muted">SCRAP PREVENTION</div>
                  <div className="font-bold text-status-pass text-[11px] mt-0.5">
                    {study.metrics.falseScrapSaved}
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-[10px] text-text-muted">ECO REVISION</div>
                  <div className="font-bold text-accent-primary text-[11px] mt-0.5">
                    {study.metrics.ecoUpdateSpeed}
                  </div>
                </div>
              </div>

              {/* Quote Block */}
              <blockquote className="p-3 border-l-2 border-accent-primary bg-subtle/30 text-xs italic text-text-secondary leading-relaxed">
                "{study.quote}"
                <footer className="text-[11px] font-sans font-semibold text-text-primary not-italic mt-1">
                  — {study.author}, <span className="font-normal text-text-muted">{study.title}</span>
                </footer>
              </blockquote>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 border-t border-border-hairline bg-surface text-center">
        <h2 className="font-display font-semibold text-xl text-text-primary mb-2">
          Achieve Sub-Minute FAI Turnaround
        </h2>
        <p className="text-xs text-text-secondary max-w-md mx-auto mb-6">
          Join forward-thinking machine shops and tier-1 suppliers across aerospace and automotive.
        </p>
        <button
          onClick={() => onNavigate('studio')}
          className="bg-[#09090B] dark:bg-white text-white dark:text-[#09090B] px-5 py-2 rounded-md font-semibold text-xs inline-flex items-center gap-2 cursor-pointer shadow-apple-sm"
        >
          <span>Launch Studio IDE Free</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>
    </div>
  );
};

