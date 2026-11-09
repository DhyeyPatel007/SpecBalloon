import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  BookOpen,
  Keyboard,
  HelpCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Zap,
  ShieldCheck,
  Calculator,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';

export interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'quickstart' | 'dictionary' | 'shortcuts' | 'faq';
}

interface DictionaryEntry {
  term: string;
  category: 'AI Engine' | 'Metrology Math' | 'AS9102' | 'Shop Floor';
  summary: string;
  details: string;
}

const DICTIONARY_ENTRIES: DictionaryEntry[] = [
  {
    term: 'Auto-Detect All Dimensions',
    category: 'AI Engine',
    summary: 'Automated full-drawing scanning via Google Gemini 2.5 Flash Vision.',
    details: 'Sends drawing page to Gemini Vision to detect all dimensional callouts, GD&T frames, and surface roughness symbols with normalized [ymin, xmin, ymax, xmax] coordinates.',
  },
  {
    term: 'AI Box-Crop Tool [B]',
    category: 'AI Engine',
    summary: 'High-precision marquee box crop for missed or custom callouts.',
    details: 'Drag a rectangular box around any callout on the CAD canvas. SpecBalloon slices a 300 DPI patch, runs neural OCR, and calculates exact LSL and USL.',
  },
  {
    term: 'Revision Diff & Delta-Lock',
    category: 'Metrology Math',
    summary: 'Zero-scramble drawing revision comparison (Rev B → Rev C).',
    details: 'Classifies every characteristic into UNCHANGED, MODIFIED, ADDED, or SUPERSEDED. Strictly preserves existing Tag IDs (#01..#14) so shop-floor CMM programs never break.',
  },
  {
    term: 'ISO 286 Hole & Shaft Fits',
    category: 'Metrology Math',
    summary: 'Calculates fundamental deviations and tolerance classes (H7, g6, etc.).',
    details: 'Implements ISO 286 math using tolerance unit i = 0.45 ∛D + 0.001 D. Resolves upper/lower limits in micrometers with deterministic certainty.',
  },
  {
    term: 'Dynamic MMC Bonus & Datum Shift',
    category: 'Metrology Math',
    summary: 'Rescues parts from false scrap using material condition bonuses.',
    details: 'When a hole departs from its Maximum Material Condition (MMC) toward Least Material Condition (LMC), the difference is added as bonus tolerance to the True Position requirement.',
  },
  {
    term: 'Moving Range SPC (Cp & Cpk)',
    category: 'Metrology Math',
    summary: 'Statistical Process Control capability indices for lot samples.',
    details: 'Calculates process capability using the average moving range (R-bar / d2) method. Identifies process centering (Cpk) and spread (Cp) relative to tolerance limits.',
  },
  {
    term: 'ANSI/ASQ Z1.4 AQL Sampling',
    category: 'AS9102',
    summary: 'Acceptable Quality Limit statistical lot acceptance sampling.',
    details: 'Computes sample sizes and accept/reject criteria based on lot size, inspection level (Level II Normal), and AQL threshold (e.g. 1.0% or 0.65%).',
  },
  {
    term: 'ZEISS / Hexagon CMM Auto-Importer',
    category: 'Shop Floor',
    summary: 'Direct coordinate ingestion from CMM inspection runs.',
    details: 'Parses CMM inspection reports (.csv/.txt) and calculates actual diametral true position error: e_pos = 2 · √(ΔX² + ΔY²).',
  },
  {
    term: 'USB / Bluetooth Caliper DRO Mode',
    category: 'Shop Floor',
    summary: 'Hands-free measurement streaming from digital calipers.',
    details: 'Captures hardware HID keystroke bursts from Mitutoyo or Starrett digital calipers, logs measured values, plays audio verification, and advances to the next characteristic.',
  },
  {
    term: 'AS9102 Rev C Forms 1, 2 & 3',
    category: 'AS9102',
    summary: 'Aerospace First Article Inspection (FAI) reporting package.',
    details: 'Form 1 (Part Number Accountability), Form 2 (Product Process & Material Accountability), and Form 3 (Characteristic Accountability Verification and Compatibility Evaluation).',
  },
];

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'quickstart',
}) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'dictionary' | 'shortcuts' | 'faq'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredDictionary = DICTIONARY_ENTRIES.filter(
    (item) =>
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[88vh] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-panel)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">SpecBalloon Workbench Documentation</h2>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Aerospace Metrology IDE · AS9102 Rev C · ISO 286 / ASME Y14.5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'quickstart'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>🚀 4-Step Quickstart</span>
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'dictionary'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>🎛 Button & Tool Dictionary</span>
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'shortcuts'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>⌨ Keyboard Shortcuts</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'faq'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>❓ Metrology FAQs</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed">
          {/* TAB 1: 4-STEP QUICKSTART */}
          {activeTab === 'quickstart' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-1">The 4-Step Metrology Ingestion Loop</h3>
                <p className="text-[var(--text-secondary)]">
                  SpecBalloon bridges 2D CAD engineering prints, shop-floor CMMs, and AS9102 aerospace compliance packages.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 flex flex-col justify-between">
                  <div>
                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-mono font-bold text-xs flex items-center justify-center mb-2.5">
                      1
                    </div>
                    <h4 className="font-semibold text-xs mb-1">Upload / Auto-Detect</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                      Drop vector CAD PDF (A0..A4) or click <span className="font-mono text-[var(--accent)]">[✨ Auto Detect]</span>.
                    </p>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[10px] font-mono text-[var(--text-muted)]">
                    Gemini 2.5 Vision locates callout boxes [ymin, xmin, ymax, xmax].
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 flex flex-col justify-between">
                  <div>
                    <div className="w-6 h-6 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 font-mono font-bold text-xs flex items-center justify-center mb-2.5">
                      2
                    </div>
                    <h4 className="font-semibold text-xs mb-1">Review AI Crops</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                      Inspect 300 DPI high-contrast crops in Right Inspector. Press <kbd className="px-1 py-0.5 rounded bg-subtle border font-mono">Enter</kbd> to approve.
                    </p>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[10px] font-mono text-[var(--text-muted)]">
                    Deterministic solvers apply ISO 286 (H7/g6) & ASME Y14.5.
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 flex flex-col justify-between">
                  <div>
                    <div className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs flex items-center justify-center mb-2.5">
                      3
                    </div>
                    <h4 className="font-semibold text-xs mb-1">Caliper / CMM Input</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                      Import ZEISS Calypso / PC-DMIS runs or click caliper trigger to stream shop readings.
                    </p>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[10px] font-mono text-[var(--text-muted)]">
                    Bonus MMC calculation rescues true position parts.
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 flex flex-col justify-between">
                  <div>
                    <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs flex items-center justify-center mb-2.5">
                      4
                    </div>
                    <h4 className="font-semibold text-xs mb-1">AS9102 Export</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                      One-click export: 4-Sheet Excel (.xlsx), 2-Page QR PDF Deck, or Form 3 CSV.
                    </p>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[10px] font-mono text-[var(--text-muted)]">
                    Full SHA-256 audit chaining for 21 CFR Part 11 / AS9100.
                  </div>
                </div>
              </div>

              {/* Pro-Tips Callout */}
              <div className="p-3.5 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-xs text-[var(--text-primary)]">
                    AI Co-Pilot Workflow Guidance
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Notice the glowing pill in the center of the top bar: it continuously checks your characteristic list and gives you the exact next action. When all items pass, it prompts you to generate the AS9102 inspection package.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUTTON & TOOL DICTIONARY */}
          {activeTab === 'dictionary' && (
            <div className="space-y-4">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search metrology terms, buttons, standards (e.g. MMC, ISO 286, CMM, Revision)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-2.5">
                {filteredDictionary.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 hover:bg-[var(--bg-subtle)]/80 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[var(--text-primary)]">
                          {entry.term}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-muted)]">
                          {entry.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11.5px] text-[var(--text-secondary)] mb-1 font-medium">
                      {entry.summary}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono leading-relaxed">
                      {entry.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <p className="text-[var(--text-secondary)] text-[11.5px]">
                SpecBalloon is engineered for high-velocity shop-floor metrology with full keyboard control.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'Enter', action: 'Approve characteristic & advance to next' },
                  { key: 'Tab / Shift+Tab', action: 'Navigate forward / backward through balloons' },
                  { key: '↑ / ↓ Arrow', action: 'Step to previous / next characteristic' },
                  { key: 'B', action: 'Activate AI Box-Crop marquee tool' },
                  { key: 'V', action: 'Activate Canvas Pan tool' },
                  { key: 'F', action: 'Fit drawing sheet to viewport (100%)' },
                  { key: 'R', action: 'Re-number balloons clockwise around centroid' },
                  { key: 'K', action: 'Invert canvas color (White Paper ↔ Dark Blueprint)' },
                  { key: 'D', action: 'Delete currently selected characteristic' },
                  { key: 'Ctrl + Z', action: 'Undo last metrology edit (50-step stack)' },
                  { key: 'Ctrl + Y / Ctrl+Shift+Z', action: 'Redo previously undone action' },
                  { key: 'Ctrl + \\', action: 'Toggle Split 4-Pane IDE ↔ Full Sheet Spreadsheet' },
                  { key: '⌘ / or ?', action: 'Open Help Center & Dictionary' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 flex items-center justify-between gap-3"
                  >
                    <span className="text-[11.5px] text-[var(--text-secondary)]">{item.action}</span>
                    <kbd className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[10px] font-mono font-bold text-[var(--text-primary)] shadow-2xs whitespace-nowrap">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: METROLOGY FAQS */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {[
                {
                  q: 'How does Dynamic MMC Bonus rescue parts from false scrap?',
                  a: 'Under ASME Y14.5 and ISO 1101, when a hole is specified with a True Position tolerance and the Maximum Material Condition modifier (Ⓜ), the stated tolerance applies only when the feature is at its smallest allowable hole diameter. If the machined hole is larger (closer to Least Material Condition), the departure from MMC is added directly to the allowable position tolerance. SpecBalloon automatically computes this bonus and Datum Shift, turning false scrap into verified good parts.',
                },
                {
                  q: 'How does hands-free USB caliper capture work without special drivers?',
                  a: 'Modern digital calipers with USB cables (such as Mitutoyo Digimatic with USB-ITN or Starrett DataSure) act as standard USB HID keyboards. When you press the caliper data send button, it sends the measured number followed by an Enter or Tab key. SpecBalloon listens for this burst, matches it to the active characteristic, verifies LSL/USL, plays an audio sound, and advances to the next row.',
                },
                {
                  q: 'How does Revision Diff protect shop-floor CMM programs?',
                  a: 'When an ECO or Revision C drawing is issued, re-ballooning from scratch scrambles all balloon numbers. This breaks automated ZEISS or PC-DMIS CMM programs that rely on characteristic #01, #02, etc. SpecBalloon Revision Diff locks existing Tag IDs, highlights changes (tightened tolerances, deleted or added features), and lets you accept updates with zero tag re-indexing.',
                },
                {
                  q: 'What is the mathematical formulation of Moving Range SPC (Cpk)?',
                  a: 'SpecBalloon uses the moving range of consecutive measurements (MR = |X_i - X_{i-1}|) with the d2 = 1.128 unbiasing constant for sample size n=2. Process capability is evaluated as Cp = (USL - LSL) / (6 · σ_hat) and Cpk = min((USL - μ) / (3 · σ_hat), (μ - LSL) / (3 · σ_hat)). A Cpk ≥ 1.33 indicates a capable aerospace manufacturing process.',
                },
                {
                  q: 'Is the export package compliant with AS9102 Rev C and 21 CFR Part 11?',
                  a: 'Yes. SpecBalloon exports all three mandatory AS9102 Rev C sheets: Form 1 (Part Number Accountability), Form 2 (Product Process Accountability), and Form 3 (Characteristic Accountability Verification). Every measurement and status update is signed with a SHA-256 hash in the continuous immutable audit ledger.',
                },
              ].map((faq, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 space-y-1.5"
                >
                  <div className="font-semibold text-xs text-[var(--text-primary)] flex items-start gap-2">
                    <span className="text-[var(--accent)] font-mono font-bold">Q:</span>
                    <span>{faq.q}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] pl-5 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-hairline)] bg-[var(--bg-panel)] flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Deterministic Metrology Engine Active</span>
          </div>
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[10px]">Esc</kbd> to dismiss</span>
        </div>
      </div>
    </div>
  );
};

