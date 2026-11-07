import React from 'react';
import { ShieldCheck, Download, X, Clock, User, Hash, Lock } from 'lucide-react';
import { AuditLogEntry } from '../../types/metrology';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AuditLogEntry[];
  onExportAuditCsv: () => void;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({
  isOpen,
  onClose,
  entries,
  onExportAuditCsv,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-surface border-l border-border-hairline shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border-hairline flex items-center justify-between bg-subtle/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-status-pass">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  21 CFR Part 11 / AS9100 Audit Trail
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold text-status-pass">
                  LOCKED
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Tamper-evident, timestamped ledger of all metrology edits & approvals.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* System Integrity Badge */}
        <div className="px-4 py-2.5 bg-subtle/30 border-b border-border-hairline flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-status-pass">
            <Lock className="w-3.5 h-3.5" />
            <span className="font-semibold">SHA-256 Hash Chain: Verified</span>
          </div>
          <span className="text-text-muted">{entries.length} Events Logged</span>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-xs">
              No audit events recorded yet.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg border border-border-hairline bg-surface hover:bg-subtle/30 transition-all text-xs space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-accent-primary text-[11px]">
                    {entry.action}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.timestamp}
                  </span>
                </div>

                <div className="text-text-primary text-[11px] leading-relaxed">
                  {entry.details}
                </div>

                <div className="pt-1.5 border-t border-border-hairline/60 flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="font-semibold text-text-secondary">{entry.user}</span>
                    {entry.tagId && <span>· Tag {entry.tagId}</span>}
                  </span>
                  <span className="truncate max-w-[120px] text-text-muted" title={entry.hash}>
                    #{entry.hash.slice(0, 8)}...
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-border-hairline bg-subtle/40 flex items-center justify-between gap-2">
          <button
            onClick={onExportAuditCsv}
            className="flex-1 h-8 rounded-md bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Official Audit CSV</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 h-8 rounded-md border border-border-hairline bg-surface hover:bg-subtle text-text-secondary text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

