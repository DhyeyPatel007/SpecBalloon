import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  FolderOpen,
  Move,
  Crop,
  Maximize2,
  Sparkles,
  RotateCw,
  RefreshCw,
  Calculator,
  Grid,
  CheckCircle2,
  ChevronDown,
  GitCompare,
  Play,
  Cpu,
  FileSpreadsheet,
  FileText,
  BookOpen,
  Download,
  Columns,
  Radio,
  SlidersHorizontal,
  FileCode2,
  History
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
  onOpenAuditLog?: () => void;
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
  onExportPdfDeck,
  onExitToLanding,
  statusCounts,
  toolMode = 'pan',
  onSetToolMode,
  onFitSheet,
  onToggleInvert,
  inverted = false,
  onReSortClockwise,
  onAutoBalloonDetect,
  onAutoCalcFits,
  onApproveAll,
  isExtracting = false,
  showGrid = true,
  onToggleGrid,
  onOpenGeminiModal,
  isRevisionDiffMode = false,
  onToggleRevisionDiff,
  onOpenCmmImport,
  onStartTour,
  onSimulateCaliperBurst,
  onOpenAuditLog
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="w-full bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] select-none z-30 flex flex-col flex-shrink-0">
      {/* Hidden PDF File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* =========================================================================
          ROW 1: Primary App Header (40px / h-10) - Pure Swiss Minimalism
          ========================================================================= */}
      <div className="h-10 w-full px-3 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] flex items-center justify-between text-xs font-sans">
        {/* Left Section */}
        <div className="flex items-center gap-2.5">
          {/* Exit to Overview */}
          <button
            onClick={onExitToLanding}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors text-xs font-medium"
            title="Return to Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Overview</span>
          </button>

          <div className="h-3.5 w-px bg-[var(--border-hairline)]" />

          {/* Part Selector */}
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
              className="h-7 px-2 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono text-xs font-semibold focus:outline-none focus:border-[var(--border-strong)] cursor-pointer max-w-[180px]"
            >
              {drawingsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.partNumber} ({d.id === currentDrawing.id ? statusCounts.total : d.characteristics.length} Dims)
                </option>
              ))}
              <option value="upload">+ Open Custom PDF...</option>
            </select>

            {/* Revision Tag */}
            <span className="px-1.5 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] font-mono text-[11px] text-[var(--text-secondary)] font-semibold">
              {currentDrawing.revision}
            </span>
          </div>

          <div className="h-3.5 w-px bg-[var(--border-hairline)] hidden sm:block" />

          {/* Segmented Workspace Mode Selector */}
          <div className="hidden md:inline-flex p-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <button
              onClick={() => {
                if (isRevisionDiffMode && onToggleRevisionDiff) onToggleRevisionDiff();
              }}
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                !isRevisionDiffMode
                  ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Standard IDE
            </button>

            {onToggleRevisionDiff && (
              <button
                onClick={onToggleRevisionDiff}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                  isRevisionDiffMode
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Revision Diff & Delta-Lock (Rev B → C)"
              >
                <GitCompare className="w-3 h-3 stroke-[1.5]" />
                <span>Revision Diff</span>
              </button>
            )}

            {onStartTour && (
              <button
                onClick={onStartTour}
                className="px-2 py-0.5 rounded text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                title="Launch 45s Guided Product Tour"
              >
                <Play className="w-2.5 h-2.5 stroke-[1.5]" />
                <span>45s Tour</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Gemini AI Vision Pill (Quiet Monochrome with Active Dot) */}
          {onOpenGeminiModal && (
            <button
              onClick={onOpenGeminiModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-mono transition-colors"
              title="Configure Google Gemini 2.5 Flash Vision AI Pipeline"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Gemini 2.5 Vision: Ready</span>
            </button>
          )}

          {/* Audit Log Trigger */}
          {onOpenAuditLog && (
            <button
              onClick={onOpenAuditLog}
              className="hidden lg:flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-mono transition-colors"
              title="View 21 CFR Part 11 SHA-256 Audit Trail"
            >
              <History className="w-3 h-3 stroke-[1.5]" />
              <span>Audit Log</span>
            </button>
          )}

          {/* View Split / Sheet Toggle */}
          <button
            onClick={onToggleViewMode}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-hairline)] text-[11px] font-mono transition-colors ${
              viewMode === 'sheet'
                ? 'bg-[var(--text-primary)] text-[var(--bg-page)] font-semibold'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Split View vs Full AS9102 Sheet"
          >
            <Columns className="w-3 h-3 stroke-[1.5]" />
            <span>{viewMode === 'sheet' ? 'Split View' : 'Full Sheet'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title={darkMode ? 'Switch to Paper Mode' : 'Switch to Carbon Mode'}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 stroke-[1.5]" /> : <Moon className="w-3.5 h-3.5 stroke-[1.5]" />}
          </button>

          {/* Unified Export Package Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-mono font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Export Package</span>
              <ChevronDown className="w-3 h-3 stroke-[1.5] opacity-70" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-60 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-lg py-1 z-50 text-xs font-mono">
                <button
                  onClick={() => {
                    onExportExcel();
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--bg-subtle)] flex items-center gap-2 text-[var(--text-primary)]"
                >
                  <FileSpreadsheet className="w-4 h-4 stroke-[1.5] text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-semibold">4-Sheet AS9102 Rev C</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Excel workbook (.xlsx)</div>
                  </div>
                </button>

                {onExportPdfDeck && (
                  <button
                    onClick={() => {
                      onExportPdfDeck();
                      setExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--bg-subtle)] flex items-center gap-2 text-[var(--text-primary)] border-t border-[var(--border-hairline)]"
                  >
                    <BookOpen className="w-4 h-4 stroke-[1.5] text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="font-semibold">2-Page Traveler Deck</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Printable PDF with Mobile QR</div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    onExportBalloonedPdf();
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--bg-subtle)] flex items-center gap-2 text-[var(--text-primary)] border-t border-[var(--border-hairline)]"
                >
                  <Download className="w-4 h-4 stroke-[1.5] text-[var(--text-secondary)]" />
                  <div>
                    <div className="font-semibold">Ballooned Drawing</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Vector stamped PDF</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onExportCSV();
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--bg-subtle)] flex items-center gap-2 text-[var(--text-primary)] border-t border-[var(--border-hairline)]"
                >
                  <FileText className="w-4 h-4 stroke-[1.5] text-[var(--text-secondary)]" />
                  <div>
                    <div className="font-semibold">Characteristic CSV</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Raw tabular data (.csv)</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: Contextual Drawing & Metrology Toolbar (36px / h-9) - Non-wrapping
          ========================================================================= */}
      <div className="h-9 w-full px-3 flex items-center justify-between overflow-x-auto whitespace-nowrap text-xs">
        {/* Left: Canvas & Drawing Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors"
            title="Attach CAD PDF"
          >
            <FolderOpen className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Open PDF</span>
          </button>

          <button
            onClick={() => onSetToolMode && onSetToolMode('pan')}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono transition-colors ${
              toolMode === 'pan'
                ? 'border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Pan Mode [V]"
          >
            <Move className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Pan [V]</span>
          </button>

          <button
            onClick={() => onSetToolMode && onSetToolMode('box_balloon')}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono transition-colors ${
              toolMode === 'box_balloon'
                ? 'border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Capture Zone / Marquee Balloon [B]"
          >
            <Crop className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Capture Zone [B]</span>
          </button>

          <button
            onClick={onAutoBalloonDetect}
            disabled={isExtracting}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs font-mono font-medium transition-colors"
            title="Auto-Detect All Callouts & GD&T Frames"
          >
            {isExtracting ? (
              <RefreshCw className="w-3.5 h-3.5 stroke-[1.5] animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" />
            )}
            <span>{isExtracting ? 'Detecting...' : 'Auto-Detect'}</span>
          </button>

          <button
            onClick={onFitSheet}
            className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition-colors"
            title="Fit Sheet to Viewport [F]"
          >
            <Maximize2 className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Fit</span>
          </button>

          {onReSortClockwise && (
            <button
              onClick={onReSortClockwise}
              className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition-colors"
              title="Sort Balloons Clockwise [R]"
            >
              <RotateCw className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Clockwise</span>
            </button>
          )}

          <button
            onClick={onToggleInvert}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono transition-colors ${
              inverted
                ? 'border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle High-Contrast Inverted CAD [K]"
          >
            <span>{inverted ? 'Carbon [K]' : 'Paper [K]'}</span>
          </button>

          {onToggleGrid && (
            <button
              onClick={onToggleGrid}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono transition-colors ${
                showGrid
                  ? 'border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Toggle Alignment Grid"
            >
              <Grid className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Grid</span>
            </button>
          )}
        </div>

        {/* Center / Right: Metrology Controls */}
        <div className="flex items-center gap-2 flex-shrink-0 pl-2">
          {/* General Tolerance Standard */}
          <div className="flex items-center gap-1 text-xs font-mono text-[var(--text-muted)]">
            <span className="hidden xl:inline text-[11px]">Gen Tol:</span>
            <select
              value={selectedStandard}
              onChange={(e) => onChangeStandard(e.target.value as GeneralToleranceStandard)}
              className="h-7 px-2 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-[var(--border-strong)] cursor-pointer"
            >
              <option value="ASME Y14.5">ASME Y14.5</option>
              <option value="ISO 2768-m">ISO 2768-m</option>
              <option value="ISO 2768-f">ISO 2768-f</option>
              <option value="ISO 2768-c">ISO 2768-c</option>
            </select>
          </div>

          {/* Fits Math */}
          <button
            onClick={onAutoCalcFits}
            className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition-colors"
            title="Compute ISO 286 Fits & Limits"
          >
            <Calculator className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Fits Math</span>
          </button>

          {/* Import CMM Data */}
          {onOpenCmmImport && (
            <button
              onClick={onOpenCmmImport}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition-colors"
              title="Import ZEISS Calypso or Hexagon PC-DMIS CMM report"
            >
              <Cpu className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Import CMM</span>
            </button>
          )}

          {/* Caliper DRO */}
          <button
            onClick={onToggleCaliperMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-mono transition-colors ${
              caliperMode
                ? 'border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle WebHID / BLE Caliper DRO"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Caliper DRO</span>
          </button>

          {/* Approve All */}
          {onApproveAll && (
            <button
              onClick={onApproveAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs font-mono font-medium transition-colors"
              title="Approve All In-Tolerance Characteristics"
            >
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[1.5] text-emerald-600 dark:text-emerald-400" />
              <span>Approve All</span>
            </button>
          )}

          {/* Characteristic Status Summary Pill */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] font-mono text-[11px] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{statusCounts.total} Dims</span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{statusCounts.inSpec} Pass</span>
            {statusCounts.needsReview > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">{statusCounts.needsReview} Warn</span>
              </>
            )}
            {statusCounts.outOfSpec > 0 && (
              <>
                <span>·</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{statusCounts.outOfSpec} Fail</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
