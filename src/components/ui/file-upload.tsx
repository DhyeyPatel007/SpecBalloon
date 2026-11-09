import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FileUploadProps {
  onChange?: (files: File[]) => void;
  accept?: string;
  maxSizeMb?: number;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onChange,
  accept = '.pdf,.png,.jpg,.jpeg,.tiff',
  maxSizeMb = 10,
  className,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (newFile: File) => {
    setError(null);
    if (newFile.size > maxSizeMb * 1024 * 1024) {
      setError(`File exceeds maximum size of ${maxSizeMb} MB`);
      return;
    }
    setFile(newFile);
    onChange?.([newFile]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] p-8 transition-colors select-none",
        isDragOver
          ? "border-[var(--accent)] bg-[var(--bg-selected)]/50"
          : "hover:border-[var(--accent)]/60",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      <div className="flex flex-col items-center justify-center text-center">
        <motion.div
          animate={{
            scale: isDragOver ? 1.08 : 1,
            y: isDragOver ? -4 : 0,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="w-14 h-14 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--accent)] mb-4 shadow-xs"
        >
          <Upload className="w-6 h-6 stroke-[1.75]" />
        </motion.div>

        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Drop Vector CAD Blueprint or PDF
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-sm">
          Drag & drop ANSI/ISO drawing (A0–A4) at 300 DPI or browse from disk. Supports multi-page PDF, PNG, and TIFF.
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
        >
          Browse Local CAD File
        </button>

        <div className="mt-4 flex items-center gap-2 text-[10.5px] font-mono text-[var(--text-muted)]">
          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            Max {maxSizeMb} MB
          </span>
          <span>·</span>
          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            Vector + OCR
          </span>
          <span>·</span>
          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            AS9102 Rev C
          </span>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="mt-3 flex items-center gap-1.5 text-xs text-status-fail font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {file && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-4 w-full p-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-mono font-semibold text-[var(--text-primary)] truncate">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">
                    {(file.size / 1024).toFixed(1)} KB · Ready to Balloon
                  </p>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

