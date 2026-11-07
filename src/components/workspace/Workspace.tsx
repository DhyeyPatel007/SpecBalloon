import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Characteristic,
  DrawingSpec,
  GeneralToleranceStandard,
  InspectionStatus,
  Point
} from '../../types/metrology';
import { SAMPLE_DRAWINGS } from '../../data/sampleDrawings';
import {
  exportAS9102CSV,
  exportAS9102Excel,
  getGeneralTolerance,
  calculateISO286,
  fmt3
} from '../../utils/metrologyMath';
import { generateCropsFromSpec } from '../../utils/cadRenderer';
import { preloadImage, BLUEPRINT_ASSET_MAP } from '../../utils/assetLoader';
import { soundEngine } from '../../utils/audioSynthesizer';
import {
  checkBackendConnection,
  uploadDrawingApi,
  extractDrawingApi,
  exportExcelApi,
  exportBalloonedPdfApi
} from '../../api';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ModelSheetTree } from './ModelSheetTree';
import { CadCanvasViewport } from './CadCanvasViewport';
import { BillOfCharacteristics } from './BillOfCharacteristics';
import { SingleCharacteristicInspector } from './SingleCharacteristicInspector';
import { CaliperDroStrip } from './CaliperDroStrip';
import { MsPaintStatusBar } from './MsPaintStatusBar';

interface WorkspaceProps {
  initialDrawingId?: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  onExitToLanding: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  initialDrawingId = 'AS-4092-C',
  darkMode,
  onToggleTheme,
  onExitToLanding,
}) => {
  const [currentDrawing, setCurrentDrawing] = useState<DrawingSpec>(() => {
    return SAMPLE_DRAWINGS.find((d) => d.id === initialDrawingId) || SAMPLE_DRAWINGS[0];
  });

  const [characteristics, setCharacteristics] = useState<Characteristic[]>(() => {
    const raw = SAMPLE_DRAWINGS.find((d) => d.id === initialDrawingId) || SAMPLE_DRAWINGS[0];
    return generateCropsFromSpec(raw);
  });

  const [activeBalloonId, setActiveBalloonId] = useState<string | null>(() => {
    return characteristics[0]?.id ?? null;
  });

  const [selectedStandard, setSelectedStandard] = useState<GeneralToleranceStandard>(
    currentDrawing.standard
  );
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'sheet'>('split');
  const [caliperMode, setCaliperMode] = useState(false);
  const [inverted, setInverted] = useState(false);
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);

  // Tree & Layers State
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState({
    balloons: true,
    dimensions: true,
    datums: true,
    grid: true,
  });

  // Undo / Redo Stacks (>= 20 steps)
  const [undoStack, setUndoStack] = useState<Characteristic[][]>([]);
  const [redoStack, setRedoStack] = useState<Characteristic[][]>([]);

  // Export State
  const [hasExported, setHasExported] = useState(false);
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<'excel' | 'pdf' | 'csv' | null>(null);

  // Backend state
  const [backendConnected, setBackendConnected] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);

  // Tools & Viewport state
  const [toolMode, setToolMode] = useState<'pan' | 'box_balloon'>('pan');
  const [zoom, setZoom] = useState(1.0);
  const [cursorPos, setCursorPos] = useState<Point>({ x: 420, y: 310 });
  const [sheetZone, setSheetZone] = useState('B2');
  const [activePage, setActivePage] = useState(1);
  const [splitHeightPct, setSplitHeightPct] = useState(55); // 55% drawing viewport, 45% BoC table
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  // Probe backend health periodically
  useEffect(() => {
    let mounted = true;
    async function probeBackend() {
      const res = await checkBackendConnection();
      if (mounted) {
        setBackendConnected(res.connected);
      }
    }
    probeBackend();
    const interval = setInterval(probeBackend, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Preload asset for current drawing
  useEffect(() => {
    if (BLUEPRINT_ASSET_MAP[currentDrawing.id]) {
      preloadImage(BLUEPRINT_ASSET_MAP[currentDrawing.id]);
    }
  }, [currentDrawing.id]);

  // Push snapshot to undo stack before mutations
  const pushUndoSnapshot = (prev: Characteristic[]) => {
    setUndoStack((stack) => [...stack.slice(-49), prev]);
    setRedoStack([]);
  };

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, characteristics]);
    setCharacteristics(previous);
    soundEngine.playKeyClick();
  }, [undoStack, characteristics]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, characteristics]);
    setCharacteristics(next);
    soundEngine.playKeyClick();
  }, [redoStack, characteristics]);

  // Switch drawing when selector changes
  const handleSelectDrawing = (drawingId: string) => {
    const found = SAMPLE_DRAWINGS.find((d) => d.id === drawingId);
    if (found) {
      pushUndoSnapshot(characteristics);
      const withCrops = generateCropsFromSpec(found, { inverted });
      setCurrentDrawing(found);
      setCharacteristics(withCrops);
      setActiveBalloonId(withCrops[0]?.id ?? null);
      setSelectedStandard(found.standard);
      setCustomImage(null);
      setActivePage(1);
    }
  };

  // Vector PDF upload and render with pdfjs-dist
  const handleUploadPdf = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10 MB limit.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
      const pdfDoc = await loadingTask.promise;

      if (pdfDoc.numPages > 5) {
        alert(`PDF has ${pdfDoc.numPages} pages. SpecBalloon supports a maximum of 5 pages.`);
        return;
      }

      const page1 = await pdfDoc.getPage(1);
      const viewport = page1.getViewport({ scale: 1.0 });

      const newSpec: DrawingSpec = {
        id: 'PDF-' + Date.now(),
        partNumber: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
        partName: 'Vector CAD Drawing',
        revision: 'REV 1.0',
        standard: selectedStandard,
        drawingWidth: Math.round(viewport.width),
        drawingHeight: Math.round(viewport.height),
        scale: '1:1',
        sheetZoneRows: ['A', 'B', 'C', 'D'],
        sheetZoneCols: ['1', '2', '3', '4', '5', '6', '7', '8'],
        characteristics: [],
        pageCount: pdfDoc.numPages,
        pdfBuffer: buffer,
        isDemo: false,
      };

      pushUndoSnapshot(characteristics);
      setCurrentDrawing(newSpec);
      setCharacteristics([]);
      setActiveBalloonId(null);
      setCustomImage(null);
      setActivePage(1);

      // Auto-extract using backend or local engine
      setIsExtracting(true);
      try {
        if (backendConnected) {
          const uploadRes = await uploadDrawingApi(file);
          const detected = await extractDrawingApi(uploadRes.id);
          setCharacteristics(detected);
          setActiveBalloonId(detected[0]?.id ?? null);
        } else {
          const detected = await extractDrawingApi(newSpec.id);
          setCharacteristics(detected);
          setActiveBalloonId(detected[0]?.id ?? null);
        }
      } catch (err) {
        console.warn('Extraction fallback to local engine:', err);
        const fallback = generateCropsFromSpec(SAMPLE_DRAWINGS[0]);
        setCharacteristics(fallback);
        setActiveBalloonId(fallback[0]?.id ?? null);
      } finally {
        setIsExtracting(false);
      }
    } catch (err) {
      console.error('Error reading vector PDF:', err);
      alert('Failed to parse vector PDF. Please ensure the file is not corrupted.');
    }
  };

  // Characteristic updates with undo tracking
  const handleUpdateCharacteristic = (id: string, updates: Partial<Characteristic>) => {
    pushUndoSnapshot(characteristics);
    setCharacteristics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleAddCharacteristic = (newChar: Characteristic) => {
    pushUndoSnapshot(characteristics);
    setCharacteristics((prev) => [...prev, newChar]);
    setActiveBalloonId(newChar.id);
  };

  const handleDeleteCharacteristic = (id: string) => {
    pushUndoSnapshot(characteristics);
    const remaining = characteristics.filter((c) => c.id !== id);
    setCharacteristics(remaining);
    if (activeBalloonId === id) {
      setActiveBalloonId(remaining[0]?.id ?? null);
    }
    soundEngine.playKeyClick();
  };

  const handleUpdatePosition = (id: string, pos: Point) => {
    setCharacteristics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, balloonPosition: pos } : c))
    );
  };

  // Auto-Balloon Detection
  const handleAutoBalloonDetect = async () => {
    setIsExtracting(true);
    try {
      const extracted = await extractDrawingApi(currentDrawing.id);
      pushUndoSnapshot(characteristics);
      setCharacteristics(extracted);
      setActiveBalloonId(extracted[0]?.id ?? null);
      soundEngine.playInSpecPass();
    } catch (err) {
      console.error('Detection error:', err);
      alert('Extraction failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAutoCalculateFits = () => {
    pushUndoSnapshot(characteristics);
    const updated = characteristics.map((char) => {
      let plus = char.plusTolerance;
      let minus = char.minusTolerance;
      let inst = char.instrument;

      if (char.rawCallout.includes('H7') || char.rawCallout.includes('g6') || char.rawCallout.includes('H8')) {
        const fit = char.rawCallout.includes('H7') ? 'H7' : char.rawCallout.includes('g6') ? 'g6' : 'H8';
        const iso = calculateISO286(char.nominal_value ?? char.nominal ?? 0, fit);
        plus = iso.plusTol;
        minus = iso.minusTol;
        inst = iso.instrument;
      } else if (char.isGeneralTol) {
        const gen = getGeneralTolerance(char.nominal_value ?? char.nominal ?? 0, selectedStandard);
        plus = gen.plusTol;
        minus = gen.minusTol;
      }

      const nominal = char.nominal_value ?? char.nominal ?? 0;
      const lower = char.toleranceType === 'GD&T' || char.toleranceType === 'Surface' ? 0.000 : Number((nominal - minus).toFixed(4));
      const upper = char.toleranceType === 'GD&T' || char.toleranceType === 'Surface' ? Number(plus.toFixed(4)) : Number((nominal + plus).toFixed(4));

      return {
        ...char,
        plusTolerance: plus,
        minusTolerance: minus,
        upper_limit: upper,
        lower_limit: lower,
        lsl: lower,
        usl: upper,
        instrument: inst
      };
    });

    setCharacteristics(updated);
    soundEngine.playInSpecPass();
  };

  const handleApproveAll = () => {
    pushUndoSnapshot(characteristics);
    setCharacteristics((prev) =>
      prev.map((c) => ({
        ...c,
        status: 'in_spec',
        reviewed: true,
      }))
    );
    soundEngine.playInSpecPass();
  };

  const handleSortClockwise = useCallback(() => {
    pushUndoSnapshot(characteristics);
    const center = {
      x: (currentDrawing.drawingWidth || 1200) / 2,
      y: (currentDrawing.drawingHeight || 800) / 2
    };

    const sorted = [...characteristics].sort((a, b) => {
      const angleA = Math.atan2(a.balloonPosition.y - center.y, a.balloonPosition.x - center.x);
      const angleB = Math.atan2(b.balloonPosition.y - center.y, b.balloonPosition.x - center.x);
      return angleA - angleB;
    });

    const reNumbered = sorted.map((c, idx) => ({
      ...c,
      balloonNumber: idx + 1
    }));

    setCharacteristics(reNumbered);
    soundEngine.playKeyClick();
  }, [characteristics, currentDrawing.drawingWidth, currentDrawing.drawingHeight]);

  const handleAdvanceToNext = () => {
    const currentIdx = characteristics.findIndex((c) => c.id === activeBalloonId);
    const nextIdx = (currentIdx + 1) % (characteristics.length || 1);
    if (characteristics[nextIdx]) {
      setActiveBalloonId(characteristics[nextIdx].id);
    }
  };

  const handlePreviousBalloon = () => {
    const currentIdx = characteristics.findIndex((c) => c.id === activeBalloonId);
    const prevIdx = (currentIdx - 1 + characteristics.length) % (characteristics.length || 1);
    if (characteristics[prevIdx]) {
      setActiveBalloonId(characteristics[prevIdx].id);
    }
  };

  // Validated exports
  const executeExport = async (type: 'excel' | 'pdf' | 'csv') => {
    const renumbered = characteristics.map((c, idx) => ({
      ...c,
      balloonNumber: idx + 1,
    }));
    setCharacteristics(renumbered);
    setHasExported(true);

    if (type === 'excel') {
      if (backendConnected) {
        try {
          const blob = await exportExcelApi(currentDrawing.id, renumbered);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `SpecBalloon_${currentDrawing.partNumber}_AS9102.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return;
        } catch {
          // Local fallback
        }
      }
      exportAS9102Excel(currentDrawing.partNumber, currentDrawing.revision, renumbered);
    } else if (type === 'pdf') {
      if (backendConnected) {
        try {
          const blob = await exportBalloonedPdfApi(currentDrawing.id, renumbered);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `SpecBalloon_${currentDrawing.partNumber}_Ballooned.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return;
        } catch (err) {
          alert('Ballooned PDF export failed: ' + String(err));
        }
      } else {
        alert('Backend required for vector ballooned PDF generation.');
      }
    } else if (type === 'csv') {
      exportAS9102CSV(currentDrawing.partNumber, currentDrawing.revision, renumbered);
    }
  };

  const handleRequestExport = (type: 'excel' | 'pdf' | 'csv') => {
    if (hasExported) {
      setPendingExportType(type);
      setShowExportWarning(true);
    } else {
      executeExport(type);
    }
  };

  // Keyboard navigation & Shortcuts (Enter to Approve & Next, Tab / Shift+Tab, Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Enter') {
          // In input field, Enter triggers approve and next
          e.preventDefault();
          if (activeBalloonId) {
            handleUpdateCharacteristic(activeBalloonId, { status: 'in_spec', reviewed: true });
            soundEngine.playInSpecPass();
            handleAdvanceToNext();
          }
        }
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeBalloonId) {
          handleUpdateCharacteristic(activeBalloonId, { status: 'in_spec', reviewed: true });
          soundEngine.playInSpecPass();
          handleAdvanceToNext();
        }
      } else if (isCtrlOrMeta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (isCtrlOrMeta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) handlePreviousBalloon();
        else handleAdvanceToNext();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleAdvanceToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePreviousBalloon();
      } else if (e.key.toLowerCase() === 'd') {
        if (activeBalloonId) {
          e.preventDefault();
          handleDeleteCharacteristic(activeBalloonId);
        }
      } else if (isCtrlOrMeta && e.key === '\\') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'split' ? 'sheet' : 'split'));
      } else if (e.key.toLowerCase() === 'k') {
        setInverted((prev) => !prev);
      } else if (e.key.toLowerCase() === 'v') {
        setToolMode('pan');
      } else if (e.key.toLowerCase() === 'b') {
        setToolMode('box_balloon');
      } else if (e.key.toLowerCase() === 'f') {
        setZoom(1.0);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [characteristics, activeBalloonId, handleUndo, handleRedo]);

  // Splitter drag handlers
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);

    const startY = e.clientY;
    const initialPct = splitHeightPct;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const windowHeight = window.innerHeight - 130; // approx ribbon + status bar
      const deltaPct = (deltaY / windowHeight) * 100;
      const newPct = Math.min(80, Math.max(25, initialPct + deltaPct));
      setSplitHeightPct(newPct);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const statusCounts = {
    total: characteristics.length,
    inSpec: characteristics.filter((c) => c.status === 'in_spec').length,
    outOfSpec: characteristics.filter((c) => c.status === 'out_of_spec').length,
    needsReview: characteristics.filter((c) => c.status === 'needs_review').length,
  };

  const activeChar = characteristics.find((c) => c.id === activeBalloonId) || characteristics[0] || null;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-app text-text-primary selection:bg-accent-primary selection:text-white font-sans select-none">
      {/* 1. Top Ribbon */}
      <WorkspaceHeader
        currentDrawing={currentDrawing}
        drawingsList={SAMPLE_DRAWINGS}
        onSelectDrawing={handleSelectDrawing}
        onUploadPdf={handleUploadPdf}
        selectedStandard={selectedStandard}
        onChangeStandard={setSelectedStandard}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'split' ? 'sheet' : 'split')}
        caliperMode={caliperMode}
        onToggleCaliperMode={() => setCaliperMode(!caliperMode)}
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
        onExportCSV={() => handleRequestExport('csv')}
        onExportExcel={() => handleRequestExport('excel')}
        onExportBalloonedPdf={() => handleRequestExport('pdf')}
        onExitToLanding={onExitToLanding}
        statusCounts={statusCounts}
        toolMode={toolMode}
        onSetToolMode={setToolMode}
        onFitSheet={() => setZoom(1.0)}
        onToggleInvert={() => setInverted(!inverted)}
        inverted={inverted}
        onReSortClockwise={handleSortClockwise}
        onAutoBalloonDetect={handleAutoBalloonDetect}
        onResetBalloons={() => {
          const def = SAMPLE_DRAWINGS.find((d) => d.id === currentDrawing.id);
          if (def) setCharacteristics(generateCropsFromSpec(def, { inverted, customImage }));
        }}
        onAutoCalcFits={handleAutoCalculateFits}
        onApproveAll={handleApproveAll}
        backendConnected={backendConnected}
        isExtracting={isExtracting}
        showGrid={visibleLayers.grid}
        onToggleGrid={() => setVisibleLayers(prev => ({ ...prev, grid: !prev.grid }))}
      />

      {/* 2. Main 4-Pane Workbench Layout */}
      {viewMode === 'split' ? (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Pane (190px, collapsible): Model & Sheet Tree */}
          <ModelSheetTree
            drawing={currentDrawing}
            characteristics={characteristics}
            activeBalloonId={activeBalloonId}
            onSelectCharacteristic={setActiveBalloonId}
            isCollapsed={isTreeCollapsed}
            onToggleCollapse={() => setIsTreeCollapsed(!isTreeCollapsed)}
            visibleLayers={visibleLayers}
            onToggleLayer={(l) => setVisibleLayers(prev => ({ ...prev, [l]: !prev[l] }))}
          />

          {/* Center Pane: Split Vertically between CAD Viewport (55%) and Docked BoC Spreadsheet (45%) */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Center-Top: Clean 2D CAD Drawing Viewport with Highlight Pills */}
            <div
              style={{ height: `${splitHeightPct}%` }}
              className="w-full relative overflow-hidden flex flex-col transition-[height] duration-75"
            >
              <CadCanvasViewport
                currentDrawing={currentDrawing}
                characteristics={characteristics}
                activeBalloonId={activeBalloonId}
                onSelectCharacteristic={setActiveBalloonId}
                onAddCharacteristic={handleAddCharacteristic}
                onUpdateCharacteristicPosition={handleUpdatePosition}
                onDeleteCharacteristic={handleDeleteCharacteristic}
                onReSortClockwise={handleSortClockwise}
                inverted={inverted}
                onToggleInvert={() => setInverted(!inverted)}
                customImage={customImage}
                onDropPdfFile={handleUploadPdf}
                toolMode={toolMode}
                onSetToolMode={setToolMode}
                zoom={zoom}
                onZoomChange={setZoom}
                onCursorMove={(pos, zone) => {
                  setCursorPos(pos);
                  setSheetZone(zone);
                }}
                activePage={activePage}
                onPageChange={setActivePage}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </div>

            {/* Resizable Horizontal Splitter Bar */}
            <div
              onMouseDown={handleSplitterMouseDown}
              className={`h-1.5 w-full bg-border-hairline hover:bg-accent-primary cursor-row-resize transition-colors flex items-center justify-center z-10 ${
                isDraggingSplitter ? 'bg-accent-primary' : ''
              }`}
              title="Drag to resize CAD Drawing Viewport and Bill of Characteristics"
            >
              <div className="w-8 h-1 rounded-full bg-border-strong" />
            </div>

            {/* Center-Bottom: Docked Bill of Characteristics Master Spreadsheet */}
            <div
              style={{ height: `${100 - splitHeightPct}%` }}
              className="w-full relative overflow-hidden flex flex-col transition-[height] duration-75"
            >
              <BillOfCharacteristics
                drawing={currentDrawing}
                characteristics={characteristics}
                activeBalloonId={activeBalloonId}
                onSelectCharacteristic={setActiveBalloonId}
                onUpdateCharacteristic={handleUpdateCharacteristic}
                onAutoCalculateFits={handleAutoCalculateFits}
                onApproveAll={handleApproveAll}
                onExportCSV={() => handleRequestExport('csv')}
                onExportExcel={() => handleRequestExport('excel')}
                isExpanded={splitHeightPct < 70}
                onToggleHeight={() => setSplitHeightPct(prev => (prev > 50 ? 30 : 60))}
              />
            </div>
          </div>

          {/* Right Pane (360px): Single-Characteristic Focused Inspector */}
          <SingleCharacteristicInspector
            characteristic={activeChar}
            characteristicsList={characteristics}
            onSelectCharacteristic={setActiveBalloonId}
            onUpdateCharacteristic={handleUpdateCharacteristic}
            onDeleteCharacteristic={handleDeleteCharacteristic}
          />
        </div>
      ) : (
        /* Full Sheet Mode */
        <div className="flex-1 overflow-hidden flex flex-col bg-surface">
          <BillOfCharacteristics
            drawing={currentDrawing}
            characteristics={characteristics}
            activeBalloonId={activeBalloonId}
            onSelectCharacteristic={setActiveBalloonId}
            onUpdateCharacteristic={handleUpdateCharacteristic}
            onAutoCalculateFits={handleAutoCalculateFits}
            onApproveAll={handleApproveAll}
            onExportCSV={() => handleRequestExport('csv')}
            onExportExcel={() => handleRequestExport('excel')}
            isExpanded={true}
          />
        </div>
      )}

      {/* 3. Classic MS Paint Bottom Status Bar (28px) */}
      <MsPaintStatusBar
        cursorPos={cursorPos}
        sheetZone={sheetZone}
        canvasDimensions={{
          width: currentDrawing.drawingWidth || 1200,
          height: currentDrawing.drawingHeight || 800
        }}
        activeCharacteristicTitle={
          activeChar
            ? `#${activeChar.balloonNumber < 10 ? `0${activeChar.balloonNumber}` : activeChar.balloonNumber} (${activeChar.nominal_text || activeChar.featureDescription})`
            : null
        }
        statusCounts={statusCounts}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(1.0)}
      />

      {/* Re-export Warning Modal */}
      {showExportWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-hairline rounded-xl shadow-2xl max-w-md w-full p-5 text-xs font-sans">
            <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
              <span className="text-amber-500">⚠</span>
              <span>Re-Export Sequence Verification</span>
            </h3>
            <p className="text-text-secondary mb-4 leading-relaxed">
              An export has already been generated for this drawing session. Proceeding will recalculate display balloon numbers sequentially (1..{characteristics.length}).
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowExportWarning(false);
                  setPendingExportType(null);
                }}
                className="px-3 py-1.5 rounded-md border border-border-hairline hover:bg-subtle text-text-secondary font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExportWarning(false);
                  if (pendingExportType) {
                    executeExport(pendingExportType);
                    setPendingExportType(null);
                  }
                }}
                className="px-3 py-1.5 rounded-md bg-accent-primary text-white font-semibold hover:bg-accent-primary/90"
              >
                Proceed with Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
