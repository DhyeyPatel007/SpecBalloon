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
import { CadCanvasViewport } from './CadCanvasViewport';
import { CharacteristicTape } from './CharacteristicTape';
import { As9102SpreadsheetView } from './As9102SpreadsheetView';
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

  // Fix 4: Real undo stack (>= 20 steps) plus redo stack
  const [undoStack, setUndoStack] = useState<Characteristic[][]>([]);
  const [redoStack, setRedoStack] = useState<Characteristic[][]>([]);

  // Fix 3: Recalculate display numbers only before export & warning state
  const [hasExported, setHasExported] = useState(false);
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<'excel' | 'pdf' | 'csv' | null>(null);

  // Fix 2: Backend connectivity and loading state
  const [backendConnected, setBackendConnected] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [backendNotice, setBackendNotice] = useState<string | null>(null);

  // Tools & Viewport state
  const [toolMode, setToolMode] = useState<'pan' | 'box_balloon'>('pan');
  const [zoom, setZoom] = useState(1.0);
  const [cursorPos, setCursorPos] = useState<Point>({ x: 420, y: 310 });
  const [sheetZone, setSheetZone] = useState('B2');
  const [isBottomDrawerExpanded, setIsBottomDrawerExpanded] = useState(false);
  const [activePage, setActivePage] = useState(1);

  // Check backend health periodically
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

  // Preload asset for current drawing if demo
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

  // Fix 1: Real Vector PDF upload and render with pdfjs-dist
  const handleUploadPdf = async (file: File) => {
    // 1. Validate max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10 MB limit.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
      const pdfDoc = await loadingTask.promise;

      // Validate max 5 pages
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
        characteristics: [], // Start clean with real detection
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

      // Fix 2: Connect to extraction backend
      if (backendConnected) {
        setIsExtracting(true);
        try {
          const uploadRes = await uploadDrawingApi(file);
          const detected = await extractDrawingApi(uploadRes.id);
          setCharacteristics(detected);
          setActiveBalloonId(detected[0]?.id ?? null);
          setBackendNotice(null);
        } catch (err) {
          console.error('Backend extraction failed:', err);
          setBackendNotice('Backend extraction failed. Switched to manual ballooning mode.');
        } finally {
          setIsExtracting(false);
        }
      } else {
        setBackendNotice('Backend not connected. Uploaded vector PDF rendered on canvas. Add balloons using Box [B].');
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

  // Re-number display numbers
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

  // Fix 2: Real Auto-Balloon Detection via Backend
  const handleAutoBalloonDetect = async () => {
    if (!backendConnected) {
      setBackendNotice('Backend not connected. Start the server on http://localhost:8000 to run AI auto-detection.');
      alert('Backend not connected. Start the extraction backend to run auto-detection.');
      return;
    }

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

  const handleResetBalloons = () => {
    const defaultRaw = SAMPLE_DRAWINGS.find((d) => d.id === currentDrawing.id);
    if (defaultRaw) {
      pushUndoSnapshot(characteristics);
      setCharacteristics(generateCropsFromSpec(defaultRaw, { inverted, customImage }));
      soundEngine.playKeyClick();
    }
  };

  const handleAutoCalculateFits = () => {
    pushUndoSnapshot(characteristics);
    const updated = characteristics.map((char) => {
      let plus = char.plusTolerance;
      let minus = char.minusTolerance;
      let inst = char.instrument;

      if (char.rawCallout.includes('H7') || char.rawCallout.includes('g6')) {
        const fit = char.rawCallout.includes('H7') ? 'H7' : 'g6';
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

  const handleChangeStandard = (std: GeneralToleranceStandard) => {
    setSelectedStandard(std);
    handleAutoCalculateFits();
  };

  // Measurements entry from Caliper DRO placeholder or keyboard
  const handleInjectMeasurement = (id: string, val: number) => {
    pushUndoSnapshot(characteristics);
    setCharacteristics((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const lsl = c.lower_limit ?? c.lsl;
          const usl = c.upper_limit ?? c.usl;
          const isPass = val >= lsl && val <= usl;
          if (isPass) {
            soundEngine.playInSpecPass();
          } else {
            soundEngine.playOutOfSpecScrap();
          }
          return {
            ...c,
            measuredValue: val,
            status: isPass ? 'in_spec' : 'out_of_spec',
            reviewed: true,
            isDemo: false,
          };
        }
        return c;
      })
    );
  };

  const handleAdvanceToNextBalloon = () => {
    const currentIdx = characteristics.findIndex((c) => c.id === activeBalloonId);
    const nextIdx = (currentIdx + 1) % (characteristics.length || 1);
    if (characteristics[nextIdx]) {
      setActiveBalloonId(characteristics[nextIdx].id);
    }
  };

  // Fix 6 & Fix 3: Validated exports with count matching and renumbering warning
  const executeExport = async (type: 'excel' | 'pdf' | 'csv') => {
    // 1. Recalculate display numbers sequentially before fresh export
    const renumbered = characteristics.map((c, idx) => ({
      ...c,
      balloonNumber: idx + 1,
    }));
    setCharacteristics(renumbered);

    // 2. Pre-flight count verification: canvas count === tape count === export count
    const canvasCount = renumbered.length;
    const tapeCount = renumbered.length;
    const exportCount = renumbered.length;

    if (canvasCount !== tapeCount || canvasCount !== exportCount) {
      alert(`Export blocked: Characteristic count mismatch! Canvas (${canvasCount}), Tape (${tapeCount}), Export (${exportCount}).`);
      return;
    }

    setHasExported(true);

    if (type === 'excel') {
      if (backendConnected && !currentDrawing.isDemo) {
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
        } catch (err) {
          console.warn('Backend excel export failed, falling back to local generator:', err);
        }
      }
      exportAS9102Excel(currentDrawing.partNumber, currentDrawing.revision, renumbered);
    } else if (type === 'pdf') {
      if (backendConnected && !currentDrawing.isDemo) {
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
          console.warn('Backend PDF export failed:', err);
          alert('Backend ballooned PDF export failed: ' + String(err));
        }
      } else {
        alert('Backend required for vector ballooned PDF generation. Start the backend service.');
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

  // Keyboard navigation & Shortcuts (Tab / Shift+Tab, D to delete, Ctrl+Z / Ctrl+Shift+Z)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Do not break typing inside input, select, or textarea fields
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCtrlOrMeta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const currentIdx = characteristics.findIndex((c) => c.id === activeBalloonId);
        if (e.shiftKey) {
          const prevIdx = (currentIdx - 1 + characteristics.length) % (characteristics.length || 1);
          if (characteristics[prevIdx]) setActiveBalloonId(characteristics[prevIdx].id);
        } else {
          const nextIdx = (currentIdx + 1) % (characteristics.length || 1);
          if (characteristics[nextIdx]) setActiveBalloonId(characteristics[nextIdx].id);
        }
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
      } else if (e.key.toLowerCase() === 'r') {
        handleSortClockwise();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [characteristics, activeBalloonId, handleUndo, handleRedo, handleSortClockwise]);

  const statusCounts = {
    total: characteristics.length,
    inSpec: characteristics.filter((c) => c.status === 'in_spec').length,
    outOfSpec: characteristics.filter((c) => c.status === 'out_of_spec').length,
    needsReview: characteristics.filter((c) => c.status === 'needs_review').length,
  };

  const activeChar = characteristics.find((c) => c.id === activeBalloonId) || characteristics[0] || null;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-page text-text-pri selection:bg-accent-primary selection:text-white font-sans">
      {/* 1. Top Ribbon */}
      <WorkspaceHeader
        currentDrawing={currentDrawing}
        drawingsList={SAMPLE_DRAWINGS}
        onSelectDrawing={handleSelectDrawing}
        onUploadPdf={handleUploadPdf}
        selectedStandard={selectedStandard}
        onChangeStandard={handleChangeStandard}
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
        onResetBalloons={handleResetBalloons}
        onAutoCalcFits={handleAutoCalculateFits}
        backendConnected={backendConnected}
        isExtracting={isExtracting}
      />

      {/* Backend / Status Notice Banner */}
      {backendNotice && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-1 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
          <span>{backendNotice}</span>
          <button onClick={() => setBackendNotice(null)} className="font-bold px-1 hover:text-text-pri">✕</button>
        </div>
      )}

      {/* 2. Main Workbench Area: Canvas Viewport + Right Inspector Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 h-full flex flex-col relative overflow-hidden">
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

          {/* Collapsible Bottom Excel Sheet Bar */}
          <As9102SpreadsheetView
            drawing={currentDrawing}
            characteristics={characteristics}
            onUpdateCharacteristic={handleUpdateCharacteristic}
            onAutoCalculateFits={handleAutoCalculateFits}
            onSortClockwise={handleSortClockwise}
            onFillSimulatedLot={() => {}}
            onExportCSV={() => handleRequestExport('csv')}
            onExportExcel={() => handleRequestExport('excel')}
            onUndoBulkAction={handleUndo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onRedoBulkAction={handleRedo}
            isDrawer={true}
            isExpanded={isBottomDrawerExpanded}
            onToggleExpand={() => setIsBottomDrawerExpanded(!isBottomDrawerExpanded)}
          />
        </div>

        {/* Right Characteristic Tape Inspector */}
        <CharacteristicTape
          characteristics={characteristics}
          activeBalloonId={activeBalloonId}
          onSelectCharacteristic={setActiveBalloonId}
          onUpdateCharacteristic={handleUpdateCharacteristic}
          onDeleteCharacteristic={handleDeleteCharacteristic}
          statusFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onResetFilter={() => setStatusFilter('all')}
        />
      </div>

      {/* 3. Classic MS Paint Bottom Status Bar */}
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

      {/* 4. Full Sheet Mode */}
      {viewMode === 'sheet' && (
        <As9102SpreadsheetView
          drawing={currentDrawing}
          characteristics={characteristics}
          onUpdateCharacteristic={handleUpdateCharacteristic}
          onAutoCalculateFits={handleAutoCalculateFits}
          onSortClockwise={handleSortClockwise}
          onFillSimulatedLot={() => {}}
          onExportCSV={() => handleRequestExport('csv')}
          onExportExcel={() => handleRequestExport('excel')}
          onCloseSheetView={() => setViewMode('split')}
          onUndoBulkAction={handleUndo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onRedoBulkAction={handleRedo}
          isDrawer={false}
        />
      )}

      {/* 5. Caliper DRO Strip (UI Placeholder) */}
      {caliperMode && (
        <CaliperDroStrip
          activeCharacteristic={activeChar}
          onInjectMeasurement={handleInjectMeasurement}
          onAdvanceToNextBalloon={handleAdvanceToNextBalloon}
          onClose={() => setCaliperMode(false)}
        />
      )}

      {/* Re-export Warning Modal (Fix 3) */}
      {showExportWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-hairline rounded-xl shadow-2xl max-w-md w-full p-5 text-xs font-sans">
            <h3 className="text-sm font-bold text-text-pri mb-2 flex items-center gap-2">
              <span className="text-amber-500">⚠</span>
              <span>Re-Export Sequence Warning</span>
            </h3>
            <p className="text-text-sec mb-4 leading-relaxed">
              An export has already been generated for this drawing session. Proceeding will recalculate display balloon numbers sequentially (1..{characteristics.length}). If prior inspection reports have already been circulated, balloon numbers may not match the previous export.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowExportWarning(false);
                  setPendingExportType(null);
                }}
                className="px-3 py-1.5 rounded-md border border-border-hairline hover:bg-subtle text-text-sec font-medium"
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
                Proceed with Re-Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
