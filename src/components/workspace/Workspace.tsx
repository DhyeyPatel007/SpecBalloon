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
import { WorkspaceHeader } from './WorkspaceHeader';
import { CadCanvasViewport } from './CadCanvasViewport';
import { CharacteristicTape } from './CharacteristicTape';
import { As9102SpreadsheetView } from './As9102SpreadsheetView';
import { CaliperDroStrip } from './CaliperDroStrip';

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

  const [characteristics, setCharacteristics] = useState<Characteristic[]>(
    currentDrawing.characteristics
  );
  const [activeBalloonId, setActiveBalloonId] = useState<number | null>(
    currentDrawing.characteristics[0]?.id ?? null
  );

  const [selectedStandard, setSelectedStandard] = useState<GeneralToleranceStandard>(
    currentDrawing.standard
  );
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'sheet'>('split');
  const [caliperMode, setCaliperMode] = useState(false);
  const [inverted, setInverted] = useState(false);
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);

  // Switch drawing when selector changes
  const handleSelectDrawing = (drawingId: string) => {
    const found = SAMPLE_DRAWINGS.find((d) => d.id === drawingId);
    if (found) {
      setCurrentDrawing(found);
      setCharacteristics(found.characteristics);
      setActiveBalloonId(found.characteristics[0]?.id ?? null);
      setSelectedStandard(found.standard);
      setCustomImage(null);
    }
  };

  // Custom blueprint upload handler
  const handleUploadCustom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCustomImage(img);
        const customSpec: DrawingSpec = {
          id: 'CUSTOM-UPLOAD',
          partNumber: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
          partName: 'User-Uploaded Blueprint',
          revision: 'REV 1.0',
          standard: 'ISO 2768-m',
          drawingWidth: 1200,
          drawingHeight: 800,
          scale: '1:1',
          sheetZoneRows: ['A', 'B', 'C', 'D'],
          sheetZoneCols: ['1', '2', '3', '4', '5', '6', '7', '8'],
          characteristics: [
            {
              id: 1,
              balloonNumber: 1,
              zone: 'B2',
              designator: 'Critical',
              rawCallout: 'Ø30.00 H7',
              featureDescription: 'User Feature #1',
              nominal: 30.0,
              toleranceType: 'Limit',
              plusTolerance: 0.021,
              minusTolerance: 0.0,
              lsl: 30.0,
              usl: 30.021,
              units: 'mm',
              instrument: 'Bore Gauge',
              measuredValue: 30.012,
              lotMeasurements: [30.011, 30.012, 30.014],
              status: 'in_spec',
              confidence: 99.0,
              bbox: { x: 300, y: 300, width: 100, height: 30 },
              balloonPosition: { x: 260, y: 250 },
            },
          ],
        };
        setCurrentDrawing(customSpec);
        setCharacteristics(customSpec.characteristics);
        setActiveBalloonId(1);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Dynamically update untoleranced dimensions on tolerance standard change
  const handleChangeStandard = (newStandard: GeneralToleranceStandard) => {
    setSelectedStandard(newStandard);
    setCharacteristics((prev) =>
      prev.map((c) => {
        if (c.toleranceType === 'Bilateral' && c.rawCallout.includes('ISO 2768')) {
          const { plusTol, minusTol } = getGeneralTolerance(c.nominal, newStandard);
          return {
            ...c,
            plusTolerance: plusTol,
            minusTolerance: minusTol,
            lsl: Number((c.nominal - minusTol).toFixed(4)),
            usl: Number((c.nominal + plusTol).toFixed(4)),
          };
        }
        return c;
      })
    );
  };

  // Add characteristic (e.g. from Shift-drag box ballooning)
  const handleAddCharacteristic = (newChar: Characteristic) => {
    setCharacteristics((prev) => [...prev, newChar]);
  };

  // Update characteristic
  const handleUpdateCharacteristic = (id: number, updates: Partial<Characteristic>) => {
    setCharacteristics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Delete characteristic
  const handleDeleteCharacteristic = (id: number) => {
    setCharacteristics((prev) => prev.filter((c) => c.id !== id));
    if (activeBalloonId === id) {
      const remaining = characteristics.filter((c) => c.id !== id);
      setActiveBalloonId(remaining[0]?.id ?? null);
    }
  };

  // Update balloon position on drag
  const handleUpdatePosition = (id: number, pos: Point) => {
    setCharacteristics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, balloonPosition: pos } : c))
    );
  };

  // Re-sort balloons clockwise around centroid of all coordinates
  const handleSortClockwise = () => {
    if (characteristics.length <= 1) return;

    // Compute centroid
    const cx = characteristics.reduce((sum, c) => sum + c.bbox.x, 0) / characteristics.length;
    const cy = characteristics.reduce((sum, c) => sum + c.bbox.y, 0) / characteristics.length;

    const sorted = [...characteristics].sort((a, b) => {
      const angleA = Math.atan2(a.bbox.y - cy, a.bbox.x - cx);
      const angleB = Math.atan2(b.bbox.y - cy, b.bbox.x - cx);
      return angleA - angleB;
    });

    // Re-assign balloon numbers 1, 2, 3...
    const renumbered = sorted.map((c, idx) => ({
      ...c,
      balloonNumber: idx + 1,
    }));

    setCharacteristics(renumbered);
  };

  // Auto-calculate all ISO 286 fits
  const handleAutoCalculateFits = () => {
    setCharacteristics((prev) =>
      prev.map((c) => {
        if (c.rawCallout.includes('H7') || c.rawCallout.includes('g6') || c.rawCallout.includes('H8')) {
          const fitMatch = c.rawCallout.match(/(H7|G6|H8|H6|JS7)/i);
          const fit = fitMatch ? fitMatch[1] : 'H7';
          const { plusTol, minusTol, instrument } = calculateISO286(c.nominal, fit);
          return {
            ...c,
            plusTolerance: plusTol,
            minusTolerance: minusTol,
            lsl: Number((c.nominal - minusTol).toFixed(4)),
            usl: Number((c.nominal + plusTol).toFixed(4)),
            instrument,
          };
        }
        return c;
      })
    );
  };

  // Fill simulated production lot measurements
  const handleFillSimulatedLot = () => {
    setCharacteristics((prev) =>
      prev.map((c) => {
        const mid = (c.lsl + c.usl) / 2;
        const spread = (c.usl - c.lsl) * 0.3;
        const m1 = Number((mid + (Math.random() * spread - spread / 2)).toFixed(3));
        const m2 = Number((mid + (Math.random() * spread - spread / 2)).toFixed(3));
        const m3 = Number((mid + (Math.random() * spread - spread / 2)).toFixed(3));
        const measured = m2;
        const status = measured >= c.lsl && measured <= c.usl ? 'in_spec' : 'out_of_spec';

        return {
          ...c,
          lotMeasurements: [m1, m2, m3],
          measuredValue: measured,
          status,
        };
      })
    );
  };

  // Caliper DRO measurement injection
  const handleInjectMeasurement = (id: number, val: number) => {
    setCharacteristics((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const isPass = val >= c.lsl && val <= c.usl;
          return {
            ...c,
            measuredValue: val,
            lotMeasurements: [...c.lotMeasurements.slice(-2), val],
            status: isPass ? 'in_spec' : 'out_of_spec',
          };
        }
        return c;
      })
    );
  };

  // Auto-advance to next balloon
  const handleAdvanceToNextBalloon = () => {
    const currentIdx = characteristics.findIndex((c) => c.id === activeBalloonId);
    const nextIdx = (currentIdx + 1) % characteristics.length;
    if (characteristics[nextIdx]) {
      setActiveBalloonId(characteristics[nextIdx].id);
    }
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
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Compute status counts for header
  const statusCounts = {
    total: characteristics.length,
    inSpec: characteristics.filter((c) => c.status === 'in_spec').length,
    outOfSpec: characteristics.filter((c) => c.status === 'out_of_spec').length,
    needsReview: characteristics.filter((c) => c.status === 'needs_review').length,
  };

  const activeChar = characteristics.find((c) => c.id === activeBalloonId) || characteristics[0] || null;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-canvas text-text-pri selection:bg-acc-orange selection:text-white font-sans">
      {/* 1. Top Hardware Bar (44px) */}
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
      />

      {/* 2. Main Workbench Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left 65% Interactive CAD Viewport */}
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
        />

        {/* Right 35% Characteristic Tape */}
        <CharacteristicTape
          characteristics={characteristics}
          activeBalloonId={activeBalloonId}
          onSelectCharacteristic={setActiveBalloonId}
          onUpdateCharacteristic={handleUpdateCharacteristic}
          onDeleteCharacteristic={handleDeleteCharacteristic}
          statusFilter={statusFilter}
        />
      </div>

      {/* 3. Full 14-Column AS9102 Rev C Form 3 / PPAP Spreadsheet View (when viewMode === 'sheet') */}
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
        />
      )}

      {/* 4. Live Shop-Floor USB-HID Digital Caliper DRO Mode (when caliperMode === true) */}
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

