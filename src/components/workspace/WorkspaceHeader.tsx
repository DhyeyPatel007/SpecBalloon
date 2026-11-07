import React, { useRef } from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  FileSpreadsheet,
  Download,
  Image as ImageIcon,
  Columns,
  Upload,
  Move,
  Crop,
  Maximize2,
  MoonStar,
  Sparkles,
  RotateCw,
  RefreshCw,
  Calculator,
  Radio,
  CheckCircle2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { DrawingSpec, GeneralToleranceStandard, InspectionStatus } from '../../types/metrology';

export interface WorkspaceHeaderProps {
  currentDrawing: DrawingSpec;
  drawingsList: DrawingSpec[];
  onSelectDrawing: (drawingId: string) => void;
  onUploadCustom: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedStandard: GeneralToleranceStandard;
  onChangeStandard: (std: GeneralToleranceStandard) => void;
  statusFilter: InspectionStatus | 'all';
  onFilterChange: (status: InspectionStatus | 'all') => void;
  viewMode: 'split' | 'sheet';
  onToggleViewMode: () => void;
  caliperMode: boolean;
  onToggleCaliperMode: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPNG: () => void;
  onExitToLanding: () => void;
  statusCounts: {
    total: number;
    inSpec: number;
    outOfSpec: number;
    needsReview: number;
  };
  toolMode?: 'pan' | 'box_balloon';
  onSetToolMode?: (mode: 'pan' | 'box_balloon') => void;
  onFitSheet?: () => void;
  onToggleInvert?: () => void;
  inverted?: boolean;
  onReSortClockwise?: () => void;
  onAutoBalloonDetect?: () => void;
  onResetBalloons?: () => void;
  onPulseConforming?: () => void;
  onPulseScrap?: () => void;
  onAutoCalcFits?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  currentDrawing,
  drawingsList,
  onSelectDrawing,
  onUploadCustom,
  selectedStandard,
  onChangeStandard,
  viewMode,
  onToggleViewMode,
  caliperMode,
  onToggleCaliperMode,
  darkMode,
  onToggleTheme,
  onExportCSV,
  onExportExcel,
  onExportPNG,
  onExitToLanding,
  statusCounts,
  toolMode = 'pan',
  onSetToolMode,
  onFitSheet,
  onToggleInvert,
  inverted = false,
  onReSortClockwise,
  onAutoBalloonDetect,
  onResetBalloons,
  onPulseConforming,
  onPulseScrap,
  onAutoCalcFits,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <header className="w-full bg-surface border-b border-border-hairline shadow-ribbon select-none z-30 flex flex-col">
      {/* 1. Windows 11 / Office Top Title Bar */}
      <div className="h-9 w-full px-3 bg-subtle/70 border-b border-border-hairline flex items-center justify-between text-xs font-sans">
        {/* Left: Reticle + App Title + Part Information */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExitToLanding}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-text-sec hover:text-text-pri hover:bg-surface border border-transparent hover:border-border-hairline transition-all text-xs font-semibold"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-accent-primary" />
            <span>Landing</span>
          </button>

          <div className="h-4 w-px bg-border-hairline" />

          {/* Precision Reticle Logo */}
          <div className="flex items-center gap-1.5 font-bold text-text-pri">
            <div className="w-4 h-4 rounded-full border-2 border-accent-primary flex items-center justify-center relative">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
            </div>
            <span className="tracking-tight text-xs">SpecBalloon</span>
          </div>

          <div className="h-4 w-px bg-border-hairline" />

          {/* Active Blueprint Meta */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-semibold text-text-pri">{currentDrawing.partNumber}</span>
            <span className="text-text-mut">—</span>
            <span className="text-text-sec truncate max-w-[280px] hidden md:inline">{currentDrawing.partName}</span>
            <span className="px-1.5 py-0.5 rounded bg-surface border border-border-hairline font-mono font-medium text-[11px] text-text-mut">
              {currentDrawing.revision}
            </span>
          </div>
        </div>

        {/* Right: Quick View Switcher & Theme */}
        <div className="flex items-center gap-2">
          {/* Split vs Full Sheet Mode */}
          <button
            onClick={onToggleViewMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
              viewMode === 'sheet'
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-surface text-text-sec border-border-hairline hover:bg-subtle'
            }`}
            title="Toggle between Split View and Full AS9102 Sheet"
          >
            {viewMode === 'sheet' ? (
              <>
                <Columns className="w-3.5 h-3.5" />
                <span>Split View</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-status-pass" />
                <span>AS9102 Sheet View</span>
              </>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border-hairline bg-surface text-text-sec hover:text-text-pri hover:bg-subtle transition-all"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Modern Office Command Ribbon */}
      <div className="min-h-[72px] h-auto w-full px-3 py-1.5 flex flex-wrap items-stretch gap-x-3 gap-y-2 overflow-x-auto text-xs">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.pdf"
          onChange={onUploadCustom}
          className="hidden"
          id="custom-blueprint-upload"
        />

        {/* Ribbon Group 1: File & Blueprint */}
        <div className="flex flex-col justify-between pr-3 border-r border-border-hairline">
          <div className="flex items-center gap-2">
            {/* Blueprint Switcher Dropdown */}
            <div className="flex flex-col">
              <label className="text-[11px] font-medium text-text-mut mb-0.5">Active CAD Blueprint</label>
              <select
                value={currentDrawing.id}
                onChange={(e) => {
                  if (e.target.value === 'upload') {
                    handleUploadClick();
                  } else {
                    onSelectDrawing(e.target.value);
                  }
                }}
                className="h-8 px-2.5 rounded-md border border-border-strong bg-surface text-text-pri font-mono font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary cursor-pointer"
              >
                {drawingsList.map((d) => {
                  const count = d.id === currentDrawing.id ? statusCounts.total : d.characteristics.length;
                  return (
                    <option key={d.id} value={d.id}>
                      {d.partNumber} ({count} DIMS)
                    </option>
                  );
                })}
                <option value="upload">+ Upload Custom CAD Drawing...</option>
              </select>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUploadClick}
              className="mt-4 h-8 px-2.5 rounded-md border border-border-hairline bg-subtle hover:bg-surface text-text-sec hover:text-text-pri flex items-center gap-1.5 transition-all text-xs font-medium"
              title="Upload 2D CAD Image or PDF"
            >
              <FolderOpen className="w-3.5 h-3.5 text-accent-primary" />
              <span>Upload</span>
            </button>
          </div>
          <span className="text-[10px] text-text-mut text-center font-medium mt-1">File</span>
        </div>

        {/* Ribbon Group 2: Canvas Tools */}
        <div className="flex flex-col justify-between px-3 border-r border-border-hairline">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetToolMode && onSetToolMode('pan')}
              className={`ribbon-btn h-12 min-w-[50px] ${toolMode === 'pan' ? 'active' : ''}`}
              title="Pan & Select Tool [V]"
            >
              <Move className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] font-medium">Pan [V]</span>
            </button>

            <button
              onClick={() => onSetToolMode && onSetToolMode('box_balloon')}
              className={`ribbon-btn h-12 min-w-[50px] ${toolMode === 'box_balloon' ? 'active' : ''}`}
              title="Box Balloon Callout Tool [B]"
            >
              <Crop className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] font-medium">Box [B]</span>
            </button>

            <button
              onClick={onFitSheet}
              className="ribbon-btn h-12 min-w-[50px]"
              title="Fit Artboard to Viewport [F]"
            >
              <Maximize2 className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] font-medium">Fit [F]</span>
            </button>

            <button
              onClick={onToggleInvert}
              className={`ribbon-btn h-12 min-w-[50px] ${inverted ? 'active' : ''}`}
              title="Toggle Paper / Carbon Invert [K]"
            >
              <MoonStar className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] font-medium">{inverted ? 'Carbon' : 'Paper'}</span>
            </button>
          </div>
          <span className="text-[10px] text-text-mut text-center font-medium mt-1">Canvas Tools</span>
        </div>

        {/* Ribbon Group 3: AI Auto-Balloon */}
        <div className="flex flex-col justify-between px-3 border-r border-border-hairline">
          <div className="flex items-center gap-1">
            <button
              onClick={onAutoBalloonDetect}
              className="ribbon-btn h-12 min-w-[58px] text-accent-primary hover:bg-accent-primary/10"
              title="Run AI CAD Detection & Auto-Ballooning"
            >
              <Sparkles className="w-4 h-4 mb-0.5 text-accent-primary" />
              <span className="text-[11px] font-semibold text-accent-primary">Detect</span>
            </button>

            <button
              onClick={onReSortClockwise}
              className="ribbon-btn h-12 min-w-[58px]"
              title="Re-number Balloons Clockwise [R]"
            >
              <RotateCw className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] font-medium">Clockwise [R]</span>
            </button>

            <button
              onClick={onResetBalloons}
              className="ribbon-btn h-12 min-w-[52px]"
              title="Reset Balloon Positions to Factory Physics Defaults"
            >
              <RefreshCw className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] font-medium">Reset</span>
            </button>
          </div>
          <span className="text-[10px] text-text-mut text-center font-medium mt-1">AI Auto-Balloon</span>
        </div>

        {/* Ribbon Group 4: Tolerance Math */}
        <div className="flex flex-col justify-between px-3 border-r border-border-hairline">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <label className="text-[11px] font-medium text-text-mut mb-0.5">Tolerance Standard</label>
              <select
                value={selectedStandard}
                onChange={(e) => onChangeStandard(e.target.value as GeneralToleranceStandard)}
                className="h-8 px-2 rounded-md border border-border-strong bg-surface text-text-pri font-mono text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary cursor-pointer"
              >
                <option value="ISO 2768-m">ISO 2768-m (Medium)</option>
                <option value="ISO 2768-f">ISO 2768-f (Fine)</option>
                <option value="ISO 2768-c">ISO 2768-c (Coarse)</option>
                <option value="ASME Y14.5">ASME Y14.5-2018</option>
              </select>
            </div>

            <button
              onClick={onAutoCalcFits}
              className="mt-4 ribbon-btn h-8 px-2.5 flex-row gap-1.5 border border-border-hairline"
              title="Auto-calculate ISO 286 shaft/hole limits"
            >
              <Calculator className="w-3.5 h-3.5 text-accent-primary" />
              <span className="text-[11px] font-medium">Calc Fits</span>
            </button>
          </div>
          <span className="text-[10px] text-text-mut text-center font-medium mt-1">Tolerance Math</span>
        </div>

        {/* Ribbon Group 5: Caliper DRO & Bluetooth */}
        <div className="flex flex-col justify-between px-3 border-r border-border-hairline">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleCaliperMode}
              className={`ribbon-btn h-12 min-w-[64px] ${caliperMode ? 'active' : ''}`}
              title="Toggle Live USB / Bluetooth Digital Caliper DRO Strip"
            >
              <Radio className={`w-4 h-4 mb-0.5 ${caliperMode ? 'text-accent-primary animate-pulse' : ''}`} />
              <span className="text-[11px] font-semibold">{caliperMode ? 'DRO ON' : 'DRO OFF'}</span>
            </button>

            <div className="flex flex-col gap-1">
              <button
                onClick={onPulseConforming}
                className="h-5 px-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-status-pass/40 text-status-pass hover:bg-emerald-100 flex items-center gap-1 text-[11px] font-medium transition-all"
                title="Simulate Passing In-Spec Caliper Reading"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Pulse Pass</span>
              </button>
              <button
                onClick={onPulseScrap}
                className="h-5 px-2 rounded bg-red-50 dark:bg-red-950/40 border border-status-fail/40 text-status-fail hover:bg-red-100 flex items-center gap-1 text-[11px] font-medium transition-all"
                title="Simulate Out-of-Spec Scrap Caliper Reading"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Pulse Scrap</span>
              </button>
            </div>
          </div>
          <span className="text-[10px] text-text-mut text-center font-medium mt-1">Caliper DRO</span>
        </div>

        {/* Ribbon Group 6: Export */}
        <div className="flex flex-col justify-between pl-1">
          <div className="flex items-center gap-1">
            <button
              onClick={onExportExcel}
              className="ribbon-btn h-12 min-w-[56px] text-status-pass hover:bg-status-pass/10"
              title="Export Native Binary AS9102 Form 3 Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 mb-0.5 text-status-pass" />
              <span className="text-[11px] font-semibold text-status-pass">Excel</span>
            </button>

            <button
              onClick={onExportCSV}
              className="ribbon-btn h-12 min-w-[50px]"
              title="Export AS9102 CSV (.csv)"
            >
              <Download className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] font-medium">CSV</span>
            </button>

            <button
              onClick={onExportPNG}
              className="ribbon-btn h-12 min-w-[52px]"
              title="Export Ballooned CAD Drawing (.png)"
            >
              <ImageIcon className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] font-medium">Image</span>
            </button>
          </div>
          <span className="text-[10px] text-text-mut text-center font-medium mt-1">Export</span>
        </div>
      </div>
    </header>
  );
};
