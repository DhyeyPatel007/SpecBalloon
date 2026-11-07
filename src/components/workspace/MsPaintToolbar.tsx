import React from 'react';
import {
  MousePointer,
  Hand,
  CircleDot,
  ArrowUpRight,
  Type,
  Eraser,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

export type CanvasTool = 'select' | 'pan' | 'box_balloon' | 'leader' | 'text' | 'delete';

interface MsPaintToolbarProps {
  currentTool: CanvasTool;
  onSelectTool: (tool: CanvasTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  activeBalloonId: string | null;
  onDeleteActiveBalloon: () => void;
}

export const MsPaintToolbar: React.FC<MsPaintToolbarProps> = ({
  currentTool,
  onSelectTool,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  activeBalloonId,
  onDeleteActiveBalloon,
}) => {
  return (
    <div
      className="absolute top-3 left-3 z-30 bg-surface/95 backdrop-blur-md border border-border-hairline rounded-lg shadow-apple-lg p-1.5 flex flex-col gap-1 select-none font-sans"
      title="MS Paint Tool Palette"
    >
      {/* Title / Drag handle */}
      <div className="text-[9px] font-mono font-bold tracking-wider text-text-mut text-center pb-1 border-b border-border-hairline">
        TOOLS
      </div>

      {/* Primary Tool Buttons (2-column layout like classic Paint) */}
      <div className="grid grid-cols-2 gap-1">
        {/* Select */}
        <button
          onClick={() => onSelectTool('select')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
            currentTool === 'select'
              ? 'bg-accent-primary text-white shadow-xs font-bold'
              : 'text-text-sec hover:text-text-pri hover:bg-subtle'
          }`}
          title="Select / Move Balloon [V]"
        >
          <MousePointer className="w-3.5 h-3.5" />
        </button>

        {/* Pan / Hand */}
        <button
          onClick={() => onSelectTool('pan')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
            currentTool === 'pan'
              ? 'bg-accent-primary text-white shadow-xs font-bold'
              : 'text-text-sec hover:text-text-pri hover:bg-subtle'
          }`}
          title="Pan Canvas [H / Space]"
        >
          <Hand className="w-3.5 h-3.5" />
        </button>

        {/* Balloon Callout */}
        <button
          onClick={() => onSelectTool('box_balloon')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
            currentTool === 'box_balloon'
              ? 'bg-accent-primary text-white shadow-xs font-bold'
              : 'text-text-sec hover:text-text-pri hover:bg-subtle'
          }`}
          title="Add Balloon (Click or Shift-Drag) [B]"
        >
          <CircleDot className="w-3.5 h-3.5" />
        </button>

        {/* Leader Line */}
        <button
          onClick={() => onSelectTool('leader')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
            currentTool === 'leader'
              ? 'bg-accent-primary text-white shadow-xs font-bold'
              : 'text-text-sec hover:text-text-pri hover:bg-subtle'
          }`}
          title="Anchor Leader Line [L]"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        {/* Text Annotation */}
        <button
          onClick={() => onSelectTool('text')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
            currentTool === 'text'
              ? 'bg-accent-primary text-white shadow-xs font-bold'
              : 'text-text-sec hover:text-text-pri hover:bg-subtle'
          }`}
          title="Text Note / Annotation [T]"
        >
          <Type className="w-3.5 h-3.5" />
        </button>

        {/* Delete / Eraser */}
        <button
          onClick={() => {
            if (activeBalloonId) {
              onDeleteActiveBalloon();
            } else {
              onSelectTool('delete');
            }
          }}
          className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
            currentTool === 'delete'
              ? 'bg-red-500 text-white shadow-xs font-bold'
              : 'text-text-sec hover:text-status-fail hover:bg-subtle'
          }`}
          title="Delete Active Balloon [D / Del]"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-px bg-border-hairline my-0.5" />

      {/* Undo & Redo Row */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-7 h-7 rounded flex items-center justify-center text-text-sec hover:text-text-pri hover:bg-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Undo [Ctrl+Z]"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="w-7 h-7 rounded flex items-center justify-center text-text-sec hover:text-text-pri hover:bg-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Redo [Ctrl+Shift+Z]"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-px bg-border-hairline my-0.5" />

      {/* Zoom Controls */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={onZoomIn}
          className="w-7 h-7 rounded flex items-center justify-center text-text-sec hover:text-text-pri hover:bg-subtle transition-all"
          title="Zoom In (Ctrl +)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onZoomOut}
          className="w-7 h-7 rounded flex items-center justify-center text-text-sec hover:text-text-pri hover:bg-subtle transition-all"
          title="Zoom Out (Ctrl -)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fit to Screen */}
      <button
        onClick={onFitScreen}
        className="w-full h-6 mt-0.5 rounded text-[10px] font-mono font-medium text-text-sec hover:text-text-pri hover:bg-subtle flex items-center justify-center gap-1 border border-border-hairline"
        title="Fit Drawing to Viewport [F]"
      >
        <Maximize2 className="w-3 h-3" />
        <span>Fit [F]</span>
      </button>
    </div>
  );
};
