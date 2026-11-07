import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowRight,
  FileSpreadsheet,
  BookOpen,
  Cpu,
  Zap,
  Sun,
  Moon,
  Sparkles,
  GitCompare,
  Layers,
  Shield,
  DollarSign,
  HelpCircle,
  FileCode,
  X
} from 'lucide-react';
import { AppPage } from './GlobalNavbar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: AppPage, sampleId?: string) => void;
  onToggleTheme: () => void;
  onTriggerAction?: (actionId: string) => void;
}

interface CommandItem {
  id: string;
  category: 'Pages' | 'Drawings' | 'Metrology Actions' | 'Settings';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onToggleTheme,
  onTriggerAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const items: CommandItem[] = [
    // Pages
    {
      id: 'page-overview',
      category: 'Pages',
      title: 'Overview & Interactive Stage',
      subtitle: 'Homepage, blueprint loupe, and telemetry metrics',
      icon: <Layers className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('overview');
        onClose();
      },
    },
    {
      id: 'page-product',
      category: 'Pages',
      title: 'Product & Ecosystem Architecture',
      subtitle: 'Desktop IDE, tablet workbench, mobile DRO & CMM bridge',
      icon: <Layers className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('product');
        onClose();
      },
    },
    {
      id: 'page-engine',
      category: 'Pages',
      title: 'Metrology Engine & Math Sandboxes',
      subtitle: 'ISO 286 fits, ASME Y14.5 MMC bonus & thread math whitepaper',
      icon: <Sparkles className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('engine');
        onClose();
      },
    },
    {
      id: 'page-customers',
      category: 'Pages',
      title: 'Customers & Time-Motion Benchmarks',
      subtitle: 'Aerospace AS9102, automotive IATF 16949 & medical CNC cases',
      icon: <FileCode className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('customers');
        onClose();
      },
    },
    {
      id: 'page-security',
      category: 'Pages',
      title: 'Security, ITAR & Compliance',
      subtitle: '21 CFR Part 11 audit trails and on-prem air-gapped readiness',
      icon: <Shield className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('security');
        onClose();
      },
    },
    {
      id: 'page-pricing',
      category: 'Pages',
      title: 'Pricing & Shop ROI Calculator',
      subtitle: 'INR / USD tiers, labor savings calculator & buyer FAQ',
      icon: <DollarSign className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('pricing');
        onClose();
      },
    },
    {
      id: 'page-docs',
      category: 'Pages',
      title: 'Documentation & Keyboard Shortcuts',
      subtitle: 'Vim-speed QA shortcuts, caliper setup guide & v2.5 changelog',
      icon: <HelpCircle className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('docs');
        onClose();
      },
    },
    {
      id: 'page-studio',
      category: 'Pages',
      title: 'Launch 4-Pane Metrology Studio',
      subtitle: 'Open the CAD drafting and inspection workbench IDE',
      icon: <ArrowRight className="w-4 h-4 stroke-[2]" />,
      action: () => {
        onNavigate('studio');
        onClose();
      },
    },

    // Drawings
    {
      id: 'draw-as4092c',
      category: 'Drawings',
      title: 'AS-4092-C Precision Flange Housing',
      subtitle: '14 dimensions, GD&T True Position & M10x1.5 thread',
      icon: <Layers className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('studio', 'AS-4092-C');
        onClose();
      },
    },
    {
      id: 'draw-ppap8810a',
      category: 'Drawings',
      title: 'PPAP-8810-A Automotive Suspension Bracket',
      subtitle: '12 dimensions, bilateral stamped tolerances',
      icon: <Layers className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('studio', 'PPAP-8810-A');
        onClose();
      },
    },
    {
      id: 'draw-iso2044b',
      category: 'Drawings',
      title: 'ISO-2044-B Stepped Shaft Pin',
      subtitle: '10 dimensions, ISO 286 g6/H7 ground fits',
      icon: <Layers className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('studio', 'ISO-2044-B');
        onClose();
      },
    },

    // Actions
    {
      id: 'act-tour',
      category: 'Metrology Actions',
      title: 'Run 45s Interactive Metrology Tour',
      subtitle: 'Demonstrates Gemini vision, revision diff, MMC bonus & SPC',
      icon: <Sparkles className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('studio');
        onTriggerAction?.('open-tour');
        onClose();
      },
    },
    {
      id: 'act-cmm',
      category: 'Metrology Actions',
      title: 'Import CMM Coordinate Report',
      subtitle: 'ZEISS Calypso / Hexagon PC-DMIS true position solver',
      icon: <Cpu className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('studio');
        onTriggerAction?.('open-cmm');
        onClose();
      },
    },
    {
      id: 'act-caliper',
      category: 'Metrology Actions',
      title: 'Simulate USB-HID Digital Caliper Burst',
      subtitle: 'Simulates high-speed Mitutoyo wedge input (30.012 mm -> active dim)',
      icon: <Zap className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('studio');
        onTriggerAction?.('simulate-caliper');
        onClose();
      },
    },
    {
      id: 'act-excel',
      category: 'Metrology Actions',
      title: 'Export 4-Sheet AS9102 Rev C Excel',
      subtitle: 'Generates Form 1, Form 2, Form 3, and 10-sample SPC spreadsheet',
      icon: <FileSpreadsheet className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('studio');
        onTriggerAction?.('export-excel');
        onClose();
      },
    },
    {
      id: 'act-pdf',
      category: 'Metrology Actions',
      title: 'Export 2-Page QR PDF Inspection Deck',
      subtitle: 'Ballooned blueprint + printable shop-floor traveler with deep-link QR',
      icon: <BookOpen className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onNavigate('studio');
        onTriggerAction?.('export-pdf-deck');
        onClose();
      },
    },

    // Settings
    {
      id: 'set-theme',
      category: 'Settings',
      title: 'Toggle Color Theme',
      subtitle: 'Switch between Studio Paper (Light) and Carbon Studio (Dark)',
      icon: <Sun className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onToggleTheme();
        onClose();
      },
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 bg-black/50 backdrop-blur-xs p-4 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-surface border border-border-hairline rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-100"
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-border-hairline flex items-center gap-3 bg-subtle/40">
          <Search className="w-4 h-4 text-text-muted shrink-0 stroke-[1.5]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, page name, or blueprint number..."
            className="w-full bg-transparent border-none text-text-primary placeholder:text-text-muted text-xs font-sans focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 font-sans">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted">
              No matching commands or pages found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-subtle text-text-primary border border-border-hairline'
                      : 'text-text-secondary hover:bg-subtle/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center ${
                        isSelected
                          ? 'bg-surface text-text-primary border border-border-hairline shadow-2xs'
                          : 'bg-subtle/80 text-text-muted'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary text-xs flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] font-mono text-text-muted font-normal">
                          · {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted">{item.subtitle}</div>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-3.5 h-3.5 text-text-muted transition-transform ${
                      isSelected ? 'translate-x-0.5 text-text-primary' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="p-2.5 border-t border-border-hairline bg-subtle/50 flex items-center justify-between text-[11px] font-mono text-text-muted">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>SpecBalloon v2.5 Metrology OS</span>
        </div>
      </div>
    </div>
  );
};
