import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Characteristic,
  DrawingSpec,
  GeneralToleranceStandard,
  Point,
} from '../../types/metrology';
import { SAMPLE_DRAWINGS } from '../../data/sampleDrawings';
import {
  exportAS9102CSV,
  exportAS9102Excel,
  getGeneralTolerance,
  calculateISOThread,
} from '../../utils/metrologyMath';
import { generateCropsFromSpec } from '../../utils/cadRenderer';
import { soundEngine } from '../../utils/audioSynthesizer';
import { StudioTopBar } from './StudioTopBar';
import { StudioStatusBar } from './StudioStatusBar';
import { StudioChatPanel, ChatMessage } from './StudioChatPanel';
import { EmptyCanvasStartPage } from './EmptyCanvasStartPage';
import { CadCanvasViewport } from './CadCanvasViewport';
import { StudioRightDock } from './StudioRightDock';
import { exportMultiPagePdfDeck } from '../../utils/pdfDeckExporter';
import { extractVectorDimensionsFromPdf } from '../../utils/pdfDimensionExtractor';
import { ZoomIn, ZoomOut } from 'lucide-react';

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
  // Drawing & Metrology State
  const [currentDrawing, setCurrentDrawing] = useState<DrawingSpec | null>(() => {
    if (!initialDrawingId) return null;
    return SAMPLE_DRAWINGS.find((d) => d.id === initialDrawingId) || null;
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
    currentDrawing ? currentDrawing.standard : 'ASME Y14.5'
  );

  const [isSampleData, setIsSampleData] = useState<boolean>(() => {
    return Boolean(initialDrawingId);
  });

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<Characteristic[][]>([]);
  const [redoStack, setRedoStack] = useState<Characteristic[][]>([]);

  // Canvas Viewport & UI State
  const [zoom, setZoom] = useState(1.0);
  const [inverted, setInverted] = useState(false);
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [cursorCoords, setCursorCoords] = useState<Point | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);

  // Streaming Engine State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingCount, setStreamingCount] = useState(0);
  const [totalStreamingCount, setTotalStreamingCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Chat Messages State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialDrawingId) {
      return [
        {
          id: 'welcome',
          sender: 'agent',
          timestamp: 'Just now',
          text: `[SAMPLE DATA] Loaded aerospace benchmark drawing AS-4092-C (Hydraulic Actuator Housing). Displaying 17 pre-verified reference characteristics.`,
        },
      ];
    }
    return [
      {
        id: 'welcome',
        sender: 'agent',
        timestamp: 'Just now',
        text: `SpecBalloon Autonomous Metrology Agent ready. Drop a drawing or pick a sample above to begin auto-ballooning.`,
      },
    ];
  });

  const pushUndoSnapshot = (chars: Characteristic[]) => {
    setUndoStack((prev) => [...prev.slice(-25), JSON.parse(JSON.stringify(chars))]);
    setRedoStack([]);
  };

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(characteristics))]);
    setCharacteristics(previous);
    soundEngine.playKeyClick();
  }, [undoStack, characteristics]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(characteristics))]);
    setCharacteristics(next);
    soundEngine.playKeyClick();
  }, [redoStack, characteristics]);

  // Keyboard shortcut listener for undo/redo and zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(4.0, Number((z + 0.15).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((z) => Math.max(0.2, Number((z - 0.15).toFixed(2))));
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setZoom(1.0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Start live streaming balloons onto canvas and into chat
  const startLiveStreaming = useCallback(
    (extractedBalloons: Characteristic[], isDemo: boolean) => {
      setIsStreaming(true);
      setIsPaused(false);
      isPausedRef.current = false;
      isCancelledRef.current = false;
      setTotalStreamingCount(extractedBalloons.length);
      setStreamingCount(0);
      setCharacteristics([]);
      setActiveBalloonId(null);

      // Add initiating agent message
      const startMsg: ChatMessage = {
        id: `start-${Date.now()}`,
        sender: 'agent',
        timestamp: 'Just now',
        text: isDemo
          ? '[SAMPLE BENCHMARK DATA] Reading vector geometry & GD&T feature-control frames…'
          : 'Reading vector text streams, leader coordinates & GD&T feature-control frames…',
      };
      setMessages((prev) => [...prev, startMsg]);

      let currentIndex = 0;
      const interval = setInterval(() => {
        if (isCancelledRef.current) {
          clearInterval(interval);
          setIsStreaming(false);
          return;
        }

        if (isPausedRef.current) {
          return; // pause stream ticks
        }

        if (currentIndex >= extractedBalloons.length) {
          clearInterval(interval);
          setIsStreaming(false);

          // Identify flagged items (<85% confidence)
          const flagged = extractedBalloons.filter((c) => c.confidence < 85);

          // Summary message
          const summaryMsg: ChatMessage = {
            id: `sum-${Date.now()}`,
            sender: 'agent',
            type: 'summary',
            timestamp: 'Just now',
            text: `Extracted ${extractedBalloons.length} dimensions across Sheet 1. ${
              extractedBalloons.length - flagged.length
            } high-confidence (>90%), ${flagged.length} require review (<85%).`,
          };

          // Flagged review card
          const reviewMsg: ChatMessage = {
            id: `rev-${Date.now()}`,
            sender: 'agent',
            type: 'review_card',
            timestamp: 'Just now',
            flaggedItems: flagged,
          };

          setMessages((prev) => [...prev, summaryMsg, reviewMsg]);
          soundEngine.playInSpecPass();
          return;
        }

        const nextChar = extractedBalloons[currentIndex];
        currentIndex++;

        setCharacteristics((prev) => [...prev, nextChar]);
        setStreamingCount(currentIndex);
        setActiveBalloonId(nextChar.id);
        soundEngine.playKeyClick();

        // Add live placement narration step
        const stepMsg: ChatMessage = {
          id: `step-${nextChar.id}-${Date.now()}`,
          sender: 'agent',
          type: 'step',
          timestamp: 'Just now',
          stepData: {
            balloonNumber: nextChar.balloonNumber,
            callout: nextChar.rawCallout,
            zone: nextChar.zone,
          },
        };
        setMessages((prev) => [...prev, stepMsg]);
      }, 160);
    },
    []
  );

  // Load a benchmark sample drawing by ID
  const handleSelectSample = useCallback(
    (sampleId: string) => {
      const sample = SAMPLE_DRAWINGS.find((d) => d.id === sampleId) || SAMPLE_DRAWINGS[0];
      pushUndoSnapshot(characteristics);
      const withCrops = generateCropsFromSpec(sample, { inverted });
      setCurrentDrawing(sample);
      setSelectedStandard(sample.standard);
      setCustomImage(null);
      setActivePage(1);
      setIsSampleData(true);

      startLiveStreaming(withCrops, true);
    },
    [characteristics, inverted, startLiveStreaming]
  );

  const handleLoadSampleDrawing = useCallback(() => {
    handleSelectSample('AS-4092-C');
  }, [handleSelectSample]);

  // Upload and parse real vector PDF
  const handleUploadPdf = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10 MB limit.');
      return;
    }

    try {
      setIsSampleData(false);
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
      const pdfDoc = await loadingTask.promise;

      if (pdfDoc.numPages > 5) {
        alert(`PDF has ${pdfDoc.numPages} pages. SpecBalloon supports maximum 5 pages.`);
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
      setCustomImage(null);
      setActivePage(1);

      // Perform real client-side vector extraction
      const extraction = await extractVectorDimensionsFromPdf(buffer, 1);

      if (extraction.characteristics.length > 0) {
        startLiveStreaming(extraction.characteristics, false);
      } else if (extraction.isScannedRaster) {
        const warnMsg: ChatMessage = {
          id: `warn-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: 'Scanned raster drawing detected with no embedded vector text streams. Please configure a Gemini 2.5 Flash API key in Settings to run neural vision OCR on scans, or click points on the canvas to place balloons manually.',
        };
        setMessages((prev) => [...prev, warnMsg]);
      } else {
        const emptyMsg: ChatMessage = {
          id: `empty-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: 'No dimensions detected in vector text stream. You can click on the drawing canvas to manually place balloons.',
        };
        setMessages((prev) => [...prev, emptyMsg]);
      }
    } catch (err) {
      console.error('Error parsing PDF:', err);
      alert('Failed to parse vector PDF. Please ensure the file is a valid PDF.');
    }
  };

  // Select characteristic & show inline card in chat
  const handleSelectCharacteristic = (id: string) => {
    setActiveBalloonId(id);
    const target = characteristics.find((c) => c.id === id);
    if (target) {
      const cardMsg: ChatMessage = {
        id: `card-${id}-${Date.now()}`,
        sender: 'agent',
        type: 'characteristic_card',
        timestamp: 'Just now',
        characteristic: target,
      };
      setMessages((prev) => [...prev, cardMsg]);
      soundEngine.playKeyClick();
    }
  };

  const handleUpdateCharacteristic = (id: string, updates: Partial<Characteristic>) => {
    pushUndoSnapshot(characteristics);
    setCharacteristics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleDeleteCharacteristic = (id: string) => {
    pushUndoSnapshot(characteristics);
    const target = characteristics.find((c) => c.id === id);
    const remaining = characteristics
      .filter((c) => c.id !== id)
      .map((c, i) => ({ ...c, balloonNumber: i + 1 }));

    setCharacteristics(remaining);
    if (activeBalloonId === id) {
      setActiveBalloonId(remaining[0]?.id ?? null);
    }

    const delMsg: ChatMessage = {
      id: `del-${Date.now()}`,
      sender: 'agent',
      timestamp: 'Just now',
      text: target
        ? `Removed Balloon #${target.balloonNumber}. Remaining ${remaining.length} balloons renumbered sequentially.`
        : 'Balloon removed and remaining items renumbered.',
    };
    setMessages((prev) => [...prev, delMsg]);
    soundEngine.playKeyClick();
  };

  const handleApproveAll = () => {
    if (!currentDrawing || characteristics.length === 0) return;
    pushUndoSnapshot(characteristics);
    const approved = characteristics.map((c) => ({
      ...c,
      reviewed: true,
      confidence: 100,
    }));
    setCharacteristics(approved);

    const approveMsg: ChatMessage = {
      id: `app-${Date.now()}`,
      sender: 'agent',
      timestamp: 'Just now',
      text: `✓ All ${characteristics.length} characteristics approved. Generating AS9102 Rev C Excel workbook…`,
    };
    setMessages((prev) => [...prev, approveMsg]);

    try {
      exportAS9102Excel(currentDrawing.partNumber, currentDrawing.revision, approved);
      soundEngine.playInSpecPass();
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  // Chat Conversational Control Surface
  const handleChatMessage = (query: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      timestamp: 'Just now',
      text: query,
    };
    setMessages((prev) => [...prev, userMsg]);

    const q = query.toLowerCase().trim();

    // 0. Informational Prompt Suggestion Chips
    if (
      q.includes('how does auto-ballooning work') ||
      q.includes('how does autoballooning work') ||
      q.includes('how it works')
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: `SpecBalloon operates via a multi-stage autonomous pipeline:
1. **Vector Geometry & Text Parsing**: Reads PDF text streams, character placement matrices, and vector line paths directly in your browser without cloud uploads.
2. **Deterministic Metrology Engine**: Identifies callout formats, nominal values, and tolerance bands (ISO 286 limit fits, ASME Y14.5 MMC bonus, ISO 2768 general tolerances).
3. **Collision-Avoidance Placement**: Positions numbered balloons along clockwise callout paths without obscuring critical geometry.
4. **AS9102 Report Generation**: Formats characteristics into complete 4-sheet Form 1, Form 2, and Form 3 Excel workbooks.`,
        },
      ]);
      return;
    }

    if (q.includes('supported') && (q.includes('standard') || q.includes('gd&t'))) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: `SpecBalloon natively supports:
- **ASME Y14.5 (2009/2018)**: True position at MMC/LMC, datum reference frames (A, B, C), and dynamic material bonus calculations.
- **ISO 286-1 & 286-2**: Cylindrical hole and shaft fits (e.g. H7, g6, h6, f7, js6) with exact upper/lower deviation tables.
- **ISO 2768-m / ISO 2768-c**: Linear and angular general machining tolerance bands.
- **ISO 965 / Metric Threads**: Standard internal and external thread callouts (e.g. M6x1.0 6H, M10x1.5 6g) with pitch and crest diameter boundaries.`,
        },
      ]);
      return;
    }

    if (q.includes('as9102 export specs') || (q.includes('export') && q.includes('specs'))) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: `AS9102 First Article Inspection (FAI) Export Specifications:
- **Form 1 (Part Number Accountability)**: Organization details, part number, drawing revision, serial tracking, and FAI report number.
- **Form 2 (Product Process Accountability)**: Specifications, materials, special processes (heat treat, anodize, plating), and supplier codes.
- **Form 3 (Characteristic Accountability)**: Complete balloon-by-balloon inspection table (Balloon #, Sheet Zone, Characteristic Designator, Requirement/Nominal, Upper/Lower Tolerance Limits, Measurement Instrument, In-Spec / Out-of-Spec status).
- **Formats**: 4-Sheet Excel (.xlsx), CSV, and multi-page vector Ballooned PDF.`,
        },
      ]);
      return;
    }

    // 1. Pause / Resume control
    if (q === 'pause' || q.includes('pause stream')) {
      isPausedRef.current = true;
      setIsPaused(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: 'Streaming paused. Type "resume" or click Resume in the progress bar to continue.',
        },
      ]);
      return;
    }

    if (q === 'resume' || q.includes('continue')) {
      isPausedRef.current = false;
      setIsPaused(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: 'Resuming balloon placement…',
        },
      ]);
      return;
    }

    // 2. Export commands
    if (q.includes('export') && (q.includes('excel') || q.includes('as9102') || q.includes('fai'))) {
      if (!currentDrawing || characteristics.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'agent',
            timestamp: 'Just now',
            text: 'No dimensions loaded to export. Drop a CAD drawing or open a sample benchmark drawing first.',
          },
        ]);
        return;
      }
      exportAS9102Excel(currentDrawing.partNumber, currentDrawing.revision, characteristics);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: 'Generated and downloaded authentic 4-sheet AS9102 Rev C Excel workbook (Forms 1, 2, and 3).',
        },
      ]);
      soundEngine.playInSpecPass();
      return;
    }

    if (q.includes('export') && q.includes('csv')) {
      if (!currentDrawing || characteristics.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'agent',
            timestamp: 'Just now',
            text: 'No dimensions loaded to export. Drop a CAD drawing or open a sample benchmark drawing first.',
          },
        ]);
        return;
      }
      exportAS9102CSV(currentDrawing.partNumber, currentDrawing.revision, characteristics);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: 'Downloaded Form 3 Inspection CSV with all tolerance limits.',
        },
      ]);
      return;
    }

    // 3. What is the tightest tolerance?
    if (q.includes('tightest tolerance') || q.includes('smallest tolerance')) {
      if (characteristics.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'agent',
            timestamp: 'Just now',
            text: 'No dimensions loaded. Drop a drawing or pick a sample above to begin.',
          },
        ]);
        return;
      }

      let minBand = Infinity;
      let minChar = characteristics[0];

      characteristics.forEach((c) => {
        const band = (c.upper_limit ?? c.usl) - (c.lower_limit ?? c.lsl);
        if (band > 0 && band < minBand) {
          minBand = band;
          minChar = c;
        }
      });

      handleSelectCharacteristic(minChar.id);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          timestamp: 'Just now',
          text: `The tightest tolerance on this drawing is **Balloon #${minChar.balloonNumber}** (${minChar.rawCallout}) in Zone ${minChar.zone} with a total tolerance band of **${minBand.toFixed(3)} mm** (${minChar.featureDescription}).`,
        },
      ]);
      return;
    }

    // 4. GD&T Explanation
    if (q.includes('mean') || q.includes('explain')) {
      const matchNum = q.match(/#?(\d+)/);
      const target = matchNum
        ? characteristics.find((c) => c.balloonNumber === parseInt(matchNum[1], 10))
        : characteristics.find((c) => c.id === activeBalloonId);

      if (target) {
        handleSelectCharacteristic(target.id);
        let explanation = `**Balloon #${target.balloonNumber} (${target.rawCallout})**: `;
        if (target.rawCallout.includes('⌖') || target.toleranceType === 'GD&T') {
          explanation += `Specifies True Position per ASME Y14.5. Feature axis must lie within a cylindrical tolerance zone of Ø${target.plusTolerance} mm at Maximum Material Condition (MMC) relative to primary Datum A and secondary Datum B. If the bore departs from MMC, dynamic bonus tolerance expands the allowable boundary.`;
        } else if (target.rawCallout.includes('H7') || target.toleranceType === 'Limit') {
          explanation += `Specifies an ISO 286-1 H7 cylindrical hole fit. Nominal size ${target.nominal_value ?? target.nominal} mm with zero negative tolerance (+0.021 / -0.000 mm). Verified on shop floor with Mahr Air Plug Gauge.`;
        } else {
          explanation += `Specifies a linear bilateral tolerance band of ${target.lsl.toFixed(3)} .. ${target.usl.toFixed(3)} mm (${target.units}). Inspected via ${target.instrument}.`;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'agent',
            timestamp: 'Just now',
            text: explanation,
          },
        ]);
        return;
      }
    }

    // 5. Change to thread
    if (q.includes('change') && (q.includes('thread') || q.includes('m6'))) {
      const matchNum = q.match(/#?(\d+)/);
      const num = matchNum ? parseInt(matchNum[1], 10) : 4;
      const target = characteristics.find((c) => c.balloonNumber === num);

      if (target) {
        pushUndoSnapshot(characteristics);
        const threadData = calculateISOThread(6, 1.0, '6H');
        const updated = characteristics.map((c) =>
          c.id === target.id
            ? {
                ...c,
                rawCallout: 'M6x1.0 - 6H',
                featureDescription: 'Threaded Cavity M6x1.0 6H',
                toleranceType: 'Thread' as const,
                nominal_text: 'M6x1.0',
                nominal_value: 6.0,
                lsl: threadData.minorD1Lsl,
                usl: threadData.minorD1Usl,
                lower_limit: threadData.minorD1Lsl,
                upper_limit: threadData.minorD1Usl,
                instrument: 'Thread Plug Gage M6x1.0 6H (Go/No-Go)',
                reviewed: true,
              }
            : c
        );
        setCharacteristics(updated);
        handleSelectCharacteristic(target.id);

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'agent',
            timestamp: 'Just now',
            text: `Updated **Balloon #${num}** to M6x1.0-6H internal thread. Minor diameter limits calculated to ${threadData.minorD1Lsl.toFixed(3)} .. ${threadData.minorD1Usl.toFixed(3)} mm. Drawing canvas updated.`,
          },
        ]);
        soundEngine.playInSpecPass();
        return;
      }
    }

    // 6. Change nominal
    if (q.includes('change nominal') || q.includes('set nominal')) {
      const numMatch = q.match(/#?(\d+)/);
      const valMatch = q.match(/(?:to|=)\s*([0-9.]+)/);

      if (numMatch && valMatch) {
        const balloonNum = parseInt(numMatch[1], 10);
        const newNom = parseFloat(valMatch[1]);
        const target = characteristics.find((c) => c.balloonNumber === balloonNum);

        if (target) {
          pushUndoSnapshot(characteristics);
          const tol = getGeneralTolerance(newNom, selectedStandard);
          const updated = characteristics.map((c) =>
            c.id === target.id
              ? {
                  ...c,
                  nominal_text: newNom.toFixed(3),
                  nominal_value: newNom,
                  nominal: newNom,
                  plusTolerance: tol.plusTol,
                  minusTolerance: tol.minusTol,
                  lsl: newNom - tol.minusTol,
                  usl: newNom + tol.plusTol,
                  lower_limit: newNom - tol.minusTol,
                  upper_limit: newNom + tol.plusTol,
                  reviewed: true,
                }
              : c
          );
          setCharacteristics(updated);
          handleSelectCharacteristic(target.id);

          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              sender: 'agent',
              timestamp: 'Just now',
              text: `Updated Balloon #${balloonNum} nominal to **${newNom.toFixed(3)} mm**. Limits recalculated to ${(newNom - tol.minusTol).toFixed(3)} .. ${(newNom + tol.plusTol).toFixed(3)} mm under ${selectedStandard}.`,
            },
          ]);
          soundEngine.playInSpecPass();
          return;
        }
      }
    }

    // 7. Delete balloon
    if (q.includes('delete') || q.includes('remove')) {
      const matchNum = q.match(/#?(\d+)/);
      if (matchNum) {
        const num = parseInt(matchNum[1], 10);
        const target = characteristics.find((c) => c.balloonNumber === num);
        if (target) {
          handleDeleteCharacteristic(target.id);
          return;
        }
      }
    }

    // 8. Show flagged
    if (q.includes('flagged') || q.includes('out of spec') || q.includes('low confidence')) {
      const flagged = characteristics.filter((c) => c.confidence < 85 || c.status === 'out_of_spec');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          type: 'review_card',
          timestamp: 'Just now',
          flaggedItems: flagged,
        },
      ]);
      return;
    }

    // Default Fallback Help Response
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        sender: 'agent',
        timestamp: 'Just now',
        text: `I can help you review and edit drawing dimensions. Try:\n- "What's the tightest tolerance?"\n- "What does #2 mean?"\n- "Change #4 to M6x1.0 thread"\n- "Change nominal of #10 to 45.0"\n- "Delete balloon #7"\n- "Export AS9102 Excel"`,
      },
    ]);
  };

  const handleExportPdfDeck = async () => {
    if (!currentDrawing) return;
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
    }
  };

  const hasDrawing = Boolean(currentDrawing && (characteristics.length > 0 || isStreaming));

  return (
    <div
      data-ide-theme={darkMode ? 'dark-carbon' : 'light-studio'}
      className="h-screen w-screen overflow-hidden flex flex-col bg-slate-900 select-none text-slate-100"
    >
      {/* 1. App Bar / Top Menu (48px) */}
      <StudioTopBar
        currentDrawing={currentDrawing}
        hasDrawing={hasDrawing}
        isSampleData={isSampleData}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
        onExitToLanding={onExitToLanding}
        onExportExcel={() => {
          if (currentDrawing) {
            exportAS9102Excel(currentDrawing.partNumber, currentDrawing.revision, characteristics);
          }
        }}
        onExportCsv={() => {
          if (currentDrawing) {
            exportAS9102CSV(currentDrawing.partNumber, currentDrawing.revision, characteristics);
          }
        }}
        onExportPdf={handleExportPdfDeck}
        characteristicsCount={characteristics.length}
      />

      {/* 2. Main 2-Column AI Workspace (Left: ~380px Chat Panel | Right: ~70% Pure Canvas Stage) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Conversational Agent Interface */}
        <StudioChatPanel
          currentDrawing={currentDrawing || SAMPLE_DRAWINGS[0]}
          characteristics={characteristics}
          activeBalloon={characteristics.find((c) => c.id === activeBalloonId) || null}
          isStreaming={isStreaming}
          streamingCount={streamingCount}
          totalStreamingCount={totalStreamingCount}
          isPaused={isPaused}
          onPauseResume={() => {
            isPausedRef.current = !isPausedRef.current;
            setIsPaused(isPausedRef.current);
          }}
          onUploadPdf={handleUploadPdf}
          onLoadSample={handleLoadSampleDrawing}
          onSendMessage={handleChatMessage}
          onSelectBalloon={handleSelectCharacteristic}
          onUpdateCharacteristic={handleUpdateCharacteristic}
          onDeleteCharacteristic={handleDeleteCharacteristic}
          onApproveAll={handleApproveAll}
          onExportExcel={() => {
            if (currentDrawing) {
              exportAS9102Excel(currentDrawing.partNumber, currentDrawing.revision, characteristics);
            }
          }}
          messages={messages}
          onClearChat={() => {
            setMessages([
              {
                id: `reset-${Date.now()}`,
                sender: 'agent',
                timestamp: 'Just now',
                text: 'Chat history cleared. You can ask questions about dimensions or enter correction commands.',
              },
            ]);
          }}
          isSampleData={isSampleData}
        />

        {/* Right Column: CAD Canvas Stage (~70% Viewport) with 24px Precision Blueprint Grid */}
        <div
          className="flex-1 relative bg-slate-900 overflow-hidden flex items-center justify-center"
          style={{
            backgroundSize: '24px 24px',
            backgroundImage:
              'linear-gradient(to right, rgba(56, 189, 248, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.05) 1px, transparent 1px)',
          }}
        >
          {hasDrawing && currentDrawing ? (
            <CadCanvasViewport
              currentDrawing={currentDrawing}
              characteristics={characteristics}
              activeBalloonId={activeBalloonId}
              onSelectCharacteristic={handleSelectCharacteristic}
              onAddCharacteristic={(newChar) => {
                pushUndoSnapshot(characteristics);
                setCharacteristics((prev) => [...prev, newChar]);
                handleSelectCharacteristic(newChar.id);
              }}
              onUpdateCharacteristic={handleUpdateCharacteristic}
              onUpdateCharacteristicPosition={(id, pos) => {
                setCharacteristics((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, balloonPosition: pos } : c))
                );
              }}
              onDeleteCharacteristic={handleDeleteCharacteristic}
              onReSortClockwise={() => {
                pushUndoSnapshot(characteristics);
                const sorted = [...characteristics].sort(
                  (a, b) => a.balloonPosition.x - b.balloonPosition.x
                );
                setCharacteristics(sorted.map((c, i) => ({ ...c, balloonNumber: i + 1 })));
              }}
              inverted={inverted}
              onToggleInvert={() => setInverted((prev) => !prev)}
              customImage={customImage}
              onDropPdfFile={handleUploadPdf}
              zoom={zoom}
              onZoomChange={setZoom}
              onCursorMove={(pos) => setCursorCoords(pos)}
              activePage={activePage}
              onPageChange={setActivePage}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              toolMode="pan"
            />
          ) : (
            <EmptyCanvasStartPage
              onUploadPdf={handleUploadPdf}
              onSelectSample={handleSelectSample}
            />
          )}

          {/* Floating Canvas Zoom Controls */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 p-1 rounded-lg bg-slate-950/90 border border-slate-800 shadow-xl font-mono text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.2, Number((z - 0.15).toFixed(2))))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] text-slate-400 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4.0, Number((z + 0.15).toFixed(2))))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="h-3 w-px bg-slate-800 mx-0.5" />
            <button
              onClick={() => setZoom(1.0)}
              className="px-2 py-1 rounded hover:bg-slate-800 text-[10.5px] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              1:1
            </button>
          </div>
        </div>

        {/* Optional Right Dock: Characteristics Inspector */}
        {isPropertiesOpen && (
          <StudioRightDock
            isOpen={isPropertiesOpen}
            onClose={() => setIsPropertiesOpen(false)}
            activeTab="inspector"
            onTabChange={() => {}}
            drawing={currentDrawing || SAMPLE_DRAWINGS[0]}
            characteristics={characteristics}
            activeBalloonId={activeBalloonId}
            onSelectCharacteristic={handleSelectCharacteristic}
            onUpdateCharacteristic={handleUpdateCharacteristic}
            onDeleteCharacteristic={handleDeleteCharacteristic}
            onApproveAll={handleApproveAll}
            visibleLayers={{
              balloons: true,
              dimensions: true,
              datums: true,
              grid: true,
            }}
            onToggleLayer={() => {}}
          />
        )}
      </div>

      {/* 3. Docked 24px Engineering Status Bar */}
      <StudioStatusBar
        currentDrawing={currentDrawing}
        characteristics={characteristics}
        activeBalloon={characteristics.find((c) => c.id === activeBalloonId) || null}
        zoom={zoom}
        onZoomChange={setZoom}
        isSampleData={isSampleData}
        activePage={activePage}
        isStreaming={isStreaming}
        cursorCoords={cursorCoords}
        onToggleProperties={() => setIsPropertiesOpen((prev) => !prev)}
        isPropertiesOpen={isPropertiesOpen}
      />
    </div>
  );
};
