import React, { useState } from 'react';
import {
  FileText,
  Layers,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Compass,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Maximize,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Characteristic, DrawingSpec } from '../../types/metrology';

interface ModelSheetTreeProps {
  drawing: DrawingSpec;
  characteristics: Characteristic[];
  activeBalloonId: string | null;
  onSelectCharacteristic: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  visibleLayers: {
    balloons: boolean;
    dimensions: boolean;
    datums: boolean;
    grid: boolean;
  };
  onToggleLayer: (layer: 'balloons' | 'dimensions' | 'datums' | 'grid') => void;
}

export const ModelSheetTree: React.FC<ModelSheetTreeProps> = ({
  drawing,
  characteristics,
  activeBalloonId,
  onSelectCharacteristic,
  isCollapsed,
  onToggleCollapse,
  visibleLayers,
  onToggleLayer,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    sheets: true,
    views: true,
    datums: true,
    layers: true,
    characteristics: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const statusCounts = {
    total: characteristics.length,
    inSpec: characteristics.filter((c) => c.status === 'in_spec').length,
    needsReview: characteristics.filter((c) => c.status === 'needs_review').length,
    outOfSpec: characteristics.filter((c) => c.status === 'out_of_spec').length,
  };

  if (isCollapsed) {
    return (
      <div className="w-10 border-r border-border-hairline bg-surface flex flex-col items-center py-2 select-none z-20">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded hover:bg-subtle text-text-muted hover:text-text-primary transition-colors mb-4"
          title="Expand Model & Sheet Tree"
        >
          <PanelLeftOpen className="w-4 h-4 text-accent-primary" />
        </button>
        <div className="flex flex-col gap-3 items-center text-text-muted text-xs">
          <div className="p-1 rounded hover:bg-subtle" title="Sheet 1">
            <FileText className="w-4 h-4 text-accent-primary" />
          </div>
          <div className="p-1 rounded hover:bg-subtle" title="Layers">
            <Layers className="w-4 h-4" />
          </div>
          <div className="p-1 rounded hover:bg-subtle" title="Datums">
            <Compass className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[190px] border-r border-border-hairline bg-surface flex flex-col select-none text-xs font-sans h-full z-20 flex-shrink-0">
      {/* Header */}
      <div className="h-9 px-2.5 border-b border-border-hairline flex items-center justify-between bg-subtle/50">
        <span className="font-semibold text-text-primary text-[11px] tracking-wide uppercase">
          Model & Sheet Tree
        </span>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
          title="Collapse Tree (Ctrl+B)"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {/* 1. Sheets & Views Section */}
        <div>
          <button
            onClick={() => toggleSection('sheets')}
            className="w-full flex items-center justify-between p-1 rounded hover:bg-subtle text-[11px] font-semibold text-text-secondary"
          >
            <span className="flex items-center gap-1.5">
              {expandedSections.sheets ? <ChevronDown className="w-3 h-3 text-text-muted" /> : <ChevronRight className="w-3 h-3 text-text-muted" />}
              <span>Sheets ({drawing.pageCount || 1})</span>
            </span>
            <span className="text-[10px] text-text-muted font-mono">300 DPI</span>
          </button>

          {expandedSections.sheets && (
            <div className="pl-4 pr-1 py-0.5 space-y-0.5">
              <div className="flex items-center justify-between px-1.5 py-1 rounded bg-selected text-accent-primary font-medium text-[11px]">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3 h-3" />
                  <span className="truncate">Sheet 1: Vector CAD</span>
                </span>
                <span className="text-[10px] font-mono px-1 rounded bg-white/60 dark:bg-black/30">1:1</span>
              </div>
              <div className="pl-3 space-y-0.5 text-text-muted text-[10px]">
                <div className="py-0.5 hover:text-text-primary cursor-pointer truncate">· Top View (Primary)</div>
                <div className="py-0.5 hover:text-text-primary cursor-pointer truncate">· Section A-A (Bore)</div>
                <div className="py-0.5 hover:text-text-primary cursor-pointer truncate">· Detail B (Scale 4:1)</div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Datum Reference Frames */}
        <div>
          <button
            onClick={() => toggleSection('datums')}
            className="w-full flex items-center justify-between p-1 rounded hover:bg-subtle text-[11px] font-semibold text-text-secondary"
          >
            <span className="flex items-center gap-1.5">
              {expandedSections.datums ? <ChevronDown className="w-3 h-3 text-text-muted" /> : <ChevronRight className="w-3 h-3 text-text-muted" />}
              <span>Datum Frames</span>
            </span>
            <span className="text-[10px] text-accent-primary font-mono font-bold">[A|B|C]</span>
          </button>

          {expandedSections.datums && (
            <div className="pl-4 pr-1 py-0.5 space-y-0.5 text-[11px]">
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-subtle text-text-secondary">
                <span className="px-1 py-0.2 rounded bg-subtle border border-border-hairline font-mono font-bold text-[10px] text-accent-primary">[A]</span>
                <span className="truncate">Primary Plane (Mount)</span>
              </div>
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-subtle text-text-secondary">
                <span className="px-1 py-0.2 rounded bg-subtle border border-border-hairline font-mono font-bold text-[10px] text-accent-primary">[B]</span>
                <span className="truncate">Axis Bore (Cylinder)</span>
              </div>
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-subtle text-text-secondary">
                <span className="px-1 py-0.2 rounded bg-subtle border border-border-hairline font-mono font-bold text-[10px] text-accent-primary">[C]</span>
                <span className="truncate">Keyway Alignment Pin</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Annotation Layers */}
        <div>
          <button
            onClick={() => toggleSection('layers')}
            className="w-full flex items-center justify-between p-1 rounded hover:bg-subtle text-[11px] font-semibold text-text-secondary"
          >
            <span className="flex items-center gap-1.5">
              {expandedSections.layers ? <ChevronDown className="w-3 h-3 text-text-muted" /> : <ChevronRight className="w-3 h-3 text-text-muted" />}
              <span>Annotation Layers</span>
            </span>
            <Layers className="w-3 h-3 text-text-muted" />
          </button>

          {expandedSections.layers && (
            <div className="pl-4 pr-1 py-0.5 space-y-0.5 text-[11px]">
              <label className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-subtle cursor-pointer text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={visibleLayers.balloons}
                    onChange={() => onToggleLayer('balloons')}
                    className="rounded text-accent-primary focus:ring-0 w-3 h-3"
                  />
                  <span>Balloons (Pills)</span>
                </span>
                <span className="text-[10px] font-mono text-text-muted">#{characteristics.length}</span>
              </label>

              <label className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-subtle cursor-pointer text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={visibleLayers.dimensions}
                    onChange={() => onToggleLayer('dimensions')}
                    className="rounded text-accent-primary focus:ring-0 w-3 h-3"
                  />
                  <span>Dimensions</span>
                </span>
                <span className="text-[10px] font-mono text-text-muted">300 DPI</span>
              </label>

              <label className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-subtle cursor-pointer text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={visibleLayers.datums}
                    onChange={() => onToggleLayer('datums')}
                    className="rounded text-accent-primary focus:ring-0 w-3 h-3"
                  />
                  <span>Datums & FCF</span>
                </span>
                <span className="text-[10px] font-mono text-text-muted">ASME</span>
              </label>

              <label className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-subtle cursor-pointer text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={visibleLayers.grid}
                    onChange={() => onToggleLayer('grid')}
                    className="rounded text-accent-primary focus:ring-0 w-3 h-3"
                  />
                  <span>Grid & Rulers</span>
                </span>
                <span className="text-[10px] font-mono text-text-muted">10mm</span>
              </label>
            </div>
          )}
        </div>

        {/* 4. Characteristics Navigator */}
        <div className="pt-1 border-t border-border-hairline">
          <button
            onClick={() => toggleSection('characteristics')}
            className="w-full flex items-center justify-between p-1 rounded hover:bg-subtle text-[11px] font-semibold text-text-secondary"
          >
            <span className="flex items-center gap-1.5">
              {expandedSections.characteristics ? <ChevronDown className="w-3 h-3 text-text-muted" /> : <ChevronRight className="w-3 h-3 text-text-muted" />}
              <span>Characteristics ({characteristics.length})</span>
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-status-pass font-mono text-[10px] font-bold">
              {statusCounts.inSpec}/{statusCounts.total}
            </span>
          </button>

          {expandedSections.characteristics && (
            <div className="pl-2 pr-1 py-0.5 space-y-0.5 max-h-[190px] overflow-y-auto">
              {characteristics.map((char) => {
                const isSelected = char.id === activeBalloonId;
                const isPass = char.status === 'in_spec';
                const isFail = char.status === 'out_of_spec';

                return (
                  <div
                    key={char.id}
                    onClick={() => onSelectCharacteristic(char.id)}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors text-[11px] ${
                      isSelected
                        ? 'bg-selected text-accent-primary font-bold'
                        : 'hover:bg-subtle text-text-secondary'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[10px] w-5 text-text-muted">
                        #{char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber}
                      </span>
                      <span className="truncate">{char.nominal_text || char.rawCallout}</span>
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isPass
                          ? 'bg-status-pass'
                          : isFail
                          ? 'bg-status-fail'
                          : 'bg-status-warn'
                      }`}
                      title={char.status}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Metrology Summary */}
      <div className="p-2 border-t border-border-hairline bg-subtle/30 text-[10px] font-mono text-text-muted space-y-1">
        <div className="flex justify-between">
          <span>In-Spec:</span>
          <span className="font-bold text-status-pass">{statusCounts.inSpec}</span>
        </div>
        <div className="flex justify-between">
          <span>Needs Review:</span>
          <span className="font-bold text-status-warn">{statusCounts.needsReview}</span>
        </div>
        <div className="flex justify-between">
          <span>Out-of-Spec:</span>
          <span className="font-bold text-status-fail">{statusCounts.outOfSpec}</span>
        </div>
      </div>
    </div>
  );
};
