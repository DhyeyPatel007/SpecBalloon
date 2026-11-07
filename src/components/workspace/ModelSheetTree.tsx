import React, { useState } from 'react';
import {
  FileText,
  Layers,
  ChevronRight,
  ChevronDown,
  Compass,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  Crosshair
} from 'lucide-react';
import { Characteristic, DrawingSpec } from '../../types/metrology';

interface ModelSheetTreeProps {
  drawing: DrawingSpec;
  characteristics: Characteristic[];
  activeBalloonId: string | null;
  onSelectCharacteristic: (id: string) => void;
  onSelectDatum?: (datum: 'A' | 'B' | 'C') => void;
  selectedDatum?: 'A' | 'B' | 'C' | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  visibleLayers: {
    balloons: boolean;
    dimensions: boolean;
    datums: boolean;
    grid: boolean;
  };
  onToggleLayer: (layer: 'balloons' | 'dimensions' | 'datums' | 'grid') => void;
  onSelectView?: (view: string) => void;
}

export const ModelSheetTree: React.FC<ModelSheetTreeProps> = ({
  drawing,
  characteristics,
  activeBalloonId,
  onSelectCharacteristic,
  onSelectDatum,
  selectedDatum,
  isCollapsed,
  onToggleCollapse,
  visibleLayers,
  onToggleLayer,
  onSelectView
}) => {
  const [expandedSections, setExpandedSections] = useState({
    sheets: true,
    views: true,
    datums: true,
    layers: true,
    characteristics: true,
  });

  const [activeViewName, setActiveViewName] = useState<string>('top');

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

  const handleViewClick = (viewKey: string, targetTagNumber?: number) => {
    setActiveViewName(viewKey);
    if (onSelectView) onSelectView(viewKey);
    if (targetTagNumber) {
      const match = characteristics.find(c => c.balloonNumber === targetTagNumber);
      if (match) onSelectCharacteristic(match.id);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-10 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col items-center py-2 select-none z-20">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          title="Expand Model & Sheet Tree"
        >
          <PanelLeftOpen className="w-4 h-4 stroke-[1.5]" />
        </button>
        <div className="flex flex-col gap-3 items-center text-[var(--text-secondary)] text-xs">
          <div className="p-1 rounded hover:bg-[var(--bg-subtle)]" title="Sheet 1">
            <FileText className="w-4 h-4 stroke-[1.5]" />
          </div>
          <div className="p-1 rounded hover:bg-[var(--bg-subtle)]" title="Layers">
            <Layers className="w-4 h-4 stroke-[1.5]" />
          </div>
          <div className="p-1 rounded hover:bg-[var(--bg-subtle)]" title="Datums">
            <Compass className="w-4 h-4 stroke-[1.5]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[190px] border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col select-none text-xs font-sans h-full z-20 flex-shrink-0">
      {/* Header */}
      <div className="h-9 px-2.5 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-subtle)]">
        <span className="font-semibold text-[var(--text-primary)] text-[11px] tracking-wide uppercase font-mono">
          Model & Sheet Tree
        </span>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Collapse Tree"
        >
          <PanelLeftClose className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {/* 1. Sheets & Orthographic Views Section */}
        <div>
          <button
            onClick={() => toggleSection('sheets')}
            className="w-full flex items-center justify-between p-1 rounded hover:bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
          >
            <span className="flex items-center gap-1.5">
              {expandedSections.sheets ? (
                <ChevronDown className="w-3 h-3 stroke-[1.5] text-[var(--text-muted)]" />
              ) : (
                <ChevronRight className="w-3 h-3 stroke-[1.5] text-[var(--text-muted)]" />
              )}
              <span>Sheets ({drawing.pageCount || 1})</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">300 DPI</span>
          </button>

          {expandedSections.sheets && (
            <div className="pl-3 pr-1 py-0.5 space-y-0.5">
              <div className="flex items-center justify-between px-1.5 py-1 rounded bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium text-[11px]">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3 h-3 stroke-[1.5]" />
                  <span className="truncate">Sheet 1: Vector CAD</span>
                </span>
                <span className="text-[10px] font-mono px-1 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)]">1:1</span>
              </div>

              {/* Orthographic Views List with Interactive Centering */}
              <div className="pl-2 space-y-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => handleViewClick('top', 3)}
                  className={`w-full text-left px-2 py-0.5 rounded transition-colors flex items-center justify-between ${
                    activeViewName === 'top'
                      ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                  title="Focus Top View (Flange & Bolt Circle, Tag #03)"
                >
                  <span className="truncate">· Top View</span>
                  <Crosshair className="w-2.5 h-2.5 opacity-60" />
                </button>

                <button
                  type="button"
                  onClick={() => handleViewClick('section', 1)}
                  className={`w-full text-left px-2 py-0.5 rounded transition-colors flex items-center justify-between ${
                    activeViewName === 'section'
                      ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                  title="Focus Section A-A (Center Bore, Tag #01)"
                >
                  <span className="truncate">· Section A-A</span>
                  <Crosshair className="w-2.5 h-2.5 opacity-60" />
                </button>

                <button
                  type="button"
                  onClick={() => handleViewClick('detail', 4)}
                  className={`w-full text-left px-2 py-0.5 rounded transition-colors flex items-center justify-between ${
                    activeViewName === 'detail'
                      ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                  title="Focus Detail B (O-Ring Groove, Tag #04)"
                >
                  <span className="truncate">· Detail B</span>
                  <Crosshair className="w-2.5 h-2.5 opacity-60" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Datum Reference Frames */}
        <div>
          <button
            onClick={() => toggleSection('datums')}
            className="w-full flex items-center justify-between p-1 rounded hover:bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
          >
            <span className="flex items-center gap-1.5">
              {expandedSections.datums ? (
                <ChevronDown className="w-3 h-3 stroke-[1.5] text-[var(--text-muted)]" />
              ) : (
                <ChevronRight className="w-3 h-3 stroke-[1.5] text-[var(--text-muted)]" />
              )}
              <span>Datum Frames</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[var(--text-primary)]">[A|B|C]</span>
          </button>

          {expandedSections.datums && (
            <div className="pl-3 pr-1 py-0.5 space-y-0.5 text-[11px] font-mono">
              {/* Datum A -> Tag #07 */}
              <button
                type="button"
                onClick={() => {
                  const tag7 = characteristics.find(c => c.balloonNumber === 7 || c.datumFeature === 'A');
                  if (tag7) onSelectCharacteristic(tag7.id);
                  if (onSelectDatum) onSelectDatum('A');
                }}
                className={`w-full flex items-center justify-between px-1.5 py-1 rounded text-left transition-colors cursor-pointer ${
                  selectedDatum === 'A'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
                title="Click to jump to Datum A (Tag #07: Mounting Face Flatness)"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="px-1 py-0.2 rounded border border-[var(--border-hairline)] font-bold text-[10px]">[A]</span>
                  <span className="truncate">Mounting Face</span>
                </span>
                <span className="text-[9px] opacity-70">#07</span>
              </button>

              {/* Datum B -> Tag #01 */}
              <button
                type="button"
                onClick={() => {
                  const tag1 = characteristics.find(c => c.balloonNumber === 1 || c.datumFeature === 'B');
                  if (tag1) onSelectCharacteristic(tag1.id);
                  if (onSelectDatum) onSelectDatum('B');
                }}
                className={`w-full flex items-center justify-between px-1.5 py-1 rounded text-left transition-colors cursor-pointer ${
                  selectedDatum === 'B'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
                title="Click to jump to Datum B (Tag #01: Main Bore Ø30.00 H7)"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="px-1 py-0.2 rounded border border-[var(--border-hairline)] font-bold text-[10px]">[B]</span>
                  <span className="truncate">Center Bore</span>
                </span>
                <span className="text-[9px] opacity-70">#01</span>
              </button>

              {/* Datum C -> Tag #03 */}
              <button
                type="button"
                onClick={() => {
                  const tag3 = characteristics.find(c => c.balloonNumber === 3 || c.datumFeature === 'C');
                  if (tag3) onSelectCharacteristic(tag3.id);
                  if (onSelectDatum) onSelectDatum('C');
                }}
                className={`w-full flex items-center justify-between px-1.5 py-1 rounded text-left transition-colors cursor-pointer ${
                  selectedDatum === 'C'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
                title="Click to jump to Datum C (Tag #03: Flange Outer Dia Ø120.0)"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="px-1 py-0.2 rounded border border-[var(--border-hairline)] font-bold text-[10px]">[C]</span>
                  <span className="truncate">Flange OD</span>
                </span>
                <span className="text-[9px] opacity-70">#03</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Annotation Layers */}
        <div>
          <button
            onClick={() => toggleSection('layers')}
            className="w-full flex items-center justify-between p-1 rounded hover:bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
          >
            <span className="flex items-center gap-1.5">
              {expandedSections.layers ? (
                <ChevronDown className="w-3 h-3 stroke-[1.5] text-[var(--text-muted)]" />
              ) : (
                <ChevronRight className="w-3 h-3 stroke-[1.5] text-[var(--text-muted)]" />
              )}
              <span>Annotation Layers</span>
            </span>
            <Layers className="w-3 h-3 stroke-[1.5] text-[var(--text-muted)]" />
          </button>

          {expandedSections.layers && (
            <div className="pl-3 pr-1 py-0.5 space-y-0.5 text-[11px] font-mono">
              <label className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-[var(--bg-subtle)] cursor-pointer text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={visibleLayers.balloons}
                    onChange={() => onToggleLayer('balloons')}
                    className="rounded accent-[var(--text-primary)] w-3 h-3"
                  />
                  <span>Balloons</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">#{characteristics.length}</span>
              </label>

              <label className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-[var(--bg-subtle)] cursor-pointer text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={visibleLayers.dimensions}
                    onChange={() => onToggleLayer('dimensions')}
                    className="rounded accent-[var(--text-primary)] w-3 h-3"
                  />
                  <span>Dimensions</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">300 DPI</span>
              </label>

              <label className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-[var(--bg-subtle)] cursor-pointer text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={visibleLayers.datums}
                    onChange={() => onToggleLayer('datums')}
                    className="rounded accent-[var(--text-primary)] w-3 h-3"
                  />
                  <span>Datums & FCF</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">ASME</span>
              </label>

              <label className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-[var(--bg-subtle)] cursor-pointer text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={visibleLayers.grid}
                    onChange={() => onToggleLayer('grid')}
                    className="rounded accent-[var(--text-primary)] w-3 h-3"
                  />
                  <span>Grid & Rulers</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">10mm</span>
              </label>
            </div>
          )}
        </div>

        {/* 4. Characteristics Navigator */}
        <div className="pt-1 border-t border-[var(--border-hairline)]">
          <button
            onClick={() => toggleSection('characteristics')}
            className="w-full flex items-center justify-between p-1 rounded hover:bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
          >
            <span className="flex items-center gap-1.5">
              {expandedSections.characteristics ? (
                <ChevronDown className="w-3 h-3 stroke-[1.5] text-[var(--text-muted)]" />
              ) : (
                <ChevronRight className="w-3 h-3 stroke-[1.5] text-[var(--text-muted)]" />
              )}
              <span>Characteristics ({characteristics.length})</span>
            </span>
            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {statusCounts.inSpec}/{statusCounts.total}
            </span>
          </button>

          {expandedSections.characteristics && (
            <div className="pl-1 pr-1 py-0.5 space-y-0.5 max-h-[190px] overflow-y-auto font-mono text-[11px]">
              {characteristics.map((char) => {
                const isSelected = char.id === activeBalloonId;
                const isPass = char.status === 'in_spec';
                const isFail = char.status === 'out_of_spec';

                return (
                  <div
                    key={char.id}
                    onClick={() => onSelectCharacteristic(char.id)}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                        : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="text-[10px] w-5 opacity-70">
                        #{char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber}
                      </span>
                      <span className="truncate">{char.nominal_text || char.rawCallout}</span>
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isPass
                          ? 'bg-emerald-500'
                          : isFail
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
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
      <div className="p-2 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[10px] font-mono text-[var(--text-muted)] space-y-1">
        <div className="flex justify-between">
          <span>In-Spec:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{statusCounts.inSpec}</span>
        </div>
        <div className="flex justify-between">
          <span>Needs Review:</span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">{statusCounts.needsReview}</span>
        </div>
        <div className="flex justify-between">
          <span>Out-of-Spec:</span>
          <span className="font-semibold text-rose-600 dark:text-rose-400">{statusCounts.outOfSpec}</span>
        </div>
      </div>
    </div>
  );
};
