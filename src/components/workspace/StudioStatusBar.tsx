import React from 'react';
import { Characteristic, DrawingSpec, Point } from '../../types/metrology';
import { ZoomIn, ZoomOut, ShieldCheck } from 'lucide-react';

interface StudioStatusBarProps {
  currentDrawing: DrawingSpec | null;
  characteristics: Characteristic[];
  activeBalloon: Characteristic | null;
  zoom: number;
  onZoomChange: (z: number) => void;
  isSampleData: boolean;
  activePage: number;
  isStreaming: boolean;
  cursorCoords?: Point | null;
  onToggleProperties?: () => void;
  isPropertiesOpen?: boolean;
}

export const StudioStatusBar: React.FC<StudioStatusBarProps> = ({
  currentDrawing,
  characteristics,
  activeBalloon,
  zoom,
  onZoomChange,
  isSampleData,
  activePage,
  isStreaming,
  cursorCoords,
  onToggleProperties,
  isPropertiesOpen,
}) => {
  const inSpecCount = characteristics.filter((c) => c.status === 'in_spec').length;
  const outOfSpecCount = characteristics.filter((c) => c.status === 'out_of_spec').length;
  const reviewCount = characteristics.filter((c) => c.confidence < 85).length;
  const hasDrawing = Boolean(currentDrawing && (characteristics.length > 0 || isStreaming));

  return (
    <footer className="h-6 w-full bg-slate-950 border-t border-slate-800 px-3 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-30 shrink-0">
      {/* Left Segment: Engine Status, Coords, Units, Sheet, Standard */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isStreaming
                ? 'bg-[#38BDF8] animate-pulse'
                : hasDrawing
                ? 'bg-emerald-400'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-slate-300 font-semibold">
            {isStreaming
              ? 'AI EXTRACTING'
              : hasDrawing
              ? 'METROLOGY CORE READY'
              : 'Local AI Engine: Ready'}
          </span>
        </div>

        <span className="text-slate-700">|</span>
        <span className="hidden xl:inline">
          {cursorCoords ? (
            <span>
              X: <span className="text-slate-200">{Math.round(cursorCoords.x)}</span>, Y:{' '}
              <span className="text-slate-200">{Math.round(cursorCoords.y)}</span>
            </span>
          ) : (
            <span>X: --, Y: --</span>
          )}
        </span>

        <span className="text-slate-700 hidden xl:inline">|</span>
        <span>Units: <span className="text-slate-200">mm</span></span>
        <span className="text-slate-700">|</span>
        <span>
          Sheet:{' '}
          <span className="text-slate-200">
            {activePage} of {currentDrawing?.pageCount || 1}
          </span>
        </span>
        <span className="text-slate-700 hidden sm:inline">|</span>
        <span className="hidden sm:inline">
          Scale: <span className="text-slate-200">{currentDrawing?.scale || '1:1'}</span>
        </span>
        <span className="text-slate-700 hidden md:inline">|</span>
        <span className="hidden md:inline">
          Standard:{' '}
          <span className="text-slate-200">
            {currentDrawing?.standard || 'ASME Y14.5'}
          </span>
        </span>
      </div>

      {/* Middle Segment: Selection State & Count */}
      <div className="hidden lg:flex items-center gap-2">
        {activeBalloon ? (
          <span className="text-slate-300">
            Selected: <span className="text-[#38BDF8] font-bold">#{activeBalloon.balloonNumber}</span> ({activeBalloon.rawCallout}) &bull; Zone {activeBalloon.zone}
          </span>
        ) : (
          <span className="text-slate-500">No selection</span>
        )}

        {characteristics.length > 0 && (
          <>
            <span className="text-slate-700">&bull;</span>
            <span className="text-slate-300">
              {characteristics.length} dims
              {inSpecCount > 0 && <span className="text-emerald-400 ml-1">({inSpecCount} pass)</span>}
              {reviewCount > 0 && <span className="text-amber-400 ml-1">({reviewCount} review)</span>}
              {outOfSpecCount > 0 && <span className="text-red-400 ml-1">({outOfSpecCount} fail)</span>}
            </span>
          </>
        )}
      </div>

      {/* Right Segment: Engine Origin, Zoom & Properties Toggle */}
      <div className="flex items-center gap-2.5">
        {isSampleData ? (
          <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
            SAMPLE BENCHMARK
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10.5px] text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Air-Gapped Client</span>
          </span>
        )}

        <span className="text-slate-700">|</span>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onZoomChange(Math.max(0.2, Number((zoom - 0.1).toFixed(2))))}
            className="hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={() => onZoomChange(1.0)}
            className="text-slate-200 hover:text-white tabular-nums px-1 cursor-pointer transition-colors"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => onZoomChange(Math.min(4.0, Number((zoom + 0.1).toFixed(2))))}
            className="hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {onToggleProperties && (
          <>
            <span className="text-slate-700">|</span>
            <button
              onClick={onToggleProperties}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                isPropertiesOpen
                  ? 'bg-[#0047AB] text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle Properties Dock"
            >
              PROPERTIES
            </button>
          </>
        )}
      </div>
    </footer>
  );
};
