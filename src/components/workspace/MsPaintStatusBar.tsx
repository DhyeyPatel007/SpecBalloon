import React from 'react';
import { Crosshair, ZoomIn, ZoomOut, ShieldCheck } from 'lucide-react';
import { fmt3 } from '../../utils/metrologyMath';

interface MsPaintStatusBarProps {
  cursorPos: { x: number; y: number };
  sheetZone: string;
  canvasDimensions: { width: number; height: number };
  activeCharacteristicTitle?: string | null;
  statusCounts: {
    total: number;
    inSpec: number;
    outOfSpec: number;
    needsReview: number;
  };
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onResetZoom: () => void;
  onOpenAuditLog?: () => void;
  auditLogCount?: number;
}

export const MsPaintStatusBar: React.FC<MsPaintStatusBarProps> = ({
  cursorPos,
  sheetZone,
  canvasDimensions,
  activeCharacteristicTitle,
  statusCounts,
  zoom,
  onZoomChange,
  onResetZoom,
  onOpenAuditLog,
  auditLogCount = 0,
}) => {
  const zoomPct = Math.round(zoom * 100);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseFloat(e.target.value));
  };

  const handleStepZoom = (delta: number) => {
    const next = Math.max(0.25, Math.min(3.0, Math.round((zoom + delta) * 10) / 10));
    onZoomChange(next);
  };

  return (
    <footer className="h-7 w-full bg-surface border-t border-border-hairline px-3 flex items-center justify-between text-xs font-mono text-text-sec select-none z-30">
      {/* Left: Cursor Position (in PDF Points) & Sheet Zone */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 min-w-[170px]" title="Live Drawing Coordinates (PDF Points)">
          <Crosshair className="w-3.5 h-3.5 text-accent-primary" />
          <span className="font-semibold text-text-pri">
            X: {fmt3(cursorPos.x)} pt, Y: {fmt3(cursorPos.y)} pt
          </span>
        </div>

        <div className="h-3.5 w-px bg-border-hairline" />

        <div className="flex items-center gap-1" title="Drawing Sheet Grid Zone">
          <span className="text-text-mut">Zone:</span>
          <span className="font-semibold text-text-pri bg-subtle px-1 rounded border border-border-hairline text-[11px]">
            {sheetZone || '—'}
          </span>
        </div>

        <div className="h-3.5 w-px bg-border-hairline" />

        {/* Canvas Buffer Dimensions */}
        <div className="hidden sm:flex items-center gap-1 text-text-mut" title="Artboard Buffer Resolution">
          <span>Canvas:</span>
          <span className="font-semibold text-text-sec">
            {canvasDimensions.width} × {canvasDimensions.height} pt
          </span>
        </div>

        <div className="h-3.5 w-px bg-border-hairline hidden md:block" />

        {/* Selected Balloon Indicator */}
        <div className="hidden md:flex items-center gap-1.5 truncate max-w-[280px]">
          <span className="text-text-mut">Selection:</span>
          <span className="text-text-pri font-sans truncate font-medium">
            {activeCharacteristicTitle || 'None'}
          </span>
        </div>
      </div>

      {/* Right: Metrics Telemetry & Smooth Zoom Slider */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 text-[11px]">
          <span className="font-semibold text-text-pri">{statusCounts.total} Dims</span>
          <span className="text-status-pass font-semibold">({statusCounts.inSpec} Pass</span>
          <span className="text-status-warn font-semibold">{statusCounts.needsReview} Rev</span>
          <span className="text-status-fail font-semibold">{statusCounts.outOfSpec} Fail)</span>
        </div>

        {onOpenAuditLog && (
          <>
            <div className="h-3.5 w-px bg-border-hairline" />
            <button
              onClick={onOpenAuditLog}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono text-text-sec hover:text-text-pri hover:bg-subtle border border-border-hairline transition-colors cursor-pointer"
              title="Open 21 CFR Part 11 / AS9100 Tamper-Evident Audit Log"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-status-pass" />
              <span className="font-semibold">Audit Log ({auditLogCount})</span>
            </button>
          </>
        )}

        <div className="h-3.5 w-px bg-border-hairline" />

        {/* Classic MS Paint Zoom Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStepZoom(-0.1)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-subtle text-text-sec hover:text-text-pri transition-all"
            title="Zoom Out (Ctrl -)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="0.25"
            max="3.0"
            step="0.05"
            value={zoom}
            onChange={handleSliderChange}
            className="w-20 sm:w-28 h-1.5 bg-subtle rounded-lg appearance-none cursor-pointer accent-accent-primary"
            title={`Zoom: ${zoomPct}%`}
          />

          <button
            onClick={() => handleStepZoom(0.1)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-subtle text-text-sec hover:text-text-pri transition-all"
            title="Zoom In (Ctrl +)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetZoom}
            className="px-1.5 py-0.5 rounded text-[11px] font-semibold text-text-sec hover:text-text-pri hover:bg-subtle border border-border-hairline"
            title="Reset Zoom to 100%"
          >
            {zoomPct}%
          </button>
        </div>
      </div>
    </footer>
  );
};
