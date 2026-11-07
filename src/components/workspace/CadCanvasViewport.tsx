import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  BoundingBox,
  Characteristic,
  DrawingSpec,
  Point
} from '../../types/metrology';
import { renderCADBlueprint, cropCanvasSnippet, generateAllCrops } from '../../utils/cadRenderer';
import { ForceDirectedSimulator, PhysicsBalloon } from '../../utils/balloonPhysics';
import { soundEngine } from '../../utils/audioSynthesizer';
import { parseCalloutAndCalculateLimits } from '../../utils/metrologyMath';
import {
  analyzeCalloutCropWithGemini,
  applyDeterministicMetrologyGuardrails
} from '../../lib/geminiVision';
import {
  Upload
} from 'lucide-react';

// Configure pdfjs worker if available
if (typeof window !== 'undefined' && (pdfjsLib as unknown as { GlobalWorkerOptions?: { workerSrc: string } }).GlobalWorkerOptions) {
  try {
    (pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as unknown as { version?: string }).version || '4.0.379'}/pdf.worker.min.mjs`;
  } catch {
    // Fallback to inline fake-worker
  }
}

interface CadCanvasViewportProps {
  currentDrawing: DrawingSpec;
  characteristics: Characteristic[];
  activeBalloonId: string | null;
  onSelectCharacteristic: (id: string) => void;
  onAddCharacteristic: (newChar: Characteristic) => void;
  onUpdateCharacteristic?: (id: string, updates: Partial<Characteristic>) => void;
  onBulkUpdateCharacteristics?: (chars: Characteristic[]) => void;
  onUpdateCharacteristicPosition: (id: string, pos: Point) => void;
  onDeleteCharacteristic?: (id: string) => void;
  onReSortClockwise: () => void;
  inverted: boolean;
  onToggleInvert: () => void;
  customImage: HTMLImageElement | null;
  onDropPdfFile?: (file: File) => void;
  toolMode?: 'pan' | 'box_balloon';
  onSetToolMode?: (mode: 'pan' | 'box_balloon') => void;
  zoom?: number;
  onZoomChange?: (z: number) => void;
  onCursorMove?: (pos: Point, zone: string) => void;
  activePage?: number;
  onPageChange?: (page: number) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isRevisionDiffMode?: boolean;
  onAcceptRevisionDeltas?: () => void;
  selectedDatumHighlight?: 'A' | 'B' | 'C' | null;
}

export const CadCanvasViewport: React.FC<CadCanvasViewportProps> = ({
  currentDrawing,
  characteristics,
  activeBalloonId,
  onSelectCharacteristic,
  onAddCharacteristic,
  onUpdateCharacteristic,
  onBulkUpdateCharacteristics,
  onUpdateCharacteristicPosition,
  onDeleteCharacteristic,
  inverted,
  customImage,
  onDropPdfFile,
  toolMode = 'pan',
  onSetToolMode,
  zoom: externalZoom,
  onZoomChange: externalOnZoomChange,
  onCursorMove,
  activePage = 1,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  isRevisionDiffMode = false,
  onAcceptRevisionDeltas,
  selectedDatumHighlight = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const leftRulerRef = useRef<HTMLCanvasElement>(null);

  // Pan & Zoom state (zoom range: 0.35 to 3.0)
  const [internalZoom, setInternalZoom] = useState(1.0);
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const setZoom = (z: number) => {
    if (externalOnZoomChange) {
      externalOnZoomChange(z);
    } else {
      setInternalZoom(z);
    }
  };

  const [pan, setPan] = useState<Point>({ x: 75, y: 50 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Cached rendered PDF page canvas
  const [renderedPdfCanvas, setRenderedPdfCanvas] = useState<HTMLCanvasElement | null>(null);

  // PDF Page loader
  useEffect(() => {
    let isCancelled = false;

    async function loadPdfPage() {
      if (!currentDrawing.pdfBuffer) {
        setRenderedPdfCanvas(null);
        return;
      }

      try {
        const loadingTask = pdfjsLib.getDocument({
          data: currentDrawing.pdfBuffer.slice(0),
        });
        const pdfDoc = await loadingTask.promise;
        const pageNum = Math.min(activePage, pdfDoc.numPages);
        const page = await pdfDoc.getPage(pageNum);

        const renderScale = 2.0;
        const viewport = page.getViewport({ scale: renderScale });

        const offscreen = document.createElement('canvas');
        offscreen.width = viewport.width;
        offscreen.height = viewport.height;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        await page.render({ canvasContext: offCtx, viewport }).promise;

        if (!isCancelled) {
          setRenderedPdfCanvas(offscreen);
        }
      } catch (err) {
        console.warn('PDF.js rendering fallback or error:', err);
      }
    }

    loadPdfPage();

    return () => {
      isCancelled = true;
    };
  }, [currentDrawing.pdfBuffer, activePage]);

  // Pre-generate visual crops for characteristics once
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

  // Box-Ballooning marquee state
  const isBoxSelecting = useRef(false);
  const boxStart = useRef<Point>({ x: 0, y: 0 });
  const [boxSelection, setBoxSelection] = useState<BoundingBox | null>(null);

  // Dragging individual balloon
  const [draggedBalloonId, setDraggedBalloonId] = useState<string | null>(null);

  // Physics simulation instance
  const simRef = useRef<ForceDirectedSimulator | null>(null);

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

  const computeZone = (x: number, y: number): string => {
    const margin = 24;
    const w = (currentDrawing.drawingWidth || 1200) - margin * 2;
    const h = (currentDrawing.drawingHeight || 800) - margin * 2;
    const colIdx = Math.max(0, Math.min(7, Math.floor(((x - margin) / w) * 8)));
    const rowIdx = Math.max(0, Math.min(3, Math.floor(((y - margin) / h) * 4)));
    const rows = ['A', 'B', 'C', 'D'];
    return `${rows[rowIdx]}${colIdx + 1}`;
  };

  const handleFitSheet = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cw = container.clientWidth - 80;
    const ch = container.clientHeight - 48;
    const dw = currentDrawing.drawingWidth || 1200;
    const dh = currentDrawing.drawingHeight || 800;

    const fitScale = Math.min(cw / dw, ch / dh, 1.25);
    const newZoom = Math.max(0.35, Math.round(fitScale * 100) / 100);
    setZoom(newZoom);

    const targetX = Math.round((container.clientWidth - dw * newZoom) / 2) + 20;
    const targetY = Math.round((container.clientHeight - dh * newZoom) / 2);
    setPan({ x: Math.max(80, targetX), y: Math.max(24, targetY) });
  }, [currentDrawing.drawingWidth, currentDrawing.drawingHeight]);

  useEffect(() => {
    handleFitSheet();
  }, [currentDrawing.id, handleFitSheet]);

  // Render Rulers in true PDF points (72 pt = 1 inch)
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
    const step = 50;

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
          topCtx.fillText(`${dX}pt`, screenX, topCanvas.height - 13);
        }
      }
    }

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
          leftCtx.fillText(`${dY}pt`, 0, 0);
          leftCtx.restore();
        }
      }
    }

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
    const t0 = performance.now();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    if (renderedPdfCanvas) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(renderedPdfCanvas, 0, 0, width, height);
    } else if (customImage) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(customImage, 0, 0, width, height);
    } else {
      renderCADBlueprint(canvas, currentDrawing, {
        inverted,
        showGrid: true,
        customImage: null,
      });
    }

    if (simRef.current && !simRef.current.isSettled()) {
      simRef.current.step();
    }

    characteristics.forEach((char) => {
      const isSelected = char.id === activeBalloonId;
      const bX = char.balloonPosition.x;
      const bY = char.balloonPosition.y;
      const anchorX = char.bbox.x + char.bbox.width / 2;
      const anchorY = char.bbox.y + char.bbox.height / 2;

      const isDatumMatch = selectedDatumHighlight && char.datumFeature === selectedDatumHighlight;

      let balloonColor = isSelected
        ? '#0284C7'
        : char.status === 'in_spec'
        ? '#107C41'
        : char.status === 'out_of_spec'
        ? '#DC2626'
        : '#D97706';

      let fillStyle = isSelected
        ? 'rgba(2, 132, 199, 0.22)'
        : char.status === 'in_spec'
        ? 'rgba(16, 185, 129, 0.16)'
        : char.status === 'out_of_spec'
        ? 'rgba(239, 68, 68, 0.18)'
        : 'rgba(245, 158, 11, 0.18)';

      let strokeStyle = isSelected
        ? '#0284C7'
        : char.status === 'in_spec'
        ? '#10B981'
        : char.status === 'out_of_spec'
        ? '#EF4444'
        : '#F59E0B';

      let tagLabel = `#${char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber}`;
      let tagW = 26;

      ctx.save();

      // Revision Diff Mode styling
      if (isRevisionDiffMode) {
        if (char.deltaState === 'MODIFIED') {
          balloonColor = '#6366F1';
          fillStyle = 'rgba(99, 102, 241, 0.28)';
          strokeStyle = '#6366F1';
          tagLabel = `#${char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber} Δ REV C`;
          tagW = 56;
        } else if (char.deltaState === 'ADDED') {
          balloonColor = '#10B981';
          fillStyle = 'rgba(16, 185, 129, 0.28)';
          strokeStyle = '#10B981';
          tagLabel = `#${char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber} + NEW`;
          tagW = 48;
        } else if (char.deltaState === 'SUPERSEDED') {
          balloonColor = '#9CA3AF';
          fillStyle = 'rgba(239, 68, 68, 0.18)';
          strokeStyle = '#EF4444';
          tagLabel = `#${char.balloonNumber < 10 ? `0${char.balloonNumber}` : char.balloonNumber} ✕ DEL`;
          tagW = 46;
        } else {
          // Unchanged dims are dimmed so user focuses on diffs
          ctx.globalAlpha = 0.40;
        }
      }

      if (isDatumMatch) {
        ctx.globalAlpha = 1.0;
        strokeStyle = '#06B6D4';
        fillStyle = 'rgba(6, 182, 212, 0.3)';
        balloonColor = '#0891B2';
      }

      // 1. Translucent Callout Highlight Pill over char.bbox
      const { x: boxX, y: boxY, width: boxW, height: boxH } = char.bbox;
      const cornerRadius = 4;

      // Draw rounded rectangle for bbox highlight
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxW, boxH, cornerRadius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = isSelected || isDatumMatch ? 2.5 : 1;
      ctx.stroke();

      // Corner Tag Badge (#01) in top-left
      const tagH = 14;
      const tagX = boxX;
      const tagY = Math.max(2, boxY - tagH);

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(tagX, tagY, tagW, tagH, 3);
      } else {
        ctx.rect(tagX, tagY, tagW, tagH);
      }
      ctx.fillStyle = isSelected ? '#0284C7' : balloonColor;
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagLabel, tagX + tagW / 2, tagY + tagH / 2);

      // Datum badge if controlling datum
      if (char.datumFeature) {
        ctx.fillStyle = '#0891B2';
        ctx.fillRect(tagX + tagW + 2, tagY, 18, tagH);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`[${char.datumFeature}]`, tagX + tagW + 11, tagY + tagH / 2);
      }

      ctx.restore();

      // 2. Leader line and circular balloon
      ctx.save();
      if (isRevisionDiffMode && (!char.deltaState || char.deltaState === 'UNCHANGED')) {
        ctx.globalAlpha = 0.40;
      }
      ctx.strokeStyle = balloonColor;
      ctx.lineWidth = isSelected || isDatumMatch ? 2 : 1.25;

      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(bX, bY);
      ctx.stroke();

      const angle = Math.atan2(anchorY - bY, anchorX - bX);
      ctx.fillStyle = balloonColor;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(anchorX - 7 * Math.cos(angle - Math.PI / 6), anchorY - 7 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(anchorX - 7 * Math.cos(angle + Math.PI / 6), anchorY - 7 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      if (isSelected || isDatumMatch) {
        ctx.strokeStyle = isDatumMatch ? 'rgba(6, 182, 212, 0.5)' : 'rgba(2, 132, 199, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bX, bY, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = isDatumMatch ? 'rgba(6, 182, 212, 0.25)' : 'rgba(2, 132, 199, 0.2)';
        ctx.beginPath();
        ctx.arc(bX, bY, 28, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = balloonColor;
      ctx.beginPath();
      ctx.arc(bX, bY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = char.balloonNumber < 10 ? `0${char.balloonNumber}` : `${char.balloonNumber}`;
      ctx.fillText(label, bX, bY);

      ctx.restore();
    });

    renderMinimap();

    const elapsed = performance.now() - t0;
    if (elapsed > 30) {
      console.debug(`[SpecBalloon Canvas] Frame rendered in ${elapsed.toFixed(1)}ms`);
    }
  }, [
    currentDrawing,
    characteristics,
    activeBalloonId,
    inverted,
    customImage,
    renderedPdfCanvas,
  ]);

  const renderMinimap = () => {
    const minimap = minimapCanvasRef.current;
    if (!minimap) return;
    const mCtx = minimap.getContext('2d');
    if (!mCtx) return;

    mCtx.fillStyle = inverted ? '#141413' : '#EAE8E1';
    mCtx.fillRect(0, 0, minimap.width, minimap.height);

    const scaleX = minimap.width / (currentDrawing.drawingWidth || 1200);
    const scaleY = minimap.height / (currentDrawing.drawingHeight || 800);

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

  const handlePointerDown = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e);

    // 1. Balloon or Translucent Highlight Pill Hit Test
    const clickedChar = characteristics.find((c) => {
      // Check circular balloon (16px radius)
      const dx = c.balloonPosition.x - coords.x;
      const dy = c.balloonPosition.y - coords.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 16) return true;

      // Check translucent highlight pill / corner tag bounding box
      const inBbox =
        coords.x >= c.bbox.x - 4 &&
        coords.x <= c.bbox.x + c.bbox.width + 4 &&
        coords.y >= c.bbox.y - 16 &&
        coords.y <= c.bbox.y + c.bbox.height + 4;
      return inBbox;
    });

    if (clickedChar) {
      onSelectCharacteristic(clickedChar.id);
      // If clicked near balloon circle, allow dragging balloon position
      const dx = clickedChar.balloonPosition.x - coords.x;
      const dy = clickedChar.balloonPosition.y - coords.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 20) {
        setDraggedBalloonId(clickedChar.id);
      }
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

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e);
    const currentZone = computeZone(coords.x, coords.y);
    setCursorPos(coords);
    setSheetZone(currentZone);

    if (onCursorMove) {
      onCursorMove(coords, currentZone);
    }

    if (draggedBalloonId !== null) {
      onUpdateCharacteristicPosition(draggedBalloonId, coords);
      if (simRef.current) simRef.current.wake();
      return;
    }

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

    if (isPanning.current) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
    }
  };

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
      if (boxSelection.width > 15 && boxSelection.height > 10) {
        handleCreateBoxBalloon(boxSelection);
      }
      setBoxSelection(null);
    }

    isPanning.current = false;
  };

  const handleCreateBoxBalloon = (bbox: BoundingBox) => {
    const canvas = canvasRef.current;
    const cropDataUrl = canvas ? cropCanvasSnippet(canvas, bbox, 140, 48) : '';
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}`;
    const nextBalloonNum = characteristics.length + 1;
    const zone = computeZone(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);

    const parsed = parseCalloutAndCalculateLimits('NEW DIM ±0.10', 'Bilateral');

    const newChar: Characteristic = {
      id: newId,
      balloonNumber: nextBalloonNum,
      zone,
      designator: 'Minor',
      rawCallout: 'NEW DIM ±0.10',
      featureDescription: 'User-Selected Dimension Callout',
      nominal_text: parsed.nominal_text,
      nominal_value: parsed.nominal_value,
      nominal: parsed.nominal_value ?? 0,
      toleranceType: 'Bilateral',
      plusTolerance: parsed.plusTolerance,
      minusTolerance: parsed.minusTolerance,
      upper_limit: parsed.upper_limit,
      lower_limit: parsed.lower_limit,
      lsl: parsed.lower_limit ?? 0,
      usl: parsed.upper_limit ?? 0,
      units: 'mm',
      instrument: 'Precision Digital Caliper',
      measuredValue: null,
      lotMeasurements: [],
      status: 'needs_review',
      confidence: 90.0,
      bbox,
      balloonPosition: {
        x: Math.round(bbox.x + bbox.width + 30),
        y: Math.round(bbox.y - 15)
      },
      cropDataUrl,
      reviewed: false,
      isDemo: false,
    };

    onAddCharacteristic(newChar);
    onSelectCharacteristic(newId);
    soundEngine.playInSpecPass();

    // Stage A + Stage B: Gemini 2.5 Flash Vision + Deterministic Metrology Solver
    if (cropDataUrl && onUpdateCharacteristic) {
      analyzeCalloutCropWithGemini(cropDataUrl)
        .then((analysis) => {
          const guard = applyDeterministicMetrologyGuardrails(analysis, currentDrawing.standard);
          onUpdateCharacteristic(newId, {
            rawCallout: guard.nominal_text,
            nominal_text: guard.nominal_text,
            nominal_value: guard.nominal_value,
            nominal: guard.nominal_value,
            toleranceType: guard.toleranceType,
            plusTolerance: guard.plusTolerance,
            minusTolerance: guard.minusTolerance,
            upper_limit: guard.upper_limit,
            lower_limit: guard.lower_limit,
            lsl: guard.lower_limit,
            usl: guard.upper_limit,
            instrument: guard.instrument,
            confidence: guard.confidence,
            featureDescription: analysis.characteristicType.replace('GDT_', 'GD&T ').toLowerCase(),
          });
          soundEngine.playInSpecPass();
        })
        .catch((err) => {
          console.warn('Gemini vision crop analysis:', err);
        });
    }
  };

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
      if (onDropPdfFile) {
        onDropPdfFile(file);
      }
    }
  };

  return (
    <div className="flex-1 w-full h-full relative flex flex-col overflow-hidden bg-page select-none">
      {/* 1. Top Ruler Bar */}
      <div className="h-6 w-full flex items-center bg-subtle border-b border-border-hairline z-20">
        <div className="w-6 h-6 border-r border-border-hairline bg-subtle flex items-center justify-center text-[10px] font-mono text-text-mut font-semibold">
          pt
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

      {/* 2. Main Viewport Area */}
      <div className="flex-1 w-full flex relative overflow-hidden">
        <div className="w-6 h-full bg-subtle border-r border-border-hairline z-20 relative overflow-hidden">
          <canvas
            ref={leftRulerRef}
            width={24}
            height={1080}
            className="w-full h-full block"
          />
        </div>

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
          {/* Floating Revision Diff Mode Banner */}
          {isRevisionDiffMode && (
            <div className="absolute top-3 left-4 right-4 z-30 bg-surface/95 backdrop-blur-md border border-indigo-500/40 rounded-lg shadow-xl px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  🔀 REVISION DIFF MODE
                </span>
                <span className="font-semibold text-text-primary hidden sm:inline">
                  Comparing Baseline (Rev B) → Released (Rev C)
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-subtle text-text-muted">10 Unchanged</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold">
                    2 Modified (Δ)
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-semibold">
                    +1 Added
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 line-through">
                    1 Superseded
                  </span>
                </div>
              </div>
              {onAcceptRevisionDeltas && (
                <button
                  type="button"
                  onClick={onAcceptRevisionDeltas}
                  className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span>✓ Accept All Rev C Deltas & Lock Tag IDs</span>
                </button>
              )}
            </div>
          )}

          {/* Centered Artboard Sheet */}
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
              <div className="text-base font-bold text-text-pri">Drop Vector CAD PDF Here</div>
              <div className="text-xs text-text-sec mt-1">Accepts vector PDF (max 10 MB, max 5 pages)</div>
            </div>
          )}

          {/* Floating Minimap Radar */}
          {showMinimap && (
            <div className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-sm border border-border-hairline rounded-lg shadow-apple-md p-1.5 z-20">
              <div className="flex items-center justify-between text-[10px] text-text-mut px-1 mb-1 font-mono">
                <span>MINIMAP</span>
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
