import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  RotateCw,
  Sun,
  Moon,
} from 'lucide-react';
import { DrawingSpec } from '../../types/metrology';
import { SpecBalloonLogo } from '../brand/SpecBalloonLogo';

interface StudioTopBarProps {
  currentDrawing: DrawingSpec | null;
  hasDrawing: boolean;
  isSampleData: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onExitToLanding: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  characteristicsCount: number;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  currentDrawing,
  hasDrawing,
  isSampleData,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  darkMode,
  onToggleTheme,
  onExitToLanding,
  onExportExcel,
  onExportCsv,
  onExportPdf,
  characteristicsCount,
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`h-12 w-full border-b px-3 flex items-center justify-between text-xs font-mono select-none z-30 shrink-0 transition-colors ${
        darkMode
          ? 'bg-slate-950 border-slate-800 text-slate-200'
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      }`}
    >
      {/* Left: Brand + Back + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExitToLanding}
          className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors cursor-pointer ${
            darkMode
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title="Return to Landing Page"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-sans text-xs">Exit</span>
        </button>

        <div className={`h-4 w-px ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />

        <div className="flex items-center gap-2">
          <SpecBalloonLogo size={20} dotPulse={false} />
          <span
            className={`font-display font-semibold text-sm tracking-tight hidden sm:inline ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            SpecBalloon
          </span>
          <span className="px-1.5 py-0.2 rounded bg-[#0047AB]/15 text-[#0047AB] dark:text-[#38BDF8] border border-[#0047AB]/30 text-[10px] font-bold">
            STUDIO
          </span>
        </div>

        <div
          className={`h-4 w-px hidden md:block ${
            darkMode ? 'bg-slate-800' : 'bg-slate-200'
          }`}
        />

        {/* Breadcrumb & Drawing Identification */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
            Workspace
          </span>
          <span className={darkMode ? 'text-slate-700' : 'text-slate-300'}>/</span>
          {hasDrawing && currentDrawing ? (
            <>
              <span
                className={`font-bold truncate max-w-[200px] sm:max-w-xs ${
                  darkMode ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                Drawing: {currentDrawing.partNumber} ({currentDrawing.revision})
              </span>
              {isSampleData && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 dark:text-amber-300 border border-amber-500/30">
                  SAMPLE DATA
                </span>
              )}
            </>
          ) : (
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500 font-medium'}>
              No Drawing Loaded
            </span>
          )}
        </div>
      </div>

      {/* Middle: Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded transition-colors ${
            canUndo
              ? darkMode
                ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              : darkMode
              ? 'text-slate-600 cursor-not-allowed opacity-40'
              : 'text-slate-300 cursor-not-allowed opacity-40'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded transition-colors ${
            canRedo
              ? darkMode
                ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              : darkMode
              ? 'text-slate-600 cursor-not-allowed opacity-40'
              : 'text-slate-300 cursor-not-allowed opacity-40'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {characteristicsCount > 0 && (
          <span
            className={`ml-2 text-[11px] hidden lg:inline ${
              darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <span className="text-[#0047AB] dark:text-[#38BDF8] font-bold">
              {characteristicsCount}
            </span>{' '}
            dimensions placed
          </span>
        )}
      </div>

      {/* Right: Theme Toggle + Export Menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleTheme}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            darkMode
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title={darkMode ? 'Switch to Clean Light Theme' : 'Switch to Dark Carbon Theme'}
        >
          {darkMode ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </button>

        {/* 1-Click Export Dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            disabled={characteristicsCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors shadow-sm ${
              characteristicsCount > 0
                ? 'bg-[#0047AB] hover:bg-[#003887] text-white cursor-pointer'
                : darkMode
                ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export AS9102</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
          </button>

          {isExportMenuOpen && characteristicsCount > 0 && (
            <div
              className={`absolute right-0 top-full mt-1.5 w-64 rounded-lg border shadow-2xl p-1.5 z-50 space-y-1 font-sans text-xs transition-colors ${
                darkMode
                  ? 'border-slate-800 bg-slate-900 text-slate-200'
                  : 'border-slate-200 bg-white text-slate-800 shadow-xl'
              }`}
            >
              <button
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onExportExcel();
                }}
                className={`w-full text-left px-3 py-2 rounded-md flex items-start gap-2.5 transition-colors cursor-pointer group ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div
                    className={`font-semibold ${
                      darkMode
                        ? 'text-white group-hover:text-emerald-300'
                        : 'text-slate-900 group-hover:text-emerald-600'
                    }`}
                  >
                    AS9102 Rev C Excel (.xlsx)
                  </div>
                  <div
                    className={`text-[11px] ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Forms 1, 2, and 3 full 4-sheet workbook
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onExportCsv();
                }}
                className={`w-full text-left px-3 py-2 rounded-md flex items-start gap-2.5 transition-colors cursor-pointer group ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4 text-[#0047AB] dark:text-[#38BDF8] mt-0.5 shrink-0" />
                <div>
                  <div
                    className={`font-semibold ${
                      darkMode
                        ? 'text-white group-hover:text-[#38BDF8]'
                        : 'text-slate-900 group-hover:text-[#0047AB]'
                    }`}
                  >
                    Form 3 Inspection CSV (.csv)
                  </div>
                  <div
                    className={`text-[11px] ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Tabular characteristic limit grid
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onExportPdf();
                }}
                className={`w-full text-left px-3 py-2 rounded-md flex items-start gap-2.5 transition-colors cursor-pointer group ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                <Download className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <div
                    className={`font-semibold ${
                      darkMode
                        ? 'text-white group-hover:text-amber-300'
                        : 'text-slate-900 group-hover:text-amber-600'
                    }`}
                  >
                    Ballooned PDF Deck (.pdf)
                  </div>
                  <div
                    className={`text-[11px] ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Vector drawing overlay with balloon tags
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
