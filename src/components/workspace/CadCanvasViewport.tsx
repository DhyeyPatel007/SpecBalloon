import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BoundingBox,
  Characteristic,
  DrawingSpec,
  Point
} from '../../types/metrology';
import { renderCADBlueprint, cropCanvasSnippet, generateAllCrops } from '../../utils/cadRenderer';
import { ForceDirectedSimulator, PhysicsBalloon } from '../../utils/balloonPhysics';
import { soundEngine } from '../../utils/audioSynthesizer';
import {
  Move,
  Crop,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Layers,
  HelpCircle,
  Upload
} from 'lucide-react';

interface CadCanvasViewportProps {
  currentDrawing: DrawingSpec;
  characteristics: Characteristic[];
  activeBalloonId: number | null;
  onSelectCharacteristic: (id: number) => void;
  onAddCharacteristic: (newChar: Characteristic) => void;
  onBulkUpdateCharacteristics?: (chars: Characteristic[]) => void;
  onUpdateCharacteristicPosition: (id: number, pos: Point) => void;
  onReSortClockwise: () => void;
  inverted: boolean;
  onToggleInvert: () => void;
  customImage: HTMLImageElement | null;
  onDropImageFile?: (file: File) => void;
  toolMode?: 'pan' | 'box_balloon';
  onSetToolMode?: (mode: 'pan' | 'box_balloon') => void;
  zoom?: number;
  onZoomChange?: (z: number) => void;
  onCursorMove?: (pos: Point, zone: string) => void;
}

export const CadCanvasViewport: React.FC<CadCanvasViewportProps> = ({
  currentDrawing,
  characteristics,
  activeBalloonId,
  onSelectCharacteristic,
  onAddCharacteristic,
  onBulkUpdateCharacteristics,
  onUpdateCharacteristicPosition,
  onReSortClockwise,
  inverted,
  onToggleInvert,
  customImage,
  onDropImageFile,
  toolMode = 'pan',
  onSetToolMode,
  zoom: externalZoom,
  onZoomChange: externalOnZoomChange,
  onCursorMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const leftRulerRef = useRef<HTMLCanvasElement>(null);

  // Pan & Zoom state
  const [internalZoom, setInternalZoom] = useState(1.0);
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const setZoom = (z: number) => {
    if (externalOnZoomChange) {
      externalOnZoomChange(z);
    } else {
      setInternalZoom(z);
    }
  };

  const [pan, setPan] = useState<Point>({ x: 60, y: 50 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Pre-generate crops for initial characteristics once
  const cropsGenerated = useRef<string | null>(null);
  useEffect(() => {
    if (cropsGenerated.current === currentDrawing.id) return;
    const canvas = canvasRef.current;
    if (!canvas || !onBulkUpdateCharacteristics) return;

    const needsCrops = characteristics.some((c) => !c.cropDataUrl);
    if (needsCrops) {
      const enriched = generateAllCrops(canvas, characteristics);
      cropsGenerated.current = currentDrawing.id;
      onBulkUpdateCharacteristics(enriched);
    }
  }, [currentDrawing.id, characteristics, onBulkUpdateCharacteristics]);

  // Dragging & Interaction state
  const isPanning = useRef(false);
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 });
  const [sheetZone, setSheetZone] = useState('B2');

  // Shift-Drag Box-Ballooning marquee state
  const isBoxSelecting = useRef(false);
  const boxStart = useRef<Point>({ x: 0, y: 0 });
  const [boxSelection, setBoxSelection] = useState<BoundingBox | null>(null);

  // Dragging individual balloon
  const [draggedBalloonId, setDraggedBalloonId] = useState<number | null>(null);

  // Physics simulation instance
  const simRef = useRef<ForceDirectedSimulator | null>(null);

  // Sync physics simulation with characteristics
  useEffect(() => {
    const physicsBalloons: PhysicsBalloon[] = characteristics.map((c) => ({
      id: c.id,
      label: c.balloonNumber < 10 ? `0${c.balloonNumber}` : `${c.balloonNumber}`,
      x: c.balloonPosition.x,
      y: c.balloonPosition.y,
      vx: 0,
      vy: 0,
      anchorX: c.bbox.x + c.bbox.width / 2,
      anchorY: c.bbox.y + c.bbox.height / 2,
      radius: 12
    }));

    if (!simRef.current) {
      simRef.current = new ForceDirectedSimulator(physicsBalloons);
    } else {
      simRef.current.setBalloons(physicsBalloons);
    }
  }, [characteristics]);

  // Compute sheet grid zone (e.g., B4) based on sheet coordinates
  const computeZone = (x: number, y: number): string => {
    const margin = 24;
    const w = (currentDrawing.drawingWidth || 1200) - margin * 2;
    const h = (currentDrawing.drawingHeight || 800) - margin * 2;
    const colIdx = Math.max(0, Math.min(7, Math.floor(((x - margin) / w) * 8)));
    const rowIdx = Math.max(0, Math.min(3, Math.floor(((y - margin) / h) * 4)));
    const rows = ['A', 'B', 'C', 'D'];
    return `${rows[rowIdx]}${colIdx + 1}`;
  };

  // Center artboard on mount or blueprint change
  const handleFitSheet = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cw = container.clientWidth - 48; // padding
    const ch = container.clientHeight - 48;
    const dw = currentDrawing.drawingWidth || 1200;
    const dh = currentDrawing.drawingHeight || 800;

    const fitScale = Math.min(cw / dw, ch / dh, 1.25);
    const newZoom = Math.max(0.35, Math.round(fitScale * 100) / 100);
    setZoom(newZoom);

    const targetX = Math.round((container.clientWidth - dw * newZoom) / 2);
    const targetY = Math.round((container.clientHeight - dh * newZoom) / 2);
    setPan({ x: Math.max(24, targetX), y: Math.max(24, targetY) });
  }, [currentDrawing.drawingWidth, currentDrawing.drawingHeight]);

  useEffect(() => {
    handleFitSheet();
  }, [currentDrawing.id, handleFitSheet]);

  // Render Top & Left Rulers
  useEffect(() => {
    const topCanvas = topRulerRef.current;
    const leftCanvas = leftRulerRef.current;
    if (!topCanvas || !leftCanvas) return;

    const topCtx = topCanvas.getContext('2d');
    const leftCtx = leftRulerRef.current?.getContext('2d');
    if (!topCtx || !leftCtx) return;

    const rulerBg = inverted ? '#1C1C1E' : '#F0F2F5';
    const tickColor = inverted ? '#48484A' : '#C7C7CC';
    const textColor = inverted ? '#8E8E93' : '#6E6E73';
    const cursorColor = '#0066CC';

    // 1. Top Ruler
    topCtx.fillStyle = rulerBg;
    topCtx.fillRect(0, 0, topCanvas.width, topCanvas.height);

    topCtx.strokeStyle = tickColor;
    topCtx.fillStyle = textColor;
    topCtx.font = '9px "JetBrains Mono", monospace';
    topCtx.textBaseline = 'bottom';
    topCtx.textAlign = 'center';

    const dw = currentDrawing.drawingWidth || 1200;
    const step = 50; // mm step

    for (let dX = 0; dX <= dw; dX += step) {
      const screenX = pan.x + dX * zoom;
      if (screenX >= 0 && screenX <= topCanvas.width) {
        const isMajor = dX % 100 === 0;
        const tickH = isMajor ? 12 : 6;
        topCtx.beginPath();
        topCtx.moveTo(screenX, topCanvas.height);
        topCtx.lineTo(screenX, topCanvas.height - tickH);
        topCtx.stroke();

        if (isMajor && screenX > 20 && screenX < topCanvas.width - 20) {
          topCtx.fillText(`${dX}`, screenX, topCanvas.height - 13);
        }
      }
    }

    // Top Ruler Cursor Indicator
    const cursorScreenX = pan.x + cursorPos.x * zoom;
    if (cursorScreenX >= 0 && cursorScreenX <= topCanvas.width) {
      topCtx.strokeStyle = cursorColor;
      topCtx.lineWidth = 1.5;
      topCtx.beginPath();
      topCtx.moveTo(cursorScreenX, 0);
      topCtx.lineTo(cursorScreenX, topCanvas.height);
      topCtx.stroke();
    }

    // 2. Left Ruler
    leftCtx.fillStyle = rulerBg;
    leftCtx.fillRect(0, 0, leftCanvas.width, leftCanvas.height);

    leftCtx.strokeStyle = tickColor;
    leftCtx.fillStyle = textColor;
    leftCtx.font = '9px "JetBrains Mono", monospace';
    leftCtx.textBaseline = 'middle';
    leftCtx.textAlign = 'right';

    const dh = currentDrawing.drawingHeight || 800;

    for (let dY = 0; dY <= dh; dY += step) {
      const screenY = pan.y + dY * zoom;
      if (screenY >= 0 && screenY <= leftCanvas.height) {
        const isMajor = dY % 100 === 0;
        const tickW = isMajor ? 12 : 6;
        leftCtx.beginPath();
        leftCtx.moveTo(leftCanvas.width, screenY);
        leftCtx.lineTo(leftCanvas.width - tickW, screenY);
        leftCtx.stroke();

        if (isMajor && screenY > 15 && screenY < leftCanvas.height - 15) {
          leftCtx.save();
          leftCtx.translate(leftCanvas.width - 14, screenY);
          leftCtx.rotate(-Math.PI / 2);
          leftCtx.textAlign = 'center';
          leftCtx.fillText(`${dY}`, 0, 0);
          leftCtx.restore();
        }
      }
    }

    // Left Ruler Cursor Indicator
    const cursorScreenY = pan.y + cursorPos.y * zoom;
    if (cursorScreenY >= 0 && cursorScreenY <= leftCanvas.height) {
      leftCtx.strokeStyle = cursorColor;
      leftCtx.lineWidth = 1.5;
      leftCtx.beginPath();
      leftCtx.moveTo(0, cursorScreenY);
      leftCtx.lineTo(leftCanvas.width, cursorScreenY);
      leftCtx.stroke();
    }
  }, [pan, zoom, cursorPos, currentDrawing.drawingWidth, currentDrawing.drawingHeight, inverted]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render underlying CAD blueprint
    renderCADBlueprint(canvas, currentDrawing, {
      inverted,
      showGrid: true,
      customImage,
    });

    // Step physics simulator
    if (simRef.current) {
      simRef.current.step();
    }

    // Render Balloons & Leader lines on top of drawing
    characteristics.forEach((char) => {
      const isSelected = char.id === activeBalloonId;
      const bX = char.balloonPosition.x;
      const bY = char.balloonPosition.y;
      const anchorX = char.bbox.x + char.bbox.width / 2;
      const anchorY = char.bbox.y + char.bbox.height / 2;

      // Color coding: Selected (Fluent Blue #0066CC), Pass (#107C41), Fail (#DC2626), Warn (#D97706), Default QA Crimson (#E11D48)
      const balloonColor = isSelected
        ? '#0066CC'
        : char.status === 'in_spec'
        ? '#107C41'
        : char.status === 'out_of_spec'
        ? '#DC2626'
        : '#D97706';

      // Leader line
      ctx.save();
      ctx.strokeStyle = balloonColor;
      ctx.lineWidth = isSelected ? 2 : 1.25;

      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(bX, bY);
      ctx.stroke();

      // Arrowhead at anchor
      const angle = Math.atan2(anchorY - bY, anchorX - bX);
      ctx.fillStyle = balloonColor;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(anchorX - 7 * Math.cos(angle - Math.PI / 6), anchorY - 7 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(anchorX - 7 * Math.cos(angle + Math.PI / 6), anchorY - 7 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // Concentric Radar Halo on selected balloon
      if (isSelected) {
        ctx.strokeStyle = 'rgba(0, 102, 204, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bX, bY, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 102, 204, 0.2)';
        ctx.beginPath();
        ctx.arc(bX, bY, 28, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Balloon Circle
      ctx.fillStyle = balloonColor;
      ctx.beginPath();
      ctx.arc(bX, bY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Thin crisp white border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Balloon Number text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = char.balloonNumber < 10 ? `0${char.balloonNumber}` : `${char.balloonNumber}`;
      ctx.fillText(label, bX, bY);

      ctx.restore();
    });

    // Render Minimap Radar
    renderMinimap();
  }, [
    currentDrawing,
    characteristics,
    activeBalloonId,
    inverted,
    customImage,
  ]);

  // Minimap Renderer
  const renderMinimap = () => {
    const minimap = minimapCanvasRef.current;
    if (!minimap) return;
    const mCtx = minimap.getContext('2d');
    if (!mCtx) return;

    mCtx.fillStyle = inverted ? '#141413' : '#EAE8E1';
    mCtx.fillRect(0, 0, minimap.width, minimap.height);

    const scaleX = minimap.width / (currentDrawing.drawingWidth || 1200);
    const scaleY = minimap.height / (currentDrawing.drawingHeight || 800);

    // Draw balloon dots on minimap
    characteristics.forEach((char) => {
      const isSel = char.id === activeBalloonId;
      mCtx.fillStyle = isSel
        ? '#0066CC'
        : char.status === 'in_spec'
        ? '#107C41'
        : char.status === 'out_of_spec'
        ? '#DC2626'
        : '#D97706';
      mCtx.beginPath();
      mCtx.arc(char.balloonPosition.x * scaleX, char.balloonPosition.y * scaleY, isSel ? 3.5 : 2, 0, Math.PI * 2);
      mCtx.fill();
    });

    // Draw Viewport Frustum Box
    if (containerRef.current) {
      const cW = containerRef.current.clientWidth;
      const cH = containerRef.current.clientHeight;

      const vx = (-pan.x / zoom) * scaleX;
      const vy = (-pan.y / zoom) * scaleY;
      const vw = (cW / zoom) * scaleX;
      const vh = (cH / zoom) * scaleY;

      mCtx.strokeStyle = '#0066CC';
      mCtx.lineWidth = 1.25;
      mCtx.strokeRect(vx, vy, vw, vh);
      mCtx.fillStyle = 'rgba(0, 102, 204, 0.08)';
      mCtx.fillRect(vx, vy, vw, vh);
    }
  };

  // Handle Wheel Zoom (centered on cursor)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(3.0, Math.max(0.25, zoom * zoomFactor));

    const drawingX = (mouseX - pan.x) / zoom;
    const drawingY = (mouseY - pan.y) / zoom;

    const newPanX = mouseX - drawingX * newZoom;
    const newPanY = mouseY - drawingY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Convert mouse event to canvas coordinate
  const getCanvasCoords = (e: React.MouseEvent | React.PointerEvent): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    return {
      x: (clientX - pan.x) / zoom,
      y: (clientY - pan.y) / zoom
    };
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e);

    // 1. Check if clicked on a balloon circle (within 16px radius)
    const clickedBalloon = characteristics.find((c) => {
      const dx = c.balloonPosition.x - coords.x;
      const dy = c.balloonPosition.y - coords.y;
      return Math.sqrt(dx * dx + dy * dy) <= 16;
    });

    if (clickedBalloon) {
      onSelectCharacteristic(clickedBalloon.id);
      setDraggedBalloonId(clickedBalloon.id);
      soundEngine.playKeyClick();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // 2. Box-ballooning mode
    if (toolMode === 'box_balloon' || e.shiftKey) {
      isBoxSelecting.current = true;
      boxStart.current = coords;
      setBoxSelection({ x: coords.x, y: coords.y, width: 0, height: 0 });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // 3. Pan canvas mode
    isPanning.current = true;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e);
    const currentZone = computeZone(coords.x, coords.y);
    setCursorPos(coords);
    setSheetZone(currentZone);

    if (onCursorMove) {
      onCursorMove(coords, currentZone);
    }

    // Dragging individual balloon
    if (draggedBalloonId !== null) {
      onUpdateCharacteristicPosition(draggedBalloonId, coords);
      return;
    }

    // Dragging box selection marquee
    if (isBoxSelecting.current) {
      const startX = boxStart.current.x;
      const startY = boxStart.current.y;
      const x = Math.min(startX, coords.x);
      const y = Math.min(startY, coords.y);
      const width = Math.abs(coords.x - startX);
      const height = Math.abs(coords.y - startY);
      setBoxSelection({ x, y, width, height });
      return;
    }

    // Panning canvas
    if (isPanning.current) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (draggedBalloonId !== null) {
      setDraggedBalloonId(null);
    }

    if (isBoxSelecting.current && boxSelection) {
      isBoxSelecting.current = false;
      if (boxSelection.width > 20 && boxSelection.height > 12) {
        handleCreateBoxBalloon(boxSelection);
      }
      setBoxSelection(null);
    }

    isPanning.current = false;
  };

  // Create new Characteristic from Shift-Drag box
  const handleCreateBoxBalloon = (bbox: BoundingBox) => {
    const canvas = canvasRef.current;
    const cropDataUrl = canvas ? cropCanvasSnippet(canvas, bbox, 140, 48) : '';
    const newId = Date.now();
    const nextBalloonNum = characteristics.length + 1;
    const zone = computeZone(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);

    const newChar: Characteristic = {
      id: newId,
      balloonNumber: nextBalloonNum,
      zone,
      designator: 'Minor',
      rawCallout: 'NEW DIM ±0.10',
      featureDescription: 'User-Selected Dimension Callout',
      nominal: 25.000,
      toleranceType: 'Bilateral',
      plusTolerance: 0.100,
      minusTolerance: 0.100,
      lsl: 24.900,
      usl: 25.100,
      units: 'mm',
      instrument: 'Mitutoyo Digital Caliper',
      measuredValue: 25.000,
      lotMeasurements: [25.000, 25.000, 25.000],
      status: 'in_spec',
      confidence: 96.5,
      bbox,
      balloonPosition: {
        x: Math.round(bbox.x + bbox.width + 30),
        y: Math.round(bbox.y - 15)
      },
      cropDataUrl
    };

    onAddCharacteristic(newChar);
    onSelectCharacteristic(newId);
    soundEngine.playInSpecPass();
  };

  // Drag and Drop File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (onDropImageFile) {
        onDropImageFile(file);
      }
    }
  };

  return (
    <div className="flex-1 w-full h-full relative flex flex-col overflow-hidden bg-page select-none">
      {/* 1. Top Ruler Bar */}
      <div className="h-6 w-full flex items-center bg-subtle border-b border-border-hairline z-20">
        {/* Top-Left Corner Square (Origin Marker) */}
        <div className="w-6 h-6 border-r border-border-hairline bg-subtle flex items-center justify-center text-[10px] font-mono text-text-mut font-semibold">
          mm
        </div>
        <div className="flex-1 h-6 relative overflow-hidden">
          <canvas
            ref={topRulerRef}
            width={1920}
            height={24}
            className="w-full h-full block"
          />
        </div>
      </div>

      {/* 2. Main Viewport Area (Left Ruler + Artboard Canvas) */}
      <div className="flex-1 w-full flex relative overflow-hidden">
        {/* Left Ruler Bar */}
        <div className="w-6 h-full bg-subtle border-r border-border-hairline z-20 relative overflow-hidden">
          <canvas
            ref={leftRulerRef}
            width={24}
            height={1080}
            className="w-full h-full block"
          />
        </div>

        {/* Artboard Container with subtle grid background */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 h-full relative overflow-hidden bg-page bg-subtle-grid cursor-${
            toolMode === 'box_balloon' ? 'crosshair' : isPanning.current ? 'grabbing' : 'grab'
          }`}
        >
          {/* Centered Artboard Sheet (elevated white canvas) */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: currentDrawing.drawingWidth || 1200,
              height: currentDrawing.drawingHeight || 800,
            }}
            className="absolute shadow-artboard rounded-xs bg-surface border border-border-hairline transition-shadow"
          >
            <canvas
              ref={canvasRef}
              width={currentDrawing.drawingWidth || 1200}
              height={currentDrawing.drawingHeight || 800}
              className="block rounded-xs"
            />

            {/* Marquee Box Selection Overlay */}
            {boxSelection && (
              <div
                style={{
                  left: boxSelection.x,
                  top: boxSelection.y,
                  width: boxSelection.width,
                  height: boxSelection.height,
                }}
                className="absolute border-2 border-dashed border-accent-primary bg-accent-primary/10 pointer-events-none rounded-xs"
              />
            )}
          </div>

          {/* Drag & Drop Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-accent-primary/20 backdrop-blur-sm border-2 border-dashed border-accent-primary flex flex-col items-center justify-center z-40">
              <Upload className="w-12 h-12 text-accent-primary animate-bounce mb-2" />
              <div className="text-base font-bold text-text-pri">Drop 2D CAD Blueprint or PDF Here</div>
              <div className="text-xs text-text-sec mt-1">Autonomous OCR and AI Auto-Ballooning will trigger instantly</div>
            </div>
          )}

          {/* Floating Minimap Radar (bottom right of viewport) */}
          {showMinimap && (
            <div className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-sm border border-border-hairline rounded-lg shadow-apple-md p-1.5 z-20">
              <div className="flex items-center justify-between text-[10px] text-text-mut px-1 mb-1 font-mono">
                <span>RADAR OVERVIEW</span>
                <button
                  onClick={() => setShowMinimap(false)}
                  className="hover:text-text-pri font-bold ml-2"
                >
                  ✕
                </button>
              </div>
              <canvas
                ref={minimapCanvasRef}
                width={150}
                height={100}
                className="rounded border border-border-hairline block"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
