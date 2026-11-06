import React from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Columns,
  Maximize2,
  Sliders,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Cpu
} from 'lucide-react';
import { DrawingSpec, GeneralToleranceStandard, InspectionStatus } from '../../types/metrology';

interface WorkspaceHeaderProps {
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
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  currentDrawing,
  drawingsList,
  onSelectDrawing,
  onUploadCustom,
  selectedStandard,
  onChangeStandard,
  statusFilter,
  onFilterChange,
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
}) => {
  return (
    <header className="h-11 w-full border-b border-border-str bg-surface-1 px-3 flex items-center justify-between text-xs font-mono select-none z-30">
      {/* Left: Navigation + Drawing Selector + Tolerance Std */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExitToLanding}
          className="machined-btn border border-border-str px-2 py-1 bg-surface-2 hover:bg-surface-3 text-text-pri flex items-center gap-1.5 font-bold"
          title="Exit to Landing Page"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-acc-orange" />
          <span className="hidden sm:inline">LANDING</span>
        </button>

        {/* Part Selector Dropdown */}
        <div className="flex items-center border border-border-str bg-surface-2 px-2 py-0.5">
          <select
            value={currentDrawing.id}
            onChange={(e) => {
              if (e.target.value === 'upload') {
                document.getElementById('custom-blueprint-upload')?.click();
              } else {
                onSelectDrawing(e.target.value);
              }
            }}
            className="bg-transparent text-text-pri font-bold focus:outline-none cursor-pointer pr-1"
          >
            {drawingsList.map((d) => (
              <option key={d.id} value={d.id} className="bg-surface-1 text-text-pri">
                {d.partNumber} ({d.characteristics.length} DIMS)
              </option>
            ))}
            <option value="upload" className="bg-surface-1 text-acc-orange">
              + UPLOAD CUSTOM CAD / PDF
            </option>
          </select>
          <span className="border-l border-border-str pl-2 ml-1 text-text-mut text-[10px]">
            {currentDrawing.revision}
          </span>
        </div>

        <input
          id="custom-blueprint-upload"
          type="file"
          accept="image/*,.pdf"
          onChange={onUploadCustom}
          className="hidden"
        />

        {/* General Tolerance Standard Selector */}
        <div className="hidden lg:flex items-center border border-border-str bg-surface-2 px-2 py-0.5 text-[11px]">
          <span className="text-text-mut mr-1.5">TOL:</span>
          <select
            value={selectedStandard}
            onChange={(e) => onChangeStandard(e.target.value as GeneralToleranceStandard)}
            className="bg-transparent text-text-pri focus:outline-none cursor-pointer"
          >
            <option value="ISO 2768-m" className="bg-surface-1">ISO 2768-m (Medium)</option>
            <option value="ISO 2768-f" className="bg-surface-1">ISO 2768-f (Fine)</option>
            <option value="ASME Y14.5" className="bg-surface-1">ASME Y14.5 (Decimal)</option>
          </select>
        </div>
      </div>

      {/* Center: Instant Status Filter Pills (0ms filtering) */}
      <div className="hidden md:flex items-center gap-1">
        <button
          onClick={() => onFilterChange('all')}
          className={`machined-btn px-2 py-0.5 text-[10px] border font-bold ${
            statusFilter === 'all'
              ? 'bg-text-pri text-canvas border-text-pri'
              : 'bg-surface-2 border-border-str text-text-sec hover:text-text-pri'
          }`}
        >
          ALL: {statusCounts.total}
        </button>

        <button
          onClick={() => onFilterChange('needs_review')}
          className={`machined-btn px-2 py-0.5 text-[10px] border font-bold flex items-center gap-1 ${
            statusFilter === 'needs_review'
              ? 'bg-st-warn text-white border-st-warn'
              : 'bg-surface-2 border-border-str text-st-warn hover:bg-st-warn/10'
          }`}
        >
          <span>REVIEW: {statusCounts.needsReview}</span>
        </button>

        <button
          onClick={() => onFilterChange('in_spec')}
          className={`machined-btn px-2 py-0.5 text-[10px] border font-bold flex items-center gap-1 ${
            statusFilter === 'in_spec'
              ? 'bg-st-pass text-white border-st-pass'
              : 'bg-surface-2 border-border-str text-st-pass hover:bg-st-pass/10'
          }`}
        >
          <span>IN SPEC: {statusCounts.inSpec}</span>
        </button>

        <button
          onClick={() => onFilterChange('out_of_spec')}
          className={`machined-btn px-2 py-0.5 text-[10px] border font-bold flex items-center gap-1 ${
            statusFilter === 'out_of_spec'
              ? 'bg-st-fail text-white border-st-fail'
              : 'bg-surface-2 border-border-str text-st-fail hover:bg-st-fail/10'
          }`}
        >
          <span>OUT SPEC: {statusCounts.outOfSpec}</span>
        </button>
      </div>

      {/* Right: Workspace Controls + Exports */}
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <button
          onClick={onToggleViewMode}
          className="machined-btn border border-border-str px-2 py-1 bg-surface-2 hover:bg-surface-3 text-text-pri flex items-center gap-1.5"
          title="Toggle Split View / 14-Col AS9102 Sheet (Cmd + \)"
        >
          <Columns className="w-3.5 h-3.5 text-acc-orange" />
          <span className="hidden xl:inline">{viewMode === 'split' ? 'FULL AS9102 SHEET' : '65/35 CROP-TAPE'}</span>
        </button>

        {/* Live Caliper Mode Toggle */}
        <button
          onClick={onToggleCaliperMode}
          className={`machined-btn border px-2 py-1 flex items-center gap-1.5 font-bold ${
            caliperMode
              ? 'bg-acc-orange text-white border-acc-orange animate-pulse'
              : 'bg-surface-2 text-text-sec border-border-str hover:text-text-pri'
          }`}
          title="Toggle Shop Floor USB-HID Digital Caliper DRO"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{caliperMode ? 'CALIPER DRO: ON' : 'CALIPER DRO'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="machined-btn border border-border-str p-1 bg-surface-2 hover:bg-surface-3 text-text-pri"
          title="Toggle Theme"
        >
          {darkMode ? <Moon className="w-3.5 h-3.5 text-acc-orange" /> : <Sun className="w-3.5 h-3.5 text-acc-orange" />}
        </button>

        {/* Primary Export Actions */}
        <div className="flex items-center gap-1 border-l border-border-str pl-2 ml-1">
          <button
            onClick={onExportCSV}
            className="machined-btn bg-surface-2 border border-border-str hover:bg-surface-3 text-text-pri px-2 py-1 flex items-center gap-1 text-[11px]"
            title="Download AS9102 Rev C Form 3 CSV"
          >
            <Download className="w-3 h-3 text-acc-orange" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={onExportExcel}
            className="machined-btn bg-surface-2 border border-border-str hover:bg-surface-3 text-text-pri px-2 py-1 flex items-center gap-1 text-[11px]"
            title="Download Formatted Excel .XLS Sheet"
          >
            <FileSpreadsheet className="w-3 h-3 text-st-pass" />
            <span className="hidden sm:inline">EXCEL</span>
          </button>

          <button
            onClick={onExportPNG}
            className="machined-btn bg-acc-orange hover:bg-orange-600 text-white font-bold px-2.5 py-1 flex items-center gap-1.5 text-[11px]"
            title="Export Ballooned CAD Drawing PNG"
          >
            <ImageIcon className="w-3 h-3" />
            <span className="hidden md:inline">EXPORT DRAWING</span>
          </button>
        </div>
      </div>
    </header>
  );
};
