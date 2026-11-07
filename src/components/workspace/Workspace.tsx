import React, { useState, useEffect, useCallback } from 'react';
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
  calculateISO286
} from '../../utils/metrologyMath';
import { generateCropsFromSpec } from '../../utils/cadRenderer';
import { preloadImage, BLUEPRINT_ASSET_MAP } from '../../utils/assetLoader';
import { soundEngine } from '../../utils/audioSynthesizer';
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

  // Pre-generate offscreen visual crops immediately on init
  const [characteristics, setCharacteristics] = useState<Characteristic[]>(() => {
    const raw = SAMPLE_DRAWINGS.find((d) => d.id === initialDrawingId) || SAMPLE_DRAWINGS[0];
    return generateCropsFromSpec(raw);
  });

  const [activeBalloonId, setActiveBalloonId] = useState<number | null>(() => {
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
  const [undoSnapshot, setUndoSnapshot] = useState<Characteristic[] | null>(null);

  // Tools & Viewport state
  const [toolMode, setToolMode] = useState<'pan' | 'box_balloon'>('pan');
  const [zoom, setZoom] = useState(1.0);
  const [cursorPos, setCursorPos] = useState<Point>({ x: 420, y: 310 });
  const [sheetZone, setSheetZone] = useState('B2');
  const [isBottomDrawerExpanded, setIsBottomDrawerExpanded] = useState(false);

  // Preload asset for current drawing
  useEffect(() => {
    if (BLUEPRINT_ASSET_MAP[currentDrawing.id]) {
      preloadImage(BLUEPRINT_ASSET_MAP[currentDrawing.id]);
    }
  }, [currentDrawing.id]);

  // Switch drawing when selector changes
  const handleSelectDrawing = (drawingId: string) => {
    const found = SAMPLE_DRAWINGS.find((d) => d.id === drawingId);
    if (found) {
      const withCrops = generateCropsFromSpec(found, { inverted });
      setCurrentDrawing(found);
      setCharacteristics(withCrops);
      setActiveBalloonId(withCrops[0]?.id ?? null);
      setSelectedStandard(found.standard);
      setCustomImage(null);
      setUndoSnapshot(null);
    }
  };

  // Custom blueprint upload handler
  const handleUploadCustom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadLocalFile(file);
  };

  const handleDropImageFile = (file: File) => {
    loadLocalFile(file);
  };

  const loadLocalFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCustomImage(img);
        const customSpec: DrawingSpec = {
          id: 'CUSTOM-' + Date.now(),
          partNumber: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
          partName: 'User-Uploaded Blueprint',
          revision: 'REV 1.0',
          standard: selectedStandard,
          drawingWidth: 1600,
          drawingHeight: 1100,
          scale: '1:1',
          sheetZoneRows: ['A', 'B', 'C', 'D'],
          sheetZoneCols: ['1', '2', '3', '4', '5', '6', '7', '8'],
          characteristics: [
            {
              id: 1,
              balloonNumber: 1,
              zone: 'B2',
              designator: 'Critical',
              rawCallout: 'Ø25.000 ±0.020',
              featureDescription: 'Primary Feature Diameter',
              nominal: 25.000,
              toleranceType: 'Bilateral',
              plusTolerance: 0.020,
              minusTolerance: 0.020,
              lsl: 24.980,
              usl: 25.020,
              units: 'mm',
              instrument: 'Mitutoyo Digital Caliper',
              measuredValue: 25.004,
              lotMeasurements: [25.002, 25.004, 25.005],
              status: 'in_spec',
              confidence: 99.1,
              bbox: { x: 380, y: 280, width: 140, height: 36 },
              balloonPosition: { x: 340, y: 230 }
            }
          ]
        };

        const withCrops = generateCropsFromSpec(customSpec, { inverted, customImage: img });
        setCurrentDrawing(customSpec);
        setCharacteristics(withCrops);
        setActiveBalloonId(withCrops[0]?.id ?? null);
        setUndoSnapshot(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Characteristic updates
  const handleUpdateCharacteristic = (id: number, updates: Partial<Characteristic>) => {
    setCharacteristics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleAddCharacteristic = (newChar: Characteristic) => {
    setCharacteristics((prev) => [...prev, newChar]);
  };

  const handleDeleteCharacteristic = (id: number) => {
    setCharacteristics((prev) => prev.filter((c) => c.id !== id));
    if (activeBalloonId === id) {
      const remaining = characteristics.filter((c) => c.id !== id);
      setActiveBalloonId(remaining[0]?.id ?? null);
    }
  };

  const handleUpdatePosition = (id: number, pos: Point) => {
    setCharacteristics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, balloonPosition: pos } : c))
    );
  };

  // Re-sort balloon numbers clockwise around drawing center
  const handleSortClockwise = useCallback(() => {
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

  // AI Auto-Balloon Detection simulation
  const handleAutoBalloonDetect = () => {
    soundEngine.playInSpecPass();
    const sorted = [...characteristics].map((c, idx) => ({
      ...c,
      balloonNumber: idx + 1,
      confidence: 99.2
    }));
    setCharacteristics(sorted);
  };

  // Reset balloon positions
  const handleResetBalloons = () => {
    const defaultRaw = SAMPLE_DRAWINGS.find((d) => d.id === currentDrawing.id);
    if (defaultRaw) {
      setCharacteristics(generateCropsFromSpec(defaultRaw, { inverted, customImage }));
      soundEngine.playKeyClick();
    }
  };

  // Auto-calculate fits
  const handleAutoCalculateFits = () => {
    setUndoSnapshot([...characteristics]);
    const updated = characteristics.map((char) => {
      let plus = char.plusTolerance;
      let minus = char.minusTolerance;
      let inst = char.instrument;

      if (char.rawCallout.includes('H7') || char.rawCallout.includes('g6')) {
        const fit = char.rawCallout.includes('H7') ? 'H7' : 'g6';
        const iso = calculateISO286(char.nominal, fit);
        plus = iso.plusTol;
        minus = iso.minusTol;
        inst = iso.instrument;
      } else if (char.isGeneralTol) {
        const gen = getGeneralTolerance(char.nominal, selectedStandard);
        plus = gen.plusTol;
        minus = gen.minusTol;
      }

      const lsl = char.toleranceType === 'GD&T' || char.toleranceType === 'Surface' ? 0.000 : Number((char.nominal - minus).toFixed(4));
      const usl = char.toleranceType === 'GD&T' || char.toleranceType === 'Surface' ? Number(plus.toFixed(4)) : Number((char.nominal + plus).toFixed(4));

      return {
        ...char,
        plusTolerance: plus,
        minusTolerance: minus,
        lsl,
        usl,
        instrument: inst
      };
    });

    setCharacteristics(updated);
    soundEngine.playInSpecPass();
  };

  // Change tolerance standard
  const handleChangeStandard = (std: GeneralToleranceStandard) => {
    setSelectedStandard(std);
    handleAutoCalculateFits();
  };

  // Fill simulated lot
  const handleFillSimulatedLot = () => {
    setUndoSnapshot([...characteristics]);
    const populated = characteristics.map((char) => {
      const spread = (char.usl - char.lsl) * 0.3;
      const mid = (char.lsl + char.usl) / 2;
      const m1 = Number((mid + (Math.random() * spread - spread / 2)).toFixed(3));
      const m2 = Number((mid + (Math.random() * spread - spread / 2)).toFixed(3));
      const m3 = Number((mid + (Math.random() * spread - spread / 2)).toFixed(3));
      return {
        ...char,
        lotMeasurements: [m1, m2, m3],
        measuredValue: m2,
        status: 'in_spec' as InspectionStatus
      };
    });
    setCharacteristics(populated);
    soundEngine.playInSpecPass();
  };

  const handleUndoBulkAction = () => {
    if (undoSnapshot) {
      setCharacteristics(undoSnapshot);
      setUndoSnapshot(null);
      soundEngine.playKeyClick();
    }
  };

  // Live Caliper DRO injections
  const handleInjectMeasurement = (id: number, val: number) => {
    setCharacteristics((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const isPass = val >= c.lsl && val <= c.usl;
          if (isPass) {
            soundEngine.playInSpecPass();
          } else {
            soundEngine.playOutOfSpecScrap();
          }
          return {
            ...c,
            measuredValue: val,
            status: isPass ? 'in_spec' : 'out_of_spec'
          };
        }
        return c;
      })
    );
  };

  const handleAdvanceToNextBalloon = () => {
    const currentIdx = characteristics.findIndex((c) => c.id === activeBalloonId);
    const nextIdx = (currentIdx + 1) % characteristics.length;
    if (characteristics[nextIdx]) {
      setActiveBalloonId(characteristics[nextIdx].id);
    }
  };

  // Pulse Conforming & Scrap from Ribbon
  const handlePulseConforming = () => {
    if (!activeChar) return;
    const mid = (activeChar.lsl + activeChar.usl) / 2;
    const spread = (activeChar.usl - activeChar.lsl) * 0.3;
    const val = Number((mid + (Math.random() * spread - spread / 2)).toFixed(3));
    handleInjectMeasurement(activeChar.id, val);
  };

  const handlePulseScrap = () => {
    if (!activeChar) return;
    const val = Number((activeChar.usl + 0.025).toFixed(3));
    handleInjectMeasurement(activeChar.id, val);
  };

  // Exports
  const handleExportCSV = () => {
    exportAS9102CSV(currentDrawing.partNumber, currentDrawing.revision, characteristics);
  };

  const handleExportExcel = () => {
    exportAS9102Excel(currentDrawing.partNumber, currentDrawing.revision, characteristics);
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `SpecBalloon_${currentDrawing.partNumber}_Ballooned.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Keyboard shortcut listener for view toggle (Cmd/Ctrl + \) and Invert (K)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
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
  }, [handleSortClockwise]);

  // Compute status counts for header
  const statusCounts = {
    total: characteristics.length,
    inSpec: characteristics.filter((c) => c.status === 'in_spec').length,
    outOfSpec: characteristics.filter((c) => c.status === 'out_of_spec').length,
    needsReview: characteristics.filter((c) => c.status === 'needs_review').length,
  };

  const activeChar = characteristics.find((c) => c.id === activeBalloonId) || characteristics[0] || null;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-page text-text-pri selection:bg-accent-primary selection:text-white font-sans">
      {/* 1. Top Windows 11 / Modern Office Command Ribbon */}
      <WorkspaceHeader
        currentDrawing={currentDrawing}
        drawingsList={SAMPLE_DRAWINGS}
        onSelectDrawing={handleSelectDrawing}
        onUploadCustom={handleUploadCustom}
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
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onExportPNG={handleExportPNG}
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
        onPulseConforming={handlePulseConforming}
        onPulseScrap={handlePulseScrap}
        onAutoCalcFits={handleAutoCalculateFits}
      />

      {/* 2. Main Workbench Area: Canvas Viewport + Right Inspector Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Interactive CAD Viewport with Centered Artboard and Rulers */}
        <div className="flex-1 h-full flex flex-col relative overflow-hidden">
          <CadCanvasViewport
            currentDrawing={currentDrawing}
            characteristics={characteristics}
            activeBalloonId={activeBalloonId}
            onSelectCharacteristic={setActiveBalloonId}
            onAddCharacteristic={handleAddCharacteristic}
            onUpdateCharacteristicPosition={handleUpdatePosition}
            onReSortClockwise={handleSortClockwise}
            inverted={inverted}
            onToggleInvert={() => setInverted(!inverted)}
            customImage={customImage}
            onDropImageFile={handleDropImageFile}
            toolMode={toolMode}
            onSetToolMode={setToolMode}
            zoom={zoom}
            onZoomChange={setZoom}
            onCursorMove={(pos, zone) => {
              setCursorPos(pos);
              setSheetZone(zone);
            }}
          />

          {/* Collapsible Bottom Excel Sheet Bar (docked above MS Paint status bar) */}
          <As9102SpreadsheetView
            drawing={currentDrawing}
            characteristics={characteristics}
            onUpdateCharacteristic={handleUpdateCharacteristic}
            onAutoCalculateFits={handleAutoCalculateFits}
            onSortClockwise={handleSortClockwise}
            onFillSimulatedLot={handleFillSimulatedLot}
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onUndoBulkAction={handleUndoBulkAction}
            canUndo={undoSnapshot !== null}
            isDrawer={true}
            isExpanded={isBottomDrawerExpanded}
            onToggleExpand={() => setIsBottomDrawerExpanded(!isBottomDrawerExpanded)}
          />
        </div>

        {/* Right Visual-Crop & Characteristic Inspector Sidebar */}
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
            ? `#${activeChar.balloonNumber < 10 ? `0${activeChar.balloonNumber}` : activeChar.balloonNumber} (${activeChar.featureDescription})`
            : null
        }
        statusCounts={statusCounts}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(1.0)}
      />

      {/* 4. Full 14-Column AS9102 Rev C Form 3 / PPAP Spreadsheet View (when viewMode === 'sheet') */}
      {viewMode === 'sheet' && (
        <As9102SpreadsheetView
          drawing={currentDrawing}
          characteristics={characteristics}
          onUpdateCharacteristic={handleUpdateCharacteristic}
          onAutoCalculateFits={handleAutoCalculateFits}
          onSortClockwise={handleSortClockwise}
          onFillSimulatedLot={handleFillSimulatedLot}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          onCloseSheetView={() => setViewMode('split')}
          onUndoBulkAction={handleUndoBulkAction}
          canUndo={undoSnapshot !== null}
          isDrawer={false}
        />
      )}

      {/* 5. Live Shop-Floor USB-HID Digital Caliper DRO Overlay (when caliperMode === true) */}
      {caliperMode && (
        <CaliperDroStrip
          activeCharacteristic={activeChar}
          onInjectMeasurement={handleInjectMeasurement}
          onAdvanceToNextBalloon={handleAdvanceToNextBalloon}
          onClose={() => setCaliperMode(false)}
        />
      )}
    </div>
  );
};
