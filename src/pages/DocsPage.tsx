import React, { useState } from 'react';
import {
  BookOpen,
  Keyboard,
  Cpu,
  FileSpreadsheet,
  Download,
  Terminal,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Code2,
  FileText
} from 'lucide-react';
import { AppPage } from '../components/navigation/GlobalNavbar';

interface DocsPageProps {
  onNavigate: (page: AppPage) => void;
}

export const DocsPage: React.FC<DocsPageProps> = ({ onNavigate }) => {
  const [activeSection, setActiveSection] = useState<'quickstart' | 'shortcuts' | 'calipers' | 'cmm' | 'motion' | 'changelog'>('quickstart');

  const shortcuts = [
    { key: 'Enter / Tab', desc: 'Confirm measurement & advance to next characteristic in Bill of Characteristics' },
    { key: 'Shift + Tab', desc: 'Advance backward to prior characteristic' },
    { key: 'B', desc: 'Toggle Capture Zone marquee tool on 2D CAD canvas' },
    { key: 'R', desc: 'Rotate drawing sheet 90° clockwise' },
    { key: 'K', desc: 'Toggle High-Contrast monochrome inverted view (Dark CAD mode)' },
    { key: 'D', desc: 'Re-run deterministic OCR & fit solver on active selected characteristic' },
    { key: 'Space + Drag', desc: 'Pan viewport smoothly across oversized E-size CAD sheets' },
    { key: 'Scroll Wheel', desc: 'Zoom centered on cursor location (10% to 500% scale)' },
    { key: 'Esc', desc: 'Deselect active item / close modal dialogues' },
    { key: '⌘K / Ctrl+K', desc: 'Open global command palette for quick navigation and actions' }
  ];

  const handleDownloadSampleCMM = () => {
    const sampleCsv = `Characteristic,Feature_Type,Nominal,Lower_Tol,Upper_Tol,Measured,Dev_X,Dev_Y,Bonus,Status
#01,LINEAR,25.000,-0.050,0.050,25.012,0.000,0.000,0.000,PASS
#02,DIAMETER,12.000,-0.020,0.020,12.008,0.000,0.000,0.000,PASS
#03,TRUE_POSITION,0.050,0.000,0.050,0.028,0.009,0.011,0.012,PASS
#04,FLATNESS,0.025,0.000,0.025,0.018,0.000,0.000,0.000,PASS
#05,LINEAR,8.500,-0.100,0.100,8.580,0.000,0.000,0.000,PASS
#06,PERPENDICULARITY,0.030,0.000,0.030,0.015,0.000,0.000,0.000,PASS`;

    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_zeiss_calypso_run.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Header */}
      <section className="pt-24 pb-12 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[var(--border-hairline)]">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>METROLOGY SYSTEMS DOCUMENTATION · V2.5.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-display font-medium tracking-tight mb-4">
            Developer & Quality Engineer Manual
          </h1>

          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            Comprehensive reference guides for automated ballooning, ASME Y14.5 MMC math, WebHID hardware caliper connections, and AS9102 Rev C compliance.
          </p>
        </div>
      </section>

      {/* Docs Body with Sidebar */}
      <section className="px-6 sm:px-12 max-w-7xl mx-auto py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Navigation Sidebar (3 cols) */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-1 text-xs font-mono">
              <button
                onClick={() => setActiveSection('quickstart')}
                className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
                  activeSection === 'quickstart'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>1. Quickstart Guide</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>

              <button
                onClick={() => setActiveSection('shortcuts')}
                className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
                  activeSection === 'shortcuts'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>2. Keyboard Shortcuts</span>
                <Keyboard className="w-3 h-3 opacity-60" />
              </button>

              <button
                onClick={() => setActiveSection('calipers')}
                className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
                  activeSection === 'calipers'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>3. USB & BLE Calipers</span>
                <Cpu className="w-3 h-3 opacity-60" />
              </button>

              <button
                onClick={() => setActiveSection('cmm')}
                className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
                  activeSection === 'cmm'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>4. CMM Report Ingestion</span>
                <FileSpreadsheet className="w-3 h-3 opacity-60" />
              </button>

              <button
                onClick={() => setActiveSection('motion')}
                className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
                  activeSection === 'motion'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>5. Motion Architecture</span>
                <Code2 className="w-3 h-3 opacity-60" />
              </button>

              <button
                onClick={() => setActiveSection('changelog')}
                className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
                  activeSection === 'changelog'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>6. v2.5 Changelog</span>
                <FileText className="w-3 h-3 opacity-60" />
              </button>
            </div>
          </div>

          {/* Main Content (9 cols) */}
          <div className="lg:col-span-9 space-y-12">
            {/* Section 1: Quickstart */}
            {activeSection === 'quickstart' && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">SECTION 1</span>
                  <h2 className="text-2xl font-display font-medium tracking-tight mt-1">
                    5-Minute First Article Inspection Quickstart
                  </h2>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  SpecBalloon transforms hours of tedious blueprint ballooning into a streamlined, automated workflow. Follow these five steps to complete your first inspection report:
                </p>

                <div className="space-y-4">
                  <div className="p-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono flex items-center justify-center font-bold">1</span>
                      <h3 className="text-sm font-semibold">Load Vector Engineering Blueprint</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] pl-7">
                      Click <code className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] font-mono text-[11px]">[📂 Open PDF / CAD]</code> in the top toolbar to load your multi-page blueprint or sample aerospace drawings. Vector text elements are automatically indexed at 300 DPI.
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono flex items-center justify-center font-bold">2</span>
                      <h3 className="text-sm font-semibold">Auto-Detect Dimensions & GD&T Frames</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] pl-7">
                      Click <code className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] font-mono text-[11px]">[✨ Auto-Detect All]</code>. SpecBalloon scans the entire sheet, identifying linear tolerances, diameter callouts, thread designations, and ASME Y14.5 Feature Control Frames.
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono flex items-center justify-center font-bold">3</span>
                      <h3 className="text-sm font-semibold">Log Shop Floor Measurements</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] pl-7">
                      Enter measurements directly into the Bill of Characteristics table, connect physical digital calipers via <code className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] font-mono text-[11px]">[📏 Caliper DRO]</code>, or import a CMM run.
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono flex items-center justify-center font-bold">4</span>
                      <h3 className="text-sm font-semibold">Export AS9102 & Traveler Deck</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] pl-7">
                      Click <code className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] font-mono text-[11px]">[⬇ Export Package ▾]</code> to generate a 4-sheet AS9102 Rev C Excel workbook or a 2-page print-ready Traveler PDF complete with scannable mobile QR verification codes.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => onNavigate('studio')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity"
                  >
                    <span>Launch Studio with Sample Part</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Section 2: Shortcuts */}
            {activeSection === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">SECTION 2</span>
                  <h2 className="text-2xl font-display font-medium tracking-tight mt-1">
                    Vim-Speed Quality Assurance Shortcuts
                  </h2>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Engineered for high-throughput metrologists who prefer hands-on-keyboard workflows. You can inspect an entire 50-dimension blueprint without touching your mouse.
                </p>

                <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
                  <div className="divide-y divide-[var(--border-hairline)]">
                    {shortcuts.map((sc, idx) => (
                      <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--bg-subtle)] transition-colors">
                        <span className="text-xs text-[var(--text-secondary)]">{sc.desc}</span>
                        <kbd className="px-2.5 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-page)] text-xs font-mono font-semibold text-[var(--text-primary)] shadow-sm self-start sm:self-auto shrink-0">
                          {sc.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Calipers */}
            {activeSection === 'calipers' && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">SECTION 3</span>
                  <h2 className="text-2xl font-display font-medium tracking-tight mt-1">
                    Hardware Caliper Integration (WebHID & BLE)
                  </h2>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  SpecBalloon connects directly to industrial digital calipers, micrometers, and height gages without installing custom driver software or desktop agent utilities.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    <h3 className="text-sm font-semibold mb-2">USB-Connected Calipers (WebHID)</h3>
                    <p className="text-xs text-[var(--text-secondary)] mb-4">
                      Connect via Mitutoyo Digimatic USB Input Tool (IT-016U / 264-016-10) or generic HID footswitch.
                    </p>
                    <ol className="text-xs text-[var(--text-secondary)] space-y-2 list-decimal list-inside font-mono">
                      <li>Plug USB cable into PC</li>
                      <li>In SpecBalloon, click [📏 Caliper DRO]</li>
                      <li>Select your HID Caliper in the browser prompt</li>
                      <li>Press caliper data button to log reading</li>
                    </ol>
                  </div>

                  <div className="p-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    <h3 className="text-sm font-semibold mb-2">Wireless Bluetooth Calipers (BLE)</h3>
                    <p className="text-xs text-[var(--text-secondary)] mb-4">
                      Pairs with Fowler Ultra-Cal VI, Sylvac Bluetooth Smart, or Mitutoyo U-Wave-TM Bluetooth transmitters.
                    </p>
                    <ol className="text-xs text-[var(--text-secondary)] space-y-2 list-decimal list-inside font-mono">
                      <li>Turn on Bluetooth on caliper</li>
                      <li>In Caliper DRO, select "Bluetooth LE"</li>
                      <li>Pair with GATT Metrology Service</li>
                      <li>Readings stream at 10 Hz frequency</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: CMM */}
            {activeSection === 'cmm' && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">SECTION 4</span>
                  <h2 className="text-2xl font-display font-medium tracking-tight mt-1">
                    Coordinate Measuring Machine (CMM) Ingestion
                  </h2>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Hand calipers cannot verify complex GD&T characteristics like True Position (⌖), Flatness (⏥), or Datum shifts. SpecBalloon parses native ASCII/CSV exports from ZEISS Calypso and Hexagon PC-DMIS.
                </p>

                <div className="p-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Sample ZEISS Calypso CMM Dataset</h3>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Test Euclidean true position formulas with a pre-configured 6-characteristic CMM inspection file.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadSampleCMM}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-page)] text-xs font-mono font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .CSV</span>
                    </button>
                  </div>

                  <pre className="p-3 rounded bg-[var(--bg-page)] border border-[var(--border-hairline)] text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto">
{`Characteristic,Feature_Type,Nominal,Lower_Tol,Upper_Tol,Measured,Dev_X,Dev_Y,Bonus,Status
#01,LINEAR,25.000,-0.050,0.050,25.012,0.000,0.000,0.000,PASS
#02,DIAMETER,12.000,-0.020,0.020,12.008,0.000,0.000,0.000,PASS
#03,TRUE_POSITION,0.050,0.000,0.050,0.028,0.009,0.011,0.012,PASS`}
                  </pre>
                </div>
              </div>
            )}

            {/* Section 5: Motion */}
            {activeSection === 'motion' && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">SECTION 5</span>
                  <h2 className="text-2xl font-display font-medium tracking-tight mt-1">
                    Motion Architecture & Design System
                  </h2>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  SpecBalloon employs a single, lightweight physics motion engine (<code className="font-mono text-xs px-1 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">motion/react</code>) paired with architectural component primitives adapted from Aceternity UI and Skiper UI.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Component Primitives
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      ContainerScroll, Compare Before/After slider, BentoGrid, 3D Perspective Card, Infinite Moving Cards marquee, Floating Dock, and Multi-Step Neuro-Symbolic Loader.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Micro-Interactions
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Skiper UI TextRoll staggered character cascades, NumberTicker tabular counters, MagneticButton cursor attraction, and AnimatedQueueList layout transitions.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 text-xs font-mono text-sky-900 dark:text-sky-200">
                  <div className="font-bold mb-1">OPEN-SOURCE ATTRIBUTION</div>
                  <div>Motion components in part by Skiper UI — <a href="https://skiper-ui.com" target="_blank" rel="noreferrer" className="underline font-bold">https://skiper-ui.com</a></div>
                </div>
              </div>
            )}

            {/* Section 6: Changelog */}
            {activeSection === 'changelog' && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">SECTION 6</span>
                  <h2 className="text-2xl font-display font-medium tracking-tight mt-1">
                    v2.5.0 Release Notes & Engine Improvements
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="p-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">v2.5.0 STABLE</span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">November 2026</span>
                    </div>
                    <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc list-inside">
                      <li>Complete Swiss-Minimalist redesign adhering to strict 90% monochrome, 10% signal design laws.</li>
                      <li>ASME Y14.5 MMC Bonus tolerance engine with dynamic datum shift bonus calculations.</li>
                      <li>AS9102 Rev C 4-sheet formatted Excel workbook export with formula cells.</li>
                      <li>2-Page print-ready PDF Traveler Deck with auto-generated verification QR codes.</li>
                      <li>ZEISS Calypso and Hexagon PC-DMIS CMM report importer with automatic Euclidean true position solver.</li>
                      <li>WebHID & BLE hardware digital caliper connectivity with sub-millisecond audio feedback.</li>
                      <li>Revision Diff & Delta-Lock engine for ECO updates without renumbering tags.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

