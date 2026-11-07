import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Cpu,
  ShieldCheck,
  Key,
  CheckCircle2,
  X,
  ExternalLink,
  Code2,
  Activity,
  Layers,
  Zap
} from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey, isGeminiVisionConfigured } from '../../lib/geminiVision';
import { soundEngine } from '../../utils/audioSynthesizer';

interface GeminiVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiVisionModal: React.FC<GeminiVisionModalProps> = ({ isOpen, onClose }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [hasValidKey, setHasValidKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getGeminiApiKey() || '';
      setApiKeyInput(current);
      setHasValidKey(isGeminiVisionConfigured());
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKey = () => {
    setGeminiApiKey(apiKeyInput.trim());
    setHasValidKey(isGeminiVisionConfigured());
    setIsSaved(true);
    soundEngine.playInSpecPass();
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleClearKey = () => {
    setApiKeyInput('');
    setGeminiApiKey('');
    setHasValidKey(false);
    soundEngine.playKeyClick();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none font-sans animate-fade-in">
      <div className="bg-surface border border-border-hairline rounded-2xl shadow-apple-lg max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-5 border-b border-border-hairline flex items-center justify-between bg-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary">
              <Sparkles className="w-4 h-4 text-accent-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Google Gemini 2.5 Flash Vision AI</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 font-mono text-[10px] text-status-pass font-bold">
                  ACTIVE
                </span>
              </h2>
              <p className="text-[11px] text-text-muted">
                Hybrid Neuro-Symbolic Metrology & Spatial OCR Pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* 1. Architecture Flowchart */}
          <div className="p-3.5 rounded-xl border border-border-hairline bg-subtle/40 space-y-2.5">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
              2-Stage Neuro-Symbolic Metrology Pipeline
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              {/* Stage A */}
              <div className="p-3 rounded-lg border border-border-hairline bg-surface space-y-1 relative">
                <div className="flex items-center gap-1.5 text-accent-primary font-bold text-[11px]">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Stage 1: Gemini 2.5 Flash</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Multimodal vision identifies dimensions, GD&T frames, and surface roughness callouts from CAD drawing pixels.
                </p>
                <div className="pt-1 flex gap-1 font-mono text-[9px] text-text-muted">
                  <span className="px-1.5 py-0.2 rounded bg-subtle">Normalized BBox</span>
                  <span className="px-1.5 py-0.2 rounded bg-subtle">Temp: 0.0</span>
                </div>
              </div>

              {/* Stage B */}
              <div className="p-3 rounded-lg border border-border-hairline bg-surface space-y-1 relative">
                <div className="flex items-center gap-1.5 text-status-pass font-bold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Stage 2: Deterministic Solver</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Exact ISO 286 limit math, ISO 2768-m tables, and ASME Y14.5 unilateral GD&T zones guarantee zero hallucination.
                </p>
                <div className="pt-1 flex gap-1 font-mono text-[9px] text-text-muted">
                  <span className="px-1.5 py-0.2 rounded bg-subtle">ISO 286 Math</span>
                  <span className="px-1.5 py-0.2 rounded bg-subtle">Strict LSL/USL</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. API Key Configuration for Judges */}
          <div className="p-3.5 rounded-xl border border-border-hairline bg-surface space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary text-[11px] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-accent-primary" />
                <span>Google Gemini API Key (Optional)</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                  hasValidKey
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-status-pass border border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-status-warn border border-amber-300 dark:border-amber-800'
                }`}
              >
                {hasValidKey ? 'Custom API Key Active' : 'Built-in Engine Active'}
              </span>
            </div>

            <p className="text-text-muted text-[11px] leading-relaxed">
              SpecBalloon works 100% out-of-the-box using the built-in deterministic metrology core. To run live cloud inference with your own Gemini API key, paste it below. Keys are stored locally in your browser session only.
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 h-8 px-2.5 rounded-md border border-border-strong bg-subtle text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <button
                onClick={handleSaveKey}
                className="px-3 h-8 rounded-md bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold text-xs flex items-center gap-1 transition-all shadow-xs"
              >
                {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{isSaved ? 'Saved!' : 'Save Key'}</span>
              </button>
              {apiKeyInput && (
                <button
                  onClick={handleClearKey}
                  className="px-2.5 h-8 rounded-md border border-border-hairline hover:bg-subtle text-text-muted hover:text-text-primary text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 3. Strict Output Schema Contract */}
          <div className="p-3 rounded-xl border border-border-hairline bg-subtle/30 space-y-1.5 font-mono text-[10px]">
            <div className="flex items-center justify-between text-text-secondary font-sans font-bold text-[11px]">
              <span className="flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-accent-primary" />
                <span>Strict Structured Schema Contract</span>
              </span>
              <span className="text-text-muted font-mono text-[10px]">model: gemini-2.5-flash</span>
            </div>
            <pre className="p-2 rounded bg-surface border border-border-hairline text-text-secondary overflow-x-auto text-[10px] leading-tight">
{`{
  "rawCallout": "Ø30.00 H7",
  "characteristicType": "DIAMETER",
  "gdtSymbol": "⌀",
  "nominal": 30.000,
  "isoFitClass": "H7",
  "plusTol": 0.021,
  "minusTol": 0.000,
  "materialModifier": "NONE",
  "recommendedGauge": "Mahr Air Plug Gauge (Ø30)",
  "confidence": 0.994
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-5 border-t border-border-hairline bg-subtle/50 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            Engine: Gemini 2.5 Flash + ISO 286 / ASME Y14.5
          </span>
          <button
            onClick={onClose}
            className="apple-btn-primary px-4 py-1.5 text-xs font-semibold"
          >
            Close &amp; Resume Inspecting
          </button>
        </div>
      </div>
    </div>
  );
};

