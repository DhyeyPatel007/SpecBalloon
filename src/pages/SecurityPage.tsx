import React, { useState } from 'react';
import {
  Shield,
  Lock,
  FileCheck,
  Server,
  Key,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  Download,
  AlertCircle,
  FileSpreadsheet,
  Cpu
} from 'lucide-react';
import { AppPage } from '../components/navigation/GlobalNavbar';

interface SecurityPageProps {
  onNavigate: (page: AppPage) => void;
}

export const SecurityPage: React.FC<SecurityPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'itar' | 'as9102' | 'cfr11' | 'ppap'>('itar');
  const [copiedHash, setCopiedHash] = useState(false);

  const sampleAuditHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sampleAuditHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Hero Header */}
      <section className="pt-24 pb-16 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[var(--border-hairline)]">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] mb-6">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>ITAR · EAR · AS9102 REV C · 21 CFR PART 11</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-medium tracking-tight mb-6">
            Air-Gapped by Design.{' '}
            <span className="text-[var(--text-muted)] block sm:inline">
              Zero Telemetry. Zero Third-Party Cloud Leaks.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
            Defense contractors, aerospace primes, and medical device manufacturers cannot expose ITAR-controlled blueprints to multi-tenant public AI models. SpecBalloon runs locally in your browser and on-premise sovereign servers with zero external telemetry.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('studio')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--text-primary)] text-[var(--bg-page)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <span>Test Local Air-Gapped Engine</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#compliance-matrix"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm font-medium hover:border-[var(--border-strong)] transition-colors"
            >
              <span>View Compliance Matrix</span>
            </a>
          </div>
        </div>
      </section>

      {/* 4 Pillars Grid */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[var(--border-hairline)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="w-10 h-10 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center mb-4">
              <Server className="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <h3 className="text-base font-semibold mb-2">100% Client-Side Engine</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              PDF rendering, vector geometry decomposition, and tolerance calculations execute entirely within the client's WebAssembly sandbox. Blueprints never touch our servers.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="w-10 h-10 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <h3 className="text-base font-semibold mb-2">ITAR & EAR Compliant</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Complies with International Traffic in Arms Regulations (ITAR §120.17) and Export Administration Regulations (EAR). No foreign server hops, no model weight updates from client drawings.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="w-10 h-10 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center mb-4">
              <FileCheck className="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <h3 className="text-base font-semibold mb-2">21 CFR Part 11 Audit Trail</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Every balloon created, dimension adjusted, and measurement logged generates an immutable SHA-256 cryptographic hash chained to previous operations with full operator identity.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="w-10 h-10 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center mb-4">
              <Key className="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <h3 className="text-base font-semibold mb-2">Bring Your Own Key (BYOK)</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Optionally route AI Vision through your private Google Cloud Vertex AI endpoint or isolated enterprise Gemini VPC with zero training retention agreements.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Compliance Deep-Dive */}
      <section id="compliance-matrix" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[var(--border-hairline)]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Standards & Frameworks</span>
            <h2 className="text-3xl font-display font-medium tracking-tight mt-1">Regulatory Architecture</h2>
          </div>

          {/* Tab Selector */}
          <div className="inline-flex p-1 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <button
              onClick={() => setActiveTab('itar')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'itar'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-page)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              ITAR / Defense
            </button>
            <button
              onClick={() => setActiveTab('as9102')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'as9102'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-page)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              AS9102 Rev C
            </button>
            <button
              onClick={() => setActiveTab('cfr11')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'cfr11'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-page)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              21 CFR Part 11
            </button>
            <button
              onClick={() => setActiveTab('ppap')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'ppap'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-page)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              AIAG PPAP 4th
            </button>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="p-8 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
          {activeTab === 'itar' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">ITAR Defense & Sovereign Deployment Standard</h3>
                  <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
                    United States Munitions List (USML) technical data must remain strictly isolated within U.S. jurisdictional boundaries and authorized defense networks.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Air-Gap Certified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border-hairline)]">
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">DATA RESIDENCY</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Local Memory Only</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Blueprints loaded via PDF or image remain in volatile client RAM during session and are purged upon window closure.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">MODEL TRAINING</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Zero Training Guarantee</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    No customer CAD drawings, title blocks, or notes are ever fed into neural network fine-tuning or retention pipelines.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">NETWORK ACCESS</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Offline Deterministic Fallback</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Functions without internet connectivity using deterministic vector geometry parsers and local geometric math.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'as9102' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">AS9102 Rev C Aerospace First Article Inspection</h3>
                  <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
                    Full automated synchronization across Form 1 (Part Number Accountability), Form 2 (Product Process Accountability), and Form 3 (Characteristic Accountability & Verification).
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Rev C Compliant
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border-hairline)]">
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">FORM 1</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Part Number & ECO Trace</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Captures drawing revision, drawing number, sheet numbers, CAD model baseline, and associated ECO changelog.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">FORM 2</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Special Processes & Spec</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Links raw material specs (e.g. AMS 4928 Ti-6Al-4V) and surface finishing codes (e.g. MIL-A-8625 Type II Anodize).
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">FORM 3</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Characteristic Accountability</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    14 standard AS9102 columns with auto-evaluated pass/fail status, MMC bonus calculation, and CMM equipment serial tracking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cfr11' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">FDA 21 CFR Part 11 Electronic Records & Signatures</h3>
                  <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
                    Ensures electronic inspection records are trustworthy, reliable, and legally equivalent to signed paper records for FDA medical device validation.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Cryptographically Chained
                </span>
              </div>

              {/* Sample Hash Block */}
              <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[var(--text-muted)]">IMMUTABLE BLOCK CHAIN SAMPLE HASH</span>
                  <button
                    onClick={handleCopyHash}
                    className="font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {copiedHash ? '✓ Copied' : 'Copy Hash'}
                  </button>
                </div>
                <div className="font-mono text-xs p-2.5 rounded bg-[var(--bg-page)] border border-[var(--border-hairline)] break-all text-[var(--text-secondary)]">
                  {sampleAuditHash}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Verified with SHA-256 HMAC · Linked to inspector ID #QA-8821 · Timestamp: 2026-11-08T00:48:19.492Z
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">AUDIT LOGGING</div>
                  <div className="text-sm font-semibold mb-1">Time-Stamped Modification Records</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Every manual dimension edit or override records old value, new value, engineer timestamp, and mandatory override justification.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">DUAL SIGN-OFF</div>
                  <div className="text-sm font-semibold mb-1">Electronic Signature Verification</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Supports two-factor inspector + QA manager digital sign-offs embedded directly into the signed traveler PDF and Excel package.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ppap' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">AIAG PPAP 4th Edition Automotive Validation</h3>
                  <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
                    Automotive Production Part Approval Process requirement compliance for tier-1 and tier-2 automotive suppliers (IATF 16949 certified shops).
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  IATF 16949 Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border-hairline)]">
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">DIMENSIONAL REPORT</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Section 2.2.9 Dimensional</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Standard AIAG PPAP dimensional result sheet formatting with designated Critical Characteristics (∇ CC / SC).
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">SPC CAPABILITY</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Initial Process Study (Cpk)</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Auto-evaluates normal distribution, X-bar and R charts, and process capability indices (Cp, Cpk ≥ 1.67).
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                  <div className="text-xs font-mono text-[var(--text-muted)] mb-1">CONTROL PLAN</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Cross-Reference Mapping</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Maintains 1:1 characteristic mapping between Control Plan item numbers, drawing balloon tags, and gage IDs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Air-Gapped Topology Visualizer */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[var(--border-hairline)]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Data Flow Topology</span>
          <h2 className="text-3xl font-display font-medium tracking-tight mt-1 mb-4">Zero Data Leaves Your Perimeter</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Compare standard cloud-reliant AI tools with SpecBalloon's Sovereign Edge architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Legacy Cloud Tool */}
          <div className="p-6 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10">
            <div className="flex items-center gap-2 mb-4 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-wider font-semibold">Typical SaaS Inspection Tool</span>
            </div>
            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded bg-[var(--bg-surface)] border border-red-200 dark:border-red-900/30">
                1. Operator uploads ITAR/Defense CAD blueprint (.PDF)
              </div>
              <div className="p-3 rounded bg-[var(--bg-surface)] border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400">
                2. ⚠️ Blueprint transmitted to multi-tenant public AI cloud
              </div>
              <div className="p-3 rounded bg-[var(--bg-surface)] border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400">
                3. ⚠️ Image indexed, cached, and potentially retained for model training
              </div>
              <div className="p-3 rounded bg-[var(--bg-surface)] border border-red-200 dark:border-red-900/30">
                4. Spreadsheet returned with unknown data provenance
              </div>
            </div>
          </div>

          {/* SpecBalloon Local Architecture */}
          <div className="p-6 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10">
            <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-wider font-semibold">SpecBalloon Sovereign Edge</span>
            </div>
            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded bg-[var(--bg-surface)] border border-emerald-200 dark:border-emerald-900/30">
                1. Operator opens drawing directly in browser sandbox memory
              </div>
              <div className="p-3 rounded bg-[var(--bg-surface)] border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                2. ✓ 100% Client-side vector rasterization and bounding math
              </div>
              <div className="p-3 rounded bg-[var(--bg-surface)] border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                3. ✓ Optional AI Vision routed via private BYOK Vertex AI or local engine
              </div>
              <div className="p-3 rounded bg-[var(--bg-surface)] border border-emerald-200 dark:border-emerald-900/30">
                4. Cryptographic SHA-256 audit ledger generated on machine
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-display font-medium tracking-tight mb-4">
          Ready to verify compliance for your facility?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
          Download our compliance whitepaper or launch the offline studio to test client-side metrology calculations directly in your browser.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('studio')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--text-primary)] text-[var(--bg-page)] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <span>Open Studio Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('docs')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm font-medium hover:border-[var(--border-strong)] transition-colors"
          >
            <span>Read Security Documentation</span>
          </button>
        </div>
      </section>
    </div>
  );
};
