import React from 'react';
import { Sun, Moon, ArrowRight, Search, Terminal } from 'lucide-react';

export type AppPage = 'overview' | 'product' | 'engine' | 'customers' | 'security' | 'pricing' | 'docs' | 'studio';

interface GlobalNavbarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
}

export const NAV_LINKS: Array<{ id: AppPage; label: string; path: string }> = [
  { id: 'overview', label: 'Overview', path: '/' },
  { id: 'product', label: 'Product', path: '/product' },
  { id: 'engine', label: 'Engine & Math', path: '/engine' },
  { id: 'customers', label: 'Customers', path: '/customers' },
  { id: 'security', label: 'Security & ITAR', path: '/security' },
  { id: 'pricing', label: 'Pricing & ROI', path: '/pricing' },
  { id: 'docs', label: 'Docs', path: '/docs' },
];

export const GlobalNavbar: React.FC<GlobalNavbarProps> = ({
  activePage,
  onNavigate,
  darkMode,
  onToggleTheme,
  onOpenCommandPalette,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-surface/95 backdrop-blur-md border-b border-border-hairline transition-colors select-none">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Geometric Reticle Mark + SpecBalloon Brand + v2.5 Pill */}
        <div
          onClick={() => onNavigate('overview')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full border-[1.5px] border-text-primary flex items-center justify-center relative transition-transform group-hover:scale-105">
            <div className="w-2 h-2 rounded-full bg-text-primary" />
            <div className="absolute inset-0 rounded-full border border-text-primary/30 animate-ping opacity-20" />
          </div>
          <span className="font-display font-semibold text-base text-text-primary tracking-tight">
            SpecBalloon
          </span>
          <span className="px-1.5 py-0.5 rounded bg-subtle border border-border-hairline text-[10px] font-mono text-text-muted font-medium">
            v2.5
          </span>
        </div>

        {/* Center: True Multi-Page Links */}
        <nav className="hidden lg:flex items-center gap-0.5 text-xs font-medium">
          {NAV_LINKS.map((link) => {
            const isActive = activePage === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  isActive
                    ? 'text-text-primary font-semibold bg-subtle border border-border-hairline/80'
                    : 'text-text-secondary hover:text-text-primary hover:bg-subtle/60'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Cmd+K Trigger + Theme Toggle + Launch Studio Pill */}
        <div className="flex items-center gap-2.5">
          {/* Cmd + K Quick Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-hairline bg-subtle/80 hover:bg-subtle text-text-muted hover:text-text-secondary text-xs transition-colors cursor-pointer"
            title="Open Command Palette (Cmd + K or Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline font-sans text-[11px]">Search</span>
            <kbd className="px-1 py-0.2 rounded bg-surface border border-border-hairline text-[10px] font-mono font-semibold">
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle (Monochrome 1.5px stroke) */}
          <button
            onClick={onToggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border-hairline bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 stroke-[1.5]" />
            ) : (
              <Moon className="w-3.5 h-3.5 stroke-[1.5]" />
            )}
          </button>

          {/* High-Contrast Primary Launch Pill Button */}
          <button
            onClick={() => onNavigate('studio')}
            className="flex items-center gap-1.5 bg-[#09090B] dark:bg-white text-white dark:text-[#09090B] hover:opacity-90 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all shadow-apple-sm cursor-pointer"
          >
            <span>Launch Studio</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>
    </header>
  );
};

