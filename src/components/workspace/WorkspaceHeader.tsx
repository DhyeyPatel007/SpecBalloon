import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  Eye,
  HelpCircle,
  CheckCircle2,
  Download,
  Palette,
  FileSpreadsheet,
  FileText,
  Cpu,
  Upload,
  Check,
  RotateCw,
  GitCompare,
  Zap,
  FolderOpen,
  Layers,
  TableProperties,
  Sliders
} from 'lucide-react';
import { DrawingSpec, GeneralToleranceStandard, InspectionStatus, Characteristic } from '../../types/metrology';
import { SpecBalloonLogo } from '../brand/SpecBalloonLogo';
import { SmartTooltip } from './SmartTooltip';

export type IdeThemeId = 'light-studio' | 'dark-carbon' | 'vscode-dark' | 'darcula';

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
  ideTheme: IdeThemeId;
  onChangeIdeTheme: (theme: IdeThemeId) => void;
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
  onOpenHelpModal?: (tab?: 'quickstart' | 'dictionary' | 'shortcuts' | 'faq') => void;
  rulerUnit?: 'mm' | 'in' | 'pt';
  onCycleRulerUnit?: () => void;
  onToggleTree?: () => void;
  firstFlaggedChar?: Characteristic | null;
  onJumpToFlagged?: (char: Characteristic) => void;
  onOpenAuditLog?: () => void;
  isSampleData?: boolean;
  isTableDrawerOpen?: boolean;
  onToggleTableDrawer?: () => void;
  isRightDockOpen?: boolean;
  onToggleRightDock?: () => void;
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
  ideTheme,
  onChangeIdeTheme,
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
  inverted,
  onReSortClockwise,
  onAutoBalloonDetect,
  onAutoCalcFits,
  onApproveAll,
  isExtracting,
  onOpenGeminiModal,
  isRevisionDiffMode,
  onToggleRevisionDiff,
  onOpenCmmImport,
  onStartTour,
  onOpenHelpModal,
  rulerUnit = 'mm',
  onCycleRulerUnit,
  onToggleTree,
  firstFlaggedChar,
  onJumpToFlagged,
  onOpenAuditLog,
  isSampleData = false,
  isTableDrawerOpen = false,
  onToggleTableDrawer,
  isRightDockOpen = false,
  onToggleRightDock,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active dropdown open states
  const [openDropdown, setOpenDropdown] = useState<
    'part' | 'ai' | 'metrology' | 'view' | 'help' | 'theme' | 'export' | null
  >(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadPdf(e.target.files[0]);
    }
    setOpenDropdown(null);
  };

  const themeLabels: Record<IdeThemeId, string> = {
    'light-studio': 'Light Studio',
    'dark-carbon': 'Dark Carbon',
    'vscode-dark': 'VS Code Dark+',
    'darcula': 'PyCharm Darcula',
  };

  const flaggedCount = statusCounts.needsReview + statusCounts.outOfSpec;
  const isAllVerified = flaggedCount === 0 && statusCounts.total > 0;

  return (
    <header className="h-12 w-full flex-shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] px-3 flex items-center justify-between text-xs font-sans select-none z-30 transition-colors duration-150">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.tiff"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* =========================================================================
          ZONE A (LEFT): App Identity, Part Selector & 4 Categorized Dropdowns
      ========================================================================= */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Exit Button */}
        <SmartTooltip
          title="Exit to Landing"
          shortcut="Esc"
          whatItDoes="Leaves the 4-Pane Metrology IDE and returns to the SpecBalloon product homepage."
          aiAction="All current characteristic tags and CMM programs are cached in browser state."
        >
          <button
            onClick={onExitToLanding}
            className="p-1.5 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Exit to Overview"
          >
            <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
          </button>
        </SmartTooltip>

        {/* Bespoke Logo */}
        <div className="flex items-center gap-2 pl-0.5 pr-1.5 border-r border-[var(--border-hairline)]">
          <SpecBalloonLogo size={24} animateRuby={false} />
          <span className="font-semibold text-xs tracking-tight text-[var(--text-primary)] hidden md:inline">
            SpecBalloon
          </span>
        </div>

        {/* Part Selector Dropdown */}
        <div className="relative" data-dropdown="part">
          <SmartTooltip
            title="Part Blueprint Selector"
            whatItDoes="Switch between pre-loaded aerospace CAD drawings or upload your own vector PDF."
            aiAction="Generates 300 DPI vector geometry crops and initializes AS9102 Form 3 characteristic ledger."
          >
            <button
              onClick={() => setOpenDropdown(openDropdown === 'part' ? null : 'part')}
              className="px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] hover:bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-hairline)] font-mono text-[11.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="text-[var(--accent)] font-bold">CAD:</span>
              <span className="truncate max-w-[110px]">{currentDrawing.partNumber}</span>
              <span className="text-[10px] text-[var(--text-muted)] font-normal">{currentDrawing.revision}</span>
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)] opacity-70" />
            </button>
          </SmartTooltip>

          {openDropdown === 'part' && (
            <div className="absolute left-0 top-full mt-1 w-64 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border-hairline)] mb-1">
                Select CAD Blueprint
              </div>
              {drawingsList.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    onSelectDrawing(d.id);
                    setOpenDropdown(null);
                  }}
                  className={`w-full px-2 py-1.5 rounded-md text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    d.id === currentDrawing.id
                      ? 'bg-[var(--bg-selected)] text-[var(--accent)] font-semibold'
                      : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs">{d.partNumber}</span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate">{d.partName}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                    {d.revision}
                  </span>
                </button>
              ))}
              <div className="border-t border-[var(--border-hairline)] mt-1 pt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-2 py-1.5 rounded-md text-left flex items-center gap-2 text-xs text-[var(--accent)] hover:bg-[var(--bg-subtle)] font-medium transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Upload Vector CAD PDF / Image</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Explicit Sample Data Badge */}
        {isSampleData && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
            SAMPLE DATA
          </span>
        )}

        {/* Quick Open PDF Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 rounded-md bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-primary)] border border-[var(--border-hairline)] text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Open new vector CAD drawing"
        >
          <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="hidden sm:inline">Open PDF</span>
        </button>

        {/* 4 Categorized Menus */}
        <div className="hidden lg:flex items-center gap-0.5 ml-1">
          {/* 1. [✨ AI Engine ▾] */}
          <div className="relative" data-dropdown="ai">
            <SmartTooltip
              title="AI Engine Menu"
              whatItDoes="Direct control of Gemini 2.5 Flash Vision detection, single-patch box-crops, and revision diffing."
              aiAction="Neuro-symbolic 2-stage pipeline: neural detection + deterministic metrology solvers."
            >
              <button
                onClick={() => setOpenDropdown(openDropdown === 'ai' ? null : 'ai')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  openDropdown === 'ai'
                    ? 'bg-[var(--bg-subtle)] text-[var(--accent)] font-semibold'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>AI Engine</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </SmartTooltip>

            {openDropdown === 'ai' && (
              <div className="absolute left-0 top-full mt-1 w-64 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    onAutoBalloonDetect?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Auto-Detect All (Gemini 2.5 Vision)</span>
                </button>
                <button
                  onClick={() => {
                    onSetToolMode?.('box_balloon');
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs">⬚</span>
                    <span>Capture Zone Box-Crop</span>
                  </span>
                  <kbd className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] border text-[9px] font-mono">B</kbd>
                </button>
                <button
                  onClick={() => {
                    onToggleRevisionDiff?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <GitCompare className="w-3.5 h-3.5 text-[#0047AB]" />
                    <span>Compare Revision Diff (Rev B → C)</span>
                  </span>
                  <kbd className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] border text-[9px] font-mono">D</kbd>
                </button>
                <button
                  onClick={() => {
                    onReSortClockwise?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <RotateCw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Re-Number Clockwise Around Centroid</span>
                  </span>
                  <kbd className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] border text-[9px] font-mono">R</kbd>
                </button>
                <div className="border-t border-[var(--border-hairline)] my-1" />
                <button
                  onClick={() => {
                    onOpenGeminiModal?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs text-[var(--accent)] hover:bg-[var(--bg-subtle)] font-medium cursor-pointer"
                >
                  Configure Gemini API Key & Vision Settings...
                </button>
              </div>
            )}
          </div>

          {/* 2. [📐 Metrology & SPC ▾] */}
          <div className="relative" data-dropdown="metrology">
            <SmartTooltip
              title="Metrology & SPC Standards"
              whatItDoes="Configure general tolerance standards, ISO fits, CMM imports, and digital calipers."
              aiAction="Evaluates tolerances per ISO 286, ISO 2768, and ANSI/ASQ Z1.4 sampling."
            >
              <button
                onClick={() => setOpenDropdown(openDropdown === 'metrology' ? null : 'metrology')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  openDropdown === 'metrology'
                    ? 'bg-[var(--bg-subtle)] text-[var(--accent)] font-semibold'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Metrology & SPC</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </SmartTooltip>

            {openDropdown === 'metrology' && (
              <div className="absolute left-0 top-full mt-1 w-64 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  General Tolerance Standard
                </div>
                {(['ISO 2768-m', 'ISO 2768-c', 'ASME Y14.5M'] as GeneralToleranceStandard[]).map((std) => (
                  <button
                    key={std}
                    onClick={() => {
                      onChangeStandard(std);
                      setOpenDropdown(null);
                    }}
                    className={`w-full px-2.5 py-1 rounded-md text-left text-xs flex items-center justify-between cursor-pointer ${
                      selectedStandard === std
                        ? 'bg-[var(--bg-selected)] text-[var(--accent)] font-semibold'
                        : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span>{std}</span>
                    {selectedStandard === std && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
                <div className="border-t border-[var(--border-hairline)] my-1" />
                <button
                  onClick={() => {
                    onAutoCalcFits?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span className="font-mono text-xs">⌀</span>
                  <span>Auto-Calculate ISO 286 Fits (H7/g6)</span>
                </button>
                <button
                  onClick={() => {
                    onOpenCmmImport?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 text-[#0047AB]" />
                  <span>Import ZEISS / Hexagon CMM Data (.CSV)</span>
                </button>
                <button
                  onClick={() => {
                    onToggleCaliperMode();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Live USB / Bluetooth Caliper Mode</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${caliperMode ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                </button>
                <button
                  onClick={() => {
                    onOpenAuditLog?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>21 CFR Part 11 Audit Trail Ledger</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. [👁 View & Canvas ▾] */}
          <div className="relative" data-dropdown="view">
            <SmartTooltip
              title="View & Canvas Options"
              whatItDoes="Control panels, layout modes, paper inversion, and ruler units."
              aiAction="Toggles 4-Pane split mode, CAD coordinate projection, and ruler ticks."
            >
              <button
                onClick={() => setOpenDropdown(openDropdown === 'view' ? null : 'view')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  openDropdown === 'view'
                    ? 'bg-[var(--bg-subtle)] text-[var(--accent)] font-semibold'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View & Canvas</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </SmartTooltip>

            {openDropdown === 'view' && (
              <div className="absolute left-0 top-full mt-1 w-60 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    onToggleTree?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Toggle Left Model Tree</span>
                  </span>
                  <kbd className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] border text-[9px] font-mono">⌘B</kbd>
                </button>
                <button
                  onClick={() => {
                    onToggleViewMode();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <TableProperties className="w-3.5 h-3.5" />
                    <span>{viewMode === 'split' ? 'Maximize BoC Sheet' : 'Restore 4-Pane Split'}</span>
                  </span>
                  <kbd className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] border text-[9px] font-mono">Ctrl+\</kbd>
                </button>
                <button
                  onClick={() => {
                    onCycleRulerUnit?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span>Ruler Units ({rulerUnit.toUpperCase()})</span>
                  <span className="font-mono text-[10px] text-[var(--accent)] font-bold">
                    {rulerUnit === 'mm' ? 'Metric (mm)' : rulerUnit === 'in' ? 'Imperial (in)' : 'Points (pt)'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    onToggleInvert?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span>Invert Blueprint Paper</span>
                  <kbd className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] border text-[9px] font-mono">K</kbd>
                </button>
                <button
                  onClick={() => {
                    onFitSheet?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span>Fit Sheet to Viewport</span>
                  <kbd className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] border text-[9px] font-mono">F</kbd>
                </button>
              </div>
            )}
          </div>

          {/* 4. [? Help & Guide ▾] */}
          <div className="relative" data-dropdown="help">
            <SmartTooltip
              title="Help & Guide Center"
              shortcut="?"
              whatItDoes="Interactive 45-second quickstart, button dictionary, keyboard shortcuts, and metrology FAQ."
            >
              <button
                onClick={() => setOpenDropdown(openDropdown === 'help' ? null : 'help')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  openDropdown === 'help'
                    ? 'bg-[var(--bg-subtle)] text-[var(--accent)] font-semibold'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Help & Guide</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </SmartTooltip>

            {openDropdown === 'help' && (
              <div className="absolute left-0 top-full mt-1 w-56 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    onStartTour?.();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Interactive 45s Product Tour</span>
                </button>
                <button
                  onClick={() => {
                    onOpenHelpModal?.('dictionary');
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-teal-500" />
                  <span>Button & Tool Dictionary</span>
                </button>
                <button
                  onClick={() => {
                    onOpenHelpModal?.('shortcuts');
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <span>Keyboard Shortcuts</span>
                  <kbd className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] border text-[9px] font-mono">⌘/</kbd>
                </button>
                <button
                  onClick={() => {
                    onOpenHelpModal?.('faq');
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Metrology & AS9102 FAQ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ZONE B (CENTER): Review Status Pill & 1-Click Approve
      ========================================================================= */}
      <div className="flex-1 max-w-xl mx-2 flex justify-center items-center gap-2">
        {!isAllVerified && flaggedCount > 0 ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (firstFlaggedChar) {
                  onJumpToFlagged?.(firstFlaggedChar);
                } else if (onToggleRightDock && !isRightDockOpen) {
                  onToggleRightDock();
                }
              }}
              className="group px-3 py-1 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-selected)] border border-[#0047AB]/40 hover:border-[#0047AB] text-xs font-mono flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              title="Click to jump to and review next flagged characteristic"
            >
              <span className="w-2 h-2 rounded-full bg-[#0047AB] animate-pulse" />
              <span className="font-semibold text-[#0047AB] dark:text-[#38BDF8]">
                {statusCounts.total} found · {flaggedCount} need a look
              </span>
              {firstFlaggedChar && (
                <span className="text-[var(--accent)] font-bold group-hover:underline flex items-center gap-1">
                  <span>#{firstFlaggedChar.balloonNumber < 10 ? `0${firstFlaggedChar.balloonNumber}` : firstFlaggedChar.balloonNumber}</span>
                  <kbd className="px-1 py-0.2 rounded bg-[var(--bg-surface)] border text-[9px]">↵</kbd>
                </span>
              )}
            </button>

            {onApproveAll && (
              <button
                type="button"
                onClick={onApproveAll}
                className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                title="Approve all remaining unreviewed dimensions"
              >
                <Check className="w-3 h-3" />
                <span>Approve All</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setOpenDropdown('export')}
            className="group px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-500 text-xs font-mono flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            title="All dimensions verified! Click to export AS9102 Rev C package"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              All {statusCounts.total} Dimensions Verified ✓
            </span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline flex items-center gap-1">
              <span>Export AS9102</span>
              <span>⬇</span>
            </span>
          </button>
        )}
      </div>

      {/* =========================================================================
          ZONE C (RIGHT): Table Drawer Toggle, Dock Toggle, Theme, & Primary Export
      ========================================================================= */}
      <div className="flex items-center gap-1.5">
        {/* Toggle Table Drawer Button */}
        {onToggleTableDrawer && (
          <button
            type="button"
            onClick={onToggleTableDrawer}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isTableDrawerOpen
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hairline)]'
            }`}
            title="Toggle Slide-Over Master Table Drawer (⌘J)"
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Table Drawer</span>
            <kbd className="text-[9px] font-mono opacity-80">⌘J</kbd>
          </button>
        )}

        {/* Toggle Right Dock Button */}
        {onToggleRightDock && (
          <button
            type="button"
            onClick={onToggleRightDock}
            className={`relative px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isRightDockOpen
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hairline)]'
            }`}
            title="Toggle Right Metrology Dock (Flagged Queue / Inspector / Layers)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Dock</span>
            {flaggedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-amber-500 text-white font-bold">
                {flaggedCount}
              </span>
            )}
          </button>
        )}

        {/* Configure Gemini Vision Button */}
        <button
          type="button"
          onClick={onOpenGeminiModal}
          className="p-1.5 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Configure Gemini 2.5 Flash Vision API Key & Settings"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
        </button>

        {/* 4-way Theme Switcher Dropdown */}
        <div className="relative" data-dropdown="theme">
          <SmartTooltip
            title="Theme Switcher"
            whatItDoes="Switch between 4 metrology workspace themes: Light Studio, Dark Carbon, VS Code Dark+, and PyCharm Darcula."
            aiAction="Dynamically switches CSS semantic syntax variables for dimensions, tolerances, and GD&T."
          >
            <button
              onClick={() => setOpenDropdown(openDropdown === 'theme' ? null : 'theme')}
              className="px-2 py-1 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-hairline)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden xl:inline font-mono text-[11px]">{themeLabels[ideTheme]}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </SmartTooltip>

          {openDropdown === 'theme' && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border-hairline)] mb-1">
                Workspace IDE Theme
              </div>
              {(['light-studio', 'dark-carbon', 'vscode-dark', 'darcula'] as IdeThemeId[]).map((tId) => (
                <button
                  key={tId}
                  onClick={() => {
                    onChangeIdeTheme(tId);
                    setOpenDropdown(null);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    ideTheme === tId
                      ? 'bg-[var(--bg-selected)] text-[var(--accent)] font-semibold'
                      : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span className="font-mono text-xs">{themeLabels[tId]}</span>
                  {ideTheme === tId && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Help Button */}
        <SmartTooltip
          title="Open Help Center"
          shortcut="?"
          whatItDoes="Opens the 4-tab interactive Quickstart, Dictionary, Shortcuts, and Metrology FAQ."
        >
          <button
            onClick={() => onOpenHelpModal?.('quickstart')}
            className="p-1.5 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Help & Documentation (?)"
          >
            <HelpCircle className="w-4 h-4 stroke-[1.5]" />
          </button>
        </SmartTooltip>

        {/* Primary Export AS9102 Dropdown */}
        <div className="relative" data-dropdown="export">
          <SmartTooltip
            title="Primary AS9102 Package Exporter"
            whatItDoes="Exports the complete inspection deliverable in multiple industry standard formats."
            aiAction="Generates Form 1, Form 2, and Form 3 with cryptographic SHA-256 validation seal."
          >
            <button
              onClick={() => setOpenDropdown(openDropdown === 'export' ? null : 'export')}
              className="px-3 py-1.5 rounded-md bg-[var(--accent)] hover:brightness-110 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export AS9102</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>
          </SmartTooltip>

          {openDropdown === 'export' && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border-hairline)] mb-1">
                AS9102 Rev C Deliverables
              </div>

              {/* 1. Excel */}
              <button
                onClick={() => {
                  onExportExcel();
                  setOpenDropdown(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="font-semibold">4-Sheet AS9102 Package (.xlsx)</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Forms 1, 2, 3 + SPC Heatmap</span>
                </div>
              </button>

              {/* 2. PDF Deck */}
              {onExportPdfDeck && (
                <button
                  onClick={() => {
                    onExportPdfDeck();
                    setOpenDropdown(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  <div className="flex flex-col">
                    <span className="font-semibold">2-Page QR Traveler (.pdf)</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Vector Blueprint + Traveler Sheet</span>
                  </div>
                </button>
              )}

              {/* 3. CSV */}
              <button
                onClick={() => {
                  onExportCSV();
                  setOpenDropdown(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-500" />
                <div className="flex flex-col">
                  <span className="font-semibold">Form 3 Master BoC (.csv)</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Raw characteristic coordinates</span>
                </div>
              </button>

              {/* 4. Ballooned Vector PDF */}
              <button
                onClick={() => {
                  onExportBalloonedPdf();
                  setOpenDropdown(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#0047AB]" />
                <div className="flex flex-col">
                  <span className="font-semibold">Ballooned Vector Drawing (.pdf)</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Overlay with numbered bubbles</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
