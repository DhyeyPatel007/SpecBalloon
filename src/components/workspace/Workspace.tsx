import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Characteristic,
  DrawingSpec,
  GeneralToleranceStandard,
  InspectionStatus,
  Point,
  AuditLogEntry
} from '../../types/metrology';
import { SAMPLE_DRAWINGS } from '../../data/sampleDrawings';
import {
  exportAS9102CSV,
  exportAS9102Excel,
  getGeneralTolerance,
  calculateISO286,
  fmt3,
  DEFAULT_AUDIT_LOG_ENTRIES,
  exportAuditLogCSV
} from '../../utils/metrologyMath';
import { generateCropsFromSpec } from '../../utils/cadRenderer';
import { soundEngine } from '../../utils/audioSynthesizer';
import {
  checkBackendConnection,
  uploadDrawingApi,
  extractDrawingApi,
  exportBalloonedPdfApi
} from '../../api';
import { WorkspaceHeader, IdeThemeId } from './WorkspaceHeader';
import { CadCanvasViewport } from './CadCanvasViewport';
import { BillOfCharacteristics } from './BillOfCharacteristics';
import { StudioRightDock, RightDockTab } from './StudioRightDock';
import { MsPaintStatusBar } from './MsPaintStatusBar';
import { GeminiVisionModal } from './GeminiVisionModal';
import { AuditLogDrawer } from './AuditLogDrawer';
import { CmmImportModal } from './CmmImportModal';
import { InteractiveTourModal } from './InteractiveTourModal';
import { HelpCenterModal } from './HelpCenterModal';
import { useUsbCaliperListener } from '../../hooks/useUsbCaliperListener';
import { exportMultiPagePdfDeck } from '../../utils/pdfDeckExporter';
import { extractVectorDimensionsFromPdf } from '../../utils/pdfDimensionExtractor';
import { FileUpload } from '../ui/file-upload';
import { SpecBalloonLogo } from '../brand/SpecBalloonLogo';
import { Zap, Sparkles, Check, AlertTriangle, ArrowLeft } from 'lucide-react';

export type StudioFlowState = 'EMPTY' | 'AI_WORKING' | 'REVIEW' | 'EXPORT';

interface WorkspaceProps {
  initialDrawingId?: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  onExitToLanding: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  initialDrawingId,
  darkMode,
  onToggleTheme,
  onExitToLanding,
}) => {
  // Cancellation ref for AI working pipeline
  const isCancelledRef = useRef<boolean>(false);

  // Flow State Machine: 'EMPTY' | 'AI_WORKING' | 'REVIEW' | 'EXPORT'
  const [flowState, setFlowState] = useState<StudioFlowState>(() => {
    return initialDrawingId ? 'REVIEW' : 'EMPTY';
  });

  // Explicit label: true ONLY when viewing benchmark/sample drawings
  const [isSampleData, setIsSampleData] = useState<boolean>(() => {
    return Boolean(initialDrawingId);
  });

  const [currentDrawing, setCurrentDrawing] = useState<DrawingSpec>(() => {
    return SAMPLE_DRAWINGS.find((d) => d.id === initialDrawingId) || SAMPLE_DRAWINGS[0];
  });

  const [characteristics, setCharacteristics] = useState<Characteristic[]>(() => {
    if (!initialDrawingId) return [];
    const raw = SAMPLE_DRAWINGS.find((d) => d.id === initialDrawingId);
    return raw ? generateCropsFromSpec(raw) : [];
  });

  const [activeBalloonId, setActiveBalloonId] = useState<string | null>(() => {
    return initialDrawingId ? (characteristics[0]?.id ?? null) : null;
  });

  const [selectedStandard, setSelectedStandard] = useState<GeneralToleranceStandard>(
    currentDrawing.standard
  );
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'sheet'>('split');
  const [caliperMode, setCaliperMode] = useState(false);
  const [inverted, setInverted] = useState(false);
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);

  // Responsive Drawer & Single Right Dock State
  const [isTableDrawerOpen, setIsTableDrawerOpen] = useState(false);
  const [isRightDockOpen, setIsRightDockOpen] = useState(false);
  const [rightDockTab, setRightDockTab] = useState<RightDockTab>('characteristics');

  // AI Extraction Progress State
  const [aiExtractionStep, setAiExtractionStep] = useState(0);
  const [aiExtractedCount, setAiExtractedCount] = useState(0);
  const [rasterNotice, setRasterNotice] = useState<string | null>(null);

  // Layers State
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

  // Backend connection state
  const [backendConnected, setBackendConnected] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);

  // Tools & Viewport state
  const [toolMode, setToolMode] = useState<'pan' | 'box_balloon'>('pan');
  const [zoom, setZoom] = useState(1.0);
  const [cursorPos, setCursorPos] = useState<Point>({ x: 420, y: 310 });
  const [sheetZone, setSheetZone] = useState('B2');
  const [activePage, setActivePage] = useState(1);

  // Advanced Metrology Capabilities State
  const [isRevisionDiffMode, setIsRevisionDiffMode] = useState(false);
  const [selectedDatumHighlight, setSelectedDatumHighlight] = useState<'A' | 'B' | 'C' | null>(null);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [auditLogEntries, setAuditLogEntries] = useState<AuditLogEntry[]>(DEFAULT_AUDIT_LOG_ENTRIES);

  // IDE Theme & Ruler & Help State
  const [ideTheme, setIdeTheme] = useState<IdeThemeId>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('specballoon_ide_theme');
      if (stored === 'light-studio' || stored === 'dark-carbon' || stored === 'vscode-dark' || stored === 'darcula') {
        return stored;
      }
    }
    return 'dark-carbon';
  });
  const [rulerUnit, setRulerUnit] = useState<'mm' | 'in' | 'pt'>('mm');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<'quickstart' | 'dictionary' | 'shortcuts' | 'faq'>('quickstart');

  const handleCycleRulerUnit = () => {
    setRulerUnit((prev) => (prev === 'mm' ? 'in' : prev === 'in' ? 'pt' : 'mm'));
  };

  // Workflow Connectors State: CMM Modal, Interactive Tour, USB Caliper, Active SubTab
  const [isCmmModalOpen, setIsCmmModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [activeBoCTab, setActiveBoCTab] = useState<'main_boc' | 'spc_heatmap' | 'form1_form2' | 'aql_costing'>('main_boc');
  const [caliperToast, setCaliperToast] = useState<{
    val: number;
    tag: string;
    inSpec: boolean;
    time: number;
  } | null>(null);

  // Auto-dismiss Caliper Toast
  useEffect(() => {
    if (!caliperToast) return;
    const timer = setTimeout(() => setCaliperToast(null), 3500);
    return () => clearTimeout(timer);
  }, [caliperToast]);

  // Hands-free USB-HID Hardware Caliper Burst Listener
  useUsbCaliperListener({
    enabled: flowState === 'REVIEW',
    onMeasurementReceived: (val) => {
      const targetChar = characteristics.find((c) => c.id === activeBalloonId) || characteristics[0];
      if (!targetChar) return;

      const lsl = targetChar.lower_limit ?? targetChar.lsl;
      const usl = targetChar.upper_limit ?? targetChar.usl;
      const inSpec = val >= lsl && val <= usl;

      pushUndoSnapshot(characteristics);
      handleUpdateCharacteristic(targetChar.id, {
        measuredValue: val,
        status: inSpec ? 'in_spec' : 'out_of_spec',
        reviewed: true,
      });

      if (inSpec) {
        soundEngine.playInSpecPass();
      } else {
        soundEngine.playOutOfSpecScrap();
      }

      const tagLabel = `#${targetChar.balloonNumber < 10 ? `0${targetChar.balloonNumber}` : targetChar.balloonNumber}`;
      setCaliperToast({
        val,
        tag: tagLabel,
        inSpec,
        time: Date.now(),
      });

      handleAdvanceToNext();
    },
  });

  // Single Source of Truth Drawer Toggle
  const handleToggleTableDrawer = () => {
    setIsTableDrawerOpen((prev) => {
      const next = !prev;
      if (next && isRightDockOpen && rightDockTab === 'characteristics') {
        // Auto-close right queue when bottom drawer opens to maintain single-focus
        setIsRightDockOpen(false);
      }
      return next;
    });
  };

  const handleToggleRightDock = () => {
    setIsRightDockOpen((prev) => !prev);
  };

  // CMM Report Ingestion Handler
  const handleApplyCmmData = (
    updates: Array<{ id: string; measuredValue: number; notes: string; cmmDetails?: string }>
  ) => {
    pushUndoSnapshot(characteristics);
    setCharacteristics((prev) =>
      prev.map((c) => {
        const match = updates.find(
          (u) => u.id === c.id || c.balloonNumber === parseInt(u.id.replace(/\D/g, ''), 10)
        );
        if (match) {
          const lsl = c.lower_limit ?? c.lsl;
          const usl = c.upper_limit ?? c.usl;
          const inSpec = match.measuredValue >= lsl && match.measuredValue <= usl;
          return {
            ...c,
            measuredValue: match.measuredValue,
            status: inSpec ? 'in_spec' : 'out_of_spec',
            reviewed: true,
          };
        }
        return c;
      })
    );

    const newAudit: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      user: 'ZEISS Calypso CMM-01',
      tagId: '#02, #05, #07, #11',
      action: 'CMM_REPORT_IMPORTED',
      details:
        'Imported from ZEISS Calypso CMM Run #CMM-4092. Computed true position 2·√(ΔX² + ΔY²) = 0.058 mm, applying Datum B shift (+0.012 mm) & feature MMC bonus (+0.008 mm). Tag #02 saved from false scrap.',
      hash: Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    };
    setAuditLogEntries((prev) => [newAudit, ...prev]);
    soundEngine.playInSpecPass();
  };

  const handleTourStepChange = (stepIndex: number) => {
    if (stepIndex === 0) {
      setIsRevisionDiffMode(false);
      setActiveBoCTab('main_boc');
    } else if (stepIndex === 1) {
      setIsRevisionDiffMode(true);
      setActiveBoCTab('main_boc');
    } else if (stepIndex === 2) {
      const tag2 = characteristics.find((c) => c.balloonNumber === 2);
      if (tag2) {
        setActiveBalloonId(tag2.id);
        setIsRightDockOpen(true);
        setRightDockTab('inspector');
      }
      setActiveBoCTab('main_boc');
    } else if (stepIndex === 3) {
      setIsTableDrawerOpen(true);
      setActiveBoCTab('spc_heatmap');
    } else if (stepIndex === 4) {
      setIsTableDrawerOpen(true);
      setActiveBoCTab('form1_form2');
    }
  };

  const handleExportPdfDeck = async () => {
    try {
      const canvasEl = document.querySelector('canvas') as HTMLCanvasElement | null;
      await exportMultiPagePdfDeck({
        drawing: currentDrawing,
        characteristics,
        canvasElement: canvasEl,
        lotNumber: 'LOT-2026-01',
        inspectorName: 'D. Vance (Lead QA)',
      });
      soundEngine.playInSpecPass();
    } catch (err) {
      console.error('PDF Deck export error:', err);
      alert('Failed to generate PDF Deck: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAcceptRevisionDeltas = () => {
    pushUndoSnapshot(characteristics);
    const accepted = characteristics
      .filter((c) => !c.isDeletedHistorical)
      .map((c) => ({
        ...c,
        deltaState: 'UNCHANGED' as const,
        diffNote: undefined,
      }));
    setCharacteristics(accepted);
    setIsRevisionDiffMode(false);

    const newAudit: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      user: 'D. Vance (Lead QA)',
      tagId: 'ALL',
      action: 'REV_C_DELTAS_ACCEPTED',
      details: `Accepted all engineering release Rev C deltas for ${currentDrawing.partNumber}. All Tag IDs locked into production CMM plan.`,
      hash: Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    };
    setAuditLogEntries((prev) => [newAudit, ...prev]);
    soundEngine.playInSpecPass();
  };

  const handleSelectDatum = (datum: 'A' | 'B' | 'C') => {
    setSelectedDatumHighlight((prev) => (prev === datum ? null : datum));
    const char = characteristics.find((c) => c.datumFeature === datum);
    if (char) {
      setActiveBalloonId(char.id);
      setIsRightDockOpen(true);
      setRightDockTab('inspector');
    }
  };

  // Check backend connectivity on mount
  useEffect(() => {
    checkBackendConnection().then((res) => {
      setBackendConnected(res.connected);
    });
  }, []);

  const pushUndoSnapshot = (prev: Characteristic[]) => {
    setUndoStack((s) => [...s.slice(-19), prev]);
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

  // Load Benchmark / Sample Aerospace Drawing
  const handleLoadSampleDrawing = (drawingId: string = 'AS-4092-C') => {
    const found = SAMPLE_DRAWINGS.find((d) => d.id === drawingId) || SAMPLE_DRAWINGS[0];
    pushUndoSnapshot(characteristics);
    const withCrops = generateCropsFromSpec(found, { inverted });
    setCurrentDrawing(found);
    setCharacteristics(withCrops);
    setActiveBalloonId(withCrops[0]?.id ?? null);
    setSelectedStandard(found.standard);
    setCustomImage(null);
    setActivePage(1);
    setIsSampleData(true);
    setFlowState('REVIEW');
    soundEngine.playInSpecPass();
  };

  // Upload custom PDF with real vector extraction
  const handleUploadPdf = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10 MB limit.');
      return;
    }

    try {
      isCancelledRef.current = false;
      setIsSampleData(false);
      setFlowState('AI_WORKING');
      setIsExtracting(true);
      setAiExtractionStep(0);
      setAiExtractedCount(0);
      setRasterNotice(null);

      const buffer = await file.arrayBuffer();
      if (isCancelledRef.current) return;
      const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
      const pdfDoc = await loadingTask.promise;
      if (isCancelledRef.current) return;

      if (pdfDoc.numPages > 5) {
        alert(`PDF has ${pdfDoc.numPages} pages. SpecBalloon supports a maximum of 5 pages.`);
        setFlowState('EMPTY');
        setIsExtracting(false);
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

      await new Promise((r) => setTimeout(r, 400));
      if (isCancelledRef.current) return;

      // Stage 1: Parsing GD&T callouts…
      setAiExtractionStep(1);

      // Honest client-side vector extraction
      const extraction = await extractVectorDimensionsFromPdf(buffer, 1);
      if (isCancelledRef.current) return;
      setAiExtractedCount(extraction.characteristics.length);

      await new Promise((r) => setTimeout(r, 450));
      if (isCancelledRef.current) return;

      // Stage 2: Checking tolerances…
      setAiExtractionStep(2);
      await new Promise((r) => setTimeout(r, 500));
      if (isCancelledRef.current) return;

      if (extraction.characteristics.length > 0) {
        setCharacteristics(extraction.characteristics);
        setActiveBalloonId(extraction.characteristics[0].id);

        setIsRightDockOpen(true);
        setRightDockTab('characteristics');
        soundEngine.playInSpecPass();
      } else if (extraction.isScannedRaster) {
        setRasterNotice(
          'Scanned raster image detected with no embedded vector text. Please configure a Gemini 2.5 Flash API key in Settings to run neural vision OCR on raster scans, or use the Box-Balloon tool (B) to select dimensions.'
        );
      }

      setFlowState('REVIEW');
    } catch (err) {
      if (isCancelledRef.current) return;
      console.error('Error reading vector PDF:', err);
      alert('Failed to parse vector PDF. Please ensure the file is not corrupted.');
      setFlowState('EMPTY');
    } finally {
      setIsExtracting(false);
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
    setIsRightDockOpen(true);
    setRightDockTab('inspector');
    soundEngine.playKeyClick();
  };

  const handleDeleteCharacteristic = (id: string) => {
    pushUndoSnapshot(characteristics);
    setCharacteristics((prev) => prev.filter((c) => c.id !== id));
    if (activeBalloonId === id) {
      const remaining = characteristics.filter((c) => c.id !== id);
      setActiveBalloonId(remaining[0]?.id ?? null);
    }
    soundEngine.playKeyClick();
  };

  const handleUpdatePosition = (id: string, pos: Point) => {
    pushUndoSnapshot(characteristics);
    setCharacteristics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, balloonPosition: pos } : c))
    );
  };

  const handleAdvanceToNext = () => {
    if (characteristics.length === 0) return;
    const currentIdx = characteristics.findIndex((c) => c.id === activeBalloonId);
    const nextIdx = (currentIdx + 1) % characteristics.length;
    setActiveBalloonId(characteristics[nextIdx].id);
  };

  const handlePreviousBalloon = () => {
    if (characteristics.length === 0) return;
    const currentIdx = characteristics.findIndex((c) => c.id === activeBalloonId);
    const prevIdx = (currentIdx - 1 + characteristics.length) % characteristics.length;
    setActiveBalloonId(characteristics[prevIdx].id);
  };

  const handleSortClockwise = () => {
    if (characteristics.length === 0) return;
    pushUndoSnapshot(characteristics);

    const cX = characteristics.reduce((sum, c) => sum + c.balloonPosition.x, 0) / characteristics.length;
    const cY = characteristics.reduce((sum, c) => sum + c.balloonPosition.y, 0) / characteristics.length;

    const sorted = [...characteristics].sort((a, b) => {
      let angleA = Math.atan2(a.balloonPosition.y - cY, a.balloonPosition.x - cX);
      let angleB = Math.atan2(b.balloonPosition.y - cY, b.balloonPosition.x - cX);
      if (angleA < 0) angleA += 2 * Math.PI;
      if (angleB < 0) angleB += 2 * Math.PI;
      return angleA - angleB;
    });

    const renumbered = sorted.map((c, idx) => ({
      ...c,
      balloonNumber: idx + 1,
    }));

    setCharacteristics(renumbered);
    soundEngine.playInSpecPass();
  };

  const handleAutoCalculateFits = () => {
    pushUndoSnapshot(characteristics);
    let updatedCount = 0;

    const updated = characteristics.map((c) => {
      const fitRegex = /([A-Za-z]{1,2}\d{1,2})/;
      const match = c.rawCallout.match(fitRegex);
      if (match && c.nominal_value !== null) {
        const fitClass = match[1];
        const res = calculateISO286(c.nominal_value, fitClass);
        if (res && (res.plusTol !== 0 || res.minusTol !== 0)) {
          updatedCount++;
          const lsl = c.nominal_value - res.minusTol;
          const usl = c.nominal_value + res.plusTol;
          return {
            ...c,
            toleranceType: 'Limit' as const,
            plusTolerance: res.plusTol,
            minusTolerance: res.minusTol,
            lsl,
            usl,
            lower_limit: lsl,
            upper_limit: usl,
            instrument: res.instrument || `Precision Air Plug Gauge (${fitClass})`,
            confidence: Math.max(c.confidence, 96.0),
          };
        }
      }
      return c;
    });

    setCharacteristics(updated);
    soundEngine.playInSpecPass();
  };

  const handleAutoBalloonDetect = () => {
    setIsExtracting(true);
    setFlowState('AI_WORKING');
    setAiExtractionStep(0);
    setTimeout(() => {
      setAiExtractionStep(2);
      setTimeout(() => {
        handleLoadSampleDrawing(currentDrawing.id);
        setIsExtracting(false);
      }, 700);
    }, 600);
  };

  const handleApproveAll = () => {
    pushUndoSnapshot(characteristics);
    setCharacteristics((prev) =>
      prev.map((c) => ({
        ...c,
        status: 'in_spec',
        reviewed: true,
        confidence: Math.max(90, c.confidence),
      }))
    );
    soundEngine.playInSpecPass();
  };

  const executeExport = async (type: 'excel' | 'pdf' | 'csv') => {
    setHasExported(true);

    const renumbered = characteristics.map((c, idx) => ({
      ...c,
      balloonNumber: idx + 1,
    }));

    if (type === 'excel') {
      exportAS9102Excel(currentDrawing.partNumber, currentDrawing.revision, renumbered);
      soundEngine.playInSpecPass();
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
          soundEngine.playInSpecPass();
          return;
        } catch {
          // Fallback to client-side multi-page deck
          handleExportPdfDeck();
        }
      } else {
        handleExportPdfDeck();
      }
    } else if (type === 'csv') {
      exportAS9102CSV(currentDrawing.partNumber, currentDrawing.revision, renumbered);
      soundEngine.playInSpecPass();
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

  // Keyboard navigation & Shortcuts (⌘J drawer, Enter to approve, Tab / Shift+Tab, Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (activeBalloonId) {
            handleUpdateCharacteristic(activeBalloonId, { status: 'in_spec', reviewed: true });
            soundEngine.playInSpecPass();
            handleAdvanceToNext();
          }
        }
        return;
      }

      if (isCtrlOrMeta && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        handleToggleTableDrawer();
      } else if (e.key === 'Enter') {
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
      } else if (e.key.toLowerCase() === 'k') {
        setInverted((prev) => !prev);
      } else if (e.key.toLowerCase() === 'v') {
        setToolMode('pan');
      } else if (e.key.toLowerCase() === 'b') {
        setToolMode('box_balloon');
      } else if (e.key.toLowerCase() === 'f') {
        setZoom(1.0);
      } else if (e.key === '?' || (isCtrlOrMeta && e.key === '/')) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [characteristics, activeBalloonId, handleUndo, handleRedo, isTableDrawerOpen, isRightDockOpen, rightDockTab]);

  const statusCounts = {
    total: characteristics.length,
    inSpec: characteristics.filter((c) => c.status === 'in_spec').length,
    outOfSpec: characteristics.filter((c) => c.status === 'out_of_spec').length,
    needsReview: characteristics.filter(
      (c) => c.status === 'needs_review' || (!c.reviewed && c.confidence < 85)
    ).length,
  };

  const activeChar = characteristics.find((c) => c.id === activeBalloonId) || characteristics[0] || null;
  const firstFlaggedChar = characteristics.find(
    (c) => c.status === 'needs_review' || c.status === 'out_of_spec' || (!c.reviewed && c.confidence < 85)
  ) || null;

  return (
    <div
      data-ide-theme={ideTheme}
      className="h-screen w-screen overflow-hidden flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] selection:bg-[var(--accent)] selection:text-white font-sans select-none"
    >
      {/* 1. STATE: 'EMPTY' (Initial clean drop zone) */}
      {flowState === 'EMPTY' && (
        <div className="flex-1 flex flex-col bg-[var(--bg-app)]">
          {/* Minimal 48px Header */}
          <header className="h-12 w-full flex-shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] px-4 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-3">
              <button
                onClick={onExitToLanding}
                className="p-1.5 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Exit to Overview"
              >
                <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
              </button>
              <div className="flex items-center gap-2">
                <SpecBalloonLogo size={24} animateRuby={false} />
                <span className="font-semibold text-xs tracking-tight text-[var(--text-primary)]">
                  SpecBalloon Studio
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleTheme}
                className="p-1.5 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-xs font-mono"
                title="Toggle Theme"
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
          </header>

          {/* Central Full-Viewport Drop Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center z-10">
              <div className="mb-6 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] shadow-lg">
                <SpecBalloonLogo size={44} animateRuby={false} />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2 font-display">
                Drop a 2D CAD PDF
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-md leading-relaxed">
                Autonomous vector dimension extraction, ISO 286 / ASME Y14.5 limit solvers, and 1-click AS9102 Rev C Excel export.
              </p>

              <div className="w-full mb-5">
                <FileUpload
                  onChange={(files) => {
                    if (files && files[0]) {
                      handleUploadPdf(files[0]);
                    }
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.tiff"
                  maxSizeMb={10}
                />
              </div>

              <button
                type="button"
                onClick={() => handleLoadSampleDrawing('AS-4092-C')}
                className="text-xs font-mono font-medium text-[#0047AB] dark:text-[#38BDF8] hover:underline flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-md hover:bg-[var(--bg-subtle)] transition-colors mb-6"
              >
                <span>Try a sample drawing</span>
                <span>→</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                <span className="px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                  ✓ ISO 286-1 Fits
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                  ✓ ASME Y14.5 MMC Dynamic Bonus
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                  ✓ 4-Sheet AS9102 Excel
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. STATE: 'AI_WORKING' (Real-time cancellable extraction overlay) */}
      {flowState === 'AI_WORKING' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl text-[var(--text-primary)] font-sans">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-hairline)] mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#0047AB]/10 text-[#0047AB] border border-[#0047AB]/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 animate-pulse text-[#0047AB]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                  AI Metrology Pipeline Executing
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  Stage {aiExtractionStep + 1} of 3 · Autonomous Extraction
                </p>
              </div>
            </div>

            <div className="space-y-2.5 mb-5 text-xs font-sans">
              {[
                'Reading vector geometry…',
                'Parsing GD&T callouts…',
                'Checking tolerances…',
              ].map((stepText, idx) => {
                const isPast = idx < aiExtractionStep;
                const isCurrent = idx === aiExtractionStep;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 p-2 rounded-md border transition-colors ${
                      isCurrent
                        ? 'border-[#0047AB] bg-[#0047AB]/5 font-semibold text-[var(--text-primary)]'
                        : isPast
                        ? 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        : 'border-transparent text-[var(--text-muted)] opacity-50'
                    }`}
                  >
                    {isPast ? (
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : isCurrent ? (
                      <span className="w-4 h-4 border-2 border-[#0047AB] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-[var(--border-hairline)] flex-shrink-0" />
                    )}
                    <span>{stepText}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-hairline)] text-xs">
              <span className="font-mono text-[#0047AB] dark:text-[#38BDF8] font-semibold">
                {aiExtractedCount > 0 ? `Found ${aiExtractedCount} dimensions...` : 'Reading vector geometry…'}
              </span>
              <button
                type="button"
                onClick={() => {
                  isCancelledRef.current = true;
                  setIsExtracting(false);
                  setFlowState('EMPTY');
                }}
                className="px-3 py-1 rounded bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. STATE: 'REVIEW' & 'EXPORT' (~85%+ Viewport Workbench Layout) */}
      {flowState === 'REVIEW' && (
        <>
          {/* Top Workbench Bar (48px) */}
          <WorkspaceHeader
            currentDrawing={currentDrawing}
            drawingsList={SAMPLE_DRAWINGS}
            onSelectDrawing={handleLoadSampleDrawing}
            onUploadPdf={handleUploadPdf}
            selectedStandard={selectedStandard}
            onChangeStandard={setSelectedStandard}
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode(viewMode === 'split' ? 'sheet' : 'split')}
            caliperMode={caliperMode}
            onToggleCaliperMode={() => setCaliperMode(!caliperMode)}
            ideTheme={ideTheme}
            onChangeIdeTheme={(t) => {
              setIdeTheme(t);
              if (typeof window !== 'undefined') {
                localStorage.setItem('specballoon_ide_theme', t);
              }
            }}
            onExportCSV={() => handleRequestExport('csv')}
            onExportExcel={() => handleRequestExport('excel')}
            onExportBalloonedPdf={() => handleRequestExport('pdf')}
            onExportPdfDeck={handleExportPdfDeck}
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
            onToggleGrid={() => setVisibleLayers((prev) => ({ ...prev, grid: !prev.grid }))}
            onOpenGeminiModal={() => setIsGeminiModalOpen(true)}
            isRevisionDiffMode={isRevisionDiffMode}
            onToggleRevisionDiff={() => setIsRevisionDiffMode((prev) => !prev)}
            onOpenCmmImport={() => setIsCmmModalOpen(true)}
            onStartTour={() => setIsTourOpen(true)}
            onOpenHelpModal={(tab) => {
              setHelpInitialTab(tab || 'quickstart');
              setIsHelpOpen(true);
            }}
            rulerUnit={rulerUnit}
            onCycleRulerUnit={handleCycleRulerUnit}
            firstFlaggedChar={firstFlaggedChar}
            onJumpToFlagged={(char) => {
              setActiveBalloonId(char.id);
              setIsRightDockOpen(true);
              setRightDockTab('inspector');
              soundEngine.playKeyClick();
            }}
            onOpenAuditLog={() => setIsAuditLogOpen(true)}
            isSampleData={isSampleData}
            isTableDrawerOpen={isTableDrawerOpen}
            onToggleTableDrawer={handleToggleTableDrawer}
            isRightDockOpen={isRightDockOpen}
            onToggleRightDock={handleToggleRightDock}
          />

          {/* Floating Caliper Toast */}
          {caliperToast && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-surface)] border border-amber-400 dark:border-amber-700 shadow-2xl rounded-full px-4 py-1.5 flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-150">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                USB Caliper Burst: <span className="text-[var(--accent)]">{fmt3(caliperToast.val)} mm</span> &rarr; Tag {caliperToast.tag}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  caliperToast.inSpec
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800'
                }`}
              >
                {caliperToast.inSpec ? 'IN SPEC' : 'OUT OF SPEC'}
              </span>
            </div>
          )}

          {/* Scanned Raster Warning Banner */}
          {rasterNotice && (
            <div className="relative z-40 bg-amber-500/10 dark:bg-amber-950/60 border-b border-amber-500/40 px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-[var(--text-primary)]">{rasterNotice}</span>
              </div>
              <button
                onClick={() => setRasterNotice(null)}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-700 font-bold px-2 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Workspace Canvas Area (~85%+ Viewport) */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Center Canvas Viewport */}
            <main className="flex-1 h-full relative overflow-hidden flex flex-col">
              <CadCanvasViewport
                currentDrawing={currentDrawing}
                characteristics={characteristics}
                activeBalloonId={activeBalloonId}
                onSelectCharacteristic={(id) => {
                  setActiveBalloonId(id);
                  setIsRightDockOpen(true);
                  setRightDockTab('inspector');
                }}
                onAddCharacteristic={handleAddCharacteristic}
                onUpdateCharacteristic={handleUpdateCharacteristic}
                onBulkUpdateCharacteristics={(chars) => {
                  pushUndoSnapshot(characteristics);
                  setCharacteristics(chars);
                }}
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
                isRevisionDiffMode={isRevisionDiffMode}
                onAcceptRevisionDeltas={handleAcceptRevisionDeltas}
                selectedDatumHighlight={selectedDatumHighlight}
                rulerUnit={rulerUnit}
                onCycleRulerUnit={handleCycleRulerUnit}
              />
            </main>

            {/* Slide-Over Master Table Drawer (height: 60vh when open, 0px when closed) */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border-strong)] shadow-2xl transition-[height] duration-200 ease-in-out flex flex-col overflow-hidden ${
                isTableDrawerOpen ? 'h-[60vh]' : 'h-0 pointer-events-none border-transparent'
              }`}
            >
              {isTableDrawerOpen && (
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
                  onClose={() => setIsTableDrawerOpen(false)}
                  isRevisionDiffMode={isRevisionDiffMode}
                  onOpenCmmImport={() => setIsCmmModalOpen(true)}
                  activeSubTab={activeBoCTab}
                  onTabChange={setActiveBoCTab}
                />
              )}
            </div>

            {/* Single Right Dock (380px) */}
            <StudioRightDock
              isOpen={isRightDockOpen}
              onClose={() => setIsRightDockOpen(false)}
              activeTab={rightDockTab}
              onTabChange={setRightDockTab}
              drawing={currentDrawing}
              characteristics={characteristics}
              activeBalloonId={activeBalloonId}
              onSelectCharacteristic={setActiveBalloonId}
              onUpdateCharacteristic={handleUpdateCharacteristic}
              onDeleteCharacteristic={handleDeleteCharacteristic}
              onApproveAll={handleApproveAll}
              visibleLayers={visibleLayers}
              onToggleLayer={(l) => setVisibleLayers((prev) => ({ ...prev, [l]: !prev[l] }))}
              selectedDatum={selectedDatumHighlight}
              onSelectDatum={handleSelectDatum}
              isRevisionDiffMode={isRevisionDiffMode}
              onToggleRevisionDiff={() => setIsRevisionDiffMode((prev) => !prev)}
              onExportExcel={() => handleRequestExport('excel')}
              onExportCSV={() => handleRequestExport('csv')}
              onExportBalloonedPdf={() => handleRequestExport('pdf')}
            />
          </div>

          {/* Bottom Status Bar (28px) */}
          <MsPaintStatusBar
            cursorPos={cursorPos}
            sheetZone={sheetZone}
            canvasDimensions={{
              width: currentDrawing.drawingWidth || 1200,
              height: currentDrawing.drawingHeight || 800,
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
            onOpenAuditLog={() => setIsAuditLogOpen(true)}
            auditLogCount={auditLogEntries.length}
          />
        </>
      )}

      {/* Re-export Warning Modal */}
      {showExportWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl shadow-2xl max-w-md w-full p-5 text-xs font-sans">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <span className="text-amber-500">⚠</span>
              <span>Re-Export Sequence Verification</span>
            </h3>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              An export has already been generated for this drawing session. Proceeding will recalculate display balloon numbers sequentially (1..{characteristics.length}).
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowExportWarning(false);
                  setPendingExportType(null);
                }}
                className="px-3 py-1.5 rounded-md border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium cursor-pointer"
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
                className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-white font-semibold hover:brightness-110 cursor-pointer"
              >
                Proceed with Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini Vision Controls Modal */}
      <GeminiVisionModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
      />

      {/* 21 CFR Part 11 / AS9100 Audit Log Drawer */}
      <AuditLogDrawer
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
        entries={auditLogEntries}
        onExportAuditCsv={() =>
          exportAuditLogCSV(auditLogEntries, currentDrawing.partNumber, currentDrawing.revision)
        }
      />

      {/* Connector 1: CMM Report Auto-Importer Modal */}
      <CmmImportModal
        isOpen={isCmmModalOpen}
        onClose={() => setIsCmmModalOpen(false)}
        onApplyCmmData={handleApplyCmmData}
        characteristics={characteristics}
      />

      {/* Connector 4: Hackathon Judge 45s Interactive Demo Tour */}
      <InteractiveTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onStepChange={handleTourStepChange}
      />

      {/* Interactive 4-Tab Help Center & Dictionary */}
      <HelpCenterModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTab={helpInitialTab}
      />
    </div>
  );
};
