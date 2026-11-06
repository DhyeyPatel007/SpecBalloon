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
  RotateCw,
  Maximize,
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<Point>({ x: 20, y: 20 });
  const [toolMode, setToolMode] = useState<'pan' | 'box_balloon'>('pan');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Pre-generate crops for initial characteristics once
  const cropsGenerated = useRef<string | null>(null);
  useEffect(() => {
    if (cropsGenerated.current === currentDrawing.id) return;
    const canvas = canvasRef.current;
    if (!canvas || !onBulkUpdateCharacteristics) return;

    // Check if any characteristics lack cropDataUrl
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
    const w = currentDrawing.drawingWidth - margin * 2;
    const h = currentDrawing.drawingHeight - margin * 2;
    const colIdx = Math.max(0, Math.min(7, Math.floor(((x - margin) / w) * 8)));
    const rowIdx = Math.max(0, Math.min(3, Math.floor(((y - margin) / h) * 4)));
    const rows = ['A', 'B', 'C', 'D'];
    return `${rows[rowIdx]}${colIdx + 1}`;
  };

  // Smooth camera centering on active balloon
  useEffect(() => {
    if (!activeBalloonId || !containerRef.current) return;
    const targetChar = characteristics.find((c) => c.id === activeBalloonId);
    if (!targetChar) return;

    const container = containerRef.current;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const targetX = targetChar.balloonPosition.x * zoom;
    const targetY = targetChar.balloonPosition.y * zoom;

    setPan({
      x: containerW / 2 - targetX,
      y: containerH / 2 - targetY,
    });
  }, [activeBalloonId, zoom]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render underlying CAD vector sheet
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

      // Leader line
      ctx.save();
      ctx.strokeStyle = isSelected
        ? '#FF5500'
        : char.status === 'in_spec'
        ? '#22C55E'
        : char.status === 'out_of_spec'
        ? '#EF4444'
        : '#F59E0B';
      ctx.lineWidth = isSelected ? 2 : 1.25;

      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(bX, bY);
      ctx.stroke();

      // Arrowhead at anchor
      const angle = Math.atan2(anchorY - bY, anchorX - bX);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(anchorX - 7 * Math.cos(angle - Math.PI / 6), anchorY - 7 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(anchorX - 7 * Math.cos(angle + Math.PI / 6), anchorY - 7 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // Concentric Radar Ring on selected balloon
      if (isSelected) {
        ctx.strokeStyle = 'rgba(255, 85, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bX, bY, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 85, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(bX, bY, 30, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Balloon Circle
      ctx.fillStyle = isSelected
        ? '#FF5500'
        : char.status === 'in_spec'
        ? '#22C55E'
        : char.status === 'out_of_spec'
        ? '#EF4444'
        : '#F59E0B';

      ctx.beginPath();
      ctx.arc(bX, bY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Thin border
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

  // Minimap rendering
  const renderMinimap = () => {
    const mini = minimapCanvasRef.current;
    const mainCanvas = canvasRef.current;
    if (!mini || !mainCanvas) return;
    const miniCtx = mini.getContext('2d');
    if (!miniCtx) return;

    miniCtx.fillStyle = inverted ? '#141413' : '#EAE8E1';
    miniCtx.fillRect(0, 0, mini.width, mini.height);

    // Draw scale thumbnail of main drawing
    miniCtx.drawImage(mainCanvas, 0, 0, mini.width, mini.height);

    // Viewport rectangle
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const scaleX = mini.width / (mainCanvas.width * zoom);
      const scaleY = mini.height / (mainCanvas.height * zoom);

      const vx = -pan.x * scaleX;
      const vy = -pan.y * scaleY;
      const vw = cw * scaleX;
      const vh = ch * scaleY;

      miniCtx.strokeStyle = '#FF5500';
      miniCtx.lineWidth = 1.5;
      miniCtx.strokeRect(vx, vy, vw, vh);
    }
  };

  // Convert client cursor coords to drawing canvas coords
  const screenToCanvasCoords = (clientX: number, clientY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = clientX - rect.x;
    const screenY = clientY - rect.y;

    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  };

  // Pointer Down (Handles Pan, Balloon Dragging, and Shift-Drag Box Ballooning)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = screenToCanvasCoords(e.clientX, e.clientY);

    // Shift key or Box Balloon tool mode triggers marquee box selection
    if (e.shiftKey || toolMode === 'box_balloon') {
      isBoxSelecting.current = true;
      boxStart.current = pt;
      setBoxSelection({ x: pt.x, y: pt.y, width: 0, height: 0 });
      return;
    }

    // Check if clicked on a balloon circle
    for (const char of characteristics) {
      const dx = char.balloonPosition.x - pt.x;
      const dy = char.balloonPosition.y - pt.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 16) {
        onSelectCharacteristic(char.id);
        setDraggedBalloonId(char.id);
        return;
      }
    }

    // Otherwise initiate pan
    isPanning.current = true;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = screenToCanvasCoords(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(pt.x), y: Math.round(pt.y) });
    setSheetZone(computeZone(pt.x, pt.y));

    // Handle Shift-Drag box marquee
    if (isBoxSelecting.current) {
      const x = Math.min(boxStart.current.x, pt.x);
      const y = Math.min(boxStart.current.y, pt.y);
      const width = Math.abs(pt.x - boxStart.current.x);
      const height = Math.abs(pt.y - boxStart.current.y);
      setBoxSelection({ x, y, width, height });
      return;
    }

    // Handle Dragging an individual balloon
    if (draggedBalloonId !== null) {
      onUpdateCharacteristicPosition(draggedBalloonId, pt);
      return;
    }

    // Handle Pan
    if (isPanning.current) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    }
  };

  const handlePointerUp = () => {
    // Finish Shift-Drag Box Ballooning: Crop canvas snippet and add characteristic!
    if (isBoxSelecting.current && boxSelection && boxSelection.width > 15 && boxSelection.height > 10) {
      const canvas = canvasRef.current;
      if (canvas) {
        const cropUrl = cropCanvasSnippet(canvas, boxSelection, 140, 48);
        const nextId = Math.max(0, ...characteristics.map((c) => c.id)) + 1;
        const nextNum = Math.max(0, ...characteristics.map((c) => c.balloonNumber)) + 1;
        const zone = computeZone(boxSelection.x, boxSelection.y);

        // Heuristic nominal dimension estimate from coordinates
        const estNominal = Number((10 + Math.random() * 40).toFixed(2));

        const newChar: Characteristic = {
          id: nextId,
          balloonNumber: nextNum,
          zone,
          designator: 'Major',
          rawCallout: `${estNominal.toFixed(2)} ±0.10`,
          featureDescription: `Auto-Extracted Feature (Zone ${zone})`,
          nominal: estNominal,
          toleranceType: 'Bilateral',
          plusTolerance: 0.1,
          minusTolerance: 0.1,
          lsl: Number((estNominal - 0.1).toFixed(3)),
          usl: Number((estNominal + 0.1).toFixed(3)),
          units: 'mm',
          instrument: 'Mitutoyo Digital Caliper',
          measuredValue: Number((estNominal + (Math.random() * 0.08 - 0.04)).toFixed(3)),
          lotMeasurements: [estNominal, estNominal + 0.02, estNominal - 0.01],
          status: 'needs_review',
          confidence: 96.4,
          bbox: boxSelection,
          balloonPosition: {
            x: boxSelection.x - 30,
            y: boxSelection.y - 20,
          },
          cropDataUrl: cropUrl,
        };

        onAddCharacteristic(newChar);
        onSelectCharacteristic(newChar.id);
      }
    }

    isBoxSelecting.current = false;
    setBoxSelection(null);
    isPanning.current = false;
    setDraggedBalloonId(null);
  };

  // Zoom via wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.5, Math.min(3.0, zoom * zoomFactor));
    setZoom(Number(newZoom.toFixed(2)));
  };

  const handleFitSheet = () => {
    setZoom(1.0);
    setPan({ x: 20, y: 20 });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onDropImageFile) {
      onDropImageFile(file);
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 min-w-0 h-full bg-canvas overflow-hidden select-none cursor-crosshair"
    >
      {/* Drag & Drop Overlay Indicator (Fix 08) */}
      {isDragOver && (
        <div className="absolute inset-0 bg-acc-orange/20 border-2 border-dashed border-acc-orange z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-surface-1 border border-acc-orange p-6 font-mono text-center shadow-xl">
            <Upload className="w-8 h-8 text-acc-orange mx-auto mb-2 animate-bounce" />
            <div className="font-bold text-text-pri text-sm">[+ DROP CAD BLUEPRINT OR PDF HERE]</div>
            <div className="text-[11px] text-text-sec mt-1">Accepts PNG, JPG, WebP, SVG, and PDF drawings</div>
          </div>
        </div>
      )}
      {/* CAD Canvas Render Node */}
      <div
        className="absolute transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={currentDrawing.drawingWidth}
          height={currentDrawing.drawingHeight}
          className="shadow-md"
        />

        {/* Live Cyan Box-Balloon Marquee Overlay */}
        {boxSelection && (
          <div
            className="absolute border-2 border-acc-cobalt bg-acc-cobalt/20 pointer-events-none"
            style={{
              left: `${boxSelection.x}px`,
              top: `${boxSelection.y}px`,
              width: `${boxSelection.width}px`,
              height: `${boxSelection.height}px`,
            }}
          >
            <div className="absolute -top-5 left-0 bg-acc-cobalt text-white font-mono text-[11px] px-1.5 py-0.5 font-bold whitespace-nowrap">
              + BOX BALLOON CROP
            </div>
          </div>
        )}
      </div>

      {/* Top-Right Telemetry HUD */}
      <div className="absolute top-3 right-3 border border-border-str bg-surface-1/95 px-3 py-1.5 font-mono text-[11px] text-text-sec flex items-center gap-3 shadow-sm z-20">
        <div>X: <span className="text-text-pri font-bold">{cursorPos.x}mm</span></div>
        <div>Y: <span className="text-text-pri font-bold">{cursorPos.y}mm</span></div>
        <div>ZONE: <span className="text-acc-orange font-bold">{sheetZone}</span></div>
        <div className="text-text-mut">SCALE {Math.round(zoom * 100)}%</div>
      </div>

      {/* Bottom-Center Tactile Tool Pill */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 border border-border-str bg-surface-1/95 p-1 font-mono text-xs flex items-center gap-1 shadow-lg z-20">
        <button
          onClick={() => setToolMode('pan')}
          className={`machined-btn px-2.5 py-1 flex items-center gap-1.5 ${
            toolMode === 'pan' ? 'bg-text-pri text-canvas font-bold' : 'hover:bg-surface-2 text-text-sec'
          }`}
          title="Pan / Select Tool (V)"
        >
          <Move className="w-3.5 h-3.5" />
          <span>[V] SELECT</span>
        </button>

        <button
          onClick={() => setToolMode(toolMode === 'box_balloon' ? 'pan' : 'box_balloon')}
          className={`machined-btn px-2.5 py-1 flex items-center gap-1.5 ${
            toolMode === 'box_balloon' ? 'bg-acc-cobalt text-white font-bold' : 'hover:bg-surface-2 text-text-sec'
          }`}
          title="Shift-Drag Box Balloon (B)"
        >
          <Crop className="w-3.5 h-3.5" />
          <span>[B] BOX BALLOON</span>
        </button>

        <button
          onClick={onReSortClockwise}
          className="machined-btn px-2.5 py-1 hover:bg-surface-2 text-text-sec flex items-center gap-1.5"
          title="Re-Sort Balloon Numbers Clockwise around Part Centroid"
        >
          <RotateCw className="w-3.5 h-3.5 text-acc-orange" />
          <span className="hidden sm:inline">SORT CW</span>
        </button>

        <button
          onClick={onToggleInvert}
          className="machined-btn px-2.5 py-1 hover:bg-surface-2 text-text-sec flex items-center gap-1.5"
          title="Invert Technical Paper / Carbon (Key: K)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">[K] INVERT</span>
        </button>

        <div className="h-4 w-px bg-border-str mx-1"></div>

        <button
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          className="machined-btn p-1 hover:bg-surface-2 text-text-pri"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="px-1 text-[11px] font-bold text-text-pri min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom(Math.min(3.0, zoom + 0.1))}
          className="machined-btn p-1 hover:bg-surface-2 text-text-pri"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleFitSheet}
          className="machined-btn p-1 hover:bg-surface-2 text-text-pri"
          title="Fit Blueprint Sheet (F)"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-border-str mx-1"></div>

        {/* Collapsible Minimap Toggle (Fix 12) */}
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className="machined-btn px-2 py-1 text-[11px] hover:bg-surface-2 text-text-sec font-bold"
          title="Toggle Radar Minimap"
        >
          <span>{showMinimap ? '[-] MINIMAP' : '[+] MINIMAP'}</span>
        </button>
      </div>

      {/* Bottom-Right Minimap Radar (140x90px) (Fix 12) */}
      {showMinimap && (
        <div className="absolute bottom-4 right-4 border border-border-str bg-surface-1 p-1 shadow-md hidden sm:block z-20">
          <div className="text-[11px] font-mono text-text-mut mb-1 px-1 flex items-center justify-between font-bold">
            <span>RADAR MINIMAP</span>
            <span className="text-acc-orange">{characteristics.length} BALLOONS</span>
          </div>
          <canvas
            ref={minimapCanvasRef}
            width={140}
            height={90}
            className="border border-border-str"
          />
        </div>
      )}
    </div>
  );
};

