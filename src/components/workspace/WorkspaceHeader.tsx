import React, { useRef } from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  FileSpreadsheet,
  Download,
  FileText,
  Columns,
  FolderOpen,
  Move,
  Crop,
  Maximize2,
  MoonStar,
  Sparkles,
  RotateCw,
  RefreshCw,
  Calculator,
  Radio,
  Server,
  Grid,
  CheckCircle2,
  Sliders,
  ChevronDown,
  GitCompare,
  Play,
  Cpu,
  BookOpen,
  Zap
} from 'lucide-react';
import { DrawingSpec, GeneralToleranceStandard, InspectionStatus } from '../../types/metrology';

export interface WorkspaceHeaderProps {
  currentDrawing: DrawingSpec;
  drawingsList: DrawingSpec[];
  onSelectDrawing: (drawingId: string) => void;
  onUploadPdf: (file: File) => void;
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
  onExportBalloonedPdf: () => void;
  onExportPdfDeck?: () => void;
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
  onAutoCalcFits?: () => void;
  onApproveAll?: () => void;
  backendConnected?: boolean;
  isExtracting?: boolean;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  onOpenGeminiModal?: () => void;
  isRevisionDiffMode?: boolean;
  onToggleRevisionDiff?: () => void;
  onOpenCmmImport?: () => void;
  onStartTour?: () => void;
  onSimulateCaliperBurst?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  currentDrawing,
  drawingsList,
  onSelectDrawing,
  onUploadPdf,
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
  onExportBalloonedPdf,
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
  onAutoCalcFits,
  onApproveAll,
  backendConnected = true,
  isExtracting = false,
  showGrid = true,
  onToggleGrid,
  onOpenGeminiModal,
  isRevisionDiffMode = false,
  onToggleRevisionDiff,
  onOpenCmmImport,
  onStartTour,
  onExportPdfDeck,
  onSimulateCaliperBurst,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only vector PDF files are accepted.');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('PDF file size exceeds 10 MB limit.');
      e.target.value = '';
      return;
    }

    onUploadPdf(file);
    e.target.value = '';
  };

  return (
    <header className="w-full bg-surface border-b border-border-hairline shadow-ribbon select-none z-30 flex flex-col flex-shrink-0">
      {/* 1. Top Title Bar (h-9 / 36px) */}
      <div className="h-9 w-full px-3 bg-subtle/70 border-b border-border-hairline flex items-center justify-between text-xs font-sans">
        {/* Left: Landing back button + Logo + Blueprint Metadata + Permanent Engine Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExitToLanding}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border-hairline transition-all text-xs font-semibold"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-accent-primary" />
            <span>Landing</span>
          </button>

          <div className="h-4 w-px bg-border-hairline" />

          {/* Logo */}
          <div className="flex items-center gap-1.5 font-bold text-text-primary">
            <div className="w-4 h-4 rounded-full border-2 border-accent-primary flex items-center justify-center relative">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
            </div>
            <span className="tracking-tight text-xs">SpecBalloon IDE</span>
          </div>

          <div className="h-4 w-px bg-border-hairline" />

          {/* Blueprint Metadata */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold text-text-primary">{currentDrawing.partNumber}</span>
            <span className="text-text-muted">—</span>
            <span className="text-text-secondary truncate max-w-[200px] hidden md:inline">{currentDrawing.partName}</span>
            <span className="px-1.5 py-0.5 rounded bg-surface border border-border-hairline font-mono font-semibold text-[11px] text-text-muted">
              {currentDrawing.revision}
            </span>
          </div>

          <div className="h-4 w-px bg-border-hairline hidden sm:block" />

          {/* Permanent Required Status Badge: 🟢 Engine Ready · 300 DPI Vector + OCR */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[11px] font-mono font-semibold text-status-pass">
            <span className="w-2 h-2 rounded-full bg-status-pass animate-pulse" />
            <span>Engine Ready · 300 DPI Vector + OCR</span>
          </div>

          {/* Pill Button: [✨ Gemini 2.5 Vision: Active ⚙] */}
          {onOpenGeminiModal && (
            <button
              onClick={onOpenGeminiModal}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-[11px] font-mono font-semibold text-accent-primary transition-all shadow-xs cursor-pointer"
              title="Open Gemini 2.5 Flash Vision AI Pipeline Controls & API Key"
            >
              <Sparkles className="w-3 h-3 text-accent-primary animate-pulse" />
              <span>Gemini 2.5 Vision: Active ⚙</span>
            </button>
          )}
        </div>

        {/* Right: View Switcher, Tour, Caliper Wedge & Theme */}
        <div className="flex items-center gap-2">
          {/* Hackathon Judge 45s Guided Product Tour */}
          {onStartTour && (
            <button
              type="button"
              onClick={onStartTour}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs text-xs font-bold transition-all cursor-pointer border border-blue-400/40"
              title="Run 45s Interactive Metrology Tour for Hackathon Judges"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>▶ Interactive Tour</span>
              <span className="px-1 py-0.2 rounded bg-white/20 text-[9px] font-mono tracking-tight hidden sm:inline">
                45s Demo
              </span>
            </button>
          )}

          {/* Caliper Wedge Status / Test Trigger */}
          {onSimulateCaliperBurst && (
            <button
              type="button"
              onClick={onSimulateCaliperBurst}
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-mono font-medium transition-all cursor-pointer"
              title="Test hardware USB-HID digital caliper burst (simulates Mitutoyo keyboard wedge)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>⚡ Test USB Caliper</span>
            </button>
          )}

          <div className="h-4 w-px bg-border-hairline hidden sm:block" />

          <button
            onClick={onToggleViewMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
              viewMode === 'sheet'
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-surface text-text-secondary border-border-hairline hover:bg-subtle'
            }`}
            title="Toggle between Split View and Full AS9102 Sheet View"
          >
            {viewMode === 'sheet' ? (
              <>
                <Columns className="w-3.5 h-3.5" />
                <span>Split View</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-status-pass" />
                <span>Full Sheet View</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border-hairline bg-surface text-text-secondary hover:text-text-primary hover:bg-subtle transition-all"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Modern Single-Row Non-Wrapping Ribbon */}
      <div className="h-[64px] w-full px-3 py-1 flex items-center gap-x-2 overflow-x-auto whitespace-nowrap text-xs">
        {/* Hidden PDF File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          id="custom-pdf-upload"
        />

        {/* Group 1: Blueprint File */}
        <div className="flex flex-col justify-between pr-2.5 border-r border-border-hairline h-full flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <select
              value={currentDrawing.id}
              onChange={(e) => {
                if (e.target.value === 'upload') {
                  handleUploadClick();
                } else {
                  onSelectDrawing(e.target.value);
                }
              }}
              className="h-8 px-2 rounded-md border border-border-strong bg-surface text-text-primary font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary cursor-pointer max-w-[180px]"
            >
              {drawingsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.partNumber} ({d.id === currentDrawing.id ? statusCounts.total : d.characteristics.length} Dims)
                </option>
              ))}
              <option value="upload">+ Upload Vector PDF...</option>
            </select>

            <button
              onClick={handleUploadClick}
              className="h-8 px-2.5 rounded-md border border-border-hairline bg-subtle hover:bg-surface text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-all text-xs font-medium"
              title="Upload Vector PDF (max 10 MB, max 5 pages)"
            >
              <FolderOpen className="w-3.5 h-3.5 text-accent-primary" />
              <span>Attach PDF</span>
            </button>
          </div>
          <span className="text-[10px] text-text-muted text-center font-medium">Drawing File</span>
        </div>

        {/* Group 2: Canvas Tools */}
        <div className="flex flex-col justify-between px-2.5 border-r border-border-hairline h-full flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetToolMode && onSetToolMode('pan')}
              className={`ribbon-btn h-8 min-w-[50px] ${toolMode === 'pan' ? 'active' : ''}`}
              title="Pan Tool [V]"
            >
              <div className="flex items-center gap-1">
                <Move className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Pan [V]</span>
              </div>
            </button>

            <button
              onClick={() => onSetToolMode && onSetToolMode('box_balloon')}
              className={`ribbon-btn h-8 min-w-[50px] ${toolMode === 'box_balloon' ? 'active' : ''}`}
              title="Capture Zone / Box Balloon [B]"
            >
              <div className="flex items-center gap-1">
                <Crop className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Box [B]</span>
              </div>
            </button>

            <button
              onClick={onFitSheet}
              className="ribbon-btn h-8 min-w-[45px]"
              title="Fit Viewport [F]"
            >
              <div className="flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Fit</span>
              </div>
            </button>

            <button
              onClick={onToggleInvert}
              className={`ribbon-btn h-8 min-w-[55px] ${inverted ? 'active' : ''}`}
              title="Toggle Paper / Carbon [K]"
            >
              <div className="flex items-center gap-1">
                <MoonStar className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">{inverted ? 'Carbon' : 'Paper'}</span>
              </div>
            </button>

            {onToggleGrid && (
              <button
                onClick={onToggleGrid}
                className={`ribbon-btn h-8 min-w-[45px] ${showGrid ? 'active' : ''}`}
                title="Toggle Drawing Grid"
              >
                <div className="flex items-center gap-1">
                  <Grid className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">Grid</span>
                </div>
              </button>
            )}
          </div>
          <span className="text-[10px] text-text-muted text-center font-medium">Canvas & View</span>
        </div>

        {/* Group 3: Metrology & Auto-Balloon Engine */}
        <div className="flex flex-col justify-between px-2.5 border-r border-border-hairline h-full flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <select
              value={selectedStandard}
              onChange={(e) => onChangeStandard(e.target.value as GeneralToleranceStandard)}
              className="h-8 px-2 rounded-md border border-border-strong bg-surface text-text-primary font-mono text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-accent-primary cursor-pointer"
              title="General Tolerance Standard"
            >
              <option value="ASME Y14.5">ASME Y14.5 (GD&T)</option>
              <option value="ISO 2768-m">ISO 2768-m (Medium)</option>
              <option value="ISO 2768-f">ISO 2768-f (Fine)</option>
              <option value="ISO 2768-c">ISO 2768-c (Coarse)</option>
            </select>

            <button
              onClick={onAutoBalloonDetect}
              disabled={isExtracting}
              className="h-8 px-3 rounded-md bg-accent-primary hover:bg-accent-primary/90 text-white flex items-center gap-1.5 transition-all text-xs font-semibold shadow-xs"
              title="Auto Detect Dimensions & Balloons"
            >
              {isExtracting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{isExtracting ? 'Extracting...' : 'Auto Detect'}</span>
            </button>

            <button
              onClick={onAutoCalcFits}
              className="h-8 px-2.5 rounded-md border border-border-hairline bg-subtle hover:bg-surface text-text-secondary hover:text-text-primary flex items-center gap-1 transition-all text-xs font-medium"
              title="Calculate ISO 286 Fits & Limits"
            >
              <Calculator className="w-3.5 h-3.5 text-accent-primary" />
              <span>Fits Math</span>
            </button>

            {onToggleRevisionDiff && (
              <button
                type="button"
                onClick={onToggleRevisionDiff}
                className={`h-8 px-2.5 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                  isRevisionDiffMode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-subtle hover:bg-surface text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800'
                }`}
                title="Compare Baseline (Rev B) against Rev C without renumbering Tag IDs"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>{isRevisionDiffMode ? '🔀 Diff Mode: ON' : '🔀 Update Rev (B→C)'}</span>
              </button>
            )}

            {onApproveAll && (
              <button
                onClick={onApproveAll}
                className="h-8 px-2.5 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-status-pass hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center gap-1 transition-all text-xs font-semibold"
                title="Approve All Characteristics"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve All</span>
              </button>
            )}

            {onOpenCmmImport && (
              <button
                type="button"
                onClick={onOpenCmmImport}
                className="h-8 px-2.5 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-accent-primary hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center gap-1 transition-all text-xs font-semibold cursor-pointer"
                title="Import CMM coordinate run (ZEISS Calypso / Hexagon PC-DMIS) and calculate true position error"
              >
                <Cpu className="w-3.5 h-3.5 text-accent-primary" />
                <span>📥 Import CMM</span>
              </button>
            )}
          </div>
          <span className="text-[10px] text-text-muted text-center font-medium">Metrology & Auto-Balloon</span>
        </div>

        {/* Group 4: Exports */}
        <div className="flex flex-col justify-between pl-2.5 h-full flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onExportExcel}
              className="h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all text-xs font-semibold shadow-xs cursor-pointer"
              title="Export 4-Sheet AS9102 Rev C Excel Suite (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel AS9102</span>
            </button>

            {onExportPdfDeck && (
              <button
                onClick={onExportPdfDeck}
                className="h-8 px-2.5 rounded-md border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center gap-1.5 transition-all text-xs font-semibold shadow-xs cursor-pointer"
                title="Export 2-Page AS9102 Printable PDF Inspection Deck with Mobile QR Deep-Link Traveler"
              >
                <BookOpen className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>📕 PDF Deck</span>
              </button>
            )}

            <button
              onClick={onExportBalloonedPdf}
              className="h-8 px-2.5 rounded-md border border-border-hairline bg-subtle hover:bg-surface text-text-secondary hover:text-text-primary flex items-center gap-1 transition-all text-xs font-medium cursor-pointer"
              title="Export Ballooned CAD PDF"
            >
              <Download className="w-3.5 h-3.5 text-accent-primary" />
              <span>Ballooned PDF</span>
            </button>

            <button
              onClick={onExportCSV}
              className="h-8 px-2 rounded-md border border-border-hairline bg-subtle hover:bg-surface text-text-secondary hover:text-text-primary flex items-center gap-1 transition-all text-xs font-medium cursor-pointer"
              title="Export CSV"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
          <span className="text-[10px] text-text-muted text-center font-medium">Export Formats</span>
        </div>
      </div>
    </header>
  );
};
