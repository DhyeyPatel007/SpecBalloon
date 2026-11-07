import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Layers,
  Sparkles,
  GitCompare,
  Zap,
  ShieldCheck,
  FileSpreadsheet,
  QrCode
} from 'lucide-react';
import { AppPage } from '../components/navigation/GlobalNavbar';
import { fmt3 } from '../utils/metrologyMath';

interface ProductPageProps {
  onNavigate: (page: AppPage) => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({ onNavigate }) => {
  const [activeTier, setActiveTier] = useState<'desktop' | 'tablet' | 'mobile' | 'cmm'>('desktop');

  // Interactive micro-states for simulations
  const [tabletSigned, setTabletSigned] = useState(false);
  const [mobileBleConnected, setMobileBleConnected] = useState(true);
  const [mobileCaliperVal, setMobileCaliperVal] = useState(30.012);
  const [cmmImported, setCmmImported] = useState(false);

  return (
    <div className="w-full bg-page text-text-primary flex flex-col font-sans selection:bg-accent-primary selection:text-white">
      {/* Page Header */}
      <section className="py-14 border-b border-border-hairline bg-surface/50 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <span className="px-2.5 py-1 rounded-full bg-subtle border border-border-hairline font-mono text-[10px] text-text-muted uppercase tracking-wider">
            Connected Quality Operations
          </span>
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-text-primary tracking-tight mt-3 mb-4">
            One Unified Architecture. Four Shop-Floor Tiers.
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-xl mx-auto">
            From the QA manager's 4-monitor CAD desk to the surface plate, CNC machine enclosure, and CMM inspection lab.
          </p>

          {/* Interactive Tier Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-8 p-1 rounded-lg border border-border-hairline bg-subtle/80 max-w-2xl mx-auto">
            <button
              onClick={() => setActiveTier('desktop')}
              className={`flex-1 min-w-[120px] px-3 py-2 rounded-md font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTier === 'desktop'
                  ? 'bg-surface text-text-primary shadow-apple-sm border border-border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Desktop IDE</span>
            </button>

            <button
              onClick={() => setActiveTier('tablet')}
              className={`flex-1 min-w-[120px] px-3 py-2 rounded-md font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTier === 'tablet'
                  ? 'bg-surface text-text-primary shadow-apple-sm border border-border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Tablet className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Tablet Workbench</span>
            </button>

            <button
              onClick={() => setActiveTier('mobile')}
              className={`flex-1 min-w-[120px] px-3 py-2 rounded-md font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTier === 'mobile'
                  ? 'bg-surface text-text-primary shadow-apple-sm border border-border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Mobile Handheld DRO</span>
            </button>

            <button
              onClick={() => setActiveTier('cmm')}
              className={`flex-1 min-w-[120px] px-3 py-2 rounded-md font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTier === 'cmm'
                  ? 'bg-surface text-text-primary shadow-apple-sm border border-border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>CMM & Caliper Bridge</span>
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Simulation Frame */}
      <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6 w-full">
        {activeTier === 'desktop' && (
          <div className="border border-border-hairline rounded-xl bg-surface shadow-apple-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-border-hairline bg-subtle/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                <span className="font-semibold text-text-primary">
                  Desktop Quality IDE · Full 4-Pane Metrology Studio
                </span>
              </div>
              <span className="font-mono text-[11px] text-text-muted">
                300 DPI Vector CAD + Docked Bill of Characteristics
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3 md:col-span-1">
                <h3 className="font-semibold text-sm text-text-primary">
                  The Metrologist's Cockpit
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Engineered for maximum screen real-estate. The 4-Pane layout features an orthographic Sheet Tree, live vector CAD viewport, docked AS9102 Form 3 table, and single-item inspector.
                </p>
                <ul className="space-y-1.5 text-xs text-text-secondary pt-2">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-pass" />
                    <span>Revision Diff (Rev B &rarr; Rev C)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-pass" />
                    <span>4-Sheet AS9102 Rev C Excel Export</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-pass" />
                    <span>21 CFR Part 11 Audit Trail with SHA-256</span>
                  </li>
                </ul>

                <button
                  onClick={() => onNavigate('studio')}
                  className="mt-3 px-4 py-2 rounded-md bg-[#09090B] dark:bg-white text-white dark:text-[#09090B] font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Launch Live Desktop IDE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="md:col-span-2 border border-border-hairline rounded-lg p-3 bg-subtle/30 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] border-b border-border-hairline pb-2">
                  <span className="font-bold text-accent-primary">WORKSPACE MOCKUP</span>
                  <span className="text-status-pass">● 14 Characteristics Ready</span>
                </div>
                <div className="h-44 rounded bg-surface border border-border-hairline flex items-center justify-center text-text-muted text-[11px]">
                  [ 2D CAD Canvas Viewport · Zoom 100% · Capvidia Highlight Boxes Active ]
                </div>
                <div className="h-20 rounded bg-surface border border-border-hairline p-2 text-[10px] space-y-1">
                  <div className="font-bold text-text-primary">AS9102 Form 3: Bill of Characteristics</div>
                  <div className="text-text-muted truncate">#01 Ø30.00 H7 (+0.021/0.000) | #02 |⌖|Ø0.05(M)|A|B| | #03 120.0 ±0.15</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTier === 'tablet' && (
          <div className="border border-border-hairline rounded-xl bg-surface shadow-apple-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-border-hairline bg-subtle/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                <span className="font-semibold text-text-primary">
                  Tablet Surface-Plate Workbench (iPad Pro / Surface Pro)
                </span>
              </div>
              <span className="font-mono text-[11px] text-text-muted">
                Stylus Box-Ballooning & Touch Lot Sign-Off
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-text-primary">
                  Touch & Stylus First-Article Inspection
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Take the tablet directly to granite surface plates. Use Apple Pencil or Microsoft Surface Pen to marquee-select features (`[B] Capture Zone`) and sign off AS9102 packages with touch biometric signatures.
                </p>

                <div className="pt-2">
                  <div className="p-3 rounded-lg border border-border-hairline bg-subtle/40 space-y-2">
                    <span className="text-[11px] font-mono font-semibold text-text-primary">
                      Interactive Touch Signature Pad Demo:
                    </span>
                    <div
                      onClick={() => setTabletSigned(true)}
                      className={`h-20 rounded border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
                        tabletSigned
                          ? 'border-status-pass bg-emerald-50 dark:bg-emerald-950/20 text-status-pass'
                          : 'border-border-strong bg-surface text-text-muted hover:border-text-secondary'
                      }`}
                    >
                      {tabletSigned ? (
                        <div className="text-center font-mono text-xs">
                          <div className="font-bold">✓ D. Vance (Lead QA) — SIGNED</div>
                          <div className="text-[10px] text-text-muted">SHA-256: #8f9a2b0c1e3d4f5</div>
                        </div>
                      ) : (
                        <span className="text-xs font-mono">Tap to Simulate Touch Signature</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border-hairline bg-subtle/30 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary">TABLET WORKFLOW</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-subtle border border-border-hairline text-text-secondary">
                    Granite Bench Ready
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="p-2 rounded bg-surface border border-border-hairline flex items-center justify-between">
                    <span>Stylus Box-Balloon Tool:</span>
                    <span className="text-status-pass font-bold">ACTIVE</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-border-hairline flex items-center justify-between">
                    <span>Bluetooth Caliper Link:</span>
                    <span className="text-status-pass font-bold">PAIRED (Mitutoyo)</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-border-hairline flex items-center justify-between">
                    <span>Lot Release Status:</span>
                    <span className={tabletSigned ? 'text-status-pass font-bold' : 'text-text-muted'}>
                      {tabletSigned ? 'RELEASED' : 'AWAITING SIGN-OFF'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTier === 'mobile' && (
          <div className="border border-border-hairline rounded-xl bg-surface shadow-apple-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-border-hairline bg-subtle/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                <span className="font-semibold text-text-primary">
                  Mobile Shop-Floor Digital Caliper DRO (iOS / Android)
                </span>
              </div>
              <span className="font-mono text-[11px] text-text-muted">
                Bluetooth Caliper HUD & Defect Photo Logger
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-text-primary">
                  Pocket-Sized Caliper Digital Readout (DRO)
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Machine operators scan the QR code on the traveler sheet to instantly load the drawing's characteristic tape. Giant 40pt caliper numbers flash green/red upon reading, and out-of-spec dimensions trigger instant defect photo capture.
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      const next = Number((mobileCaliperVal + 0.005).toFixed(3));
                      setMobileCaliperVal(next > 30.03 ? 30.005 : next);
                    }}
                    className="px-3 py-1.5 rounded-md border border-border-hairline bg-surface hover:bg-subtle text-xs font-mono font-medium"
                  >
                    Simulate Next Reading
                  </button>
                  <button
                    onClick={() => setMobileBleConnected(!mobileBleConnected)}
                    className="px-3 py-1.5 rounded-md border border-border-hairline bg-surface hover:bg-subtle text-xs font-mono font-medium text-text-secondary"
                  >
                    Toggle BLE: {mobileBleConnected ? 'Connected' : 'Disconnected'}
                  </button>
                </div>
              </div>

              {/* Mobile Phone Mockup Frame */}
              <div className="mx-auto w-64 p-4 rounded-2xl border-2 border-border-strong bg-subtle/50 shadow-apple-md font-mono text-center space-y-3">
                <div className="text-[10px] text-text-muted uppercase tracking-wider flex items-center justify-between border-b border-border-hairline pb-1.5">
                  <span>DRO // TAG #01</span>
                  <span className={mobileBleConnected ? 'text-status-pass font-bold' : 'text-text-muted'}>
                    {mobileBleConnected ? '● BLE SYNC' : '○ NO SIGNAL'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border-hairline space-y-1">
                  <div className="text-[10px] text-text-muted">MITUTOYO CALIPER</div>
                  <div
                    className={`text-3xl font-bold tracking-tight ${
                      mobileCaliperVal >= 30.0 && mobileCaliperVal <= 30.021
                        ? 'text-status-pass'
                        : 'text-status-fail'
                    }`}
                  >
                    {fmt3(mobileCaliperVal)}
                  </div>
                  <div className="text-[10px] font-sans text-text-muted">
                    Nominal: Ø30.00 H7 (30.000 - 30.021 mm)
                  </div>
                </div>

                <div
                  className={`py-1 rounded text-xs font-bold ${
                    mobileCaliperVal >= 30.0 && mobileCaliperVal <= 30.021
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-status-pass border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/40 text-status-fail border border-red-200 dark:border-red-800'
                  }`}
                >
                  {mobileCaliperVal >= 30.0 && mobileCaliperVal <= 30.021
                    ? '✓ PASS (IN SPEC)'
                    : '✕ FAIL (OUT OF SPEC)'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTier === 'cmm' && (
          <div className="border border-border-hairline rounded-xl bg-surface shadow-apple-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-border-hairline bg-subtle/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                <span className="font-semibold text-text-primary">
                  CMM & Hardware Bridge (ZEISS Calypso / Hexagon PC-DMIS)
                </span>
              </div>
              <span className="font-mono text-[11px] text-text-muted">
                True Position Euclidean 2·√(ΔX² + ΔY²) & MMC Bonus
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-text-primary">
                  Automated CMM Data Ingestion
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Upload raw coordinate files from ZEISS Calypso or Hexagon PC-DMIS. SpecBalloon parses $\Delta X$ and $\Delta Y$ deviations, calculates true position diametral error, applies Datum B shift, and populates AS9102 Form 3 automatically.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setCmmImported(true)}
                    className="px-4 py-2 rounded-md bg-accent-primary text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{cmmImported ? '✓ Ingested Sample ZEISS Run' : 'Simulate CMM Import Run'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border-hairline bg-subtle/30 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border-hairline pb-2">
                  <span className="font-bold text-text-primary">CALCULATED CMM FEATURES</span>
                  <span className="text-[10px] text-text-muted">PRISMO 7/9/5</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2 rounded bg-surface border border-border-hairline flex items-center justify-between">
                    <div>
                      <div className="font-bold text-text-primary">Tag #02: True Position</div>
                      <div className="text-[10px] text-text-muted">2·√(0.018² + (-0.022)²)</div>
                    </div>
                    <span className="text-status-pass font-bold text-xs">
                      {cmmImported ? '0.058 mm (PASS VIA MMC)' : 'Pending Import'}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-surface border border-border-hairline flex items-center justify-between">
                    <div>
                      <div className="font-bold text-text-primary">Tag #05: Perpendicularity</div>
                      <div className="text-[10px] text-text-muted">CMM cylinder scan</div>
                    </div>
                    <span className="text-status-pass font-bold text-xs">
                      {cmmImported ? '0.014 mm (PASS)' : 'Pending Import'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CTA Footer Section */}
      <section className="py-12 border-t border-border-hairline bg-surface text-center">
        <h2 className="font-display font-semibold text-xl text-text-primary mb-2">
          Experience the Unified Metrology Suite
        </h2>
        <p className="text-xs text-text-secondary max-w-md mx-auto mb-6">
          Everything syncs in real-time. No manual data transfer between machines and inspection sheets.
        </p>
        <button
          onClick={() => onNavigate('studio')}
          className="bg-[#09090B] dark:bg-white text-white dark:text-[#09090B] px-5 py-2 rounded-md font-semibold text-xs inline-flex items-center gap-2 cursor-pointer shadow-apple-sm"
        >
          <span>Launch SpecBalloon Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>
    </div>
  );
};
