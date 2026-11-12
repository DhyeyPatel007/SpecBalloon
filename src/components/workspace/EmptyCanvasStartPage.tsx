import React, { useState, useRef } from 'react';
import { Upload, ChevronRight, HardDrive } from 'lucide-react';
import { SAMPLE_DRAWINGS } from '../../data/sampleDrawings';

interface EmptyCanvasStartPageProps {
  onUploadPdf: (file: File) => void;
  onSelectSample: (sampleId: string) => void;
  darkMode?: boolean;
}

export const EmptyCanvasStartPage: React.FC<EmptyCanvasStartPageProps> = ({
  onUploadPdf,
  onSelectSample,
  darkMode = true,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      onUploadPdf(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadPdf(e.target.files[0]);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 overflow-y-auto select-none font-sans">
      <div className="w-full max-w-2xl space-y-6">
        {/* Compact Drop Box (110px defined area) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group rounded-xl border border-dashed transition-all cursor-pointer p-6 flex flex-col items-center justify-center text-center ${
            isDragOver
              ? 'border-[#0047AB] bg-[#0047AB]/10 shadow-lg'
              : darkMode
              ? 'border-slate-800 bg-slate-950/70 hover:border-slate-600 hover:bg-slate-900/40'
              : 'border-slate-300 bg-white hover:border-[#0047AB] hover:bg-slate-50 shadow-sm'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0047AB]/15 text-[#38BDF8] flex items-center justify-center border border-[#0047AB]/30 shrink-0 group-hover:scale-105 transition-transform">
              <Upload className="w-4 h-4" />
            </div>

            <div className="text-left">
              <div
                className={`text-xs font-semibold flex items-center gap-2 ${
                  darkMode ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                <span>Drop 2D CAD PDF here or browse</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    darkMode
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Ctrl+O
                </span>
              </div>
              <div
                className={`text-[11px] font-mono mt-0.5 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                PDF, TIFF, PNG &middot; Max 10 MB &middot; Up to 5 sheets
              </div>
            </div>

            <div className="ml-auto">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-[#0047AB] hover:bg-[#003887] text-white font-mono text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse File
              </button>
            </div>
          </div>
        </div>

        {/* Structured Benchmark Drawings Table */}
        <div
          className={`rounded-xl border overflow-hidden shadow-lg transition-colors ${
            darkMode
              ? 'border-slate-800 bg-slate-950/80'
              : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <div
            className={`px-4 py-2.5 border-b flex items-center justify-between ${
              darkMode
                ? 'bg-slate-900/70 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <HardDrive
                className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
              />
              <span
                className={`text-xs font-semibold ${
                  darkMode ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                Recent &amp; Benchmark Drawings
              </span>
            </div>
            <span
              className={`text-[10px] font-mono ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Reference CAD Standards
            </span>
          </div>

          <div
            className={`divide-y ${
              darkMode ? 'divide-slate-800/80' : 'divide-slate-100'
            }`}
          >
            {SAMPLE_DRAWINGS.map((sample) => (
              <div
                key={sample.id}
                onClick={() => onSelectSample(sample.id)}
                className={`group px-4 py-3 transition-colors flex items-center justify-between cursor-pointer ${
                  darkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs font-bold transition-colors ${
                        darkMode
                          ? 'text-slate-100 group-hover:text-[#38BDF8]'
                          : 'text-slate-900 group-hover:text-[#0047AB]'
                      }`}
                    >
                      {sample.partNumber}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        darkMode
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {sample.revision}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      &bull;
                    </span>
                    <span
                      className={`text-[10.5px] font-mono ${
                        darkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {sample.standard}
                    </span>
                  </div>
                  <div
                    className={`text-[11px] truncate max-w-md ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {sample.partName}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10.5px] font-mono ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    <span className="text-[#0047AB] dark:text-[#38BDF8] font-bold">
                      {sample.characteristics.length}
                    </span>{' '}
                    dims
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSample(sample.id);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[10.5px] font-medium transition-colors cursor-pointer ${
                      darkMode
                        ? 'bg-slate-800 hover:bg-[#0047AB] text-slate-200 hover:text-white'
                        : 'bg-slate-100 hover:bg-[#0047AB] text-slate-700 hover:text-white border border-slate-200'
                    }`}
                  >
                    <span>Open Sample</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
